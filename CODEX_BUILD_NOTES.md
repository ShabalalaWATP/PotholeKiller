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

The test files contain automated checks and mocks. A mocked OpenAI response verifies application behaviour, not live model availability or image-recognition accuracy. No contribution is attributed to a fabricated commit or recording.

## Verification record

| Check | Recorded result |
| --- | --- |
| Lint (`npm run lint`) | PASS. |
| Type checks (`npm run typecheck`) | PASS. Runs `next typegen` before `tsc --noEmit` so clean clones generate route declarations. Generated `next-env.d.ts` is Git-ignored. |
| Final local checks (`npm run check`) | PASS, 128 tests including both origin regressions. Lines 99.05%, statements 98.29%, branches 97.22%, functions 95.23%. |
| Production build (`npm run build`) | PASS, Next.js 16.4.3. Native workers required escalated process permissions; the first sandbox run stalled and was not counted as a pass. |
| OpenAI live vision | PASS, real `POST /api/analyse`: pothole → `pothole`, capturable, 14.5 seconds; croissant → `not_road`, identified object `croissant`, no capture, 4.6 seconds. Model: `gpt-6.1-terra`. |
| Desktop browser sample journey | PASS for the predefined pothole journey, reviewed report, copy and persistent once-only XP. Detailed scope below. |
| Portrait browser journey and checked accessibility behaviour | PASS at 390 × 844: full capture, temporary empty coordinates without crash, 120 XP/level 2 after two distinct reports, reward focus/scroll, no horizontal/dialog overflow, Escape dismissal and reduced-motion duration. Not a complete accessibility audit. |
| Live file upload and failure recovery | PASS: file upload stayed live with the sample-only checkbox selected; real croissant rejection preserved XP. Simulated HTTP 502 showed retry guidance and allowed a labelled sample fallback. Repeating a photo reopened its original report with zero extra XP. |
| Focused security review | Three source findings fixed and re-reviewed, with no residual finding in the reviewed scope. Relevant unit tests now pass. No full OWASP scan is claimed. |
| Production audit (`npm audit --omit=dev --audit-level=low`) | PASS, zero vulnerabilities. |
| Full audit (`npm audit --audit-level=high`) | PASS at this severity gate; 16 moderate development dependency findings remain. Temporary scoped exception documented in [security notes](docs/security/SECURITY_NOTES.md). |
| Git and GitHub | Local foundation commit `f6da0b8` on `feature/hackathon-mvp`; application push not completed. The specified remote repository was verified public and empty, with administrator access. |
| Netlify preparation | Free project `potholekiller-hackney` created and linked; ID `4dbe58fd-071d-4c2b-a38c-38fe60c9b402`. Environment setup completed with the user's cloud-specific consent. No application deployment yet. |
| Local demo recording | Created: `output/playwright/potholekiller-hackathon.webm`, metadata-verified duration 47.56 seconds, 1280 × 900, VP9, silent. Shows real live pothole and croissant analysis plus capture. A frame was visually checked. Ignored local output only; no public video link. |
| Organiser submission | Not completed or confirmed. |
| Known-key scan | No configured key found in 78 publishable source files or 42 browser bundle files. `.env.local` remains ignored. This is not a comprehensive secret scan. |

Coverage applies to the configured API, AI, security, game and reporting modules. It excludes React components, browser hooks and client-side image handling. The passing unit suite uses mocks for provider interactions, not a live image-recognition test.

The verified desktop sequence used the bundled pothole with predefined output, continued through the encounter, edited the factual description, entered coordinates and explicitly confirmed the pin, then captured for 60 XP. Recentre did not change the confirmed pin or submit the form. Copying the report worked. Saved data retained the reviewed description, coordinates and demonstration flag; a council email action was absent. Reload retained the capture and 60 XP. The reward heading received focus and the dialog scroll position reset to the top.

Additional browser checks verified real croissant file upload even while the sample-only checkbox was selected, with the live processing/source label and no XP award. A simulated 502 took the user through an explanation to a labelled fallback. A repeat photograph reopened its original record without another award. Portrait testing completed the full capture loop, handled a temporarily blank coordinate field, reached level 2 after a second distinct report and found no horizontal or dialog overflow. Escape closed the dialog; the checked animation duration under reduced motion was 0.00001 seconds.

Fictional sample report forms now use the original schematic with fiction labels. Real-upload forms retain OpenStreetMap and manual verified-coordinate fallback. Origin validation prefers `APP_ORIGIN`, then Netlify's trusted runtime `DEPLOY_PRIME_URL`, then the request URL origin. Local configuration uses `http://127.0.0.1:3000`.

Netlify's free plan rejected per-scope and write-only environment controls with HTTP 403 and an upgrade requirement. No paid upgrade was purchased. With explicit user authorisation, the key was stored using standard account-protected environment storage, and is used only server-side by the application. Native connector writes failed; the authenticated CLI completed configuration. No write-only property is claimed. `.netlify/` is ignored.

Remote builds do not support the alias flag. Deployment will use the returned Netlify preview URL, with canonical origin supplied by trusted `DEPLOY_PRIME_URL` unless `APP_ORIGIN` is explicitly set. Hosting remains pending; a planned or provisioned URL is not a verified running application.

Dependency maintenance raised sharp to `^0.35.5` and Vitest plus its coverage package to `4.1.12`. Weekly Dependabot updates and the high-severity audit gate are configured in [dependency updates](.github/dependabot.yml) and [CI](.github/workflows/ci.yml). Workflow configuration is not evidence of a completed remote CI run.

An initial attempt to publish `main` was rejected by automatic approval review under a shared-branch assumption. No push completed. The publication plan creates the new `feature/hackathon-mvp` branch in the confirmed empty public repository, avoiding a mutation of `main`. Local preparation does not imply the application is already available on GitHub.

## What is original and what is reused

The core application and original game artwork were created for this build. Next.js, React and other dependencies are existing open-source software. The three sample photographs are existing CC0 or public-domain works with provenance in [asset credits](docs/ASSET_CREDITS.md). They are not photographs of the fictional Hackney points.

The original build brief is the scope reference. Implementation choices and remaining work are tracked in [the implementation plan](docs/MASTER_IMPLEMENTATION_PLAN.md) and [development story](docs/DEVELOPMENT_STORY.md). Team details, video and the organiser's submission route must be supplied before claiming a completed submission.
