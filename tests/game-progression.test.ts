import { afterEach, describe, expect, it, vi } from "vitest";
import { achievements, addCapture, attachScanReceipt, emptyGameState, GameStateSchema, MAX_CAPTURES, playerProgress, recordRejection, updateReportStatus, type GameState } from "../lib/game/progression";
import { GAME_STORAGE_KEY, readGameState, saveGameState } from "../lib/game/storage";
import { prepareReport } from "../lib/reporting/report";
import { validReportInput } from "./game-fixtures";

const report = (index = 0, isDemo = false) => prepareReport(validReportInput({
  imageHash: index.toString(16).padStart(64, "0"),
  isDemo,
}));

describe("once-only local rewards", () => {
  it("starts as a Crater Cadet with no XP or achievements", () => {
    const state = emptyGameState();
    expect(playerProgress(state)).toEqual({ xp: 0, level: 1, rank: "Crater Cadet", levelXp: 0, nextLevelXp: 120, progress: 0, collected: 0 });
    expect(achievements(state)).toEqual([]);
  });

  it("awards 60 XP once for a valid report and leaves the previous state untouched", () => {
    const initial = emptyGameState();
    const first = addCapture(initial, report());
    expect(initial.captures).toEqual([]);
    expect(first.awardedXp).toBe(60);
    expect(first.duplicate).toBe(false);
    expect(playerProgress(first.state)).toMatchObject({ xp: 60, progress: 50, collected: 1 });
    expect(achievements(first.state)).toEqual(["first_blood"]);
    const repeated = addCapture(first.state, report());
    expect(repeated).toEqual({ state: first.state, awardedXp: 0, duplicate: true });
  });

  it("does not allow moving a map pin or editing a report to farm the same photo", () => {
    const first = addCapture(emptyGameState(), report());
    const changed = prepareReport(validReportInput({
      imageHash: report().imageHash,
      location: { lat: 51.54, lng: -0.06 },
      description: "A corrected description of the same image.",
    }));
    expect(addCapture(first.state, changed).awardedXp).toBe(0);
  });

  it("rejects captures from an invalid assessment even if a caller supplies a record", () => {
    const invalid = report();
    invalid.analysis.visibleDamage = false;
    expect(() => addCapture(emptyGameState(), invalid)).toThrow();
  });

  it("levels deterministically, unlocks three captures and caps at level five", () => {
    let state = emptyGameState();
    for (let index = 0; index < 9; index += 1) {
      state = addCapture(state, report(index)).state;
      if (index === 1) expect(playerProgress(state)).toMatchObject({ level: 2, rank: "Road Ranger", xp: 120 });
      if (index === 2) expect(achievements(state)).toEqual(["first_blood", "asphalt_avenger"]);
      if (index === 3) expect(playerProgress(state).rank).toBe("Asphalt Avenger");
      if (index === 5) expect(playerProgress(state).rank).toBe("Pothole Predator");
    }
    expect(playerProgress(state)).toMatchObject({ level: 5, rank: "Lord of the Holes", xp: 540, progress: 100, nextLevelXp: null, levelXp: 120 });
  });

  it("records an invalid-image achievement without awarding capture XP", () => {
    const initial = emptyGameState();
    const state = recordRejection(initial);
    expect(achievements(state)).toEqual(["nice_try"]);
    expect(playerProgress(state).xp).toBe(0);
    expect(initial.rejectedScan).toBe(false);
    expect(recordRejection(state)).toEqual(state);
  });

  it("bounds the local collection without discarding existing reports", () => {
    const state = { ...emptyGameState(), captures: Array.from({ length: MAX_CAPTURES }, (_, i) => report(i)) };
    expect(() => addCapture(state, report(MAX_CAPTURES))).toThrow("100-report");
    expect(addCapture(state, report(0)).duplicate).toBe(true);
    expect(state.captures).toHaveLength(MAX_CAPTURES);
  });
});

