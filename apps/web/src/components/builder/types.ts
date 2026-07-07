import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

/** Props every builder section receives — a thin view over the character store. */
export interface BuilderProps {
  doc: CharacterDoc;
  sheet: DerivedSheet;
  refData: RefData;
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
  /**
   * One-step undo (feedback/toasts+undo audit slice) — see
   * `useCharacter().undoLast`. Optional here since most sections don't wire
   * an Undo action; only surfaced by a couple of tracker panels (New Day,
   * big HP changes) that pass it as a toast action.
   */
  undoLast?: () => void;
}
