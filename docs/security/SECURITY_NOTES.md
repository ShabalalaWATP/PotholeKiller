# Security and privacy notes

Scope: local-first app with optional Identity/Postgres collectors, 1 November 2026. Approved production build/public endpoints and core/mock flows are verified. Confirmed-account capture end-to-end remains untested. These notes are not a full OWASP or high-traffic readiness assessment.

## Boundaries and implemented controls

- The OpenAI key is used only in the server-side adapter. `.env.local` is ignored; `.env.example` lists variable names without credentials. `/api/config` exposes only whether a key is configured.
- Uploads require a matching origin and reject cross-site fetches. Explicit `APP_ORIGIN` is preferred; Netlify's trusted runtime `DEPLOY_PRIME_URL` is the next fallback, followed by the request URL origin. Local setup uses `http://127.0.0.1:3000`. Next.js/proxy request URLs can differ from the browser origin. This check is browser abuse protection, not authentication.
- The route accepts one multipart `image` field, limits the incoming stream to a 6 MiB image plus bounded multipart overhead, and imposes a 15-second upload timeout. It does not rely on `Content-Length` alone.
- JPEG, PNG and WebP require matching MIME/signature and successful server decode. Animated/multipage and over-16-megapixel images are rejected. sharp re-encodes to JPEG with a maximum dimension of 1600 pixels and strips embedded metadata before sending to OpenAI.
- Analysis uses a 45-second provider timeout, no automatic SDK retries, bounded output and `store: false`. Provider errors and image payloads are not logged by the application or returned to the browser.
- Structured output is validated with strict Zod fields. The prompt treats text in an image as untrusted. The report workflow independently gates eligible defect classes, quality, reviewed content and valid user-confirmed coordinates.
- React renders model/user text as text, not executable HTML. Mailto subject and body are URL-encoded. Reporting contacts are fixed verified routes, not model-generated addresses.
- Bundled samples are always demonstration records. Email handoff and user-recorded submission are blocked for them in the reporting/progression rules.
- Security headers disable framing, MIME sniffing and microphone access, with a restrictive referrer policy. Geolocation is limited to this origin and invoked only by the explicit **Use my location** action. This is not a complete browser security policy.
- Location lookup constrains inputs, trusted external hosts, response sizes, timeouts, rates/concurrency and cache size. Saved council contacts are bound to the official directory and source-host rules. Only the independently verified Hackney inbox is enabled; other routes do not invent email addresses.
- Community ownership comes only from official Identity SDK server-side `getUser().id`. Mutations require same origin, bounded JSON and ownership. Road publication adds explicit opt-in and canonical capture/server-image-hash proof; manual target links must be within 100 metres. Public responses omit private auth UUIDs.
- Parameterised SQL, owner-bound receipt lookups, row locks and unique constraints protect repeated/concurrent claims. The server calculates allowed XP instead of accepting a browser-supplied total. Receipts are created only after eligible authenticated live analysis; known sample copies are excluded. This is not proof of human review, photograph ownership or a unique physical defect.

See [upload handling](../../lib/security/request.ts), [image sanitation](../../lib/security/image.ts), [report rules](../../lib/reporting/report.ts), [lookup provenance](../../lib/location/README.md), [community handler](../../lib/community/handler.ts), [receipt gate](../../lib/community/scan-receipt.ts) and [database repository](../../lib/community/database.ts).

## Request and spending limits

Live-analysis defaults are 6 requests per minute per bucket, 100 validated provider-call attempts per UTC day and 2 concurrent attempts per process. Failed provider calls count daily; invalid uploads count towards request rate but not the provider allowance. Without `TRUST_PROXY=true`, callers share a bucket. Trusted proxy mode hashes a valid forwarded IP in memory. Location and community endpoints have separate bounded request protections.

Enable trusted proxy mode only where infrastructure overwrites client-supplied forwarding headers. These limits are best-effort backstops: restarts reset them and multiple serverless instances maintain separate counters. They are neither authentication nor a global spending ceiling.

Provider spending controls, an upstream hard stop, platform limits and shared abuse protection remain operator requirements for high traffic. Application limits do not override platform body-size/duration/scaling constraints. Production smoke checks passed; no load or high-traffic assessment is claimed.

## Data handling

