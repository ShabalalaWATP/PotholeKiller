import { z } from "zod";

const calendarDateSchema = z.iso.date().refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, { message: "Choose a valid calendar date." });

/** Optional user observations affect the game, never an engineering safety rating. */
export const MonsterProfileSchema = z.object({
  extent: z.enum(["unknown", "small", "medium", "large"]).default("unknown"),
  firstObservedOn: calendarDateSchema.nullable().default(null),
}).default({ extent: "unknown", firstObservedOn: null });

export type MonsterProfile = z.infer<typeof MonsterProfileSchema>;
export const BASE_CAPTURE_XP = 60;

export function defaultMonsterProfile(): MonsterProfile {
  return { extent: "unknown", firstObservedOn: null };
}

/** Uses calendar days in UTC so elapsed days do not change with daylight saving. */
export function monsterPower(profile: MonsterProfile, asOfISO: string) {
  const validated = MonsterProfileSchema.parse(profile);
  const asOf = z.iso.datetime().parse(asOfISO).slice(0, 10);
  if (validated.firstObservedOn && validated.firstObservedOn > asOf) {
    throw new Error("The first-noticed date cannot be after report preparation.");
  }
  const ageDays = validated.firstObservedOn === null ? null : Math.floor(
    (Date.parse(`${asOf}T00:00:00.000Z`) - Date.parse(`${validated.firstObservedOn}T00:00:00.000Z`)) / 86_400_000,
  );
  const sizeBonus = { unknown: 0, small: 0, medium: 10, large: 20 }[validated.extent];
  const ageBonus = ageDays === null || ageDays < 7 ? 0
    : ageDays < 30 ? 10 : ageDays < 90 ? 20 : 30;
  const bonusXp = sizeBonus + ageBonus;
  const score = Math.min(10, 1 + bonusXp / 5);
  const tier = score <= 2 ? "Mild nuisance"
    : score <= 5 ? "Street rascal"
    : score <= 8 ? "Asphalt menace" : "Neighbourhood boss";
  return { score, tier, ageDays, sizeBonus, ageBonus, bonusXp, captureXp: BASE_CAPTURE_XP + bonusXp };
}
