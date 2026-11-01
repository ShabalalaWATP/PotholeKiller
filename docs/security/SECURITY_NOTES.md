# Security and privacy notes

Scope: local-first hackathon application with optional Identity/Postgres collectors, 1 November 2026. The latest expanded build and hosted shared service are not yet verified. These notes are not a completed OWASP assessment or a production-readiness guarantee.

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
- Community ownership comes only from official Identity SDK server-side `getUser().id`, never a body-supplied user ID. State-changing community requests require same origin, bounded JSON and authenticated ownership. Public responses omit private auth UUIDs.
- Parameterised SQL, owner-bound receipt lookups, row locks and unique constraints protect repeated/concurrent claims. The server calculates allowed XP instead of accepting a browser-supplied total. Receipts are created only after eligible authenticated live analysis; known sample copies are excluded. This is not proof of human review, photograph ownership or a unique physical defect.

See [upload handling](../../lib/security/request.ts), [image sanitation](../../lib/security/image.ts), [report rules](../../lib/reporting/report.ts), [lookup provenance](../../lib/location/README.md), [community handler](../../lib/community/handler.ts), [receipt gate](../../lib/community/scan-receipt.ts) and [database repository](../../lib/community/database.ts).

## Request and spending limits

Live-analysis defaults are 6 requests per minute per bucket, 100 validated provider-call attempts per UTC day and 2 concurrent attempts per process. Failed provider calls count daily; invalid uploads count towards request rate but not the provider allowance. Without `TRUST_PROXY=true`, callers share a bucket. Trusted proxy mode hashes a valid forwarded IP in memory. Location and community endpoints have separate bounded request protections.

Enable trusted proxy mode only where infrastructure overwrites client-supplied forwarding headers. These limits are best-effort backstops: restarts reset them and multiple serverless instances maintain separate counters. They are neither authentication nor a global spending ceiling.

Before a high-traffic public demo, the operator must configure provider project spending controls, an enforceable upstream hard stop, platform upload/request limits and suitable shared abuse protection. Check the hosting platform's actual body-size, execution-duration and scaling limits; the application's limits do not override them. The baseline preview is verified; this is not a verified production deployment or a high-traffic readiness assessment.

## Data handling

The application does not intentionally save uploaded photos to disk, localStorage or a database. Previews and processed image data exist transiently during the journey. Live scans transmit the cleaned photograph to OpenAI; `store: false` does not override all provider retention or legal policies.

GPS permission is requested only after the user presses **Use my location**. The selected coordinates still require pin confirmation. Address/pin lookup sends the entered query or coordinates to Photon/Postcodes.io and official routing services. Suggestions and nearest postcode centres are approximate. Responses are not persisted on disk; bounded memory cache values expire proactively after ten minutes, including when idle. Provider-side retention is governed by the providers, not this application.

The local PotholeDex stores reviewed description, notes, landmark, confirmed coordinates, analysis text, observations, dates, status, creature data, image hashes and optional receipt identifiers, up to 100 records. Keep personal details out of report fields. The separate guest profile stores only chosen nickname/avatar. Same-origin scripts can read browser storage; it is not an encrypted vault.

The official Identity SDK owns authentication and vendor session storage, which can contain tokens/email. The game does not duplicate these into its report/profile stores or implement its own token protocol. Shared database rows contain private auth UUIDs, nickname/avatar/public flag, normalised image hashes, receipt identifiers, times and XP, with no photos, coordinates, report text, email or passwords. The public board projects opted-in game fields only. Clearing local browser data does not delete hosted records; unpublishing hides a profile but is not deletion.

Shared receipt validity is 30 minutes for claims. **Expired receipt rows are not automatically deleted.** This is not a 30-minute retention guarantee. Hosted retention/cleanup and account/data removal workflows remain operational follow-up; see [community setup](../COMMUNITY_SETUP.md).

OpenStreetMap tiles are requested for the street map and real-upload location picker. The tile provider receives normal network metadata and the requested map area. Fictional sample location forms use the labelled original local schematic. Keep geographic map attribution visible and follow its usage policy. The schematic is not a source of real road coordinates; real uploads have manual verified-coordinate fallback.

