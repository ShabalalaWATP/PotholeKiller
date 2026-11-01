# Submission materials

**Status: baseline source/video are public. Latest 15:49 build/types and focused repair checks passed; 416-test coverage is historical. Profile preview `6ae75c622086dbea5bf72fdc` deployed with isolated DB/base SQL staged, but runtime health is unchecked and repair preview is next. Identity is enabled; canonical callback needs production approval after preview verification. Alex O is solo, contact private, organisers' link unreleased and submission unsent.**

The supplied event brief sets a strict 17:00 London deadline on 1 November 2026, with a target submission time of 16:45. Use the organiser's actual submission route. The event page is [DevDay Exchange Community Hackathon](https://luma.com/dde-ldn-hack); it is not assumed to be the submission form.

## Ready-to-use project text

**Name:** PotholeKiller

**Tagline:** Hunt potholes. Earn XP. Save your streets.

**Description:** PotholeKiller turns road documentation into monster collecting: review visible findings, find a UK route, confirm the pin and prepare a draft. Capture rewards are 60 to 110 XP from self-reported observations. A labelled world of sixty fictional issues and twenty mock collectors demonstrates the loop. Optional real profiles support explicit public-road opt-in and weighted community repair marking, with once-only reporter credits. Community-marked fixed is not proof of council repair. Hosted runtime remains unverified; samples cannot email councils or earn real community credit.

**Meaningful OpenAI use:** The server-side Responses API adapter sends a validated, metadata-stripped image and requests a structured assessment of visible road damage. Zod validates the response, and conservative eligibility rules reject uncertain or unrelated images. Factual observations stay separate from humorous character copy. Predefined sample outputs are visibly labelled.

**Concrete Codex example:** Codex implemented vision/upload protection, reviewed reports, UK lookup, power, shared collectors and opt-in road/repair rules. The last full pre-repair check passed 416 tests: 98.98% lines, 98.4% statements, 95.81% branches, 96.17% functions, excluding React components/hooks/browser image utility. Latest repair work passed five vital rule and six database/auth/concurrency checks plus the 15:49 build/types. No new full coverage is claimed. [Build notes](../CODEX_BUILD_NOTES.md) link evidence; latest hosted regressions/footage remain pending.

**Original work and credits:** The application, creature art and docs were created for this build. Existing software, photographs and OSM road geometry retain their source/licence credits in [asset credits](ASSET_CREDITS.md) and [demo data credits](DEMO_DATA_CREDITS.md). Demo issues/users/report links are explicitly fictional and never seed real Identity accounts.

## Links and required details

| Field | Value or outstanding action |
| --- | --- |
| GitHub | [Public baseline source](https://github.com/ShabalalaWATP/PotholeKiller), commit [`becb8af`](https://github.com/ShabalalaWATP/PotholeKiller/commit/becb8afb71bb04cb94a7cd52d05939c3aeade9b7) on default branch `feature/hackathon-mvp`. Expanded source publication pending; `main` was not written. |
| Setup | [Published README](https://github.com/ShabalalaWATP/PotholeKiller/blob/feature/hackathon-mvp/README.md). |
| Team members | Alex O, solo. |
| Contact | Supplied privately and kept in ignored local submission notes. Do not copy the address into the public repository. |
| Video, maximum 90 seconds | [Baseline video](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-demo-2026/potholekiller-hackathon.webm) in the [prerelease](https://github.com/ShabalalaWATP/PotholeKiller/releases/tag/hackathon-demo-2026): 47.56 seconds, silent 1280 × 900 VP9. Real AI/earlier 60 XP flow, without expanded lookup/collectors. Replacement pending. [Recording notes](DEMO_SCRIPT.md). |
| Working app | [Preview alias](https://hackathon--potholekiller-hackney.netlify.app). Profile deployment `6ae75c622086dbea5bf72fdc` completed; runtime health unchecked. Isolated hackathon DB/base SQL staged; repair preview/additive SQL and hosted checks pending. No production publication or Git continuous deployment. |
| Organiser form | The organisers have not released the submission link yet, as confirmed by the entrant. Await their actual form. |
| Submission confirmation | Record the real confirmation and time after submitting. |

## Final checks

- [x] Record historical 416-test full coverage separately from latest five rule/six DB checks and 15:49 build/types.
- [x] Record manual Identity enablement at 15:24.
- [x] Record profile preview deployment and isolated database/base SQL staging.
- [ ] Verify repair preview/schema, hosted auth, map opt-in, manual links, weighted votes, credits and mock/real separation.
- [x] Record the passing desktop predefined-sample journey and production audit; disclose the scoped development dependency exception.
- [x] Record genuine live pothole classification and croissant rejection, plus browser live-upload/fallback and portrait checks.
- [x] Record no configured-key match in 166 source files/44 bundles; keep private environment/output ignored.
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
