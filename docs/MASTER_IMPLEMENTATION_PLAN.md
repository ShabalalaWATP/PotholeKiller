# Implementation plan

Build date: 1 November 2026, London. Submission deadline supplied in the event brief: **17:00**. Aim for feature freeze by 16:00 and submission by 16:45, reserving the remaining time for delivery. These are targets, not recorded completion times.

## Milestone and success criteria

Production, screenshots, [public YouTube demo](https://youtu.be/NFl9KuJ_NlU) and official submission are complete. The official UI confirms **Submitted, waiting for judging**. Receipt/status link and contact values remain private. Confirmed-account scoring remains manual follow-up; no automatic council send or verified-repair claim.

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
- [x] Streets/Night real-map styles, clustered close-zoom anchored points and explicit GPS control.
- [x] Report choices for cracking/small/medium/large; cracking has no size bonus.
- [x] Local nickname/avatar, official SDK sign-in UI and opt-in shared profiles/leaderboard code.
- [x] Native community function, owner-bound live receipts and Postgres migration with uniqueness constraints.
- [x] Labelled demo: 60 fictional issues, 75 mock report links, 20 mock users/two fictional inspector flags, twelve OSM road centrelines and six licensed photographs.
- [x] Explicit real-road publication opt-in, default false for legacy records, and owner/canonical-capture proof with manual target links within 100 metres.
- [x] Five-point repair marking and role-weighted one-vote/account rules; credits match first frozen capture XP plus order bonus, up to 170 once/user/issue, with counts unchanged.
- [x] New real hunt confirms road point/address before photo; map-background clicks prefill chooser and existing monsters open issue details/add-own-report.
- [x] Editable reporter name prefilled from nickname, 2 to 80 characters, included in the private council draft and omitted from public road API responses.
- [x] Row-locked once/user/issue order bonuses: first 60, positions 2 to 5 twenty, later five; mock actor reports use the same rules locally.
- [x] Separate persistent local mock repair simulation and demo-league credits; no mock Identity accounts seeded.
- [x] Targeted unit test source and 90% configured domain/API coverage thresholds.
- [x] Focused static security review, three source fixes, re-review and passing relevant unit tests.
- [x] README, Codex evidence, safety/privacy notes and demo/submission scripts.

## Verification and delivery

- [x] Finish dependency installation and retain the generated lockfile.
- [x] Pass baseline `npm run check` with 128 tests, including both origin regressions.
- [x] Pass the 159-test power milestone's full checks/build; retain its coverage as historical evidence only.
- [x] Record the last full pre-repair check: 416 tests/23 files; lines 98.98%, statements 98.4%, branches 95.81%, functions 96.17%. These do not cover the new repair feature.
- [x] Record earlier 15:49 build/types, five rule and six DB/auth/concurrency checks, before newest location/name/order changes.
- [x] Pass latest build/types and core reporting/mock-community browser flows for pushed source `bfa894f`; no new full suite/CI.
- [x] Compile/local-check phone hotfix `317ef76`: 277 × 246 map, pin 138.46/122.64 and six tiles.
- [x] Clean Netlify production retry passed with local servers stopped; deploy/verify `317ef76` as `6ae767a03f094ad44e5a7911`. Prior contention remains suspected, not proven.
- [x] Production 390 × 844 phone map PASS: 275 × 244, pin 137.54/121.82, six tiles.
- [x] Capture/review/link five genuine README screenshots and commit `e9a0b18`, including zoom-19 Mare Street point; link/file check passed.
- [x] Pass six real lookup cases across four nations, Kent county responsibility and Mare Street address search; slowest observed request 5.3 seconds.
- [x] Complete focused static security review of the power update without actionable findings and fix the quality review's invalid-date preview edge case with `safeParse`.
- [x] Record historical full coverage separately from latest focused checks/build.
- [ ] Verify latest lookup, map styles/zoom, GPS permission flow, type choices, power and local profile controls in the browser.
- [x] User manually enabled Identity in the [linked project](https://app.netlify.com/projects/potholekiller-hackney/identity) at 15:24.
- [x] Publish latest preview `6ae7624635873082859af109`; verify page/config/assets, anonymous community/road reads and Hackney postcode lookup.
- [x] Verify sixty mock issues/twenty users, replay without XP, duplicate vote rejection, weighted threshold, 59 active pins and 280 aggregate fixture repair credits.
- [x] Verify pin-first postcode to live own-photo analysis, preserved pin, editable reporter name and named Hackney mailto; email not sent.
- [x] Record the verification limit: no confirmed-account capture/publication/vote end-to-end and no account created during checks.
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
- [x] Latest configured-key scan: no match in 174 source/44 browser files; ZIP private environment files/key matches zero.
- [x] Publish source commit [`becb8af`](https://github.com/ShabalalaWATP/PotholeKiller/commit/becb8afb71bb04cb94a7cd52d05939c3aeade9b7) on `feature/hackathon-mvp`, now GitHub's default branch; leave `main` unwritten.
- [x] Create/link the free Netlify project and configure the key with explicit user consent using standard account-protected environment storage, not write-only storage.
- [x] Verify the public [baseline preview](https://hackathon--potholekiller-hackney.netlify.app) using the Windows manual-packaging workaround, with private environment files excluded.
- [x] Verify latest preview health, mock/real separation and core reporting browser flows.
- [x] Commit/push current source `bfa894f`; intentional CI skip retained.
- [x] Receive explicit production publication approval and pass production build.
- [x] Publish/verify latest production `6ae767a03f094ad44e5a7911` at the main URL: source `317ef76`, phone geometry PASS, root/config/community/road/demo JPEG/Hackney lookup 200 and road-write guards 401/403.
- [x] Record the real silent live-AI demo, verify its 47.56-second media duration and visually inspect a frame; keep the WebM under ignored `output/`.
- [x] Publish the [demo video](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-demo-2026/potholekiller-hackathon.webm) in a public [prerelease](https://github.com/ShabalalaWATP/PotholeKiller/releases/tag/hackathon-demo-2026).
- [x] Publish verified [final narrated MP4](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-final-2026/potholekiller-hackathon-narrated.mp4) and matching SRT: 89.000 seconds, 1280 × 932 H.264/AAC, 9,030,610 bytes; labelled AI/demo footer, optional English captions. Independent audio transcription passed at 192 words/2.08% word error. Keep 47.68-second WebM only as backup.
- [x] Verify public YouTube video `NFl9KuJ_NlU` in Studio and its acceptance on the submission receipt; keep MP4/SRT backups.
- [x] Record the team as Alex O, solo.
- [x] Receive contact email privately and keep it in ignored local submission notes, outside the public repository.
- [x] Receive released [organiser form](https://hack.outpostcrew.co/e/devday-hack-london-49b733) and prepare project/team/contact/profile fields privately; optional Twitter left blank by user choice.
- [x] Submit the entry with the public YouTube URL; official status is **Submitted, waiting for judging**.
- [x] Retain the verified receipt privately; publish no private status URL or contact values.

## Constraints and risks

The authorised expansion uses optional Netlify Identity and Database for collectors. No separate FastAPI service, automatic council messages, engineering danger claims or verified repair status is implemented. A shared physical-defect register and council-accountability metrics remain future work. The schematic cannot locate a real defect.

App, phone fix, screenshots, YouTube/backup media and submission are complete. README changed only in video links. No full suite/CI reran. Official status is **Submitted, waiting for judging**. Receipt/status link and contacts remain private; confirmed-account scoring remains manual follow-up.

Windows packaging used dereferenced links and verified official Linux sharp/libvips artifacts, excluding private `.env` files. Both preview and approved production are now smoke-verified. Production has canonical `APP_ORIGIN` while the preview alias is preserved. No Git continuous deployment is configured.

Initial publication of `main` was rejected by automatic approval review under a shared-branch assumption. The new `feature/hackathon-mvp` branch was then published into the empty public repository and became its default; `main` was not written. Keep the development-only minimatch exception visible in [security notes](security/SECURITY_NOTES.md), weekly dependency review and the high-severity audit gate.

Coverage now includes core/API, location/community, the native function and pure client helpers, excluding React components/hooks/browser image utility. The 416-test measurements are recorded above. Separate real vision/location and baseline browser checks establish specific outcomes, not exhaustive accuracy or accessibility.

At the user's rush-delivery request, skip CI/CodeQL/unit runs unless vital and do not wait for pipelines. New commits use `[skip ci]`; baseline green runs remain historical. Production publication was subsequently explicitly approved and completed.

Completed desktop/portrait checks and the 60 XP video describe the baseline. The new profile uses self-reported observations, not actual defect age, council history or an engineering danger classification. Bonuses are fixed at capture and do not grow on refresh. Fictional map profiles are supplied only to bundled samples; real uploads start unknown.

Drafts/complete photos/report text/email/passwords are not stored in the shared database. Explicit map opt-in now stores public road pins/labels/type/age, alongside private auth IDs, profiles, hashes/receipts, votes, credits and times. Legacy publication defaults false. Receipt validity is 30 minutes, not deletion. See [community setup](COMMUNITY_SETUP.md) and [repair rules](COMMUNITY_REPAIRS.md).

## Future discussion, outside today's scope

Opt-in road records/manual nearby links and weighted community marking are now implemented. Independently verified physical-defect deduplication, authority acknowledgement and engineering repair evidence remain future work. Capture counts remain photo IDs. Mock metrics are explicitly labelled; publish no unsupported council blame. See [roadmap](ROADMAP.md).

See [build notes](../CODEX_BUILD_NOTES.md) for recorded results and [submission materials](SUBMISSION.md) for the final handoff.
