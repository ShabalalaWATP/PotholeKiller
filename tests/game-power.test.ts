import { describe, expect, it, vi } from "vitest";
import { defaultMonsterProfile, MonsterProfileSchema, monsterPower } from "../lib/game/power";
import { addCapture, captureXpForReport, emptyGameState, playerProgress } from "../lib/game/progression";
import { readGameState } from "../lib/game/storage";
import { prepareReport, ReportRecordSchema } from "../lib/reporting/report";
import { validReportInput } from "./game-fixtures";

const capturedAt = "2026-11-01T13:00:00.000Z";
const dateBefore = (days: number) => new Date(Date.parse(capturedAt) - days * 86_400_000).toISOString().slice(0, 10);

describe("optional monster observations", () => {
  it("defaults omitted observations to unknown, preserving the original 60 XP award", () => {
    expect(defaultMonsterProfile()).toEqual({ extent: "unknown", firstObservedOn: null });
    expect(MonsterProfileSchema.parse(undefined)).toEqual(defaultMonsterProfile());
    expect(MonsterProfileSchema.parse({})).toEqual(defaultMonsterProfile());
    expect(monsterPower(defaultMonsterProfile(), capturedAt)).toEqual({
      score: 1,
      tier: "Mild nuisance",
      ageDays: null,
      sizeBonus: 0,
      ageBonus: 0,
      bonusXp: 0,
      captureXp: 60,
    });
    const first = defaultMonsterProfile();
    first.extent = "large";
    expect(defaultMonsterProfile().extent).toBe("unknown");
  });

  it.each(["2026-02-30", "2025-02-29", "2026-04-31", "2026-13-01", "2026-11-00", "01/11/2026", "yesterday", "2026-11-01T12:00:00Z"])("rejects an invalid calendar date: %s", (firstObservedOn) => {
    expect(MonsterProfileSchema.safeParse({ extent: "small", firstObservedOn }).success).toBe(false);
  });

  it("accepts leap days and rejects an unsupported size or invalid capture date", () => {
    expect(MonsterProfileSchema.parse({ firstObservedOn: "2024-02-29" }).firstObservedOn).toBe("2024-02-29");
    expect(MonsterProfileSchema.safeParse({ extent: "enormous" }).success).toBe(false);
    expect(() => monsterPower(defaultMonsterProfile(), "not-a-date")).toThrow();
  });

  it("rejects future observations against the report date", () => {
    const profile = { extent: "large", firstObservedOn: "2026-11-02" } as const;
    expect(() => monsterPower(profile, capturedAt)).toThrow("cannot be after report preparation");
    expect(() => prepareReport(validReportInput({ monsterProfile: profile }))).toThrow("cannot be after report preparation");
    const record = prepareReport(validReportInput());
    expect(ReportRecordSchema.safeParse({ ...record, monsterProfile: profile }).success).toBe(false);
  });
});

describe("deterministic game power and bonus XP", () => {
  it.each([
    ["unknown", 0],
    ["small", 0],
    ["medium", 10],
    ["large", 20],
  ] as const)("awards %s extent bonus of %i XP", (extent, sizeBonus) => {
    expect(monsterPower({ extent, firstObservedOn: null }, capturedAt)).toMatchObject({ sizeBonus, bonusXp: sizeBonus, captureXp: 60 + sizeBonus, ageDays: null });
  });

  it.each([
    [0, 0],
    [6, 0],
    [7, 10],
    [29, 10],
    [30, 20],
    [89, 20],
    [90, 30],
    [365, 30],
  ])("awards a %i-day observation bonus of %i XP", (ageDays, ageBonus) => {
    expect(monsterPower({ extent: "unknown", firstObservedOn: dateBefore(ageDays) }, capturedAt)).toMatchObject({ ageDays, ageBonus, bonusXp: ageBonus, captureXp: 60 + ageBonus });
  });

  it("combines bonuses to a maximum of 110 XP and a maximum power of ten", () => {
    const result = monsterPower({ extent: "large", firstObservedOn: "2020-01-01" }, capturedAt);
    expect(result).toMatchObject({ sizeBonus: 20, ageBonus: 30, bonusXp: 50, captureXp: 110, score: 10, tier: "Neighbourhood boss" });
    expect(monsterPower({ extent: "medium", firstObservedOn: null }, capturedAt).tier).toBe("Street rascal");
    expect(monsterPower({ extent: "large", firstObservedOn: dateBefore(7) }, capturedAt).tier).toBe("Asphalt menace");
  });

  it("uses full calendar days consistently across daylight-saving boundaries", () => {
    const profile = { extent: "small", firstObservedOn: "2026-10-25" } as const;
    expect(monsterPower(profile, "2026-11-01T00:00:00.000Z").ageDays).toBe(7);
    expect(monsterPower(profile, "2026-11-01T23:59:59.999Z").ageDays).toBe(7);
  });
});

