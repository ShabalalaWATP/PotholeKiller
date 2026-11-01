import type { MonsterProfile } from "./power";

/** Invented encounter histories. These are never records of council reports. */
export const demoMonsters = [
  { position: [51.5483, -0.0669], name: "Lord Potholious", sample: "pothole", colour: "mint", extent: "large", ageDays: 120 },
  { position: [51.5425, -0.0519], name: "Count Crackula", sample: "crack", colour: "purple", extent: "unknown", ageDays: 32 },
  { position: [51.5364, -0.0661], name: "Baron von Bump", sample: "pothole", colour: "coral", extent: "medium", ageDays: 8 },
  { position: [51.554, -0.047], name: "Sir Cracksalot", sample: "crack", colour: "yellow", extent: "unknown", ageDays: 2 },
] as const;

export function demoMonsterProfile(marker: typeof demoMonsters[number], asOf = new Date()): MonsterProfile {
  const firstObserved = new Date(asOf);
  firstObserved.setUTCDate(firstObserved.getUTCDate() - marker.ageDays);
  return { extent: marker.extent, firstObservedOn: firstObserved.toISOString().slice(0, 10) };
}
