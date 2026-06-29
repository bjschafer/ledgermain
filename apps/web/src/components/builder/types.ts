import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

/** Props every builder section receives — a thin view over the character store. */
export interface BuilderProps {
  doc: CharacterDoc;
  sheet: DerivedSheet;
  refData: RefData;
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
}
