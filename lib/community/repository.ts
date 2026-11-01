import type { ProfileInput, ProfileStats, ScanReceipt } from "./schema";

export type StoredClaim = { receiptId: string; preparedAtISO: string; awardedXp: number };
export type ClaimResult = { awardedXp: number; duplicate: boolean };

/** Authentication has already resolved the user ID before reaching persistence. */
export interface CommunityRepository {
  getProfile(userId: string): Promise<ProfileStats | null>;
  leaderboard(): Promise<ProfileStats[]>;
  saveProfile(userId: string, input: ProfileInput): Promise<void>;
  claimCapture(userId: string, input: StoredClaim, now: Date): Promise<ClaimResult>;
  issueReceipt(userId: string, imageHash: string, now: Date): Promise<ScanReceipt>;
}
