# Future direction

The physical-defect register and council-accountability ideas below remain future work. Authorised power, UK lookup/maps and optional shared collector code passed the final 416-test local check and build. Identity is enabled. Latest preview/runtime, database/migration and hosted shared-session verification remain pending.

## Britain's Most Wanted Potholes

A future shared view could give each physical road defect one record, while keeping each resident's observations and reporting actions as separate reports. This separates “one pothole” from “several people reported it”.

Nearby coordinates and photograph similarity could suggest an existing defect. A person must confirm the link; proximity alone cannot establish that two photographs show the same hole. Allow corrections to mistaken links. Residents can explicitly choose to prepare a fresh report about an existing defect, with their own reviewed evidence and chosen reporting route. Never automatically message a council.

Rank by the age supported by dated evidence and the number of independent reporters. Label the source and confidence of dates and counts. Repeated uploads or browser records must not masquerade as independent residents. Rarity, AI humour and assumed engineering danger should not determine public accountability rankings.

## Evidence and accountability

Keep distinct events for a draft prepared, email handoff requested, submission recorded by the resident, authority acknowledgement supported by evidence and repair independently verified. An email intent is not proof that an authority received the report. Missing acknowledgement does not, by itself, establish neglect or identify the responsible road owner.

Useful metrics would include unique physical defects, separate resident reports, evidenced age, acknowledgement duration and verified repair duration. Record the source of each timestamp and the start event used for each duration. Missing evidence stays unknown. Do not publish invented totals, fake leaderboard entries or unsupported claims about councils.

Before building a physical-defect register, decide evidence, privacy/consent, correction/moderation and how to establish independent reporters without exposing identities. The optional collector database does not answer those questions. This requires a separate milestone.

## Collector board, implemented source

Guest nicknames/avatars work locally. Optional official Netlify Identity sessions support database-backed profiles, opt-in public fields and collector levels. Shared counts require eligible new signed-in live user uploads with owner-bound, 30-minute-valid receipts. SQL uniqueness is per user and normalised image hash. Samples/offline/guest history is not backfilled, and no fake entries are seeded.

These are collector image-capture counts, not unique physical potholes, independently verified reporters or council submissions. Identity is enabled; preview database/migration and hosted end-to-end checks remain pending. Receipt validity is not retention: expired rows are not automatically deleted yet. See [community setup](COMMUNITY_SETUP.md).

## Creature progression, implemented experiment

The local experiment uses optional user-estimated extent and a self-reported first-noticed date. It awards 60 base XP, 10/20 for medium/large extent and 10/20/30 at 7/30/90 days since first noticed, up to 110 once per photograph. Profile and preparation time fix the award at capture; legacy records retain 60. Game power changes creature artwork without classifying engineering danger. Real uploads start unknown; map profiles and age histories belong only to labelled fictional samples.

This self-reported date does not establish actual defect age, council notification or response time. Public accountability rankings would need the stronger evidence rules above. Future bonuses for evidence quality, corroboration or follow-up are still proposals. Never encourage approaching a dangerous defect for a score.

## Today's boundary

Each browser retains its own reports and sample-inclusive collection. The optional shared service stores limited collector/hash/receipt metadata, not photos, coordinates or report text. Local duplicate checks and shared per-user normalised-image uniqueness do not identify a physical pothole globally. There is no shared physical-defect register, verified independent-resident count, authority acknowledgement integration or verified repair tracking. Map histories are labelled fictional, not public statistics.
