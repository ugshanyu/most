# Handoff

Most is asynchronous and pack-based. Choose a pack, invite friends, answer at
any pace, and reopen the same invite later. Each pack keeps its own votes and
progress. The built-in “The friend test 👀” contains the user's 14 revised
questions in English and Mongolian. Original questions are retained only for
historical records; old ballots are never relabeled as new answers.

Pack cards show real answerer icons (at least one submitted vote). On the home
screen these come only from the viewer's joined games; inside a game they come
only from that room. No global disclosure of private answers or friend activity.

Users can create immutable packs with a name and 1–30 unique questions. Custom
packs are private to the creator until shared into a joined game. Members of
that game can read/play the pack and reuse it in their own joined games. Pack
creation retries use a UUID. Up to 100 packs per creator; title 2–60 characters,
questions 8–180 characters. User text is escaped on display.

## API

- GET/POST /games/most/packs: catalog and creation. GET supports room_id.
- POST /games/rooms/{id}/most/pack: share an accessible pack with this room.
- GET /games/rooms/{id}/most?pack_id=...: scoped identities and pack ballots.
- POST /games/rooms/{id}/most/vote: pack_id, question, candidate. Authenticated
  identity supplies the voter; immutable Mongo ballot keys include the pack.
- GET /games/most/records: joined games, paginated by 20; choose a pack to review.

The scoped token is read from Usion.user.getToken() on every request. The SDK
still supplies identity, native invites, room membership, connection state and
chat. The pending selected pack is held in sessionStorage across the host's
invite remount. Ordinary reloads reopen the pack catalog with saved progress.
Pack questions and IDs are immutable once created; the server validates all votes.

Keep real voter icons, vote percentages/bars, one selection stamp, stable card
sizes, equal action buttons and EN/MN. No leaderboard or automatic profile posts.
Most invites never expire. Old mobile host binaries need the 1.6.37 host update
for their cards to stop applying the old 15-minute expiry.

Edit src, run npm test, npm run build, node scripts/check-build.mjs and
scripts/browser-test.mjs. Browser tests cover independent completion, late joins,
recovery, records, answerer icons, custom pack creation/invites, and vote isolation.
scripts/async-smoke.py verifies real production persistence/privacy with disposable
identities. Never send real friends invitations for tests. Do not replace the
user's native glass-menu build or take over their active encrypted chat session.
