# Implementation plan

Build date: 1 November 2026, London. Submission deadline supplied in the event brief: **17:00**. Aim for feature freeze by 16:00 and submission by 16:45, reserving the remaining time for delivery. These are targets, not recorded completion times.

## Milestone and success criteria

Deliver one usable journey: hunt, scan, encounter, review facts and a confirmed location, prepare a useful draft, award 60 XP once and reopen the record. A live provider check, passing local checks, browser verification and honest delivery materials are required before declaring the milestone complete.

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
- [x] Targeted unit test source and 90% configured domain/API coverage thresholds.
- [x] Focused static security review, three source fixes, re-review and passing relevant unit tests.
- [x] README, Codex evidence, safety/privacy notes and demo/submission scripts.

## Verification and delivery

- [x] Finish dependency installation and retain the generated lockfile.
- [x] Pass final `npm run check` with 128 tests including both origin regressions; record coverage: lines 99.05%, statements 98.29%, branches 97.22%, functions 95.23%.
- [x] Run `next typegen` before TypeScript checks for clean-clone route declarations and ignore generated `next-env.d.ts`.
- [x] Pass the Next.js 16.4.3 production build with native-worker process permissions.
- [ ] Verify production startup separately from the build.
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
- [x] Configure weekly Dependabot updates and CI checks; remote CI has not run yet.
- [x] Create local foundation commit `f6da0b8` on `feature/hackathon-mvp` and verify the intended GitHub repository is public and empty.
- [x] Scan 78 publishable source files and 42 browser bundle files for the configured key, with no match; keep `.env.local` ignored.
- [ ] Commit the completed application and publish it to the specified GitHub repository.
- [x] Create/link the free Netlify project and configure the key with explicit user consent using standard account-protected environment storage, not write-only storage.
- [ ] Deploy the application and verify its actual public preview link.
- [x] Record the real silent live-AI demo, verify its 47.56-second media duration and visually inspect a frame; keep the WebM under ignored `output/`.
- [ ] Publish the recording and verify a publicly accessible video link.
- [ ] Add team/contact details, find the organiser's form and submit before 17:00.
- [ ] Verify the submitted links and retain the organiser's actual confirmation.

## Constraints and risks

No authentication, database, automatic council sending, engineering severity claims or verified repair status is in scope. No new multiplayer, payments or leaderboard work before delivery. The schematic map cannot locate a real defect.

Public hosting, a public video link, team/contact details and the organiser submission route require actual confirmation. Explicit `APP_ORIGIN` is preferred, including `http://127.0.0.1:3000` locally; Netlify's trusted `DEPLOY_PRIME_URL` is the next fallback for its preview URLs. Per-process request limits cannot enforce a shared spending cap on multiple server instances. Configure provider spending controls, an upstream hard stop and platform limits before opening a high-traffic public demo.

Use the preview URL returned by the remote Netlify build; its alias flag is unsupported. Do not declare deployment complete until the returned application URL works.

Initial publication of `main` was rejected by automatic approval review under a shared-branch assumption; no push completed. Publish a new `feature/hackathon-mvp` branch into the confirmed empty public repository without mutating `main`. Keep the development-only minimatch exception visible in [security notes](security/SECURITY_NOTES.md), weekly dependency review and the high-severity audit gate.

Measured unit coverage excludes React components, browser hooks and client-side image handling. Separate browser and real-provider smoke checks establish the specific outcomes recorded above; they are not exhaustive accuracy or accessibility assessments.

The browser stores report fields and confirmed coordinates, but no photos. Users must avoid entering personal details. Local duplicate detection is byte based and browser local, not proof of a unique real-world defect.

See [build notes](../CODEX_BUILD_NOTES.md) for recorded results and [submission materials](SUBMISSION.md) for the final handoff.
