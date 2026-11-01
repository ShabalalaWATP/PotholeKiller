# Implementation plan

Build date: 1 November 2026, London. Submission deadline supplied in the event brief: **17:00**. Aim for feature freeze by 16:00 and submission by 16:45, reserving the remaining time for delivery. These are targets, not recorded completion times.

## Milestone and success criteria

Deliver the reviewed guest journey with UK lookup/maps, type choices and fixed capture rewards of 60 to 110 XP. Optional shared collectors add Identity and database-backed scores. Local checks/build are complete and source is frozen. Latest hosted runtime/database verification and matching footage remain. No automatic council submission is in scope.

## Implemented in source

- [x] Next.js, React, TypeScript and Tailwind application with local development scripts.
- [x] Original creature artwork and illustrated hunt map with fictional markers.
- [x] Photo input, three licensed samples and explicitly labelled example outputs.
- [x] Server-only OpenAI Responses API adapter and structured validation.
- [x] Classification gates, generic rejection and conditional croissant joke.
- [x] Editable description, map pin and explicit review confirmations.
- [x] Draft generation, copy, supported email handoff and official-route links.
- [x] Demo email/status guard and honest report status vocabulary.
- [x] Local PotholeDex, deterministic progression and photograph-based XP guard.
- [x] Experimental profile, validated first-noticed date, extent/age bonuses and legacy 60 XP defaults.
- [x] P1/P5/P7/P10 fictional map histories and power-dependent horns, armour and aura.
- [x] UK full-address/postcode/pin lookup, county/unitary/NI routing and independently verified contact safeguards.
- [x] Game/Streets/Night map styles, close-zoom anchored points and explicit GPS control.
- [x] Report choices for cracking/small/medium/large; cracking has no size bonus.
- [x] Local nickname/avatar, official SDK sign-in UI and opt-in shared profiles/leaderboard code.
- [x] Native community function, owner-bound live receipts and Postgres migration with uniqueness constraints.
- [x] Targeted unit test source and 90% configured domain/API coverage thresholds.
- [x] Focused static security review, three source fixes, re-review and passing relevant unit tests.
- [x] README, Codex evidence, safety/privacy notes and demo/submission scripts.

## Verification and delivery

