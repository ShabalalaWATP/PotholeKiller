# Submission materials

**Status: submission succeeded. Official UI: Submitted, waiting for judging. The [public YouTube demo](https://youtu.be/NFl9KuJ_NlU) was accepted on the receipt. Production/screenshots/media are complete. Alex O is solo; contact values and the private receipt/status link are not published. Confirmed-account scoring remains manual follow-up.**

The entry was sent through the official [organiser form](https://hack.outpostcrew.co/e/devday-hack-london-49b733), with receipt verified. The private status URL and contact values remain outside public documentation.

## Ready-to-use project text

**Name:** PotholeKiller

**Tagline:** Hunt potholes. Earn XP. Save your streets.

**Description:** PotholeKiller turns road documentation into monster collecting: choose the road point before a real photo, review findings/reporter name and prepare a draft. Capture XP uses self-reported observations; early-report bonuses and matching repair credits encourage participation. Sixty fictional issues/twenty mock collectors demonstrate the loop in a labelled simulation. Latest preview core/mock flows passed; real authenticated profiles/map publication/votes remain unverified. Community-marked fixed does not prove council repair. Samples never email councils or earn real community credit.

**Meaningful OpenAI use:** The server-side Responses API adapter sends a validated, metadata-stripped image and requests a structured assessment of visible road damage. Zod validates the response, and conservative eligibility rules reject uncertain or unrelated images. Factual observations stay separate from humorous character copy. Predefined sample outputs are visibly labelled.

**Concrete Codex example:** Codex implemented vision/upload protection, reviewed reports, lookup, game/community rules and the phone-map fix. Historical 416-test coverage, later focused checks and production/core/mock browser evidence are linked in [build notes](../CODEX_BUILD_NOTES.md). Phone fix is now deployed and verified at 390 × 844; no full suite/CI rerun or confirmed-account scoring end-to-end is claimed.

**Original work and credits:** The application, creature art and docs were created for this build. Existing software, photographs and OSM road geometry retain their source/licence credits in [asset credits](ASSET_CREDITS.md) and [demo data credits](DEMO_DATA_CREDITS.md). Demo issues/users/report links are explicitly fictional and never seed real Identity accounts.

## Links and required details

| Field | Value or outstanding action |
| --- | --- |
| GitHub | [Source repository](https://github.com/ShabalalaWATP/PotholeKiller), default `feature/hackathon-mvp`. Production source `317ef76`; screenshot commit `e9a0b18`. Primary handles final docs/asset/source push; `main` was not written and CI intentionally skipped. |
| Setup | [Published README](https://github.com/ShabalalaWATP/PotholeKiller/blob/feature/hackathon-mvp/README.md). |
| Team members | Alex O, solo. |
| Contact/profile fields | Prepared privately in the form and ignored local notes. No email, WhatsApp or social-profile values belong in public docs. Optional Twitter is blank by user choice. |
| Video, maximum 90 seconds | [89-second narrated MP4 fallback](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-final-2026/potholekiller-hackathon-narrated.mp4), [release](https://github.com/ShabalalaWATP/PotholeKiller/releases/tag/hackathon-final-2026), [English SRT](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-final-2026/potholekiller-hackathon-narrated.srt). Verified 89.000 seconds, 1280 × 932 H.264/AAC, 9,030,610 bytes; AI/demo footer, captions default off. |
| Primary YouTube video | [Public 89-second narrated demo](https://youtu.be/NFl9KuJ_NlU), verified in Studio and accepted on the submission receipt. |
| Backup video | [47.68-second community WebM](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-community-2026/potholekiller-community-demo.webm), retained only as a backup. |
| Working app | [Production PotholeKiller](https://potholekiller-hackney.netlify.app), ready `6ae767a03f094ad44e5a7911` / `317ef76`. Clean build, endpoint smoke/401/403 guards and 390 × 844 phone map verified. |
| Preview and verification limit | [Preview](https://hackathon--potholekiller-hackney.netlify.app) remains available. Core live-photo/named draft and mock repair flows passed. No account created; confirmed-account capture/publication/vote end-to-end remains untested. |
| Organiser form | [Official submission route](https://hack.outpostcrew.co/e/devday-hack-london-49b733). Entry submitted successfully. |
| Submission confirmation | Verified official status: **Submitted, waiting for judging**. Receipt/status link retained privately. |

## Final checks

- [x] Record historical 416-test coverage and earlier five rule/six DB checks/15:49 build separately from newest source changes.
- [x] Verify latest build/types, ready preview, core reporting and mock report/vote/credit browser flows.
- [x] Record manual Identity enablement at 15:24.
- [x] Record profile preview deployment and isolated database/base SQL staging.
- [x] Verify anonymous community/road reads, Hackney postcode route, mock/real separation and named email draft; email not sent.
- [x] Verify ready production, canonical origin, read endpoints, sign-in UI and 401/403 anonymous/cross-origin road-write guards.
- [ ] Optional verification gap: confirmed-account capture/publication/links/votes/credits end-to-end; no account created during checks.
- [x] Record the passing desktop predefined-sample journey and production audit; disclose the scoped development dependency exception.
- [x] Record genuine live pothole classification and croissant rejection, plus browser live-upload/fallback and portrait checks.
- [x] Record no configured-key match in 169 source/44 bundles; deployment ZIP 1,642 entries with zero private environment files/key matches.
- [x] Publish the intended GitHub content on the public default feature branch.
- [x] Record green application/security CI, zero CodeQL alerts and enabled secret scanning/push protection.
- [ ] Keep API keys, private files, logs and personal details out of source and video.
- [x] Record a real video under 90 seconds and visually inspect a frame.
- [x] Upload the final recording as a public prerelease asset and record its direct link.
- [x] Verify final MP4 metadata/audio: 89.000 seconds; -16.03 LUFS/-1.44 dBTP; independent transcription 192 words/2.08% word error. AI/demo footer and optional English captions included.
- [x] Verify the baseline hosted link, config/assets, real croissant rejection and cross-site upload guard.
- [x] Publish current source and verify latest preview core/mock flows.
- [x] Complete approved production deployment and verify readiness at the main URL.
- [x] Publish/verify the 89-second AI-narrated MP4/SRT; keep earlier WebM only as backup.
- [x] Verify public YouTube URL and include it in the accepted submission.
- [x] Complete clean production phone-hotfix build/deploy and verify 275 × 244 modal map, centred pin and six tiles on a 390 × 844 phone viewport.
- [x] Capture/review/link five genuine README screenshots, including zoom-19 road point; commit `e9a0b18`, link/file check passed.
- [x] Record Alex O as the solo team member.
- [x] Receive the contact email privately and keep it in ignored local submission notes.
- [x] Open released organiser form and prepare project/solo-team/contact/profile fields privately; optional Twitter blank.
- [x] Submit the entry and verify **Submitted, waiting for judging**; retain receipt privately.

A pushed repository, deployed app or completed checklist does not by itself prove entry to the competition. Only the organiser's submission process completes that step.

Delivery now follows the user's request to avoid further CI/CodeQL/unit runs unless vital and not wait on pipelines; new commits use `[skip ci]`. Older green baseline runs do not cover the new commit.
