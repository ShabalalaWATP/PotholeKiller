# PotholeKiller

**Hunt potholes. Earn XP. Save your streets.**

PotholeKiller turns a road-defect photograph into a reviewed report draft and an original collectable creature. It helps UK residents document visible road damage, confirm its location and find a reporting route, with a little British humour along the way.

Built by **Alex O, solo**, for the DevDay Exchange Community Hackathon in London on 1 November 2026. The Next.js, React and TypeScript core works as a guest, with optional Netlify Identity and Postgres-backed shared collector profiles. There is no separate FastAPI service.

[Preview URL](https://hackathon--potholekiller-hackney.netlify.app): expanded profile deployment `6ae75c622086dbea5bf72fdc` completed, with runtime health still unverified. The latest demo-map/repair update passed its 15:49 build and is awaiting the next preview deployment. Identity is enabled; hosted auth/database behaviour remains unverified.

## The journey

1. Explore the Hackney pilot map and choose **HUNT A POTHOLE**.
2. For a new real hunt, choose and confirm the road point/address before taking or uploading a photo. Clicking the Streets/Night background pre-fills this point chooser. Bundled samples remain a separate labelled route.
3. Scan for visible road damage and meet an original creature with a humorous nickname.
4. Correct the factual description, choose cracking/small/medium/large where appropriate, look up a UK address or position a precise pin, then confirm the location and reporting route.
5. Prepare the report draft, collect the creature and earn **60 base XP, up to 110 with observation bonuses**, once per photograph in this browser.
6. Copy the auto-written report, reopen it in the PotholeDex, or explicitly open an available reporting handoff. Optional sign-in enables eligible new captures to contribute to a shared collector score once hosting is configured.

Potholes, visible surface cracks and surface wear can qualify. Unrelated images, uncertain assessments and poor-quality photographs cannot earn a capture. The croissant joke appears only when the assessment identifies a croissant. Creature rarity is cosmetic and says nothing about engineering severity.

Existing monsters open issue details first: self-reported age, report count, community repair information and an option to add your own report. The council draft's editable **Reported by** name is prefilled from the local/community nickname, accepts 2 to 80 characters and is omitted from public road API responses. The location-first/name/order-bonus update is implemented in source; its build and hosted verification are pending.

## Experimental creature power

Optional, user-supplied apparent extent and a first-noticed date now affect game power and capture XP. Real uploads start with unknown extent/date; the model does not infer them. A first-noticed date is a self-reported observation, not proof of defect age, council notification or repair history.

| Observation at capture | Bonus XP |
| --- | --- |
| Cracking, unknown or small apparent extent | 0 |
| Medium / large apparent extent | 10 / 20 |
| Unknown date or fewer than 7 days since first noticed | 0 |
| At least 7 / 30 / 90 days since first noticed | 10 / 20 / 30, using the highest applicable band |

The reward is 60 plus the two bonuses, capped at 110 XP. Game power is `min(10, 1 + bonus XP / 5)`. Horns, armour and aura change at power thresholds 4 and 8. Demo histories are explicitly fictional and apply to sample journeys. Legacy captures without a profile retain 60 XP.

XP is calculated from the reviewed profile at capture time. Refreshing, waiting or changing a repeated photo's profile cannot earn another award. Cracking does not earn a size bonus. This is experimental game progression, not an engineering danger classification. Use existing observations from a safe place; never approach a road hazard for a bonus.

## UK lookup and precise maps

Full-address and postcode search uses Photon, Postcodes.io, a checked-in 382-authority GOV.UK directory snapshot and official local-transaction reporting routes. Suggestions and postcode centres are approximate. Select a result, check the actual road and explicitly confirm the pin. Moving the pin clears its previous confirmation. Only the **Use my location** button requests GPS permission; there is no automatic prompt.

The form starts with a factual draft from the image assessment and fills the selected address, coordinates and reporting route. Users review it before capture. Only Hackney has an independently verified direct reporting email. Other authorities use a verified official-domain form or national fallback with the known council website. Northern Ireland public-road reports use DfI. Road ownership can still differ for trunk, TfL or private roads. No email address is invented and no report is sent automatically.

Current map styles are **Streets** and **Night**, using the same OpenStreetMap tiles with a CSS filter for Night. There is no fictional background in the real map. Issue markers cluster, expand with zoom and shrink around an anchored exact dot for closer inspection. When tiles fail, use verified manual coordinates; demonstration markers are not evidence of real damage.

Six real lookup checks passed across all four UK nations, a Kent county-authority case and `282 Mare Street London`; the slowest observed request took 5.3 seconds. This is not a coverage or availability guarantee. See [provider/directory provenance](lib/location/README.md) and retain the directory's [MIT licence notice](lib/location/DIRECTORY_LICENCE.txt).

## Labelled demo and community repair marking

The default demonstration contains **60 fictional issues, 75 mock report links and 20 mock users**, including two fictional inspector flags. Positions follow twelve real Hackney road centrelines sourced from OpenStreetMap, but the defects and histories are invented. Six licensed photographs discovered through image search are credited in [demo data credits](docs/DEMO_DATA_CREDITS.md); their metadata is stripped and files are 52 to 160 KB. No mock Identity accounts are seeded.

The mock leaderboard and repair simulation are explicitly labelled and separate from authenticated community data. Choosing fictional voters changes persistent local demo state and the demo league only. The Active filter hides `community_fixed` issues.

Real reports default to **no public map publication**, including legacy records. Publishing a road pin/type/age/label is a separate opt-in, requiring signed-in capture proof. Users can manually link a target issue within 100 metres; this does not independently identify a unique physical pothole.

Community repair marking requires five points: ordinary accounts contribute one, and the SDK role `council_verified` contributes three, once per account. A single council-role vote cannot clear an issue. Five ordinary votes, three plus one plus one, or three plus three reach the threshold. This produces **community-marked fixed**, without proving engineering safety or council repair.

An additional early-reporter community bonus is awarded once per user/issue: **60 XP for first, 20 XP for positions 2 to 5, and 5 XP thereafter**, assigned under the issue row lock. Repair credit matches that reporter's first frozen capture XP **plus their order bonus**, once per issue/user, up to **170 XP**. Credits do not add capture count. The mock report action applies the same rules once per selected fictional actor/issue and updates the twenty-user demo league. See [repair rules](docs/COMMUNITY_REPAIRS.md); latest verification/footage remain pending.

## Collectors and the optional shared board

Guests can choose a local nickname and creature avatar. Official Netlify Identity supports optional sign-in. Real shared profiles/levels use Netlify Database and opt-in public fields. The authenticated board shows published collector records; the separately labelled mock league contains the fictional demonstration users. Real rankings use capture count, then XP including repair credits, and do not measure council performance.

Shared credit requires a new eligible live user upload while signed in, followed by reviewed report preparation and a server-issued database receipt. Receipts are valid for claims for 30 minutes. Database constraints prevent repeating the same normalised image hash for the same user. Guest, offline and bundled-sample captures are not backfilled. A count does not establish an independently unique physical pothole, council receipt or repair.

Identity was manually enabled at 15:24. Hosted account/board testing and preview database/migration verification remain pending. Plain `npm run dev` supports local guest play; it does not provide the hosted Identity/community service. See [community setup and privacy](docs/COMMUNITY_SETUP.md) for the migration, data boundaries and outstanding checks.

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

`check` runs ESLint, TypeScript and Vitest with V8 coverage. Type checking runs `next typegen` before `tsc --noEmit`, generating clean-clone route declarations; generated `next-env.d.ts` is ignored. Coverage thresholds remain 90% for each measure across configured core/API, location, community, native function and pure client helpers. React components, hooks and the browser image utility are excluded. Individual commands are `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:coverage`.

The last full pre-repair check passed **416 tests/23 files** at 15:32: **98.98% lines, 98.4% statements, 95.81% branches, 96.17% functions**. The earlier repair build/types passed at 15:49 with five rule and six database/auth/concurrency checks. These results predate the newest location-first, reporter-name and order-bonus changes, whose build/runtime verification is pending. No further full suite was run under the user's rush-delivery instruction.

Baseline browser checks passed for desktop/portrait capture, live upload, rejection, labelled failure recovery, duplicate protection, persistence, focus, Escape and reduced motion. The old hosted build passed page/config/assets, real croissant rejection and cross-site upload rejection. These results do not verify the new lookup/profile/board UI or hosted sign-in. The production dependency audit reported zero vulnerabilities; the full high-severity gate passed with 16 moderate development findings under a scoped exception. See [build notes](CODEX_BUILD_NOTES.md) and [security notes](docs/security/SECURITY_NOTES.md).

Remote [application checks](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934636) and the [security workflow](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934625) passed for baseline source commit `becb8afb71bb04cb94a7cd52d05939c3aeade9b7`, with zero CodeQL alerts. They do not cover the new commit. At the user's explicit delivery request, new commits use `[skip ci]` and delivery will not wait for further CI, CodeQL or unit runs unless vital. Secret scanning and push protection remain enabled.

The opt-in live smoke command requires a running local server with its server-side key configured:

```powershell
npm run test:live
```

It makes **two paid OpenAI requests**, checks the pothole and croissant samples, and writes local results under ignored `output/`. It is excluded from CI and `npm run check`. `LIVE_BASE_URL` can select another local server URL; remote targets are rejected.

## Reporting and privacy

Capturing documents a defect. It does not repair the road or send a report. Status distinguishes a prepared draft, an email handoff request and a submission explicitly recorded by the user. A handoff request does not prove an email application opened. None proves council receipt, acknowledgement or repair.

[Hackney's official instructions](https://www.hackney.gov.uk/parking-streets-and-transport/roads-streets-and-pavements/report-roads-streets-and-pavement-problems) publish `Highway.Inspectors@hackney.gov.uk`, checked on 1 November 2026. That is the only independently verified direct email enabled. Elsewhere, lookup offers official forms or national instructions, including [GOV.UK](https://www.gov.uk/report-pothole). Users verify road ownership, review the auto-written draft and manually attach the photograph before sending an email. Example journeys cannot open a council email.

Photos are processed transiently and are not saved in the PotholeDex or an application database. The server checks image contents and re-encodes photographs without embedded metadata before live analysis. Live scans transmit the cleaned image to OpenAI. `store: false` is not a promise of zero provider retention.

The app requests device GPS only after **Use my location** is pressed. Lookup providers receive the entered address or coordinates. Location responses use a bounded ten-minute memory cache with proactive expiry, not persistent application storage. Street-map requests disclose normal connection information and the requested area to the tile provider.

Browser game storage retains reviewed draft text, reporter name, confirmed coordinates, observations, dates, status, creature data, receipt identifiers and image fingerprints, up to 100 captures. Include only the details you intend in the council draft. The reporter name is omitted from public road API responses. A separate guest profile stores chosen nickname/avatar; the Identity SDK owns its session storage, including tokens/email, without duplicating these into game data.

The shared database stores private auth UUIDs, game profiles, hashes/receipts, timestamps, XP and private vote/reward ownership. **Explicit map publication also stores public road pins, labels, type and self-reported age.** It stores no complete photograph, report text, email or password. Public projections omit private auth IDs. Thirty-minute receipt validity is not deletion: expired rows are not automatically removed. See [community setup](docs/COMMUNITY_SETUP.md) and [repair privacy](docs/COMMUNITY_REPAIRS.md).

**Stay safe. Never enter the road or stop somewhere dangerous to photograph a pothole.** Existing photographs are welcome. See [security notes](docs/security/SECURITY_NOTES.md) for controls and limits.

## Delivery and credits

Baseline source is public at [ShabalalaWATP/PotholeKiller](https://github.com/ShabalalaWATP/PotholeKiller), with [commit `becb8af`](https://github.com/ShabalalaWATP/PotholeKiller/commit/becb8afb71bb04cb94a7cd52d05939c3aeade9b7) on default branch `feature/hackathon-mvp`. `main` was not written. Publication and final hosted verification of the expanded build remain pending.

The [47.56-second baseline video](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-demo-2026/potholekiller-hackathon.webm) in the [public prerelease](https://github.com/ShabalalaWATP/PotholeKiller/releases/tag/hackathon-demo-2026) shows real live AI and the earlier 60 XP flow. It does not show the latest power, lookup or collector features. Replacement footage is pending; the local original remains ignored under `output/playwright/`.

Profile preview deployment `6ae75c622086dbea5bf72fdc` completed at the [same alias](https://hackathon--potholekiller-hackney.netlify.app). An isolated `hackathon` database was created and base SQL staged/uploaded; runtime health is not yet checked. The repair update's preview deployment is next. Identity's canonical callback needs production approval after final preview verification. No production publication or Git continuous deployment is configured. Alex O is solo; contact is private, organisers' form is unreleased, and submission is unsent.

The application, reporting flow, local game progression, original creature templates, schematic map and delivery documentation were created for this build. The sample photographs and software dependencies predate it. See [asset credits](docs/ASSET_CREDITS.md), [Codex contribution evidence](CODEX_BUILD_NOTES.md), [demo scripts](docs/DEMO_SCRIPT.md) and [submission materials](docs/SUBMISSION.md).

The [roadmap](docs/ROADMAP.md) separates implemented opt-in road records/manual links and community marking from future independently evidenced physical-defect deduplication and council history. Capture counts remain photo identifiers, not independently unique potholes.

Dependencies include Next.js, React, Tailwind, Lucide, Leaflet, OpenAI's SDK, Zod, sharp, Space Grotesk and the official Netlify Identity, Database and Functions packages. Their upstream licences apply. Keep the [directory licence notice](lib/location/DIRECTORY_LICENCE.txt) with the generated snapshot. Geographic maps use [OpenStreetMap contributors' data](https://www.openstreetmap.org/copyright); keep attribution visible and follow the [tile policy](https://operations.osmfoundation.org/policies/tiles/).
