# Handoff

Most is asynchronous: invite friends, answer 15 questions independently, and
reopen the same invite later. Presence and host readiness never gate a vote or
Next. Current totals and voter avatars refresh every two seconds. The next
unanswered question resumes after reload. Results update as friends answer.
Play again reviews the same saved picks; it never clears someone else's votes.

The UI calls authenticated `/games/rooms/{id}/most` reads and `/most/vote` writes.
The Usions backend stores immutable ballots in Mongo, keyed by room, question,
and authenticated voter. No expiring Redis checkpoint owns these votes.
The scoped token comes from `Usion.user.getToken()` on every request.
Participant access is room scoped; personal invitees and verified group members
can be candidates before joining. Existing synchronous ballots migrate lazily.

Host web/native invite handlers persist personal invitees before remounting;
the app also records the SDK invite result for older compatible hosts.
Most rooms never archive automatically, and Most chat cards do not expire.
Other Usions games keep their original lifecycle. Old mobile binaries need a
matching host update for their chat cards to stop applying the 15-minute expiry.

Keep EN/MN, visible voter icons, one stamp, fixed card sizes and large Next.
No leaderboard or automatic profile posting. Edit src, then run npm test,
npm run build, node scripts/check-build.mjs and scripts/browser-test.mjs.
Browser tests exercise one player finishing alone, a friend arriving later,
reload recovery and live result updates using a test-only API adapter.
Production smoke uses disposable identities; never send invitations to real
contacts just to test. Native visual validation must not take over the user's
active encrypted chat session or replace their working glass-menu binary.
