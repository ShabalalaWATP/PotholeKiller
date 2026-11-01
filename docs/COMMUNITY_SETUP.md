# Optional shared collectors

The local guest journey works without an account. Shared profiles and leaderboard code passed local checks/build. The user manually enabled Identity at 15:24. Preview database/migration and hosted account/runtime checks remain pending; do not infer hosted success from the local SQL tests.

## Operator setup still required

1. Identity is enabled in the linked [Netlify project](https://app.netlify.com/projects/potholekiller-hackney/identity), manually completed at 15:24. Its settings determine sign-in providers and email confirmation; runtime account behaviour is not yet verified.
2. The next Netlify build uses `BRANCH=hackathon` and `branch-deploy` context to provision/stage Netlify Database and [the committed collector migration](../netlify/database/migrations/20261101151000_collector_profiles.sql). Confirm actual preview provisioning/migration results; in-memory tests do not establish them.
3. Deploy the expanded Next.js application and native community function, then verify account creation/confirmation, sign-in/out, profile save, public opt-in/out and a new eligible capture on the actual preview.
4. Verify server ownership checks, repeated claims, expired receipts and database-unavailable handling on that hosted environment before calling the shared feature operational.

Plain `npm run dev` does not supply Netlify Identity or `/api/community`. Local guest nickname/avatar and the PotholeDex remain usable when shared services are unavailable. Do not add hand-rolled session tokens or credentials to game data.

## What can count

Sign in and save a collector profile before scanning a new eligible user photograph. The server's official Identity SDK supplies `getUser().id`; the browser cannot choose a different owner. A capturable live upload can produce an owner-bound database receipt valid for 30 minutes. Bundled samples, known near-identical sample copies, offline examples and guest scans do not qualify and are not backfilled.

After reviewed report preparation, the server calculates 60 to 110 XP from the submitted observation profile. SQL locks and uniqueness constraints prevent one receipt or the same normalised image hash counting repeatedly for one user. Replays return zero extra XP. This is image-level duplication control, not proof of an independently unique physical pothole, independent residents or council submission.

The board shows only opted-in nicknames, avatars, capture counts, XP and collector level/rank. Levels advance each 120 XP and cap at five. It ranks captures first and XP second, with no fabricated entries. Local play can include samples, so local and shared totals can differ. A nickname/avatar can be kept private while retaining a signed-in profile.

## Data and retention

The official Identity SDK manages authentication and its own vendor session storage, including tokens and email. The game's separate guest profile stores only the chosen nickname/avatar; it does not duplicate those authentication details.

The database schema contains private auth UUIDs, nickname, avatar, public flag, normalised image hashes, receipt identifiers, timestamps and awarded XP. It stores no photos, coordinates, report text, email or passwords. Public projections omit auth IDs. Report drafts and coordinates remain in the browser's local collection.

Receipt validity is **30 minutes for claiming**, not a retention period. Expired receipt rows are not automatically deleted by the current implementation. A cleanup/retention policy remains future operational work; do not promise automatic removal after 30 minutes.

Final local check passed 416 tests in 23 files, including ten real in-memory SQL checks; the expanded build passed. Hosted account/session and database behaviour remain unverified. The user explicitly requested no further CI/CodeQL/unit runs unless vital and no pipeline waiting. New commits use `[skip ci]`. No shared capture count proves council acknowledgement, submission or repair.
