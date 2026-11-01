# PotholeKiller

**Hunt potholes. Earn XP. Save your streets.**

PotholeKiller turns a road-defect photograph into a reviewed report draft and an original collectable creature. It helps UK residents document visible road damage, confirm its location and find a reporting route, with a little British humour along the way.

Built for the DevDay Exchange Community Hackathon in London on 1 November 2026. The project uses Next.js App Router, React, TypeScript and Tailwind in a single application. No account, database or separate backend is required.

## The journey

1. Explore the Hackney pilot map and choose **HUNT A POTHOLE**.
2. Upload a photograph or choose one of three real, permissively licensed sample photographs.
3. Scan for visible road damage and meet an original creature with a humorous nickname.
4. Correct the factual description, confirm a map pin and review the reporting authority.
5. Prepare the report draft, collect the creature and earn **60 XP once per photograph** in this browser.
6. Copy the report, reopen it in the PotholeDex, or use an available reporting handoff.

Potholes, visible surface cracks and surface wear can qualify. Unrelated images, uncertain assessments and poor-quality photographs cannot earn a capture. The croissant joke appears only when the assessment identifies a croissant. Creature rarity is cosmetic and says nothing about engineering severity.

## Live AI and demonstration mode

`POST /api/analyse` uses the official OpenAI JavaScript SDK and Responses API with an image input, Structured Outputs and Zod validation. The model supplies visible observations and character copy separately. The application asks it not to infer a location, dimensions, depth or repair status. The server requests `store: false` and returns safe retry messages for failures.

The default model identifier is `gpt-6.1-terra`, configurable through `OPENAI_MODEL`. Real `POST /api/analyse` smoke checks passed: a pothole was classified as a capturable pothole in 14.5 seconds, and a croissant was identified as `not_road` with no capture in 4.6 seconds. These are observed checks, not response-time guarantees.

The three bundled photographs can use live analysis when configured, or the explicit **Use predefined output for bundled samples only** option. Example results are authored fixtures, visibly labelled **PREDEFINED EXAMPLE OUTPUT**. They are not live AI responses. Arbitrary uploads always use live analysis and have no simulated analysis fallback.

All bundled sample journeys use fictional locations and produce demonstration reports. Their email handoff and submitted status are disabled, including when a sample is analysed live. Fictional map markers are not evidence of real defects. The illustrated hunt map and fictional sample location forms use the original local schematic, with explicit fiction labels. Real-upload location forms use OpenStreetMap and allow manually verified coordinates when tiles are unavailable. The schematic cannot establish a real defect's location.

## Run locally

Use Node.js 22.12.0 or later and npm.

```powershell
npm install
Copy-Item .env.example .env.local
```

Set the canonical local origin in `.env.local` before starting the app:

```dotenv
APP_ORIGIN=http://127.0.0.1:3000
```