The application does not intentionally save uploaded photos to disk, localStorage or a database. Previews and processed image data exist transiently during the journey. Live scans transmit the cleaned photograph to OpenAI; `store: false` does not override all provider retention or legal policies.

GPS permission is requested only after the user presses **Use my location**. The selected coordinates still require pin confirmation. Address/pin lookup sends the entered query or coordinates to Photon/Postcodes.io and official routing services. Suggestions and nearest postcode centres are approximate. Responses are not persisted on disk; bounded memory cache values expire proactively after ten minutes, including when idle. Provider-side retention is governed by the providers, not this application.

The local PotholeDex stores reviewed description, notes, landmark, confirmed coordinates, analysis text, observations, dates, status, creature data, image hashes and optional receipt identifiers, up to 100 records. Keep personal details out of report fields. The separate guest profile stores only chosen nickname/avatar. Same-origin scripts can read browser storage; it is not an encrypted vault.

The official SDK owns vendor session storage, including tokens/email; game stores do not duplicate them. Shared rows contain private auth IDs, profiles, hashes/receipts, times, XP and private vote/credit ownership. **Explicit map opt-in now stores public pins, labels, type and self-reported age.** New and legacy `publishToMap` default false. Complete photographs, report text, email and passwords are not stored. Profile and road publication are separate consents. Clearing local data does not delete hosted records.

Shared receipt validity is 30 minutes for claims. **Expired receipt rows are not automatically deleted.** This is not a 30-minute retention guarantee. Hosted retention/cleanup and account/data removal workflows remain operational follow-up; see [community setup](../COMMUNITY_SETUP.md).

Current real-map styles are Streets/Night, sharing OSM tiles with Night a CSS filter. The provider receives normal network metadata and requested area. There is no fictional background in the real map. Demo defects remain fictional despite real road geometry. Keep attribution visible; verified manual coordinates remain the tile-failure fallback.

## Integrity and remaining limitations

Visual AI can be wrong. It does not establish dimensions, depth, engineering danger, responsible authority or repair status. The user must review observations and location. Every real handoff remains a user action. The label **Email handoff requested** does not prove the operating system opened a mail application, and opening one would not prove delivery.

Duplicate detection recognises the same image bytes in this browser. Re-encoding a photo, clearing storage or using another browser can bypass it. Local XP is a game feature, not an anti-fraud system or a cross-user defect register.

The last full pre-repair run passed 416 tests/23 files: lines 98.98%, statements 98.4%, branches 95.81%, functions 96.17%, excluding React components/hooks/browser image utility. These metrics are historical. Later focused checks, latest build/types, core/mock browser flows and production 200/401/403 guards passed without another full suite. Confirmed-account capture remains untested; no full OWASP assessment or production DAST is claimed.

Repairs use one vote/account: ordinary one, SDK `council_verified` three, threshold five. One role vote cannot clear. Order bonuses are 60/20/5 for first/positions 2 to 5/later, once/user/issue under row lock. Matching repair credit is frozen capture plus order bonus, up to 170, without another capture count. Latest build/mock flow passed; real authenticated credit actions remain untested. Community-fixed is not engineering/council repair evidence or physical-defect deduplication.

Real hunts confirm the road point before photo input. Editable reporter name defaults from nickname, accepts 2 to 80 characters and appears in the council draft, omitted from public road API responses. It cannot choose account ownership or SDK vote role. The pin-first/live-photo/name/Hackney-mailto browser flow passed; email was not sent.

Power is an experimental game attribute, never an engineering danger rating. Extent and first-noticed date are optional user observations. Dates cannot establish actual defect age, council notification or repair history. Fictional map profiles are supplied only to bundled samples; real uploads start unknown. Rewards use the profile and preparation time at capture, so they do not grow on refresh; older records default to the original 60 XP. The council draft labels any supplied extent/date as self-reported and excludes XP/game-power claims.

For baseline source commit `becb8afb71bb04cb94a7cd52d05939c3aeade9b7`, remote [application checks](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934636) and the [security workflow](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934625) passed. CodeQL reported zero alerts. These predate the power update. GitHub secret scanning and push protection are enabled. Zero reported alerts does not establish that every vulnerability class has been assessed.

## Credentials and hosting preparation

