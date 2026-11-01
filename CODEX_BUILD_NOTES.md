# Codex build notes

PotholeKiller was created for the DevDay Exchange Community Hackathon, 1 November 2026. These notes identify implementation evidence, not a claim that every delivery check has passed.

## Concrete contributions

| Codex work | Evidence |
| --- | --- |
| Created a single Next.js application with a game map, scanner, creature encounter, reviewed reporting flow and collection. | [Game state and screens](components/game/Game.tsx), [scanner](components/scan/ScanPanel.tsx), [report form](components/report/ReportPanel.tsx), [reward](components/report/Reward.tsx). |
| Implemented a server-only OpenAI vision adapter using Responses API, Structured Outputs, Zod, a timeout and `store: false`. | [Provider adapter](lib/ai/analyse.ts), [schema and classification gates](lib/ai/schema.ts), [API route](app/api/analyse/route.ts), [provider tests](tests/analysis.provider.test.ts). |
| Added image-upload protection, same-origin checks and bounded analysis attempts. | [Upload stream](lib/security/request.ts), [decode and metadata removal](lib/security/image.ts), [limits](lib/security/limits.ts), [request tests](tests/security.request.test.ts), [image tests](tests/security.image.test.ts). |
| Separated reviewed factual reporting from humorous creature attributes and required confirmed coordinates. | [Report domain](lib/reporting/report.ts), [reporting tests](tests/reporting.test.ts). |
| Implemented once-only local XP, validated collection persistence and distinct states for drafts, requested email handoffs and user-recorded submission. | [Progression](lib/game/progression.ts), [storage](lib/game/storage.ts), [progression tests](tests/game-progression.test.ts). |
| Created original creature templates and an offline illustrated hunt map. | [Creature component](components/game/Creature.tsx), [creature artwork](public/creatures/gremlin.svg), [schematic map](public/map/hackney-pilot.svg), [credits](docs/ASSET_CREDITS.md). |
| Added an explicit sample fallback that does not impersonate live AI or enable council handoff. | [Sample fixtures](lib/samples.ts), [source badges](components/scan/Encounter.tsx), [handoff guard](lib/reporting/handoff.ts). |
| Added an opt-in live smoke check against the running local server, kept separate from CI. | [Live smoke script](tests/live-smoke.mjs), [npm scripts](package.json). It makes two paid requests. |
| Implemented the later authorised experimental age/extent power rules, capture-time bonuses and legacy 60 XP defaults. | [Power rules](lib/game/power.ts), [progression](lib/game/progression.ts), [power tests](tests/game-power.test.ts). |
| Added fictional map histories and power-dependent creature art, with manual profile fields for real uploads. | [Demo profiles](lib/game/demo-monsters.ts), [profile form](components/report/MonsterProfileFields.tsx), [creature](components/game/Creature.tsx). |
| Added UK address/pin lookup with official authority routes, source validation and bounded ephemeral caching. | [Lookup](lib/location/lookup.ts), [directory provenance](lib/location/README.md), [location API](app/api/location/route.ts), [live lookup checks](tests/location-live.mjs). |
| Added Game/Streets/Night styles, close-zoom precise markers, explicit GPS and reviewed report types. | [Map](components/map/MapLeaflet.tsx), [location search](components/report/LocationSearch.tsx), [report form](components/report/ReportPanel.tsx). |
| Implemented optional SDK sign-in, local collector cards, opt-in public profiles and a real database-backed leaderboard. | [Collector hook](lib/client/useCollector.ts), [profile UI](components/profile/ProfilePanel.tsx), [community handler](lib/community/handler.ts), [Netlify function](netlify/functions/community.mts). |
| Added owner-bound live-scan receipts, per-user database uniqueness and real in-memory SQL integration tests. | [Receipt gate](lib/community/scan-receipt.ts), [repository](lib/community/database.ts), [migration](netlify/database/migrations/20261101151000_collector_profiles.sql), [SQL tests](tests/community-database.test.ts). |

The test files contain automated checks and mocks. A mocked OpenAI response verifies application behaviour, not live model availability or image-recognition accuracy. No contribution is attributed to a fabricated commit or recording.

## Verification record

