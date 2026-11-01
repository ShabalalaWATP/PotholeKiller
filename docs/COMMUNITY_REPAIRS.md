# Road publication and community repair marking

Approved [production](https://potholekiller-hackney.netlify.app) is ready at `6ae767a03f094ad44e5a7911`, source `317ef76`, with clean build and production phone-map verification. Core/mock flows, read endpoints/sign-in UI and 401/403 road-write guards passed. Confirmed-account scoring remains manual follow-up. This is not a verified council repair feed.

## Real community records

`ReportRecord.publishToMap` defaults to `false`, including legacy records. An explicit opt-in can publish a road pin, label, type and self-reported age. Full photographs, report text, email and passwords are not stored in this shared record. Private auth IDs, vote ownership and repair-credit ownership remain database metadata.

Road-issue creation/linking requires official SDK authentication and capture proof bound to the owner, server-normalised image hash and canonical capture. `communityIssueId` can select an existing issue. Linking is manual and the target must be within 100 metres. There is no independently verified physical-defect deduplication; capture counts remain eligible photo identifiers.

A new real hunt confirms its road pin/address before photo input. Streets/Night background clicks prefill that chooser; existing monsters open age/report-count/repair details and an add-own-report action. The editable 2-to-80-character reporter name defaults from the collector nickname and appears in the council draft's **Reported by** line, but is omitted from public road API responses. It does not determine account ownership or vote role.

The additive [repair migration](../netlify/database/migrations/20261101154000_community_repairs.sql) follows the base collector migration; do not edit applied base SQL. The preview's anonymous community read returned 200 and road-issue read returned an empty 200 list. Authenticated create/link/vote/credit behaviour still needs verification.

## Votes and rewards

An ordinary authenticated account contributes one repair point. An account with the server-recognised SDK role `council_verified` contributes three. Each account votes once per issue. Five points mark it `community_fixed`: five ordinary votes, 3 + 1 + 1, or 3 + 3 suffice. A single three-point role vote does not clear it.

The status means **community-marked fixed**. It does not prove council work, engineering safety, authority acknowledgement or a submitted report. The Active map filter hides these issues, without converting the status into verified repair evidence.

Each user/issue can receive one additional early-report bonus: first 60 XP, positions 2 to 5 receive 20 XP, later reporters 5 XP. The server assigns order under the issue row lock. Repair credit matches the reporter's first frozen capture XP plus that order bonus, once per issue/user, capped at 170 XP. Shared XP includes credits; issuing bonuses does not add capture count. Voting alone is not a capture.

## Separate fictional demonstration

The labelled demo contains 60 fictional issues, 75 mock report links and 20 mock users, including two fictional inspector flags. It uses twelve real Hackney road centrelines sourced from OSM and six licensed, metadata-stripped photographs. See [demo data credits](DEMO_DATA_CREDITS.md).

The mock map/league is labelled and separate from authenticated data. Each chosen fictional actor can add one simulated report per issue with the same order-bonus rules, updating the twenty-user local league. Fictional voters drive persistent local repair simulation and matching credits. No mock Identity accounts are seeded. Real geography does not make these defects real.

Verified preview scenario: add a third report, replay it without extra XP, cast a three-point role vote and replay without extra points, then two ordinary votes to reach five. Active pins dropped from sixty to fifty-nine and linked reporters received 280 XP in aggregate fixture repair credits. This is a mock-simulation outcome, not a real council or authenticated community action.

Receipt validity is 30 minutes for claims, not deletion; expired rows are not automatically deleted. Road/profile consents are separate. App/screenshots and [public YouTube demo](https://youtu.be/NFl9KuJ_NlU) are complete. The hackathon entry succeeded: **Submitted, waiting for judging**. Contact values and private receipt/status URL stay private. Confirmed-account scoring remains manual follow-up.
