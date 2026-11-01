# Submission materials

**Status: no organiser submission or acceptance is recorded. A real local recording exists; public application, repository content and video links remain pending.**

The supplied event brief sets a strict 17:00 London deadline on 1 November 2026, with a target submission time of 16:45. Use the organiser's actual submission route. The event page is [DevDay Exchange Community Hackathon](https://luma.com/dde-ldn-hack); it is not assumed to be the submission form.

## Ready-to-use project text

**Name:** PotholeKiller

**Tagline:** Hunt potholes. Earn XP. Save your streets.

**Description:** PotholeKiller turns the chore of documenting road damage into an original monster-collecting game. A user photographs a suspected defect, reviews a structured visual assessment, confirms a map pin and prepares a useful report draft. Completing the reviewed journey earns 60 XP once per photograph in the local PotholeDex. The Hackney pilot offers an official reporting route after the user checks road ownership. Fictional sample reports cannot be emailed to a council.

**Meaningful OpenAI use:** The server-side Responses API adapter sends a validated, metadata-stripped image and requests a structured assessment of visible road damage. Zod validates the response, and conservative eligibility rules reject uncertain or unrelated images. Factual observations stay separate from humorous character copy. Predefined sample outputs are visibly labelled.

**Concrete Codex example:** Codex implemented the structured vision endpoint, image-upload protections, human-reviewed report generation and once-only local XP rules. Final `npm run check` passed with 128 tests, including both origin regressions; the production build also passed. Core/API coverage measured 99.05% lines, 98.29% statements, 97.22% branches and 95.23% functions, excluding React components, browser hooks and client-side image code. Real live pothole classification and croissant rejection passed, alongside desktop and portrait browser journeys. [Codex build notes](../CODEX_BUILD_NOTES.md) link the implementation, tests and exact verification scope.

**Original work and credits:** The core application, original creature templates, schematic hunt map and delivery docs were created for this build. Existing open-source dependencies and three existing sample photographs are credited in the [README](../README.md) and [asset credits](ASSET_CREDITS.md).

## Links and required details

| Field | Value or outstanding action |
| --- | --- |
| GitHub | [ShabalalaWATP/PotholeKiller](https://github.com/ShabalalaWATP/PotholeKiller), verified public and empty. Local foundation commit `f6da0b8` exists on `feature/hackathon-mvp`; the completed application still needs publishing and a public-read check. |
| Setup | [README](../README.md). Verify it is available on the submitted GitHub branch. |
| Team members | Required from the team; not supplied in this document. |
| Contact | Required from the team; no address or telephone number has been invented. |
| Video, maximum 90 seconds | Real local silent WebM created: `output/playwright/potholekiller-hackathon.webm`, metadata-verified 47.56 seconds, 1280 × 900 VP9. Shows live pothole/croissant analysis and capture; a frame was visually checked. Upload and a verified accessible viewer link are still required. [Recording notes](DEMO_SCRIPT.md). |
| Working app | Free Netlify project created and linked; application deployment and a verified public URL are still pending. |
| Organiser form | Locate the route provided by organisers; not yet recorded. |
| Submission confirmation | Record the real confirmation and time after submitting. |

## Final checks

- [x] Record passing `npm run check`, 128 tests, measured coverage and `npm run build` in the build notes.
- [x] Record the passing desktop predefined-sample journey and production audit; disclose the scoped development dependency exception.
- [x] Record genuine live pothole classification and croissant rejection, plus browser live-upload/fallback and portrait checks.
- [x] Scan publishable source and browser bundles for the configured key, with no match; keep local environment and output directories ignored.
- [ ] Verify the intended GitHub content is public and opens without an access request.
- [ ] Keep API keys, private files, logs and personal details out of source and video.
- [x] Record a real video under 90 seconds and visually inspect a frame.
- [ ] Upload the recording, verify playback and open the viewer link signed out.
- [ ] Verify any hosted app link and its labelled sample fallback.
- [ ] Fill in the real team and contact details.
- [ ] Send the organiser form before 17:00 and retain its real confirmation.

A pushed repository, deployed app or completed checklist does not by itself prove entry to the competition. Only the organiser's submission process completes that step.
