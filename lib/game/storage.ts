import { emptyGameState, GameStateSchema, type GameState } from "./progression";

export const GAME_STORAGE_KEY = "potholekiller.game.v1";
const MAX_STORAGE_CHARACTERS = 2_000_000;

export type GameStorage = Pick<Storage, "getItem" | "setItem">;

/** Storage is supplied by the browser caller, keeping SSR and tests side-effect free. */
export function readGameState(storage: Pick<GameStorage, "getItem">): GameState {
  try {
    const raw = storage.getItem(GAME_STORAGE_KEY);
    if (!raw || raw.length > MAX_STORAGE_CHARACTERS) return emptyGameState();
    const parsed = GameStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyGameState();
  } catch {
    return emptyGameState();
  }
}

export function saveGameState(
  storage: Pick<GameStorage, "setItem">,
  state: GameState,
): { ok: true } | { ok: false; error: string } {
  try {
    const serialised = JSON.stringify(GameStateSchema.parse(state));
    if (serialised.length > MAX_STORAGE_CHARACTERS) {
      return { ok: false, error: "Your local collection is too large to save. Copy your report before closing this page." };
    }
    storage.setItem(GAME_STORAGE_KEY, serialised);
    return { ok: true };
  } catch {
    return { ok: false, error: "Your browser could not save your collection. Copy your report before closing this page." };
  }
}
