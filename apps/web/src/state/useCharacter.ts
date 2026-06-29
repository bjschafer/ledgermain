/**
 * The single React binding between the pure model, the engine, and persistence.
 * Components stay thin: they read `doc`/`sheet` and call `update(fn)` with a pure
 * transition from `model/doc`. `compute()` is pure and cheap, so the derived
 * sheet is recomputed on every document change (DESIGN.md §3.2 / Stage 2 notes).
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { compute } from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { db, loadOrCreateActive } from "../db/characters.js";
import { loadRefData } from "../refdata/loader.js";

export type LoadStatus = "loading" | "ready" | "error";

export interface CharacterStore {
  status: LoadStatus;
  error?: string;
  refData?: RefData;
  doc?: CharacterDoc;
  sheet?: DerivedSheet;
  /** Apply a pure transition (from model/doc) to the working document. */
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
}

export function useCharacter(): CharacterStore {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string>();
  const [refData, setRefData] = useState<RefData>();
  const [doc, setDoc] = useState<CharacterDoc>();

  useEffect(() => {
    let alive = true;
    Promise.all([loadRefData(), loadOrCreateActive()])
      .then(([ref, loaded]) => {
        if (!alive) return;
        setRefData(ref);
        setDoc(loaded);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  // Autosave to IndexedDB (debounced). Version stays put until Stage 5 adds the
  // sync push that needs optimistic-concurrency bumps.
  useEffect(() => {
    if (!doc) return;
    const id = setTimeout(() => {
      void db.characters.put({ ...doc, updatedAt: new Date().toISOString() });
    }, 300);
    return () => clearTimeout(id);
  }, [doc]);

  const update = useCallback((fn: (d: CharacterDoc) => CharacterDoc) => {
    setDoc((prev) => (prev ? fn(prev) : prev));
  }, []);

  const sheet = useMemo(
    () => (doc && refData ? compute(doc, refData) : undefined),
    [doc, refData],
  );

  return { status, error, refData, doc, sheet, update };
}
