import { z } from "zod";
import { MonsterProfileSchema } from "../game/power";

export const AvatarSchema = z.enum(["gremlin", "crackling", "puddle", "beast"]);
export const AuthUserIdSchema = z.uuid();
export const ImageHashSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const ProfileInputSchema = z.object({
  displayName: z.string().trim().min(2).max(24).regex(/^[\p{L}\p{N}][\p{L}\p{N} ._'’-]*$/u, "Use letters, numbers and simple punctuation."),
  avatar: AvatarSchema,
  published: z.boolean(),
}).strict();

export const CaptureClaimSchema = z.object({
  receiptId: z.uuid(),
  monsterProfile: MonsterProfileSchema,
  preparedAtISO: z.iso.datetime(),
}).strict();

export const ProfileUpdateSchema = ProfileInputSchema;
export const ClaimCaptureSchema = CaptureClaimSchema;

const ProfileStatsSchema = ProfileInputSchema.extend({
  captures: z.number().int().min(0).max(2_147_483_647),
  xp: z.number().int().min(0).max(2_147_483_647),
});
export const PublicProfileSchema = ProfileStatsSchema.extend({
  level: z.number().int().min(1).max(5),
  rank: z.string().min(1).max(40),
});
export const LeaderboardEntrySchema = PublicProfileSchema.omit({ published: true }).extend({
  position: z.number().int().min(1).max(20),
});
export const CommunitySnapshotSchema = z.object({
  authenticated: z.boolean(),
  profile: PublicProfileSchema.nullable(),
  leaderboard: z.array(LeaderboardEntrySchema).max(20),
}).strict();

export type ProfileInput = z.infer<typeof ProfileInputSchema>;
export type CaptureClaim = z.infer<typeof CaptureClaimSchema>;
export type ProfileStats = z.infer<typeof ProfileStatsSchema>;
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type CommunitySnapshot = z.infer<typeof CommunitySnapshotSchema>;
export type ScanReceipt = { receiptId: string; expiresAt: string };

export function collectorLevel(xp: number): { level: number; rank: string } {
  const level = Math.min(5, Math.floor(xp / 120) + 1);
  const ranks = ["Crater Cadet", "Road Ranger", "Asphalt Avenger", "Pothole Predator", "Lord of the Holes"];
  return { level, rank: ranks[level - 1] };
}

/** Only explicitly public game fields are projected; auth IDs and emails never leave this boundary. */
export function publicProfile(profile: ProfileStats): PublicProfile {
  return {
    displayName: profile.displayName,
    avatar: profile.avatar,
    published: profile.published,
    captures: profile.captures,
    xp: profile.xp,
    ...collectorLevel(profile.xp),
  };
}

export function publicLeaderboard(profiles: ProfileStats[]): LeaderboardEntry[] {
  return profiles.filter(profile => profile.published).slice(0, 20).map((profile, index) => {
    const { displayName, avatar, captures, xp, level, rank } = publicProfile(profile);
    return { displayName, avatar, captures, xp, level, rank, position: index + 1 };
  });
}
