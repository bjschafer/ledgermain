import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import type { SessionLogEntry } from "../../model/sessionLog.js";

/** Props every builder section receives — a thin view over the character store. */
export interface BuilderProps {
  doc: CharacterDoc;
  sheet: DerivedSheet;
  refData: RefData;
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
  /**
   * Undo — see `useCharacter().undoLast`. Optional here since most sections
   * don't wire an Undo action; only surfaced by a couple of tracker panels
   * (New Day, big HP changes) that pass it as a toast action.
   */
  undoLast?: () => void;
  /** Whether `undoLast` has a step left to walk back. Paired with `undoLast`. */
  canUndo?: boolean;
  /**
   * The passive session log (`model/sessionLog.ts`), oldest first. Only the
   * Session Log panel reads it, hence optional here like `undoLast`.
   */
  sessionLog?: SessionLogEntry[];
  /** Forget the session log. Paired with `sessionLog`. */
  onClearSessionLog?: () => void;
}
