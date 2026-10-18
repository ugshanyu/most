/**
 * Usion SDK Game Reliability — the reconnection-lifecycle surface promised in
 * v2.16: sequence getters, the unified connection-state machine, and
 * syncedState (reconnect-safe authoritative shared state).
 *
 * Everything here rides the events the game module already dispatches
 * ('disconnect' / 'reconnect' / 'joined' / 'sync' / 'action'), so it behaves
 * identically across the socket, embedded-proxy, and direct transports.
 */

export function applyGameReliability(game, Usion) {
  // ── Sequence getters ──────────────────────────────────────────────────────

  /** Highest action sequence seen (from joins, syncs, and live actions). */
  game.getLastSequence = function () { return this._lastSequence || 0; };

  /** Highest action sequence applied locally; trails while catching up. */
  game.getLastAppliedSequence = function () { return this._lastActionApplied || 0; };

  // ── Connection-state machine ──────────────────────────────────────────────
  // connected → disconnected → rejoining → reconnected → connected.
  // 'reconnected' is a transient notification state: observers see it, then
  // the machine settles back to 'connected' in the same tick.

  game._connState = 'disconnected';
  game._awaitResync = false;

  game._setConnState = function (state) {
    if (this._connState === state) return;
    this._connState = state;
    this._dispatch('connectionState', state);
  };

  /** Current connection state, synchronously. */
  game.getConnectionState = function () { return this._connState; };

  /**
   * Observe connection-state transitions — one hook to drive a
   * "Reconnecting…" overlay and gate input, identical on every transport.
   * Single handler (last wins); returns an unsubscribe fn. For multiple
   * listeners use game.on('connectionState', cb).
   */
  game.onConnectionState = function (callback) { return this._setHandler('connectionState', callback); };

  /**
   * Fires once per reconnect, after the resync completes, with
   * { state, lastSequence, viaSync }. Restore local state here — it does NOT
   * fire for a manually-requested sync.
   */
  game.onReconnected = function (callback) { return this._setHandler('reconnected', callback); };

  game.on('disconnect', function () {
    game._awaitResync = false;
    game._setConnState('disconnected');
  });

  game.on('reconnect', function () {
    if (game.roomId) {
      game._awaitResync = true;
      game._setConnState('rejoining');
    } else {
      game._setConnState('connected');
    }
  });

  game.on('sync', function (data) {
    if (!game._awaitResync) return;
    game._awaitResync = false;
    game._dispatch('reconnected', {
      state: (data && data.game_state) || null,
      lastSequence: game._lastSequence || 0,
      viaSync: true,
    });
    game._setConnState('reconnected');
    game._setConnState('connected');
  });

  // Transport-level connects (initial connect in every mode) resolve through
  // connect()/connectDirect() — reflect them in the state machine.
  function wrapConnect(name) {
    var orig = game[name];
    if (typeof orig !== 'function') return;
    game[name] = function () {
      var self = this;
      return orig.apply(self, arguments).then(function (result) {
        if (!self._awaitResync) self._setConnState('connected');
        return result;
      });
    };
  }
  wrapConnect('connect');
  wrapConnect('connectDirect');

  // ── Host tracking ─────────────────────────────────────────────────────────
  // Kept on the game module (registered at module creation, so it never
  // misses an event) — a syncedState created AFTER the join still knows who
  // the authority is.

  game._hostId = null;
  function trackHost(d) {
    if (!d) return;
    if (d.host_id) game._hostId = d.host_id;
    else if (d.player_ids && d.player_ids.length) game._hostId = d.player_ids[0];
  }
  game.on('joined', trackHost);
  game.on('playerJoined', trackHost);

  // ── syncedState ───────────────────────────────────────────────────────────

  /**
   * Reconnect-safe authoritative shared state. Commits are sequenced actions
   * applied through `reduce` on every client in the same order (deduped by
   * sequence); the authority (player_ids[0] by default) auto-checkpoints via
   * setState, and (re)joining clients recover automatically (checkpoint +
   * un-checkpointed tail). Degrades to local-apply in direct mode.
   * Full contract: SyncedStateOptions / SyncedState in types/index.d.ts.
   */
  game.syncedState = function (initial, opts) {
    opts = opts || {};
    var self = this;
    var reduce = typeof opts.reduce === 'function'
      ? opts.reduce
      : function (state, action) { return Object.assign({}, state, action.data); };
    var checkpointEvery = opts.checkpointEvery != null ? opts.checkpointEvery : 1;
    var authorityMode = opts.authority === 'all' ? 'all' : 'host';
    var defaultType = opts.type || 'update';

    var state = initial === undefined ? {} : initial;
    var appliedSeq = 0;
    var sinceCheckpoint = 0;
    var lastGapRequest = -1;
    var changeCbs = [];
    var offs = [];

    function notify(reason) {
      var copy = changeCbs.slice();
      for (var i = 0; i < copy.length; i++) {
        try { copy[i](state, reason); } catch (e) { Usion.log('syncedState onChange error: ' + e.message); }
      }
    }

    function isAuthority() {
      if (authorityMode === 'all') return true;
      var me = self.playerId || (Usion.user && Usion.user.getId && Usion.user.getId());
      return !!(me && self._hostId && me === self._hostId);
    }

    function doCheckpoint() {
      if (self.directMode) {
        return Promise.resolve({ success: false, error: 'not_supported_in_direct_mode' });
      }
      // The wrapper carries the sequence the checkpoint reflects, so recovery
      // knows exactly where the un-checkpointed tail starts.
      return self.setState({ __usionSyncedState: 1, seq: appliedSeq, state: state });
    }

    function maybeAutoCheckpoint() {
      if (!(checkpointEvery > 0) || !isAuthority()) return;
      sinceCheckpoint += 1;
      if (sinceCheckpoint >= checkpointEvery) {
        sinceCheckpoint = 0;
        doCheckpoint();
      }
    }

    function applyOne(playerId, type, data, sequence) {
      if (sequence !== undefined && sequence <= appliedSeq) return false; // dedupe
      var next;
      try {
        next = reduce(state, { playerId: playerId, type: type, data: data, sequence: sequence });
      } catch (e) {
        Usion.log('syncedState reduce error: ' + e.message);
        return false;
      }
      if (next !== undefined) state = next;
      if (sequence !== undefined) appliedSeq = sequence;
      return true;
    }

    function onAction(d) {
      if (!d) return;
      if (applyOne(d.player_id, d.action_type, d.action_data, d.sequence)) {
        notify('action');
        maybeAutoCheckpoint();
      }
    }

    // Recover from a join ack or sync payload: load the checkpoint (if it is
    // ours and newer), replay the action tail in order, and if the server's
    // sequence is still ahead of us, ask once for the missing range.
    function recover(d) {
      if (!d) return;
      var changed = false;

      var gs = d.game_state;
      if (gs && gs.__usionSyncedState && typeof gs.seq === 'number'
          && gs.seq >= appliedSeq && gs.state !== undefined) {
        state = gs.state;
        appliedSeq = gs.seq;
        changed = true;
      }

      var actions = d.actions;
      if (actions && actions.length) {
        var sorted = actions.slice().sort(function (a, b) {
          return (a.sequence || 0) - (b.sequence || 0);
        });
        for (var i = 0; i < sorted.length; i++) {
          var item = sorted[i];
          if (item && applyOne(item.player_id, item.action_type, item.action_data, item.sequence)) {
            changed = true;
          }
        }
      }

      if (changed) notify('recover');

      // Gap fill: the checkpoint may lag the room sequence (checkpointEvery>1).
      // Request the tail from OUR applied sequence — once per position, so a
      // trimmed history can't loop us.
      if (d.sequence !== undefined && d.sequence > appliedSeq && lastGapRequest !== appliedSeq) {
        lastGapRequest = appliedSeq;
        try { self.requestSync(appliedSeq); } catch (e) { /* non-fatal */ }
      }
    }

    offs.push(self.on('action', onAction));
    offs.push(self.on('sync', recover));
    offs.push(self.on('joined', recover));

    return {
      /** Current state value. */
      get: function () { return state; },

      /**
       * Commit a change: commit(data) with the default action type, or
       * commit(type, data, opts) to name it (opts forwarded to game.action,
       * e.g. nextTurn / queueOffline). Applied exactly once via the echo.
       */
      commit: function (typeOrData, data, actionOpts) {
        var t, payload, o;
        if (typeof typeOrData === 'string') { t = typeOrData; payload = data; o = actionOpts; }
        else { t = defaultType; payload = typeOrData; o = data; }
        if (self.directMode) {
          // No platform echo in direct mode — apply locally, then send.
          if (applyOne(self.playerId, t, payload, undefined)) notify('action');
          return self.action(t, payload, o);
        }
        return self.action(t, payload, o);
      },

      /** Subscribe to changes: cb(state, reason). Returns an unsubscribe fn. */
      onChange: function (cb) {
        changeCbs.push(cb);
        return function () {
          var i = changeCbs.indexOf(cb);
          if (i >= 0) changeCbs.splice(i, 1);
        };
      },

      /** Whether this client is the checkpointing authority. */
      isAuthority: isAuthority,

      /** Force a server checkpoint now (no-op result in direct mode). */
      checkpoint: function () { return doCheckpoint(); },

      /** Sequence of the last action applied into this state. */
      getSequence: function () { return appliedSeq; },

      /** Detach all listeners; the instance stops receiving updates. */
      destroy: function () {
        for (var i = 0; i < offs.length; i++) { try { offs[i](); } catch (e) { /* noop */ } }
        offs.length = 0;
        changeCbs.length = 0;
      },
    };
  };
}
