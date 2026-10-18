# Deployment

Production is the `main` branch. Feature branches and pull requests run CI.
The production workflow runs tests, builds with Vercel and deploys the prebuilt
artifact. Concurrent releases are serialized. Never commit credentials.

GitHub repository settings:
- Secret `VERCEL_TOKEN`: deployment token for the Vercel project/team.
- Variable `VERCEL_ORG_ID`: Vercel team ID.
- Variable `VERCEL_PROJECT_ID`: Most's project ID (never Chemistry's).
- Variable `VERCEL_DEPLOY_ENABLED`: `true` after credentials are configured.

Manual rerun: Actions → Deploy production → Run workflow on main.
Rollback by reverting the offending commit on main so later deployments retain
that fix. Vercel CLI is pinned in the workflow. `.vercel/` is local-only.

The Usions service registration is separate from Vercel hosting. Its iframe URL
must point to production, `max_players` must be 16, leaderboard disabled, and
SDK version must include getParticipants. Icon changes need a new versioned URL
and a registry image update verified against public bytes.

The Most-only Vercel token created October 19, 2026 expires in October 2027.
Rotate VERCEL_TOKEN before then; it grants access only to the usion-most project.
