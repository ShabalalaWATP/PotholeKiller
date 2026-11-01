import type { PublishRoadIssue, RoadIssue } from "./schema";

export type RoadMutationResult = {
  issue: RoadIssue; duplicate: boolean; rewardAwarded?: boolean; reportBonusXp?: number; reporterOrdinal?: number;
};

export interface RoadRepository {
  list(): Promise<RoadIssue[]>;
  publish(userId: string, input: PublishRoadIssue, now: Date): Promise<RoadMutationResult>;
  confirmFixed(userId: string, roles: readonly string[], issueId: string, now: Date): Promise<RoadMutationResult>;
}