describe("reviewed reports and immutable capture rewards", () => {
  it("includes explicitly user-reported observations, keeping game power out of the council draft", () => {
    const report = prepareReport(validReportInput({ monsterProfile: { extent: "large", firstObservedOn: dateBefore(90) } }));
    expect(report.monsterProfile.extent).toBe("large");
    expect(report.body).toContain("User-reported apparent extent: large (qualitative estimate; no measurements supplied)");
    expect(report.body).toContain(`First noticed by user: ${dateBefore(90)} (self-reported`);
    expect(report.body).toContain("does not establish defect age, council notification or repair history");
    expect(report.body).not.toMatch(/XP|monster power|Neighbourhood boss/);
    expect(report.subject).not.toMatch(/XP|monster power|Neighbourhood boss/);
    expect(captureXpForReport(report)).toBe(110);
    const captured = addCapture(emptyGameState(), report);
    expect(captured.awardedXp).toBe(110);
    expect(playerProgress(captured.state).xp).toBe(110);
  });

  it("omits unknown qualitative observations rather than inventing them", () => {
    const report = prepareReport(validReportInput());
    expect(report.body).not.toContain("First noticed by user");
    expect(report.body).not.toContain("User-reported apparent extent");
    expect(report.monsterProfile).toEqual(defaultMonsterProfile());
  });

  it("fixes XP at report preparation, regardless of how much time later passes", () => {
    const report = prepareReport(validReportInput({ monsterProfile: { extent: "medium", firstObservedOn: dateBefore(6) } }));
    const captured = addCapture(emptyGameState(), report);
    expect(captured.awardedXp).toBe(70);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-11-01T13:00:00.000Z"));
    try {
      expect(playerProgress(captured.state).xp).toBe(70);
      expect(captureXpForReport(report)).toBe(70);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cannot upgrade an already captured photo by changing size, age or preparation date", () => {
    const original = prepareReport(validReportInput());
    const initial = addCapture(emptyGameState(), original);
    const upgraded = prepareReport(validReportInput({
      preparedAt: "2027-11-01T13:00:00.000Z",
      monsterProfile: { extent: "large", firstObservedOn: "2026-01-01" },
    }));
    const duplicate = addCapture(initial.state, upgraded);
    expect(duplicate).toMatchObject({ awardedXp: 0, duplicate: true });
    expect(duplicate.state.captures[0]).toEqual(original);
    expect(playerProgress(duplicate.state).xp).toBe(60);
  });

  it("restores version-one saved records without a profile at their original 60 XP", () => {
    const record = prepareReport(validReportInput());
    const legacy = { ...record } as Record<string, unknown>;
    delete legacy.monsterProfile;
    const restored = readGameState({ getItem: () => JSON.stringify({ version: 1, captures: [legacy], rejectedScan: false, xp: 99999 }) });
    expect(restored.captures).toHaveLength(1);
    expect(restored.captures[0].monsterProfile).toEqual(defaultMonsterProfile());
    expect(playerProgress(restored).xp).toBe(60);
    expect(addCapture(restored, record).awardedXp).toBe(0);
  });

  it("sums frozen per-record awards rather than accepting an arbitrary XP total", () => {
    const first = addCapture(emptyGameState(), prepareReport(validReportInput()));
    const second = addCapture(first.state, prepareReport(validReportInput({
      imageHash: "b".repeat(64),
      monsterProfile: { extent: "large", firstObservedOn: dateBefore(30) },
    })));
    expect(second.awardedXp).toBe(100);
    expect(playerProgress(second.state)).toMatchObject({ xp: 160, level: 2, collected: 2, levelXp: 40 });
  });
});
