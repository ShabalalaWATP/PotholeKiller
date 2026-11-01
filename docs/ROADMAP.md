# Future direction

Opt-in road records, manual nearby links and weighted community repair marking are now implemented alongside power, lookup/maps and collectors. Independent physical-defect deduplication and evidenced council accountability remain future work. Latest 15:49 build/types and focused repair checks passed; the 416-test coverage is historical. Profile preview/database staging completed, with runtime/repair-preview verification pending.

## Britain's Most Wanted Potholes

The new shared road records allow explicit publication and manual report links within 100 metres, using authenticated capture proof. They do not independently establish one record per physical pothole. Future deduplication/evidence work would distinguish “one pothole” from “several eligible photo captures”.

Proximity/photo suggestions and corrections to mistaken links remain future work beyond today's manual target choice. Proximity alone cannot establish that two photographs show the same defect. Residents explicitly control each fresh reviewed report and any official handoff. Never automatically message a council.

Rank by the age supported by dated evidence and the number of independent reporters. Label the source and confidence of dates and counts. Repeated uploads or browser records must not masquerade as independent residents. Rarity, AI humour and assumed engineering danger should not determine public accountability rankings.

## Evidence and accountability

Keep distinct events for a draft prepared, email handoff requested, submission recorded by the resident, authority acknowledgement supported by evidence and repair independently verified. An email intent is not proof that an authority received the report. Missing acknowledgement does not, by itself, establish neglect or identify the responsible road owner.

Useful metrics would include unique physical defects, separate resident reports, evidenced age, acknowledgement duration and verified repair duration. Record the source of each timestamp and the start event used for each duration. Missing evidence stays unknown. Do not publish invented totals, fake leaderboard entries or unsupported claims about councils.

Before building a physical-defect register, decide evidence, privacy/consent, correction/moderation and how to establish independent reporters without exposing identities. The optional collector database does not answer those questions. This requires a separate milestone.

## Collector board, implemented source

Guest nicknames/avatars work locally. Optional official Netlify Identity sessions support database-backed profiles, opt-in public fields and collector levels. Shared counts require eligible new signed-in live user uploads with owner-bound, 30-minute-valid receipts. SQL uniqueness is per user and normalised image hash. Samples/offline/guest history is not backfilled, and no fake entries are seeded.

These are photo-capture counts, not unique physical potholes or council submissions. Shared XP now includes once-only issue/user repair credits equal to the reporter's first frozen capture XP; counts stay unchanged. Identity is enabled; profile deployment/base SQL staging completed, but runtime and latest repair preview remain unverified. Receipt validity is not deletion. See [community setup](COMMUNITY_SETUP.md).

## Creature progression, implemented experiment

The local experiment uses optional user-estimated extent and a self-reported first-noticed date. It awards 60 base XP, 10/20 for medium/large extent and 10/20/30 at 7/30/90 days since first noticed, up to 110 once per photograph. Profile and preparation time fix the award at capture; legacy records retain 60. Game power changes creature artwork without classifying engineering danger. Real uploads start unknown; map profiles and age histories belong only to labelled fictional samples.

This self-reported date does not establish actual defect age, council notification or response time. Public accountability rankings would need the stronger evidence rules above. Future bonuses for evidence quality, corroboration or follow-up are still proposals. Never encourage approaching a dangerous defect for a score.

## Today's boundary

Each browser retains local reports and a separate sample-inclusive demo simulation. Shared storage now includes public road metadata only with opt-in, plus private collector/hash/receipt/vote/credit metadata, without complete photos/report text/email. Manual links and per-user image uniqueness are not global physical-defect deduplication. Five weighted points mean community-marked fixed, not engineering or council repair proof. The 60 demo issues, 75 mock report links and twenty fictional users are explicitly labelled. See [repair rules](COMMUNITY_REPAIRS.md).