Latest known-key scanning found no match in 174 source files or 44 browser files; the deployment ZIP contained zero private environment files/key matches. `.env.local` stays ignored. This is not a comprehensive secret scan.

Approved [production](https://potholekiller-hackney.netlify.app) is ready at `6ae767a03f094ad44e5a7911`, source `317ef76`, after a clean production build. Root/config/community/road/demo JPEG/Hackney lookup returned 200, anonymous road mutation 401 and cross-origin 403. Canonical origin and preview are preserved. Email UI/local profile save were checked without account creation; confirmed-account scoring and callback roundtrips remain manual follow-up.

The user explicitly consented to the temporary OpenAI key on Netlify. Free-plan per-scope/write-only controls required an upgrade, so authenticated CLI setup used standard account-protected environment storage, without a paid upgrade or write-only claim. Application key use remains server-side and `.netlify/` is ignored. Database connection configuration belongs to the hosting service, not public game data.

The original Windows workaround dereferenced package links and bundled verified official Linux sharp/libvips artifacts, excluding private environment files. Preview and subsequently approved production are now deployed/smoke-verified. Git continuous deployment remains unconfigured; neither smoke checks nor the narrow key scan prove complete security coverage.

The primary [YouTube demo](https://youtu.be/NFl9KuJ_NlU) is public and accepted on the submission receipt. Labelled AI narration/demo data and optional English captions remain; GitHub MP4/SRT are download backups. Official status is **Submitted, waiting for judging**. Receipt/status URL and all contact values remain private. Mock issues/users remain labelled and never seed Identity accounts. See [credits](../DEMO_DATA_CREDITS.md) and [repair rules](../COMMUNITY_REPAIRS.md).

Phone hotfix `317ef76` is deployed and passed production 390 × 844 QA: map 275 × 244, centred pin 137.54/121.82, six tiles. A clean build passed after local servers were stopped; contention remains the suspected cause of the earlier `Failed publishing static content` error. Five reviewed/linked screenshots are committed in `e9a0b18`. No full CI/test suite was rerun.

At the user's explicit delivery request, no further CI/CodeQL/unit runs or pipeline waits are planned unless vital. New commits use `[skip ci]`; linked baseline green runs do not validate the new commit. Secret scanning/push protection remain enabled. This changes delivery sequencing, not the recorded scope of prior checks.

## Dependency audit and temporary development exception

Verified on 1 November 2026:

| Check | Result |
| --- | --- |
| `npm audit --omit=dev --audit-level=low` | PASS, zero production dependency vulnerabilities. |
| `npm audit --audit-level=high` | PASS at the configured severity gate, with 16 moderate findings in the development dependency graph. This is not a clean full audit. |
| Patched tooling | sharp updated to `^0.35.5`; Vitest and V8 coverage updated to `4.1.12`. |

**Temporary accepted exception:** the remaining development findings concern transitive minimatch versions `3.1.5` and `10.2.6`, reviewed against [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Both are marked development-only in the dependency graph and are absent from runtime dependencies. The application does not import minimatch, and attacker-controlled HTTP, image, model and report content does not become a glob pattern.

Reviewed ESLint/parser call sites use fixed options, including `dot: true`. The vulnerable `optimizationLevel >= 2` path is not enabled: minimatch 10 defaults to level 1, and minimatch 3 does not implement that optimisation path. This narrows the observed exposure; it does not remove the advisories or prove that arbitrary future tooling use is safe.

Forcing minimatch 11 would break plugins expecting the callable minimatch 3 API. The installed React and accessibility plugin peer ranges also exclude ESLint 10, so a forced toolchain upgrade is not treated as a safe patch. Retain the [weekly Dependabot updates](../../.github/dependabot.yml) and [high-severity CI audit gate](../../.github/workflows/ci.yml). Revisit this exception when compatible patched tooling is available or if glob inputs/options, build tooling or dependency placement change. Do not suppress the moderate audit output.

Baseline layout/recovery checks, real vision/UK lookup and latest core/mock flows passed. Production sign-in UI/read endpoints and anonymous write guards work; confirmed-account capture remains untested. Per-user image uniqueness is not physical-defect deduplication, independent-resident verification or council-submission proof. Samples/offline/guest history is not backfilled. Opt-in `npm run test:live` makes two paid requests and is never CI. See [build notes](../../CODEX_BUILD_NOTES.md).
