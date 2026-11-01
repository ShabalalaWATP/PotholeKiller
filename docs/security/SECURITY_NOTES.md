# Security and privacy notes

Scope: local-first hackathon MVP, 1 November 2026. These are implementation notes and deployment constraints, not a completed OWASP assessment or a guarantee of production readiness.

## Boundaries and implemented controls

- The OpenAI key is used only in the server-side adapter. `.env.local` is ignored; `.env.example` lists variable names without credentials. `/api/config` exposes only whether a key is configured.
- Uploads require a matching origin and reject cross-site fetches. Explicit `APP_ORIGIN` is preferred; Netlify's trusted runtime `DEPLOY_PRIME_URL` is the next fallback, followed by the request URL origin. Local setup uses `http://127.0.0.1:3000`. Next.js/proxy request URLs can differ from the browser origin. This check is browser abuse protection, not authentication.
- The route accepts one multipart `image` field, limits the incoming stream to a 6 MiB image plus bounded multipart overhead, and imposes a 15-second upload timeout. It does not rely on `Content-Length` alone.
- JPEG, PNG and WebP require matching MIME/signature and successful server decode. Animated/multipage and over-16-megapixel images are rejected. sharp re-encodes to JPEG with a maximum dimension of 1600 pixels and strips embedded metadata before sending to OpenAI.
- Analysis uses a 45-second provider timeout, no automatic SDK retries, bounded output and `store: false`. Provider errors and image payloads are not logged by the application or returned to the browser.
- Structured output is validated with strict Zod fields. The prompt treats text in an image as untrusted. The report workflow independently gates eligible defect classes, quality, reviewed content and valid user-confirmed coordinates.
- React renders model/user text as text, not executable HTML. Mailto subject and body are URL-encoded. Reporting contacts are fixed verified routes, not model-generated addresses.
- Bundled samples are always demonstration records. Email handoff and user-recorded submission are blocked for them in the reporting/progression rules.
- Security headers disable framing, MIME sniffing, geolocation and microphone access, with a restrictive referrer policy. These headers are not a complete browser security policy.

See [upload handling](../../lib/security/request.ts), [image sanitation](../../lib/security/image.ts), [vision adapter](../../lib/ai/analyse.ts), [report rules](../../lib/reporting/report.ts) and [handoff](../../lib/reporting/handoff.ts).

## Request and spending limits

Defaults are 6 requests per minute per rate bucket, 100 validated provider-call attempts per UTC day and 2 concurrent attempts per server process. Failed provider calls count towards the daily allowance; invalid uploads do not. Invalid uploads still count towards the request-rate limit. Without `TRUST_PROXY=true`, all callers share the same bucket. Trusted proxy mode hashes a valid forwarded IP in memory instead of retaining its plain value.

Enable trusted proxy mode only where infrastructure overwrites client-supplied forwarding headers. These limits are best-effort backstops: restarts reset them and multiple serverless instances maintain separate counters. They are neither authentication nor a global spending ceiling.

Before a high-traffic public demo, the operator must configure provider project spending controls, an enforceable upstream hard stop, platform upload/request limits and suitable shared abuse protection. Check the hosting platform's actual body-size, execution-duration and scaling limits; the application's limits do not override them. No public deployment is recorded as verified here.

## Data handling

The application does not intentionally save uploaded photos to disk, localStorage or a database. Previews and processed image data exist transiently during the journey. Live scans transmit the cleaned photograph to OpenAI; `store: false` does not override all provider retention or legal policies.

The app does not request device GPS. Users explicitly set a report pin. The local PotholeDex stores reviewed description, notes, landmark, exact confirmed report coordinates, analysis text, dates, status, creature details and a photograph hash, up to 100 records. Do not put names, contact details or other personal information in these fields. Clearing the site's browser storage removes the saved collection. Browser storage is readable by scripts running on the same origin and is not an encrypted vault.

OpenStreetMap tiles are requested for the street map and real-upload location picker. The tile provider receives normal network metadata and the requested map area. Fictional sample location forms use the labelled original local schematic. Keep geographic map attribution visible and follow its usage policy. The schematic is not a source of real road coordinates; real uploads have manual verified-coordinate fallback.

## Integrity and remaining limitations

Visual AI can be wrong. It does not establish dimensions, depth, engineering danger, responsible authority or repair status. The user must review observations and location. Every real handoff remains a user action. The label **Email handoff requested** does not prove the operating system opened a mail application, and opening one would not prove delivery.

Duplicate detection recognises the same image bytes in this browser. Re-encoding a photo, clearing storage or using another browser can bypass it. Local XP is a game feature, not an anti-fraud system or a cross-user defect register.

Focused static security review identified three issues, corrected in source: premature daily quota charging, unreviewed model observations in outgoing report text and misleading upload/sample-mode presentation. Re-review confirmed all three fixes without a residual finding in that scope. Final `npm run check` passed with 128 tests covering upload rejection, limits, provider errors, classification, report review, progression, demo restrictions and both origin regressions. Configured core/API coverage measured 99.05% lines, 98.29% statements, 97.22% branches and 95.23% functions. React components, browser hooks and client-side image code are excluded. No comprehensive penetration test, production DAST or full OWASP scan is claimed.

## Credentials and hosting preparation

A known-key scan checked 78 publishable source files and 42 browser bundle files without finding the configured key. `.env.local` remains ignored. This narrow check does not establish the absence of every possible secret.

The free Netlify project `potholekiller-hackney` is created and linked, but not yet deployed. The user explicitly consented to storing the key on Netlify after cloud-specific consent was requested. The free plan rejected per-scope and write-only controls with HTTP 403 and an upgrade requirement. Standard account-protected environment variable storage was used; it is not claimed to be write-only. No paid upgrade was made. Native connector writes failed and authenticated CLI configuration succeeded. The application uses the credential only server-side, and `.netlify/` remains ignored.

The local demo recording contains live analysis and gameplay, and stays under ignored `output/`. It is not a hosted submission video yet. Do not include environment files, tokens or private user data when publishing it.

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

The desktop sample journey verified edited report text and confirmed coordinates in saved data, the demo flag, absence of council email, copy behaviour and persistent once-only XP. Real API smoke checks accepted a visible pothole and rejected a croissant. Browser checks confirmed uploads remained live with the sample-only toggle selected, rejection preserved XP, repeat photographs earned no extra XP, simulated 502 recovery stayed labelled and the portrait capture flow worked. These are specific checks, not exhaustive classification accuracy, accessibility or browser security assessments. The opt-in `npm run test:live` makes two paid requests against a running local server and is never part of CI. See [build notes](../../CODEX_BUILD_NOTES.md) for remaining verification and delivery items.
