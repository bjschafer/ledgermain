/**
 * The single React binding between the pure model, the engine, and persistence.
 * Components stay thin: they read `doc`/`sheet` and call `update(fn)` with a pure
 * transition from `model/doc`. `compute()` is pure and cheap, so the derived
 * sheet is recomputed on every document change (DESIGN.md §3.2 / Stage 2 notes).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  /** True while a character-management action (below) is in flight. */
  actionPending: boolean;
  /** Message from the most recent failed character-management action, if any. */
  actionError?: string;
  /** Dismiss the current `actionError` without taking another action. */
  clearActionError: () => void;
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
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string>();

  const clearActionError = useCallback(() => setActionError(undefined), []);

  // Full re-fetch — only worth its IndexedDB table scan when the saved-character
  // *set* actually changed (switch/create/import/delete/reset), not on every edit.
  const refreshList = useCallback(async () => {
    setCharacters(await listCharacters());
  }, []);

  // Cheap local patch for the common case: an autosave that only changed the
  // active character's own content (e.g. a renamed identity). Avoids re-reading
  // every saved character's full document body on every debounced edit.
  const upsertLocalSummary = useCallback((d: CharacterDoc) => {
    setCharacters((prev) => {
      const next = prev.filter((c) => c.id !== d.id);
      next.push({ id: d.id, name: d.identity.name, updatedAt: d.updatedAt });
      next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return next;
    });
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
        void refreshList();
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
  // sync push that needs optimistic-concurrency bumps. The pending timer is kept
  // in a ref (not just the effect's local closure) so character-switching actions
  // below can flush or cancel it explicitly instead of losing the race to it.
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!doc) return;
    pendingSaveRef.current = setTimeout(() => {
      pendingSaveRef.current = null;
      const next = { ...doc, updatedAt: new Date().toISOString() };
      void db.characters
        .put(next)
        .then(() => upsertLocalSummary(next))
        .catch((e: unknown) => {
          setActionError(e instanceof Error ? e.message : String(e));
        });
    }, 300);
    return () => {
      if (pendingSaveRef.current != null) {
        clearTimeout(pendingSaveRef.current);
        pendingSaveRef.current = null;
      }
    };
  }, [doc, upsertLocalSummary]);

  /** Write the current doc immediately if an autosave is pending, then clear the timer. */
  const flushPendingSave = useCallback(async () => {
    if (pendingSaveRef.current == null || !doc) return;
    clearTimeout(pendingSaveRef.current);
    pendingSaveRef.current = null;
    const next = { ...doc, updatedAt: new Date().toISOString() };
    await db.characters.put(next);
    upsertLocalSummary(next);
  }, [doc, upsertLocalSummary]);

  /** Discard a pending autosave without writing it (the doc is about to be deleted/wiped). */
  const cancelPendingSave = useCallback(() => {
    if (pendingSaveRef.current != null) {
      clearTimeout(pendingSaveRef.current);
      pendingSaveRef.current = null;
    }
  }, []);

  const update = useCallback((fn: (d: CharacterDoc) => CharacterDoc) => {
    setDoc((prev) => (prev ? fn(prev) : prev));
  }, []);

  const adopt = useCallback(
    async (loaded: CharacterDoc) => {
      if (!refData) {
        throw new Error("Cannot switch characters before reference data has loaded");
      }
      const reconciled = reconcileGrantedCantrips(loaded, refData);
      // Refresh the list before flipping `doc`, so the two land in the same
      // render — otherwise the switcher briefly shows an id with no matching
      // option (its list query resolves a tick after `doc` does).
      const list = await listCharacters();
      setCharacters(list);
      setDoc(reconciled);
    },
    [refData],
  );

  /** Runs a character-management action with pending/error tracking and re-entrancy guarding. */
  const runAction = useCallback(async (fn: () => Promise<void>) => {
    setActionPending(true);
    setActionError(undefined);
    try {
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionPending(false);
    }
  }, []);

  const switchCharacter = useCallback(
    (id: string) =>
      runAction(async () => {
        await flushPendingSave();
        await adopt(await loadCharacterDb(id));
      }),
    [adopt, flushPendingSave, runAction],
  );

  const createCharacter = useCallback(
    () =>
      runAction(async () => {
        await flushPendingSave();
        await adopt(await createCharacterDb());
      }),
    [adopt, flushPendingSave, runAction],
  );

  const importCharacter = useCallback(
    (parsed: CharacterDoc) =>
      runAction(async () => {
        await flushPendingSave();
        await adopt(await importCharacterDb(parsed));
      }),
    [adopt, flushPendingSave, runAction],
  );

  const resetAll = useCallback(
    () =>
      runAction(async () => {
        cancelPendingSave();
        await adopt(await resetAllCharacters());
      }),
    [adopt, cancelPendingSave, runAction],
  );

  const deleteCharacter = useCallback(
    (id: string) =>
      runAction(async () => {
        if (doc?.id === id) cancelPendingSave();
        await adopt(await deleteCharacterDb(id));
      }),
    [adopt, cancelPendingSave, runAction, doc],
  );

  const sheet = useMemo(() => (doc && refData ? compute(doc, refData) : undefined), [doc, refData]);

  // A freshly created character starts at 0/0 HP (no class picked yet); once
  // building gives it its first nonzero max, start at full instead of forcing
  // a manual "Rest" click before play. Only fires on that first 0 -> nonzero
  // transition (guarded by current/temp both still being untouched), so it
  // never overrides HP the player has since tracked in Play mode.
  const prevMaxHpRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!sheet) return;
    const max = sheet.hp.max;
    const prevMax = prevMaxHpRef.current;
    prevMaxHpRef.current = max;
    if (prevMax === 0 && max > 0) {
      setDoc((d) =>
        d && d.live.hp.current === 0 && d.live.hp.temp === 0
          ? { ...d, live: { ...d.live, hp: { ...d.live.hp, current: max } } }
          : d,
      );
    }
  }, [sheet]);

  return {
    status,
    error,
    refData,
    doc,
    sheet,
    characters,
    actionPending,
    actionError,
    clearActionError,
    update,
    switchCharacter,
    createCharacter,
    importCharacter,
    resetAll,
    deleteCharacter,
  };
}
