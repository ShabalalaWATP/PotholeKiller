# Optional shared collectors

The local guest journey works without an account. Identity was enabled at 15:24. Profile preview `6ae75c622086dbea5bf72fdc` is deployed, with isolated `hackathon` database created and base SQL staged/uploaded. Runtime health/auth remains unverified; latest repair preview deployment is pending. Local SQL checks do not establish hosted success.

## Operator setup still required

1. Identity is enabled in the linked [Netlify project](https://app.netlify.com/projects/potholekiller-hackney/identity), manually completed at 15:24. Its settings determine sign-in providers and email confirmation; runtime account behaviour is not yet verified.
2. The `hackathon` / `branch-deploy` profile build created the isolated database and staged/uploaded [base SQL](../netlify/database/migrations/20261101151000_collector_profiles.sql). The new [repair migration](../netlify/database/migrations/20261101154000_community_repairs.sql) is additive; do not edit an applied base migration. Verify actual schema/runtime after deployment.
3. Deploy the expanded Next.js application and native community function, then verify account creation/confirmation, sign-in/out, profile save, public opt-in/out and a new eligible capture on the actual preview.
4. Verify server ownership checks, repeated claims, expired receipts and database-unavailable handling on that hosted environment before calling the shared feature operational.
5. Verify explicit map opt-in, canonical capture/nearby-link proof, one-vote/account weights and once-only repair credits. Canonical Identity callback configuration needs production approval after final preview verification; production is not published.

Plain `npm run dev` does not supply Netlify Identity or `/api/community`. Local guest nickname/avatar and the PotholeDex remain usable when shared services are unavailable. Do not add hand-rolled session tokens or credentials to game data.

## What can count

Sign in and save a collector profile before scanning a new eligible user photograph. The server's official Identity SDK supplies `getUser().id`; the browser cannot choose a different owner. A capturable live upload can produce an owner-bound database receipt valid for 30 minutes. Bundled samples, known near-identical sample copies, offline examples and guest scans do not qualify and are not backfilled.

After reviewed report preparation, the server calculates 60 to 110 XP from the submitted observation profile. SQL locks and uniqueness constraints prevent one receipt or the same normalised image hash counting repeatedly for one user. Replays return zero extra XP. This is image-level duplication control, not proof of an independently unique physical pothole, independent residents or council submission.

The authenticated board shows opted-in nicknames, avatars, capture counts, XP and level/rank. Levels advance each 120 XP, capped at five; standings rank captures then XP. Shared XP includes once-per-user/issue order bonuses of 60/20/5 for first/positions 2 to 5/later reporters. Repair credit matches first frozen capture XP plus that bonus, up to 170, without an extra capture count. A separate twenty-user mock league simulates the same rules without seeding Identity accounts.

## Data and retention

The official Identity SDK manages authentication and its own vendor session storage, including tokens and email. The game's separate guest profile stores only the chosen nickname/avatar; it does not duplicate those authentication details.

The database contains private auth UUIDs, game profile fields, hashes/receipts, timestamps, XP and private vote/credit ownership. Public road pins, labels, type and self-reported age are stored only after separate map opt-in, default false for new/legacy records. Complete photos, report text, email and passwords are not stored. Public projections omit private auth IDs. See [repair privacy](COMMUNITY_REPAIRS.md).

The council draft now includes an editable reporter name, prefilled from the chosen nickname and validated to 2 to 80 characters. It remains outside public road API responses. A new real hunt confirms a road point before photo input. These newest changes are not yet covered by a verified build/hosted preview result.

Receipt validity is **30 minutes for claiming**, not a retention period. Expired receipt rows are not automatically deleted by the current implementation. A cleanup/retention policy remains future operational work; do not promise automatic removal after 30 minutes.

The last full check passed 416 tests before the repair feature. Latest build/types passed at 15:49, plus five focused rule and six database/auth/concurrency checks. No new full coverage is claimed. Hosted behaviour remains unverified. The user requested no further full CI/CodeQL/unit runs or pipeline waits unless vital; new commits use `[skip ci]`. Capture counts and community-marked fixed status do not prove council submission or engineering repair.
