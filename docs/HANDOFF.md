# Handoff

## Product

Invite-only entry → ready lobby → 15 questions → result review → Play again.
Candidates show the authenticated participant directory's names/avatars. A group
invite includes non-playing group members; only connected joined players are
expected to vote. The candidate list freezes at Start. A late joiner votes from
the next question. Self-votes are allowed. Every vote reveals immediately.

The host can advance when everyone voted. After a 20-second absence, the host
can explicitly skip missing votes (no generated votes). Remaining players elect
a replacement host after the same grace. Replay returns to the ready lobby.

## Platform integration

Requires Usions SDK 2.33.0-dev.3 or newer with `game.getParticipants()` and the
`GET /games/rooms/{room_id}/participants` endpoint. Reads use the current scoped
iframe token. The backend verifies service scope and room membership. It returns
only IDs, display names, avatars, joined/connected flags. It does not expose
phone numbers, usernames or arbitrary contacts.

Accepted group game invites preserve the first source group on the room.
The directory expands that group only if all room participants belong to it;
mixed-group rooms return room participants. New group members after Start do
not change the frozen candidate list. The group size limit is 500.

`game.syncedState` persists sequenced actions and checkpoints. All peers can
checkpoint, so a sleeping host does not discard votes. Vote identity comes from
the relay envelope. Duplicate picks, stale rounds/sessions, unknown candidates
and non-voters are ignored. The platform relay authenticates participants;
this casual game's rule enforcement is client-side, not an anti-cheat server.

## UI constraints

Keep the single question, avatar cards, voter icons, one primary next action.
Reserve footer space; revealing Next must not resize cards. One selection stamp.
No descriptions, separate back button or score leaderboard. Support EN/MN and
portrait touch screens. Treat any profile text as text, never trusted HTML.

## Validation

`npm test` covers the complete match, immutable picks, late joins, skipping,
ties, replay, and recovery equivalence. `scripts/browser-test.mjs` exercises
multiple browser clients using the actual SDK recovery module with a test relay.
Production still needs real authenticated web/native smoke tests; a simulated
relay is not evidence of device verification.
