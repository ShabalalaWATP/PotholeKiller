export const REPAIR_CONFIRMATION_THRESHOLD = 5;

/** The server supplies real roles; the labelled mock world supplies fictional roles. */
export function voteWeight(roles: readonly string[]): 1 | 3 {
  return roles.includes("council_verified") ? 3 : 1;
}

/** This threshold records a community claim, not an independently verified repair. */
export function isCommunityFixed(points: number): boolean {
  return Number.isInteger(points) && points >= REPAIR_CONFIRMATION_THRESHOLD;
}

/** Once-only enforcement belongs to the issue/reporter reward key, not a mutable XP counter. */
export function repairBonus(originalReportXp: number): number {
  if (!Number.isInteger(originalReportXp) || originalReportXp < 60 || originalReportXp > 170) {
    throw new Error("Repair bonuses must match a valid original report award.");
  }
  return originalReportXp;
}

/** The server assigns the ordinal once while holding the issue lock. */
export function reportOrderBonus(ordinal: number): number {
  if (!Number.isInteger(ordinal) || ordinal < 1) throw new Error("Reporter order must be a positive integer.");
  return ordinal === 1 ? 60 : ordinal <= 5 ? 20 : 5;
}