- [x] Finish dependency installation and retain the generated lockfile.
- [x] Pass baseline `npm run check` with 128 tests, including both origin regressions.
- [x] Pass the 159-test power milestone's full checks/build; retain its coverage as historical evidence only.
- [x] Pass final `npm run check`: 416 tests in 23 files, including ten real in-memory SQL, 21 client-race and 33 storage/API checks. Coverage: lines 98.98%, statements 98.4%, branches 95.81%, functions 96.17%.
- [x] Pass expanded `npm run build` with native-community/SQL types at 15:32; freeze source and resolve all P2 findings.
- [x] Pass six real lookup cases across four nations, Kent county responsibility and Mare Street address search; slowest observed request 5.3 seconds.
- [x] Complete focused static security review of the power update without actionable findings and fix the quality review's invalid-date preview edge case with `safeParse`.
- [x] Record final expanded-scope coverage/build results.
- [ ] Verify latest lookup, map styles/zoom, GPS permission flow, type choices, power and local profile controls in the browser.
- [x] User manually enabled Identity in the [linked project](https://app.netlify.com/projects/potholekiller-hackney/identity) at 15:24.
- [ ] Run the next `hackathon` branch-preview build to provision/stage Netlify Database and the committed collector migration; verify actual hosted database behaviour.
- [ ] Verify hosted account/session, public opt-in/out, new live capture claims and shared board behaviour.
- [x] Run `next typegen` before TypeScript checks for clean-clone route declarations and ignore generated `next-env.d.ts`.
- [x] Pass the baseline Next.js 16.4.3 production build with native-worker process permissions.
- [x] Verify baseline hosted startup, config, assets, real croissant rejection and cross-site HTTP 403.
- [x] Verify model metadata access for `gpt-6.1-terra` (HTTP 200); this does not prove image analysis.
- [x] Complete genuine OpenAI POST checks: capturable pothole in 14.5 seconds and croissant rejection in 4.6 seconds.
- [x] Add opt-in `npm run test:live`; it requires the running local server and makes two paid requests, never CI requests.
- [x] Verify the desktop predefined pothole journey, edited facts, explicit pin confirmation, copy, demo guard and persistence with 60 XP.
- [x] Verify reward-heading focus and top scroll position; recentre does not change the confirmed pin or submit the form.
- [x] Verify the 390 × 844 capture loop, empty-coordinate handling, level 2 after two distinct captures and absence of horizontal/dialog overflow.
- [x] Verify Escape dismissal, reward focus/scroll and reduced-motion animation duration.
- [x] Verify a real croissant upload remains live with the sample-only checkbox selected and earns no XP.
- [x] Verify simulated API 502 recovery to a labelled fallback and repeat-photo reopening with zero extra XP.
- [x] Use the labelled local schematic for fictional sample report forms; keep OSM/manual verified coordinates for real uploads.
- [ ] Verify deliberate OSM tile failure, clipboard failure fallback and remaining accessibility behaviour.
- [x] Record zero production audit vulnerabilities and a passing full high-severity gate, with 16 moderate development-only findings under a scoped exception.
- [x] Configure weekly Dependabot updates and pass baseline [application CI](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934636) and [security CI](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934625); these predate the power update.
- [x] Record zero CodeQL alerts and enabled secret scanning/push protection.
- [x] Create foundation commit `f6da0b8` and verify the intended empty public repository before publication.
- [x] Scan 78 publishable source files and 42 browser bundle files for the configured key, with no match; keep `.env.local` ignored.
- [x] Publish source commit [`becb8af`](https://github.com/ShabalalaWATP/PotholeKiller/commit/becb8afb71bb04cb94a7cd52d05939c3aeade9b7) on `feature/hackathon-mvp`, now GitHub's default branch; leave `main` unwritten.
- [x] Create/link the free Netlify project and configure the key with explicit user consent using standard account-protected environment storage, not write-only storage.
- [x] Verify the public [baseline preview](https://hackathon--potholekiller-hackney.netlify.app) using the Windows manual-packaging workaround, with private environment files excluded.
- [ ] Deploy the expanded build and verify the updated public preview; it currently runs the old baseline.
- [ ] Publish expanded source and record its own remote CI results.
- [x] Record the real silent live-AI demo, verify its 47.56-second media duration and visually inspect a frame; keep the WebM under ignored `output/`.
- [x] Publish the [demo video](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-demo-2026/potholekiller-hackathon.webm) in a public [prerelease](https://github.com/ShabalalaWATP/PotholeKiller/releases/tag/hackathon-demo-2026).
- [ ] Record/publish matching footage under 90 seconds; the current 47.56-second video shows the earlier 60 XP flow, without latest lookup or collectors.
- [x] Record the team as Alex O, solo.
- [x] Receive contact email privately and keep it in ignored local submission notes, outside the public repository.
- [x] Confirm the organisers have not released their submission link yet.
- [ ] Complete the organiser's form when released, aiming to meet the stated 17:00 deadline.
- [ ] Verify the submitted links and retain the organiser's actual confirmation.

## Constraints and risks

The authorised expansion uses optional Netlify Identity and Database for collectors. No separate FastAPI service, automatic council messages, engineering danger claims or verified repair status is implemented. A shared physical-defect register and council-accountability metrics remain future work. The schematic cannot locate a real defect.

Latest deployment, database/migration runtime verification, hosted auth/board checks and replacement footage are pending. Identity is enabled. Alex O is solo; contact is private, organisers have not released the submission link, and submission is unsent. Explicit `APP_ORIGIN` is preferred locally; trusted `DEPLOY_PRIME_URL` supplies preview origin. Per-process limits are not a shared spending ceiling.

Baseline Windows packaging used dereferenced package links and official Linux sharp `0.35.5` / libvips package `1.3.4` artifacts with SHA-512 verification, excluding private `.env` files. This is a manual preview; production is not published and Git continuous deployment is not configured. Do not apply the baseline smoke result to the unfinished power deployment.

Initial publication of `main` was rejected by automatic approval review under a shared-branch assumption. The new `feature/hackathon-mvp` branch was then published into the empty public repository and became its default; `main` was not written. Keep the development-only minimatch exception visible in [security notes](security/SECURITY_NOTES.md), weekly dependency review and the high-severity audit gate.

Coverage now includes core/API, location/community, the native function and pure client helpers, excluding React components/hooks/browser image utility. The 416-test measurements are recorded above. Separate real vision/location and baseline browser checks establish specific outcomes, not exhaustive accuracy or accessibility.

At the user's explicit rush-delivery request, skip further CI/CodeQL/unit runs unless vital and do not wait for pipelines. New commits use `[skip ci]`. Baseline green runs remain historical evidence, not validation of the new commit. Deliver the branch preview, not production.

Completed desktop/portrait checks and the 60 XP video describe the baseline. The new profile uses self-reported observations, not actual defect age, council history or an engineering danger classification. Bonuses are fixed at capture and do not grow on refresh. Fictional map profiles are supplied only to bundled samples; real uploads start unknown.

The browser retains drafts/coordinates without photos. Identity SDK vendor storage can include tokens/email; game profile storage does not duplicate them. Shared database rows contain private auth IDs, game fields, hashes/receipts, times and XP, not photos/coordinates/report text/email/passwords. Receipt validity is 30 minutes; expired rows are not automatically deleted. See [community setup](COMMUNITY_SETUP.md).

## Future discussion, outside today's scope

Explore **Britain's Most Wanted Potholes** as a physical-defect register with separate resident reports and evidenced authority history. This remains distinct from the implemented collector board, whose counts are per-user eligible images, not independently unique potholes or verified submissions. Publish no invented metrics or unsupported council blame. See [roadmap](ROADMAP.md).

See [build notes](../CODEX_BUILD_NOTES.md) for recorded results and [submission materials](SUBMISSION.md) for the final handoff.