describe("honest report status", () => {
  it("records email handoff separately from user-recorded submission", () => {
    const original = addCapture(emptyGameState(), report()).state;
    const handoff = updateReportStatus(original, report().id, "email_handoff");
    expect(original.captures[0].status).toBe("draft_prepared");
    expect(handoff.captures[0].status).toBe("email_handoff");
    const submitted = updateReportStatus(handoff, report().id, "submitted_by_user");
    expect(submitted.captures[0].status).toBe("submitted_by_user");
    expect(playerProgress(submitted).xp).toBe(60);
    expect(updateReportStatus(submitted, report().id, "submitted_by_user")).toEqual(submitted);
    expect(() => updateReportStatus(submitted, report().id, "email_handoff")).toThrow("backwards");
  });

  it("allows a user to record submission via an official channel without an email handoff", () => {
    const state = addCapture(emptyGameState(), report()).state;
    expect(updateReportStatus(state, report().id, "submitted_by_user").captures[0].status).toBe("submitted_by_user");
  });

  it("rejects unknown reports, unknown statuses and all external demo status changes", () => {
    expect(() => updateReportStatus(emptyGameState(), "missing", "email_handoff")).toThrow("not in your PotholeDex");
    const normal = addCapture(emptyGameState(), report()).state;
    expect(() => updateReportStatus(normal, report().id, "repaired" as never)).toThrow("Unknown report status");
    const demo = addCapture(emptyGameState(), report(0, true)).state;
    expect(() => updateReportStatus(demo, report().id, "email_handoff")).toThrow("Demonstration");
    expect(() => updateReportStatus(demo, report().id, "submitted_by_user")).toThrow("Demonstration");
    expect(updateReportStatus(demo, report().id, "draft_prepared")).toEqual(demo);
  });
});

describe("fresh receipts for existing captures", () => {
  const oldReceipt = "a4b638dd-81ca-4ec9-8177-5195ffda702b";
  const freshReceipt = "e98a2d49-58f2-4563-b6c7-5331b34a802b";

  it("updates only the receipt while preserving the frozen report, status, observations and XP", () => {
    const original = prepareReport(validReportInput({
      scanReceiptId: oldReceipt,
      monsterProfile: { extent: "medium", firstObservedOn: "2026-01-01" },
    }));
    const captured = addCapture(emptyGameState(), original).state;
    const submitted = updateReportStatus(captured, original.id, "submitted_by_user");
    const withAnother = addCapture(submitted, report(2)).state;
    const updated = attachScanReceipt(withAnother, original.id, freshReceipt);
    expect(updated.report).toEqual({ ...withAnother.captures[0], scanReceiptId: freshReceipt });
    expect(updated.state.captures[1]).toEqual(withAnother.captures[1]);
    expect(withAnother.captures[0].scanReceiptId).toBe(oldReceipt);
    expect(playerProgress(updated.state)).toEqual(playerProgress(withAnother));
    expect(updated.report.status).toBe("submitted_by_user");
  });

  it("retains a duplicate rescan's fresh receipt across reloads without upgrading its original capture", () => {
    const original = prepareReport(validReportInput({ scanReceiptId: oldReceipt }));
    const first = addCapture(emptyGameState(), original).state;
    const rescanned = prepareReport(validReportInput({
      scanReceiptId: freshReceipt,
      preparedAt: "2027-01-01T13:00:00.000Z",
      monsterProfile: { extent: "large", firstObservedOn: "2026-01-01" },
    }));
    const duplicate = addCapture(first, rescanned);
    expect(duplicate.awardedXp).toBe(0);
    const updated = attachScanReceipt(duplicate.state, original.id, freshReceipt);
    let stored = "";
    expect(saveGameState({ setItem: (_key, value) => { stored = value; } }, updated.state)).toEqual({ ok: true });
    const reloaded = readGameState({ getItem: () => stored });
    expect(reloaded.captures[0]).toEqual({ ...original, scanReceiptId: freshReceipt });
    expect(playerProgress(reloaded).xp).toBe(60);
    expect(addCapture(reloaded, rescanned).awardedXp).toBe(0);
  });

  it("supports legacy captures without receipts and rejects invalid receipts or unknown reports", () => {
    const original = report();
    const state = addCapture(emptyGameState(), original).state;
    expect(attachScanReceipt(state, original.id, freshReceipt).report.monsterProfile).toEqual(original.monsterProfile);
    expect(() => attachScanReceipt(state, original.id, "not-a-uuid")).toThrow();
    expect(() => attachScanReceipt(state, "missing-report", freshReceipt)).toThrow("not in your PotholeDex");
    expect(state.captures[0]).not.toHaveProperty("scanReceiptId");
  });

  describe("progress hook receipt persistence", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.doUnmock("react");
      vi.resetModules();
    });

    async function loadProgress(storage: Pick<Storage, "getItem" | "setItem">) {
      vi.resetModules();
      vi.doMock("react", () => ({ useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => GameState) => getSnapshot() }));
      vi.stubGlobal("window", { localStorage: storage });
      return (await import("../lib/client/useProgress")).default;
    }

    it("persists the fresh receipt before a remote claim so reopening the draft can retry", async () => {
      const original = prepareReport(validReportInput({ scanReceiptId: oldReceipt }));
      let stored = JSON.stringify(addCapture(emptyGameState(), original).state);
      const useProgress = await loadProgress({ getItem: () => stored, setItem: (_key, value) => { stored = value; } });
      const result = useProgress().attachReceipt(original.id, freshReceipt);
      expect(result).toEqual({ report: { ...original, scanReceiptId: freshReceipt }, saveError: undefined });
      expect(readGameState({ getItem: () => stored }).captures[0].scanReceiptId).toBe(freshReceipt);
      expect(playerProgress(useProgress().state).xp).toBe(60);
    });

    it("exposes a storage failure while retaining the fresh receipt for the current visit", async () => {
      const original = prepareReport(validReportInput({ scanReceiptId: oldReceipt }));
      const stored = JSON.stringify(addCapture(emptyGameState(), original).state);
      const useProgress = await loadProgress({ getItem: () => stored, setItem: () => { throw new Error("Quota exceeded"); } });
      const result = useProgress().attachReceipt(original.id, freshReceipt);
      expect(result.report.scanReceiptId).toBe(freshReceipt);
      expect(result.saveError).toContain("could not save");
      expect(useProgress().state.captures[0].scanReceiptId).toBe(freshReceipt);
      expect(readGameState({ getItem: () => stored }).captures[0].scanReceiptId).toBe(oldReceipt);
      expect(playerProgress(useProgress().state).xp).toBe(60);
    });
  });
});

