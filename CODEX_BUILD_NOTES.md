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
| Added labelled demo population, opt-in public road records, weighted community repair votes and once-only reporter credits. | [Demo credits](docs/DEMO_DATA_CREDITS.md), [report model](lib/reporting/report.ts), [additive repair migration](netlify/database/migrations/20261101154000_community_repairs.sql), [rules](docs/COMMUNITY_REPAIRS.md). |
| Added road-point confirmation before real photo input, existing-issue details, private reporter name and row-locked early-report bonuses. | [Report model](lib/reporting/report.ts), [repair rules](docs/COMMUNITY_REPAIRS.md). Latest build/types, mock-community and core reporting browser flows passed. |

The test files contain automated checks and mocks. A mocked OpenAI response verifies application behaviour, not live model availability or image-recognition accuracy. No contribution is attributed to a fabricated commit or recording.

## Verification record

| Check | Recorded result |
| --- | --- |
| Lint (`npm run lint`) | PASS. |
| Type checks (`npm run typecheck`) | PASS. Runs `next typegen` before `tsc --noEmit` so clean clones generate route declarations. Generated `next-env.d.ts` is Git-ignored. |
| Last full check, before repairs/demo population | PASS: 416 tests in 23 files, including ten in-memory SQL, 21 client-race and 33 storage/API checks. Lines 98.98%, statements 98.4%, branches 95.81%, functions 96.17%. Historical scope; not coverage of the latest repair feature. |
| Earlier focused checks | Five repair-rule and six database/auth/concurrency checks PASS before the newest location-first/name/order-bonus changes. No further runs, per the user's rush-delivery instruction. |
| Latest build/types | Clean Netlify production build PASS for source `317ef76` after local servers were stopped. No full CI/test suite rerun or new full coverage claimed. |
| Phone map hotfix | DEPLOYED in `6ae767a03f094ad44e5a7911`. Production 390 × 844 check PASS: modal map 275 × 244, centred pin 137.54/121.82 and six tiles. Earlier static-publish failure is resolved by the successful clean retry; process contention remains a suspected cause, not proven. |
| OpenAI live vision | PASS, real `POST /api/analyse`: pothole → `pothole`, capturable, 14.5 seconds; croissant → `not_road`, identified object `croissant`, no capture, 4.6 seconds. Model: `gpt-6.1-terra`. |
| Real UK lookup checks | PASS, six local API cases covering all four nations, Kent county responsibility and `282 Mare Street London`; slowest observed request 5.3 seconds. Suggestions remain approximate. |
| Desktop browser sample journey | PASS for the predefined pothole journey, reviewed report, copy and persistent once-only XP. Detailed scope below. |
| Portrait browser journey and checked accessibility behaviour | PASS at 390 × 844: full capture, temporary empty coordinates without crash, 120 XP/level 2 after two distinct reports, reward focus/scroll, no horizontal/dialog overflow, Escape dismissal and reduced-motion duration. Not a complete accessibility audit. |
| Live file upload and failure recovery | PASS: file upload stayed live with the sample-only checkbox selected; real croissant rejection preserved XP. Simulated HTTP 502 showed retry guidance and allowed a labelled sample fallback. Repeating a photo reopened its original report with zero extra XP. |
| Focused security and quality reviews | Initial findings/date edge case fixed. Latest core/mock browser checks passed; no full OWASP scan or confirmed-account capture end-to-end is claimed. |
| Production audit (`npm audit --omit=dev --audit-level=low`) | PASS, zero vulnerabilities. |
| Full audit (`npm audit --audit-level=high`) | PASS at this severity gate; 16 moderate development dependency findings remain. Temporary scoped exception documented in [security notes](docs/security/SECURITY_NOTES.md). |
| Source and screenshots | Production source `317ef76`; five reviewed/linked README screenshots committed in `e9a0b18`, including zoom-19 Mare Street point. Default branch is `feature/hackathon-mvp`; primary handles final docs commit/push. |
| Baseline remote CI | PASS: [Application checks](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934636) and [security workflow](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934625). These predate the power update. |
| GitHub security | CodeQL reported zero alerts. Secret scanning and push protection enabled. These results do not constitute a full OWASP assessment. |
| Preview delivery | `6ae7624635873082859af109` ready at [preview alias](https://hackathon--potholekiller-hackney.netlify.app). Page/config/assets 200, live available, anonymous community 200, empty road-issues 200 and Hackney postcode/email lookup 200. |
| Latest browser checks | PASS: sixty mock issues/twenty-user league, third report then replay without XP, duplicate role vote unchanged, 3 + 1 + 1 threshold, 59 active pins and 280 aggregate fixture repair credits. Pin-first real upload/live OpenAI/name-edit/Hackney mailto passed; email not sent. |
| Identity verification limit | Production email sign-in form available and local profile saved, without account creation. Anonymous writes 401/cross-origin writes 403. Confirmed-account capture/publication/vote end-to-end remains untested. |
| Production | [Main app](https://potholekiller-hackney.netlify.app) ready, `6ae767a03f094ad44e5a7911` / `317ef76`. Root/config/community/road/demo JPEG/Hackney lookup 200; anonymous road write 401, cross-origin 403. Production origin canonical, preview preserved. |
| Primary video | [Public YouTube demo](https://youtu.be/NFl9KuJ_NlU), verified in Studio and accepted on the submission receipt. [MP4](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-final-2026/potholekiller-hackathon-narrated.mp4)/[SRT](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-final-2026/potholekiller-hackathon-narrated.srt) are download backups. Verified 89.000 seconds, 1280 × 932 H.264/AAC; AI/demo footer and optional English captions. |
| Backup video | Earlier [47.68-second community WebM](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-community-2026/potholekiller-community-demo.webm) is retained only as a backup. |
| Team and organiser submission | Alex O, solo. Submission succeeded; official UI says **Submitted, waiting for judging**. Public YouTube link accepted on receipt. Receipt/status link and contact values remain private. |
| Known-key/bundle scan | No configured key in 174 source files or 44 browser files. Latest deployment ZIP has zero private environment files/key matches. Not a comprehensive secret scan. |

The last full coverage run included core/API, location/community, native function and pure client helpers, excluding React components/hooks/browser image utility. Its 416-test percentages predate the latest repair/demo feature. New repair validation used five rule and six database/auth/concurrency checks plus a passing build/types. No new full coverage is claimed. Provider mocks and in-memory SQL do not prove hosted runtime behaviour.

The profile gives 60 base XP plus extent/first-noticed bonuses, capped at 110, frozen at capture. Game power is `min(10, 1 + bonus XP / 5)`, with art thresholds 4/8. Legacy captures retain 60; fixture histories are fictional and real uploads begin unknown. Dates are self-reported, not council history or engineering danger. Core pin-first/live-photo/named-draft and mock repair browser flows passed.

The form offers assessment/cracking/small/medium/large choices; cracking adds no size bonus. UK lookup uses Photon, Postcodes.io, official directory/transaction routes and NI DfI. Only Hackney has a verified direct email; no inboxes are guessed. Current real-map styles are Streets/Night, with Night filtering the same OSM tiles. Clusters expand with zoom around precise dots. GPS is explicit only.

The new default demo has 60 fictional issues, 75 mock report links and 20 mock users, two with fictional inspector flags. Twelve real Hackney road centrelines and six licensed, metadata-stripped photographs are documented in [credits](docs/DEMO_DATA_CREDITS.md). Mock league/repair state is local and distinct from real Identity/community data; no mock accounts are seeded.

Real map publication defaults off. Capture proof gates public metadata/manual links within 100 metres. Five weighted points mark community-fixed, one vote/account with weights 1/3. Order bonuses are first 60, positions 2 to 5 twenty, later five, once/user/issue. Repair credit matches first frozen capture XP plus order bonus, up to 170, without another capture count. The local mock scenario passed its replay/vote/repair browser checks; real authenticated writes remain unverified. See [repair rules](docs/COMMUNITY_REPAIRS.md).

Community ownership comes only from SDK server-side `getUser().id`. Eligible signed-in live uploads can receive a 30-minute-valid receipt; per-user normalised-image uniqueness prevents repeated credit. Fresh receipt persistence, retry/preparation-time handling and auth-generation/consent/invalid-callback guards are implemented. Guest/demo/offline captures are not backfilled. Identity is enabled; preview database/migration and hosted sign-in/board verification remain outstanding. See [community setup](docs/COMMUNITY_SETUP.md).

The verified desktop sequence used the bundled pothole with predefined output, continued through the encounter, edited the factual description, entered coordinates and explicitly confirmed the pin, then captured for 60 XP. Recentre did not change the confirmed pin or submit the form. Copying the report worked. Saved data retained the reviewed description, coordinates and demonstration flag; a council email action was absent. Reload retained the capture and 60 XP. The reward heading received focus and the dialog scroll position reset to the top.

Additional browser checks verified real croissant file upload even while the sample-only checkbox was selected, with the live processing/source label and no XP award. A simulated 502 took the user through an explanation to a labelled fallback. A repeat photograph reopened its original record without another award. Portrait testing completed the full capture loop, handled a temporarily blank coordinate field, reached level 2 after a second distinct report and found no horizontal or dialog overflow. Escape closed the dialog; the checked animation duration under reduced motion was 0.00001 seconds.

Fictional sample report forms now use the original schematic with fiction labels. Real-upload forms retain OpenStreetMap and manual verified-coordinate fallback. Origin validation prefers `APP_ORIGIN`, then Netlify's trusted runtime `DEPLOY_PRIME_URL`, then the request URL origin. Local configuration uses `http://127.0.0.1:3000`.

Netlify's free plan rejected per-scope and write-only environment controls with HTTP 403 and an upgrade requirement. No paid upgrade was purchased. With explicit user authorisation, the key was stored using standard account-protected environment storage, and is used only server-side by the application. Native connector writes failed; the authenticated CLI completed configuration. No write-only property is claimed. `.netlify/` is ignored.

The original Windows workaround dereferenced package links and bundled official Linux sharp `0.35.5` / libvips package `1.3.4` with SHA-512 checks, excluding private `.env` files. Preview and approved production are now deployed and smoke-verified. Production `APP_ORIGIN` is canonical while the preview alias remains intact. Deployments are manual, without Git continuous deployment.

Dependency maintenance raised sharp to `^0.35.5` and Vitest plus its coverage package to `4.1.12`. Weekly Dependabot updates and the high-severity audit gate are configured in [dependency updates](.github/dependabot.yml) and [CI](.github/workflows/ci.yml). The linked remote runs above passed; the moderate development-only exception remains visible.

The shared feature adds official `@netlify/identity` 2, `@netlify/database` 2.0.1 and `@netlify/functions` 6.0.3, with database-dev 1.0.1 and pg types 8.23.1 for development checks. Production audit remains zero; 16 moderate development findings remain. The authority directory's MIT notice and [provenance](lib/location/README.md) are retained. The repository instructions now acknowledge optional shared profiles; the original no-auth/no-database scope is superseded for that opt-in feature.

App, media and official submission are complete. The [public YouTube demo](https://youtu.be/NFl9KuJ_NlU) was accepted on the receipt; official status is **Submitted, waiting for judging**. Receipt/status link and contact values stay private. Historical coverage and confirmed-account manual verification limits remain unchanged; no new CI/tests were run.

An initial attempt to publish `main` was rejected by automatic approval review under a shared-branch assumption. Publication instead created `feature/hackathon-mvp` in the confirmed empty public repository, without writing `main`. Source commit `becb8afb71bb04cb94a7cd52d05939c3aeade9b7` is now public.

## What is original and what is reused

The core application and original game artwork were created for this build. Next.js, React and other dependencies are existing open-source software. The three sample photographs are existing CC0 or public-domain works with provenance in [asset credits](docs/ASSET_CREDITS.md). They are not photographs of the fictional Hackney points.

The [plan](docs/MASTER_IMPLEMENTATION_PLAN.md) and [story](docs/DEVELOPMENT_STORY.md) record completed delivery. YouTube is the primary demo; MP4/SRT remain backups. Submission is confirmed and waiting for judging; private receipt/status and contact details are not published.
