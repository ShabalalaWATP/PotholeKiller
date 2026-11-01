# Submission materials

**Status: baseline source/video are public. Expanded local checks/build passed; latest hosted/runtime verification and matching footage remain pending. Identity is enabled; preview database/migration and shared auth/board behaviour are unverified. Alex O is solo; contact is private. Organisers have not released their link. Submission has not been sent or confirmed.**

The supplied event brief sets a strict 17:00 London deadline on 1 November 2026, with a target submission time of 16:45. Use the organiser's actual submission route. The event page is [DevDay Exchange Community Hackathon](https://luma.com/dde-ldn-hack); it is not assumed to be the submission form.

## Ready-to-use project text

**Name:** PotholeKiller

**Tagline:** Hunt potholes. Earn XP. Save your streets.

**Description:** PotholeKiller turns road-damage documentation into an original monster-collecting game. Users review visual findings, find a UK address/reporting route, confirm the road pin and prepare a useful draft. Optional type and first-noticed observations power a creature and award 60 to 110 local XP once per photograph, without classifying engineering danger. Guest collectors work locally; optional signed-in shared profiles count eligible new live uploads through server receipts. Shared hosting setup is not yet verified. Fictional samples cannot email councils or increase community scores.

**Meaningful OpenAI use:** The server-side Responses API adapter sends a validated, metadata-stripped image and requests a structured assessment of visible road damage. Zod validates the response, and conservative eligibility rules reject uncertain or unrelated images. Factual observations stay separate from humorous character copy. Predefined sample outputs are visibly labelled.

**Concrete Codex example:** Codex implemented vision/upload protection, reviewed reports, power/duplicate rules, UK authority lookup and server-owned collector profiles. Final local check passed 416 tests in 23 files, including ten real in-memory SQL, 21 client-race and 33 storage/API tests. Coverage: 98.98% lines, 98.4% statements, 95.81% branches, 96.17% functions, excluding React components/hooks/browser image utility. Expanded build passed. Hosted regressions and matching footage remain pending. [Build notes](../CODEX_BUILD_NOTES.md) link evidence. No hosted shared-auth/database success is claimed.

**Original work and credits:** The core application, original creature templates, schematic hunt map and delivery docs were created for this build. Existing open-source dependencies and three existing sample photographs are credited in the [README](../README.md) and [asset credits](ASSET_CREDITS.md).

## Links and required details

| Field | Value or outstanding action |
| --- | --- |
| GitHub | [Public baseline source](https://github.com/ShabalalaWATP/PotholeKiller), commit [`becb8af`](https://github.com/ShabalalaWATP/PotholeKiller/commit/becb8afb71bb04cb94a7cd52d05939c3aeade9b7) on default branch `feature/hackathon-mvp`. Expanded source publication pending; `main` was not written. |
| Setup | [Published README](https://github.com/ShabalalaWATP/PotholeKiller/blob/feature/hackathon-mvp/README.md). |
| Team members | Alex O, solo. |
| Contact | Supplied privately and kept in ignored local submission notes. Do not copy the address into the public repository. |
| Video, maximum 90 seconds | [Baseline video](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-demo-2026/potholekiller-hackathon.webm) in the [prerelease](https://github.com/ShabalalaWATP/PotholeKiller/releases/tag/hackathon-demo-2026): 47.56 seconds, silent 1280 × 900 VP9. Real AI/earlier 60 XP flow, without expanded lookup/collectors. Replacement pending. [Recording notes](DEMO_SCRIPT.md). |
| Working app | [Preview URL](https://hackathon--potholekiller-hackney.netlify.app). Latest expanded deployment/runtime verification pending. Identity enabled at 15:24; preview database/migration and hosted account/board checks pending. No production publication or Git continuous deployment. |
| Organiser form | The organisers have not released the submission link yet, as confirmed by the entrant. Await their actual form. |
| Submission confirmation | Record the real confirmation and time after submitting. |

## Final checks

- [x] Record final 416-test full check, expanded coverage and passing build.
- [x] Record manual Identity enablement at 15:24.
- [ ] Verify latest preview/database migration and hosted sign-in, ownership, opt-in and real shared captures.
- [x] Record the passing desktop predefined-sample journey and production audit; disclose the scoped development dependency exception.
- [x] Record genuine live pothole classification and croissant rejection, plus browser live-upload/fallback and portrait checks.
- [x] Scan publishable source and browser bundles for the configured key, with no match; keep local environment and output directories ignored.
- [x] Publish the intended GitHub content on the public default feature branch.
- [x] Record green application/security CI, zero CodeQL alerts and enabled secret scanning/push protection.
- [ ] Keep API keys, private files, logs and personal details out of source and video.
- [x] Record a real video under 90 seconds and visually inspect a frame.
- [x] Upload the final recording as a public prerelease asset and record its direct link.
- [ ] Verify playback on the intended viewing device and check the viewer/download link without a signed-in session.
- [x] Verify the baseline hosted link, config/assets, real croissant rejection and cross-site upload guard.
- [ ] Publish/verify expanded source/preview and replace the baseline video with matching footage under 90 seconds.
- [x] Record Alex O as the solo team member.
- [x] Receive the contact email privately and keep it in ignored local submission notes.
- [x] Confirm the organisers have not released the submission link yet.
- [ ] Use the organiser form when it is released.
- [ ] Send the organiser form before 17:00 and retain its real confirmation.

A pushed repository, deployed app or completed checklist does not by itself prove entry to the competition. Only the organiser's submission process completes that step.

Delivery now follows the user's request to avoid further CI/CodeQL/unit runs unless vital and not wait on pipelines; new commits use `[skip ci]`. Older green baseline runs do not cover the new commit.