describe("defensive local storage", () => {
  it("persists limited report data and restores once-only XP across reloads", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const state = addCapture(emptyGameState(), report()).state;
    expect(saveGameState(storage, state)).toEqual({ ok: true });
    expect(values.has(GAME_STORAGE_KEY)).toBe(true);
    const restored = readGameState(storage);
    expect(restored).toEqual(state);
    expect(playerProgress(restored).xp).toBe(60);
    expect(addCapture(restored, report()).awardedXp).toBe(0);
    expect(values.get(GAME_STORAGE_KEY)).not.toContain("data:image");
  });

  it.each([
    null,
    "not json",
    JSON.stringify({ version: 999, captures: [], rejectedScan: false }),
    JSON.stringify({ version: 1, captures: [{}], rejectedScan: false }),
    "x".repeat(2_000_001),
  ])("recovers from missing, invalid or excessive storage", (value) => {
    expect(readGameState({ getItem: () => value })).toEqual(emptyGameState());
  });

  it("rejects duplicate fingerprints and forged XP, ignoring unknown data", () => {
    const duplicate = { ...emptyGameState(), captures: [report(), report()] };
    expect(GameStateSchema.safeParse(duplicate).success).toBe(false);
    expect(readGameState({ getItem: () => JSON.stringify(duplicate) })).toEqual(emptyGameState());
    const restored = readGameState({ getItem: () => JSON.stringify({ ...emptyGameState(), xp: 9999, originalImage: "private" }) });
    expect(playerProgress(restored).xp).toBe(0);
    expect(restored).not.toHaveProperty("xp");
    expect(restored).not.toHaveProperty("originalImage");
  });

  it("handles storage access denial and quota failures without throwing", () => {
    expect(readGameState({ getItem: () => { throw new Error("SecurityError"); } })).toEqual(emptyGameState());
    expect(saveGameState({ setItem: () => { throw new Error("QuotaExceededError"); } }, emptyGameState())).toMatchObject({ ok: false, error: expect.stringContaining("could not save") });
    expect(saveGameState({ setItem: () => {} }, { ...emptyGameState(), version: 2 } as never).ok).toBe(false);
  });
});
