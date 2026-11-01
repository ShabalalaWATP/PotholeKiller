"use client";

import { useSyncExternalStore } from "react";
import { addCapture, emptyGameState, recordRejection, updateReportStatus, type GameState } from "@/lib/game/progression";
import { readGameState, saveGameState } from "@/lib/game/storage";
import type { ReportRecord, ReportStatus } from "@/lib/reporting/report";

const initial = emptyGameState();
let snapshot: GameState | undefined;
const listeners = new Set<() => void>();
function getSnapshot() {
  if (!snapshot) {
    try { snapshot = readGameState(window.localStorage); } catch { snapshot = emptyGameState(); }
  }
  return snapshot;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  function storageChanged(event: StorageEvent) {
    if (event.key === "potholekiller.game.v1" || event.key === null) {
      snapshot = undefined; listeners.forEach(callback => callback());
    }
  }
  window.addEventListener("storage", storageChanged);
  return () => { listeners.delete(listener); window.removeEventListener("storage", storageChanged); };
}
function persist(next: GameState) {
  snapshot = next;
  let error: string | undefined;
  try {
    const result = saveGameState(window.localStorage, next);
    if (!result.ok) error = result.error;
  } catch { error = "Your collection is available for this visit only. Copy your report before closing."; }
  listeners.forEach(listener => listener());
  return error;
}

export default function useProgress() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => initial);
  return {
    state,
    capture(record: ReportRecord) {
      const result = addCapture(getSnapshot(), record);
      return { ...result, saveError: persist(result.state) };
    },
    reject() { return persist(recordRejection(getSnapshot())); },
    setStatus(id: string, status: ReportStatus) { return persist(updateReportStatus(getSnapshot(), id, status)); },
  };
}