```powershell
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Add a real OpenAI key to the ignored `.env.local` file to enable live scanning. The labelled sample journey works without a key. Never put the key in a `NEXT_PUBLIC_` variable or commit it. Keep `.env.example` as variable names only. For fixed hosting URLs, explicitly set `APP_ORIGIN` to the canonical public HTTPS origin. Netlify's runtime-provided `DEPLOY_PRIME_URL` supplies the preview origin when `APP_ORIGIN` is unset. Next.js or proxy request URLs can otherwise differ from the browser origin and reject uploads. Do not copy the local loopback origin into hosting configuration.

| Variable | Default when blank | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | None | Server-only OpenAI credential. |
| `OPENAI_MODEL` | `gpt-6.1-terra` | Vision-capable model available to the operator's account. |
| `APP_ORIGIN` | Netlify `DEPLOY_PRIME_URL`, then request URL origin | Preferred explicit canonical browser origin; set the local value shown above. |
| `ANALYSIS_DAILY_LIMIT` | `100` | Validated provider-call attempts, including failed calls, per UTC day and server process; maximum `10000`. |
| `ANALYSIS_RATE_LIMIT` | `6` | Requests per minute in each rate bucket; maximum `120`. |
| `ANALYSIS_CONCURRENCY_LIMIT` | `2` | Concurrent analysis attempts per server process; maximum `8`. |
| `TRUST_PROXY` | Disabled | Only literal `true` trusts the first forwarded IP. Enable only behind a proxy that replaces untrusted forwarding headers. |

Without trusted proxy identity, requests share one rate bucket. These in-memory limits reset on process restarts and do not coordinate between instances. Public hosting also needs provider spending controls, an enforceable upstream hard stop and platform request limits.

## Checks and production mode

```powershell
npm run check
npm run build
npm run start
```

`check` runs ESLint, TypeScript and Vitest with V8 coverage. Type checking runs `next typegen` before `tsc --noEmit`, so a clean clone generates its route declarations; generated `next-env.d.ts` is Git-ignored. Coverage thresholds are 90% for statements, branches, functions and lines across the configured API, AI, game, reporting and security modules. React components, browser hooks and client-side image handling are outside that coverage scope. Individual commands are `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:coverage`.

Final local verification on 1 November 2026: **`npm run check` passed with 128 tests**, including both origin regressions. Covered modules measured **99.05% lines, 98.29% statements, 97.22% branches and 95.23% functions**. Tests exercise classification gates, reviewed report locations, honest status transitions, sample handoff restrictions, upload protection and once-only XP. The production build also passed.

Browser checks passed for the desktop and 390 × 844 portrait capture journeys, real file upload with live source labelling, croissant rejection with unchanged XP, simulated API failure followed by labelled sample fallback, repeat-photo protection and reload persistence. Two distinct reports reached 120 XP and level 2. Focus, Escape dismissal, reduced motion and overflow were checked. The production dependency audit reported zero vulnerabilities. The full audit passed its high-severity gate with 16 moderate findings remaining in development dependencies under a temporary scoped exception. See [build notes](CODEX_BUILD_NOTES.md) and [security notes](docs/security/SECURITY_NOTES.md) for scope and evidence.

The opt-in live smoke command requires a running local server with its server-side key configured:

```powershell
npm run test:live
```

It makes **two paid OpenAI requests**, checks the pothole and croissant samples, and writes local results under ignored `output/`. It is excluded from CI and `npm run check`. `LIVE_BASE_URL` can select another local server URL; remote targets are rejected.

## Reporting and privacy

Capturing documents a defect. It does not repair the road or send a report. Status distinguishes a prepared draft, an email handoff request and a submission explicitly recorded by the user. A handoff request does not prove an email application opened. None proves council receipt, acknowledgement or repair.

For a real upload, users can select the Hackney pilot route after checking road ownership. [Hackney's official reporting instructions](https://www.hackney.gov.uk/parking-streets-and-transport/roads-streets-and-pavements/report-roads-streets-and-pavement-problems) publish `Highway.Inspectors@hackney.gov.uk`, checked on 1 November 2026. Some roads have another highway authority or a private owner. Unknown authorities use [GOV.UK's reporting route](https://www.gov.uk/report-pothole); the app does not invent council contacts. Users must attach their original photograph manually before sending an email.

Photos are processed transiently and are not saved in the PotholeDex or an application database. The server checks image contents and re-encodes photographs without embedded metadata before live analysis. Live scans transmit the cleaned image to OpenAI. `store: false` is not a promise of zero provider retention.

The app does not request device GPS. The user supplies the report pin. Browser localStorage retains reviewed report text, confirmed coordinates, dates, status, creature data and a photograph fingerprint, up to 100 captures. Do not enter personal details into report fields. Browser site-data controls can clear the collection. Requests for the street map or real-upload location map disclose the usual connection information and requested tile area to the tile provider; fictional sample forms use the local schematic.

**Stay safe. Never enter the road or stop somewhere dangerous to photograph a pothole.** Existing photographs are welcome. See [security notes](docs/security/SECURITY_NOTES.md) for controls and limits.

## Delivery and credits

Repository: [ShabalalaWATP/PotholeKiller](https://github.com/ShabalalaWATP/PotholeKiller), verified public and empty during delivery checks. Local work is on `feature/hackathon-mvp`, with foundation commit `f6da0b8`; publication of the new feature branch is still pending. A free Netlify project named `potholekiller-hackney` is created and linked, but no application deploy is recorded yet. Use the preview URL returned by the deployment and Netlify's runtime `DEPLOY_PRIME_URL` for its canonical origin unless explicitly overridden. A real, silent demo is saved locally at `output/playwright/potholekiller-hackathon.webm`, with a metadata-verified duration of 47.56 seconds; it has no public video link yet. A repository push or local recording does not constitute hackathon submission.

The application, reporting flow, local game progression, original creature templates, schematic map and delivery documentation were created for this build. The sample photographs and software dependencies predate it. See [asset credits](docs/ASSET_CREDITS.md), [Codex contribution evidence](CODEX_BUILD_NOTES.md), [demo scripts](docs/DEMO_SCRIPT.md) and [submission materials](docs/SUBMISSION.md).

Dependencies include Next.js, React, Tailwind CSS, Lucide, Leaflet, React Leaflet, OpenAI's SDK, Zod, sharp and the locally bundled Space Grotesk font. Their respective upstream licences apply. Geographic street maps use [OpenStreetMap contributors' data](https://www.openstreetmap.org/copyright); keep the on-map attribution visible and follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
