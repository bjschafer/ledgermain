/**
 * The single React binding between the pure model, the engine, and persistence.
 * Components stay thin: they read `doc`/`sheet` and call `update(fn)` with a pure
 * transition from `model/doc`. `compute()` is pure and cheap, so the derived
 * sheet is recomputed on every document change (DESIGN.md §3.2 / Stage 2 notes).
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { compute } from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import {
  type CharacterSummary,
  createCharacter as createCharacterDb,
  db,
  deleteCharacter as deleteCharacterDb,
  importCharacter as importCharacterDb,
  listCharacters,
  loadCharacter as loadCharacterDb,
  loadOrCreateActive,
  resetAllCharacters,
} from "../db/characters.js";
import { reconcileGrantedCantrips } from "../model/preparedSpells.js";
import { loadRefData } from "../refdata/loader.js";

export type LoadStatus = "loading" | "ready" | "error";

export interface CharacterStore {
  status: LoadStatus;
  error?: string;
  refData?: RefData;
  doc?: CharacterDoc;
  sheet?: DerivedSheet;
  /** Saved characters on this device, most-recently-active first. */
  characters: CharacterSummary[];
  /** Apply a pure transition (from model/doc) to the working document. */
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
  /** Make a different saved character the active one. */
  switchCharacter: (id: string) => Promise<void>;
  /** Create a brand-new blank character and make it active. */
  createCharacter: () => Promise<void>;
  /** Adopt an already-parsed/validated imported document as the active character. */
  importCharacter: (doc: CharacterDoc) => Promise<void>;
  /** Wipe every saved character on this device and start over with one blank doc. */
  resetAll: () => Promise<void>;
  /** Delete a single saved character; another (or a fresh blank one) becomes active. */
  deleteCharacter: (id: string) => Promise<void>;
}

export function useCharacter(): CharacterStore {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string>();
  const [refData, setRefData] = useState<RefData>();
  const [doc, setDoc] = useState<CharacterDoc>();
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);

  const refreshList = useCallback(() => {
    void listCharacters().then(setCharacters);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([loadRefData(), loadOrCreateActive()])
      .then(([ref, loaded]) => {
        if (!alive) return;
        setRefData(ref);
        // `loaded` is already migrateDoc'd by the loader; reconcile strips any
        // granted cantrips a pre-change doc may have stored in `known`/`prepared`
        // (cantrips are now derived from the class list, not stored).
        setDoc(reconcileGrantedCantrips(loaded, ref));
        setStatus("ready");
        refreshList();
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [refreshList]);

  // Autosave to IndexedDB (debounced). Version stays put until Stage 5 adds the
  // sync push that needs optimistic-concurrency bumps.
  useEffect(() => {
    if (!doc) return;
    const id = setTimeout(() => {
      void db.characters
        .put({ ...doc, updatedAt: new Date().toISOString() })
        .then(refreshList);
    }, 300);
    return () => clearTimeout(id);
  }, [doc, refreshList]);

  const update = useCallback((fn: (d: CharacterDoc) => CharacterDoc) => {
    setDoc((prev) => (prev ? fn(prev) : prev));
  }, []);

  const adopt = useCallback(
    (loaded: CharacterDoc) => {
      if (!refData) {
        throw new Error(
          "Cannot switch characters before reference data has loaded",
        );
      }
      setDoc(reconcileGrantedCantrips(loaded, refData));
      refreshList();
    },
    [refData, refreshList],
  );

  const switchCharacter = useCallback(
    async (id: string) => adopt(await loadCharacterDb(id)),
    [adopt],
  );

  const createCharacter = useCallback(
    async () => adopt(await createCharacterDb()),
    [adopt],
  );

  const importCharacter = useCallback(
    async (parsed: CharacterDoc) => adopt(await importCharacterDb(parsed)),
    [adopt],
  );

  const resetAll = useCallback(
    async () => adopt(await resetAllCharacters()),
    [adopt],
  );

  const deleteCharacter = useCallback(
    async (id: string) => adopt(await deleteCharacterDb(id)),
    [adopt],
  );

  const sheet = useMemo(
    () => (doc && refData ? compute(doc, refData) : undefined),
    [doc, refData],
  );

  return {
    status,
    error,
    refData,
    doc,
    sheet,
    characters,
    update,
    switchCharacter,
    createCharacter,
    importCharacter,
    resetAll,
    deleteCharacter,
  };
}