| Check | Recorded result |
| --- | --- |
| Lint (`npm run lint`) | PASS. |
| Type checks (`npm run typecheck`) | PASS. Runs `next typegen` before `tsc --noEmit` so clean clones generate route declarations. Generated `next-env.d.ts` is Git-ignored. |
| Final local checks | `npm run check` PASS: 416 tests in 23 files, including ten real in-memory SQL checks, 21 client-race checks and 33 storage/API checks. Lines 98.98%, statements 98.4%, branches 95.81%, functions 96.17%. |
| Final local build, 15:32 | `npm run build` PASS for all expanded features, including native-community and SQL types. Hosted runtime/auth/database behaviour remains pending. |
| OpenAI live vision | PASS, real `POST /api/analyse`: pothole → `pothole`, capturable, 14.5 seconds; croissant → `not_road`, identified object `croissant`, no capture, 4.6 seconds. Model: `gpt-6.1-terra`. |
| Real UK lookup checks | PASS, six local API cases covering all four nations, Kent county responsibility and `282 Mare Street London`; slowest observed request 5.3 seconds. Suggestions remain approximate. |
| Desktop browser sample journey | PASS for the predefined pothole journey, reviewed report, copy and persistent once-only XP. Detailed scope below. |
| Portrait browser journey and checked accessibility behaviour | PASS at 390 × 844: full capture, temporary empty coordinates without crash, 120 XP/level 2 after two distinct reports, reward focus/scroll, no horizontal/dialog overflow, Escape dismissal and reduced-motion duration. Not a complete accessibility audit. |
| Live file upload and failure recovery | PASS: file upload stayed live with the sample-only checkbox selected; real croissant rejection preserved XP. Simulated HTTP 502 showed retry guidance and allowed a labelled sample fallback. Repeating a photo reopened its original report with zero extra XP. |
| Focused security and quality reviews | Initial three security findings fixed/re-reviewed. Latest power static review found no actionable security finding; the quality review's invalid-date edge case was fixed using `safeParse`. Browser regression pending. No full OWASP scan claimed. |
| Production audit (`npm audit --omit=dev --audit-level=low`) | PASS, zero vulnerabilities. |
| Full audit (`npm audit --audit-level=high`) | PASS at this severity gate; 16 moderate development dependency findings remain. Temporary scoped exception documented in [security notes](docs/security/SECURITY_NOTES.md). |
| Git and GitHub | [Baseline commit `becb8af`](https://github.com/ShabalalaWATP/PotholeKiller/commit/becb8afb71bb04cb94a7cd52d05939c3aeade9b7) pushed to public default branch `feature/hackathon-mvp`; `main` was not written. Expanded source publication is pending. |
| Baseline remote CI | PASS: [Application checks](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934636) and [security workflow](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934625). These predate the power update. |
| GitHub security | CodeQL reported zero alerts. Secret scanning and push protection enabled. These results do not constitute a full OWASP assessment. |
| Baseline hosted preview | PASS at [hackathon preview](https://hackathon--potholekiller-hackney.netlify.app): public GET, config/assets, real croissant rejection and cross-site HTTP 403. It still runs the old build. Expanded deployment/browser/hosted regressions are pending. |
| Hosted shared service | Identity manually enabled at 15:24. Hosted auth was not verified after the earlier blank-URL browser block. Next branch-preview build will provision/stage Netlify Database and committed migration; runtime account/database checks remain pending. |
| Netlify project | Free project `potholekiller-hackney`, ID `4dbe58fd-071d-4c2b-a38c-38fe60c9b402`. Manual preview only; production not published and Git continuous deployment not configured. |
| Baseline video | [Public WebM](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-demo-2026/potholekiller-hackathon.webm) in the [prerelease](https://github.com/ShabalalaWATP/PotholeKiller/releases/tag/hackathon-demo-2026), metadata-verified 47.56 seconds, 1280 × 900 VP9, silent. Real live AI and earlier 60 XP capture. No latest power/lookup/collector footage yet. |
| Team and organiser submission | Alex O, solo. Contact email supplied privately and kept in ignored local submission notes. Organisers have not released their submission link yet. Submission not sent or confirmed. |
| Known-key scan | No configured key found in 78 publishable source files or 42 browser bundle files. `.env.local` remains ignored. This is not a comprehensive secret scan. |

Coverage includes core/API, location, community, the native function and pure client helpers. React components, hooks and browser image utility are excluded. Final measured coverage is lines 98.98%, statements 98.4%, branches 95.81%, functions 96.17%. Provider unit tests use mocks; separate smoke checks provide real API evidence. Ten database checks execute migration/SQL against a test-owned in-memory database, not hosted Postgres.

The experimental profile gives 60 base XP, plus 10/20 for medium/large apparent extent and 10/20/30 at 7/30/90 days since first noticed, capped at 110. Game power is `min(10, 1 + bonus XP / 5)` and changes art at thresholds 4 and 8. Rewards use the stored profile and preparation time, so they do not grow on refresh. Missing legacy profiles default to unknown observations and 60 XP. Fixture map histories are fictional and supplied only to bundled samples; real uploads begin unknown. First-noticed dates are self-reported, not council history or an engineering danger rating. The current feature's browser regression remains pending.

The expanded form offers photo assessment, cracking and small/medium/large pothole choices; cracking earns no size bonus. Address/pin lookup uses Photon, Postcodes.io, the 382-authority official snapshot and GOV.UK transaction routes, with NI DfI handling. Only Hackney has an independently verified direct email. Other contacts use validated official forms/national fallback and the canonical council website, never guessed inboxes. Game is schematic; Streets/Night share OSM tiles, with Night a CSS filter. Close-zoom points remain anchored. GPS is requested only through the explicit button.

Community ownership comes only from SDK server-side `getUser().id`. Eligible signed-in live uploads can receive a 30-minute-valid receipt; per-user normalised-image uniqueness prevents repeated credit. Fresh receipt persistence, retry/preparation-time handling and auth-generation/consent/invalid-callback guards are implemented. Guest/demo/offline captures are not backfilled. Identity is enabled; preview database/migration and hosted sign-in/board verification remain outstanding. See [community setup](docs/COMMUNITY_SETUP.md).

The verified desktop sequence used the bundled pothole with predefined output, continued through the encounter, edited the factual description, entered coordinates and explicitly confirmed the pin, then captured for 60 XP. Recentre did not change the confirmed pin or submit the form. Copying the report worked. Saved data retained the reviewed description, coordinates and demonstration flag; a council email action was absent. Reload retained the capture and 60 XP. The reward heading received focus and the dialog scroll position reset to the top.

Additional browser checks verified real croissant file upload even while the sample-only checkbox was selected, with the live processing/source label and no XP award. A simulated 502 took the user through an explanation to a labelled fallback. A repeat photograph reopened its original record without another award. Portrait testing completed the full capture loop, handled a temporarily blank coordinate field, reached level 2 after a second distinct report and found no horizontal or dialog overflow. Escape closed the dialog; the checked animation duration under reduced motion was 0.00001 seconds.

Fictional sample report forms now use the original schematic with fiction labels. Real-upload forms retain OpenStreetMap and manual verified-coordinate fallback. Origin validation prefers `APP_ORIGIN`, then Netlify's trusted runtime `DEPLOY_PRIME_URL`, then the request URL origin. Local configuration uses `http://127.0.0.1:3000`.

Netlify's free plan rejected per-scope and write-only environment controls with HTTP 403 and an upgrade requirement. No paid upgrade was purchased. With explicit user authorisation, the key was stored using standard account-protected environment storage, and is used only server-side by the application. Native connector writes failed; the authenticated CLI completed configuration. No write-only property is claimed. `.netlify/` is ignored.

Remote builds did not support the alias flag. The verified baseline preview used a Windows manual-packaging workaround: dereferenced package links and official Linux sharp `0.35.5` / libvips package `1.3.4` artifacts with SHA-512 integrity checks, excluding private `.env` files. This is a preview, not production or Git continuous deployment. Trusted `DEPLOY_PRIME_URL` supplies canonical origin unless `APP_ORIGIN` is set. The expanded build is not yet verified there.

Dependency maintenance raised sharp to `^0.35.5` and Vitest plus its coverage package to `4.1.12`. Weekly Dependabot updates and the high-severity audit gate are configured in [dependency updates](.github/dependabot.yml) and [CI](.github/workflows/ci.yml). The linked remote runs above passed; the moderate development-only exception remains visible.

The shared feature adds official `@netlify/identity` 2, `@netlify/database` 2.0.1 and `@netlify/functions` 6.0.3, with database-dev 1.0.1 and pg types 8.23.1 for development checks. Production audit remains zero; 16 moderate development findings remain. The authority directory's MIT notice and [provenance](lib/location/README.md) are retained. The repository instructions now acknowledge optional shared profiles; the original no-auth/no-database scope is superseded for that opt-in feature.

Delivery policy changed at the user's explicit request: skip further CI, CodeQL and unit runs unless vital, and do not wait for pipelines. The already-running full check completed with the 416-test result above. New delivery commits use `[skip ci]`; older green baseline runs do not validate the new commit. The next Netlify build is scoped to `BRANCH=hackathon` / `branch-deploy`, staging the committed database migration for the preview, not production.

An initial attempt to publish `main` was rejected by automatic approval review under a shared-branch assumption. Publication instead created `feature/hackathon-mvp` in the confirmed empty public repository, without writing `main`. Source commit `becb8afb71bb04cb94a7cd52d05939c3aeade9b7` is now public.

## What is original and what is reused

The core application and original game artwork were created for this build. Next.js, React and other dependencies are existing open-source software. The three sample photographs are existing CC0 or public-domain works with provenance in [asset credits](docs/ASSET_CREDITS.md). They are not photographs of the fictional Hackney points.

The original build brief is the scope reference. Implementation choices and remaining work are tracked in [the implementation plan](docs/MASTER_IMPLEMENTATION_PLAN.md) and [development story](docs/DEVELOPMENT_STORY.md). Team details and the public video are recorded. The contact email is supplied privately and kept in ignored local submission notes, outside the public repository. The organisers have not released their form yet; submission and its actual confirmation remain outstanding.
