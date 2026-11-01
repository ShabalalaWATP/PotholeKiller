# Development story

## 1 November 2026, hackathon build

The workspace began empty. The supplied brief fixed the scope around a single playful reporting journey, a Hackney pilot, real OpenAI image understanding and an explicitly labelled demonstration fallback. The intended repository is [ShabalalaWATP/PotholeKiller](https://github.com/ShabalalaWATP/PotholeKiller), with work on `feature/hackathon-mvp`.

A Next.js App Router application was scaffolded with React, TypeScript, Tailwind, Leaflet and the official OpenAI SDK. The implementation keeps the API credential on the server and uses no separate backend, account system or database.

Focused implementation work added upload validation and image re-encoding, a structured vision adapter, conservative capture eligibility, reviewed report generation and local progression. Original creature designs and an illustrated hunt map support the game presentation without requiring remote map tiles for its opening screen. Three existing real photographs were bundled with licence and source credits.

The reporting design distinguishes a draft, an email handoff request and submission recorded by the user. Every bundled sample remains a fictional demonstration and cannot open a council email or acquire a submitted status. The location comes from a user-confirmed pin, never from the model. Creature rarity is cosmetic.

Targeted unit tests were written for analysis, upload protection, reporting and once-only XP. Documentation now includes setup, implementation evidence, privacy limits, a 90-second recording plan, a two-minute stage script and an incomplete submission checklist.

A focused static security review identified three issues. Source fixes moved daily quota charging after image validation, removed unreviewed model observations from outgoing report text and made the upload versus sample-mode distinction explicit. Re-review confirmed the fixes without residual findings in that scope, and the relevant unit tests now pass. The email status label was also made explicit: a requested handoff does not confirm that an email application opened.

Lint, type checks and 126 unit tests passed. Configured core/API coverage measured 99.05% lines, 98.28% statements, 97.19% branches and 95.23% functions; it excludes React components, browser hooks and client-side image code. The Next.js 16.4.3 production build passed after native workers were allowed the necessary process permissions. The initial sandbox build stalled and was not treated as successful.

Dependency maintenance updated sharp to `^0.35.5` and Vitest/coverage to `4.1.12`. The production audit reported zero vulnerabilities. The full audit passed its high-severity gate with 16 moderate development-only minimatch findings remaining under a temporary scoped exception. Reviewed runtime code does not import minimatch or pass untrusted data into glob patterns. Weekly Dependabot updates and the high-severity gate remain configured; remote CI is not yet recorded.

The desktop predefined pothole journey passed through edited facts, manually entered coordinates, explicit pin confirmation, capture, copy and reload with 60 XP retained. The demo flag persisted and the council email action was absent. Reward-heading focus and top scroll position were checked; recentre did not change the confirmed pin or submit the form.

Real live `POST /api/analyse` checks then passed: a pothole was classified as a capturable pothole in 14.5 seconds; a croissant was identified as `not_road` with no capture in 4.6 seconds. An opt-in `npm run test:live` command now runs those two paid requests against a running local server. It is not part of CI. Origin handling prefers explicit `APP_ORIGIN`, then Netlify's trusted runtime `DEPLOY_PRIME_URL`; local configuration uses `http://127.0.0.1:3000`. Two origin regressions were added.

Final `npm run check` passed with 128 tests. Coverage measured 99.05% lines, 98.29% statements, 97.22% branches and 95.23% functions in the configured core/API scope. Type checks now run `next typegen` before `tsc --noEmit`, generating route declarations for a clean clone. Generated `next-env.d.ts` is ignored by Git.

Browser testing confirmed a real croissant file upload remained live even with the sample-only toggle selected, and earned no XP. A simulated HTTP 502 produced retry guidance and a labelled sample fallback. Repeated photos reopened the original record without another award. The full 390 × 844 portrait capture flow passed, including temporarily empty coordinate fields, level 2 at 120 XP, focus, scroll position and no horizontal/dialog overflow. Escape dismissal and reduced-motion duration were checked. Fictional report forms now use the labelled local schematic; real uploads use OSM with manual verified-coordinate fallback.

A real silent recording was saved locally as `output/playwright/potholekiller-hackathon.webm`, with a metadata-verified duration of 47.56 seconds at 1280 × 900 with VP9 video. It shows live pothole and croissant analysis plus capture; a frame was visually inspected. It remains ignored local output with no public video link. A known-key scan found no configured key in 78 publishable source files or 42 browser bundle files, and `.env.local` remains ignored.

The free Netlify project `potholekiller-hackney` was created and linked. The user explicitly authorised storing the key there after cloud-specific consent was requested. Free-plan per-scope/write-only controls returned HTTP 403 requiring an upgrade, so standard account-protected environment storage was used without a paid upgrade. Native connector writes failed; the authenticated CLI completed setup. Application key use remains server-side, `.netlify/` is ignored and no hosted deployment is recorded yet.

The alias flag proved unsupported for remote builds. The deployment plan uses the returned Netlify preview URL and trusted `DEPLOY_PRIME_URL` origin handling, with explicit `APP_ORIGIN` still available. A returned, working hosted URL is still required.

Local foundation commit `f6da0b8` exists on `feature/hackathon-mvp`. The intended GitHub repository was verified public and empty with administrator access. An initial `main` publication attempt was rejected by automatic approval review under a shared-branch assumption; no push completed. The plan now publishes the new feature branch without mutating `main`. Application publishing, hosted deployment, a public recording link and organiser submission remain pending in [build notes](../CODEX_BUILD_NOTES.md).
