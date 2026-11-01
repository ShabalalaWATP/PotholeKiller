import { z } from "zod";
import { MonsterProfileSchema } from "../game/power";

const LocationSchema = z.object({ lat: z.number().finite().min(49.7).max(61.1), lng: z.number().finite().min(-8.7).max(2.1) }).strict();
export const RoadIssueTypeSchema = z.enum(["cracking", "small", "medium", "large"]);
export const RoadIssueSchema = z.object({
  id: z.uuid(), label: z.string().min(1).max(200), location: LocationSchema,
  type: RoadIssueTypeSchema, monsterProfile: MonsterProfileSchema,
  createdAtISO: z.iso.datetime(), status: z.enum(["open", "community_fixed"]),
  confirmationPoints: z.number().int().min(0).max(2_147_483_647),
  confirmationCount: z.number().int().min(0).max(2_147_483_647),
  reportCount: z.number().int().min(1).max(2_147_483_647),
}).strict().refine(issue => issue.monsterProfile.firstObservedOn === null ||
  issue.monsterProfile.firstObservedOn <= issue.createdAtISO.slice(0, 10), {
  path: ["monsterProfile", "firstObservedOn"], message: "The first-noticed date cannot be after issue publication.",
});
export const PublishRoadIssueSchema = z.object({
  action: z.literal("publish"), receiptId: z.uuid(), existingIssueId: z.uuid().optional(),
  label: z.string().min(1).max(200).refine(value => !/[\u0000-\u001f\u007f]/.test(value)).transform(value => value.trim()).refine(Boolean),
  location: LocationSchema, type: RoadIssueTypeSchema, monsterProfile: MonsterProfileSchema,
}).strict();
export const ConfirmFixedSchema = z.object({ action: z.literal("confirm_fixed"), issueId: z.uuid() }).strict();
export const RoadMutationSchema = z.discriminatedUnion("action", [PublishRoadIssueSchema, ConfirmFixedSchema]);
export const RoadIssuesResponseSchema = z.object({ issues: z.array(RoadIssueSchema).max(200) }).strict();
export const RoadMutationResponseSchema = z.object({
  issue: RoadIssueSchema, duplicate: z.boolean(), rewardAwarded: z.boolean().optional(),
  reportBonusXp: z.union([z.literal(0), z.literal(5), z.literal(20), z.literal(60)]).optional(),
  reporterOrdinal: z.number().int().min(1).max(2_147_483_647).optional(),
}).strict();
export type RoadIssue = z.infer<typeof RoadIssueSchema>;
export type PublishRoadIssue = z.infer<typeof PublishRoadIssueSchema>;
export type RoadMutation = z.infer<typeof RoadMutationSchema>;
