# Most 👀

A Usions group game: 15 questions, tap a friend's avatar, see every vote immediately.
Two to sixteen people can vote. Group members can be candidates without joining.
No scores, leaderboard, or automatic profile posts.

## Develop

Node 22 or later, no production dependencies.

```
npm test
npm run build
npm run dev
```

Open http://localhost:3050. Outside Usions the landing screen is available;
real invites and identity require the Usions host. For a browser integration test,
install Playwright (`npm install --no-save playwright`) and run
`node scripts/browser-test.mjs`. This injects a test-only relay into three pages;
the deployed bundle never includes it.

Edit `src/`, never generated `public/index.html`. Stable question IDs and both
English/Mongolian text live in `src/questions.mjs`. `src/model.mjs` is the pure
sequenced-action reducer. `src/app.mjs` owns rendering and the SDK adapter.

Read [handoff](docs/HANDOFF.md) and [deployment](docs/DEPLOYMENT.md).
