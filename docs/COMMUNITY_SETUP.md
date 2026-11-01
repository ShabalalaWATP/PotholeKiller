# Optional shared collectors

[Production](https://potholekiller-hackney.netlify.app) is ready at `6ae767a03f094ad44e5a7911`, source `317ef76`, including the clean-built and phone-verified map fix. Core/mock flows, production reads and 401/403 road-write guards are verified. No account was created; confirmed-account scoring remains manual follow-up. Guest play works without an account.

## Deployment and verification record

1. Identity is enabled in the linked [Netlify project](https://app.netlify.com/projects/potholekiller-hackney/identity), manually completed at 15:24. Its settings determine sign-in providers and email confirmation; runtime account behaviour is not yet verified.
2. The `hackathon` / `branch-deploy` profile build created the isolated database and staged/uploaded [base SQL](../netlify/database/migrations/20261101151000_collector_profiles.sql). The new [repair migration](../netlify/database/migrations/20261101154000_community_repairs.sql) is additive; do not edit an applied base migration. Verify actual schema/runtime after deployment.
3. Production app/native functions are deployed. Root/config, community/road reads, demo JPEG and Hackney location lookup returned 200; config reports live analysis available.
4. Production anonymous road writes returned 401 and cross-origin writes 403. Email sign-in form and local profile save were checked without account creation.
5. Confirmed-account capture, public opt-in/out, publication, links, votes/credits and email callback roundtrips have not been tested end to end. Record this limit without treating local SQL or mock simulation as authenticated proof.

Plain `npm run dev` does not supply Netlify Identity or `/api/community`. Local guest nickname/avatar and the PotholeDex remain usable when shared services are unavailable. Do not add hand-rolled session tokens or credentials to game data.

## What can count

Sign in and save a collector profile before scanning a new eligible user photograph. The server's official Identity SDK supplies `getUser().id`; the browser cannot choose a different owner. A capturable live upload can produce an owner-bound database receipt valid for 30 minutes. Bundled samples, known near-identical sample copies, offline examples and guest scans do not qualify and are not backfilled.

After reviewed report preparation, the server calculates 60 to 110 XP from the submitted observation profile. SQL locks and uniqueness constraints prevent one receipt or the same normalised image hash counting repeatedly for one user. Replays return zero extra XP. This is image-level duplication control, not proof of an independently unique physical pothole, independent residents or council submission.

The authenticated board shows opted-in nicknames, avatars, capture counts, XP and level/rank. Levels advance each 120 XP, capped at five; standings rank captures then XP. Shared XP includes once-per-user/issue order bonuses of 60/20/5 for first/positions 2 to 5/later reporters. Repair credit matches first frozen capture XP plus that bonus, up to 170, without an extra capture count. A separate twenty-user mock league simulates the same rules without seeding Identity accounts.

## Data and retention

The official Identity SDK manages authentication and its own vendor session storage, including tokens and email. The game's separate guest profile stores only the chosen nickname/avatar; it does not duplicate those authentication details.

The database contains private auth UUIDs, game profile fields, hashes/receipts, timestamps, XP and private vote/credit ownership. Public road pins, labels, type and self-reported age are stored only after separate map opt-in, default false for new/legacy records. Complete photos, report text, email and passwords are not stored. Public projections omit private auth IDs. See [repair privacy](COMMUNITY_REPAIRS.md).

The editable 2-to-80-character reporter name defaults from nickname and stays outside public road API responses. Preview browser testing passed pin-first postcode selection, own-photo live analysis, preserved pin, name editing and the named Hackney `mailto:` draft. No email was sent.

Receipt validity is **30 minutes for claiming**, not a retention period. Expired receipt rows are not automatically deleted by the current implementation. A cleanup/retention policy remains future operational work; do not promise automatic removal after 30 minutes.

The 416-test coverage predates repairs and remains historical. Latest build/types, core/mock browser flows and production smoke checks passed without another full suite/CI, per instruction. Confirmed-account mutations remain untested. Counts/community-marked fixed do not prove council submission or engineering repair.