## Integrity and remaining limitations

Visual AI can be wrong. It does not establish dimensions, depth, engineering danger, responsible authority or repair status. The user must review observations and location. Every real handoff remains a user action. The label **Email handoff requested** does not prove the operating system opened a mail application, and opening one would not prove delivery.

Duplicate detection recognises the same image bytes in this browser. Re-encoding a photo, clearing storage or using another browser can bypass it. Local XP is a game feature, not an anti-fraud system or a cross-user defect register.

Initial review findings and later P2 issues were resolved. Final local `npm run check` passed 416 tests in 23 files, including ten in-memory SQL checks, 21 client-race tests and 33 storage/API tests. Coverage is 98.98% lines, 98.4% statements, 95.81% branches and 96.17% functions across core/API, native community and pure client helpers; React components/hooks/browser image utility are excluded. Expanded build and native-community/SQL types passed. Fresh receipt persistence/retry timing, auth-generation/consent guards and invalid callbacks are covered. These checks do not prove hosted account/database behaviour. No full OWASP assessment or production DAST is claimed.

Power is an experimental game attribute, never an engineering danger rating. Extent and first-noticed date are optional user observations. Dates cannot establish actual defect age, council notification or repair history. Fictional map profiles are supplied only to bundled samples; real uploads start unknown. Rewards use the profile and preparation time at capture, so they do not grow on refresh; older records default to the original 60 XP. The council draft labels any supplied extent/date as self-reported and excludes XP/game-power claims.

For baseline source commit `becb8afb71bb04cb94a7cd52d05939c3aeade9b7`, remote [application checks](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934636) and the [security workflow](https://github.com/ShabalalaWATP/PotholeKiller/actions/runs/41314934625) passed. CodeQL reported zero alerts. These predate the power update. GitHub secret scanning and push protection are enabled. Zero reported alerts does not establish that every vulnerability class has been assessed.

## Credentials and hosting preparation

A known-key scan checked 78 publishable source files and 42 browser bundle files without finding the configured key. `.env.local` remains ignored. This narrow check does not establish the absence of every possible secret.

The user manually enabled Identity at 15:24 in the [linked project](https://app.netlify.com/projects/potholekiller-hackney/identity). Hosted auth remains unverified after the earlier blank-URL browser block. The next `hackathon` branch-preview build will provision/stage Netlify Database and committed SQL; actual hosted/runtime checks remain pending at the [preview URL](https://hackathon--potholekiller-hackney.netlify.app). No successful shared login/database flow is claimed.

The user explicitly consented to the temporary OpenAI key on Netlify. Free-plan per-scope/write-only controls required an upgrade, so authenticated CLI setup used standard account-protected environment storage, without a paid upgrade or write-only claim. Application key use remains server-side and `.netlify/` is ignored. Database connection configuration belongs to the hosting service, not public game data.

The Windows preview workaround dereferenced package links and bundled official Linux sharp `0.35.5` / libvips package `1.3.4` artifacts with SHA-512 verification, excluding private `.env` files. Page/config/assets, real croissant rejection and cross-site HTTP 403 passed on the old baseline. Production is not published and Git continuous deployment is not configured. These checks do not verify the pending expanded build or prove every bundle file secret-free.

The [baseline recording](https://github.com/ShabalalaWATP/PotholeKiller/releases/download/hackathon-demo-2026/potholekiller-hackathon.webm) is public in the [prerelease](https://github.com/ShabalalaWATP/PotholeKiller/releases/tag/hackathon-demo-2026). It shows real live analysis and the earlier 60 XP flow, without the new lookup/collector UI. Replacement footage is pending. Keep environment files, auth/session details and private user data out of future recordings/releases.

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

Baseline desktop/portrait checks verified local review, confirmations, demo guards, copy, persistent XP and labelled failure recovery. Real vision and six real UK lookup checks passed. Shared collectors still require hosted setup and verification. Their per-user normalised image uniqueness is not global physical-defect deduplication, independent resident verification or evidence of council submission. Samples/offline/guest captures are not backfilled. The opt-in `npm run test:live` makes two paid local-server requests and is never CI. See [build notes](../../CODEX_BUILD_NOTES.md) for remaining work.
