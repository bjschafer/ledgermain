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
import { migrateDoc } from "../model/doc.js";
import { reconcileGrantedCantrips } from "../model/preparedSpells.js";
import { loadRefData } from "../refdata/loader.js";
import { pushOnChange, runOpenSync } from "../sync/backgroundSync.js";
import { deleteRemoteCharacter, fetchMe, logout as apiLogout } from "../sync/client.js";
import { apiBaseUrl } from "../sync/config.js";
import { acceptRemoteDoc, forceOverwriteDoc } from "../sync/planSync.js";
import {
  clearStoredToken,
  consumeSessionFragment,
  getStoredToken,
  loginUrl,
} from "../sync/session.js";
import { dexieSyncStore } from "../sync/store.js";
import type { SyncStatus } from "../sync/status.js";
import {
  consumeSnapshot,
  createUndoSnapshotState,
  invalidateSnapshot,
  recordSnapshot,
} from "./undoSnapshot.js";

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
  /**
   * One-step undo (feedback/toasts+undo audit slice): restores the doc as it
   * was immediately before the last `update()` call that actually changed
   * it, through the same `setDoc` path `update()` uses (so compute + the
   * autosave/push effects below all fire normally). Single-step — the
   * snapshot is a one-deep pointer (see `state/undoSnapshot.ts`), so calling
   * this twice in a row does nothing the second time rather than redoing.
   * No-op if there's nothing to undo, or if the active character changed
   * since the snapshot was taken (switch/create/import/reset/delete, a
   * remote pull/delete, or conflict resolution all invalidate it).
   */
  undoLast: () => void;
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
  /**
   * Stage 5 background sync status (DESIGN.md §2.1). `"disabled"` when
   * `VITE_API_URL` isn't configured — sync never makes a network call in
   * that case, matching this app's pre-Stage-5 behavior exactly.
   */
  syncStatus: SyncStatus;
  /** Redirect to GitHub OAuth login. No-op if sync is disabled. */
  signIn: () => void;
  /** Sign out of sync on this device — clears the local session token; characters stay local. */
  signOut: () => Promise<void>;
  /**
   * Resolve a sync conflict (only meaningful while `syncStatus.kind ===
   * "conflict"`): `"reload"` discards local edits and adopts the server's
   * copy; `"overwrite"` keeps local edits and force-pushes past the
   * server's version. Matches DESIGN §2.1's "prompts... reload?" —
   * this never auto-picks a side.
   */
  resolveConflict: (action: "reload" | "overwrite") => Promise<void>;
}

export function useCharacter(): CharacterStore {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string>();
  const [refData, setRefData] = useState<RefData>();
  const [doc, setDoc] = useState<CharacterDoc>();
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string>();
  // Seeded synchronously (no flash of "disabled" then "signed-out") — the
  // open-sync effect below upgrades this to "syncing"/"idle"/"error" once it
  // has actually checked the stored token against the API.
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    apiBaseUrl() ? { kind: "signed-out" } : { kind: "disabled" },
  );

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

  // Tracks the currently-active doc without adding `doc` as a dependency to
  // effects that shouldn't re-run on every edit (below: the open-sync effect
  // reads this to know which pulled id, if any, is the one currently on
  // screen).
  const docRef = useRef<CharacterDoc | undefined>(undefined);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // One-step undo bookkeeping (feedback/toasts+undo audit slice). The pure
  // "what's the snapshot pointer" logic lives in `state/undoSnapshot.ts`
  // (unit-tested there); this ref just gives it a stable home across
  // renders, matching every other ref-based piece of bookkeeping in this hook.
  const undoStateRef = useRef(createUndoSnapshotState());

  // Stage 5 open-sync (DESIGN.md §2.1: "each device pulls the latest on
  // open"). Runs once, after the initial local load, and never blocks
  // rendering — the app is fully usable the moment `status` is "ready"
  // regardless of how long (or whether) this resolves.
  const openSyncRanRef = useRef(false);
  useEffect(() => {
    if (status !== "ready" || openSyncRanRef.current) return;
    openSyncRanRef.current = true;
    const apiBase = apiBaseUrl();
    if (!apiBase) return; // local-only mode — no network call ever attempted
    void (async () => {
      const fragmentToken = consumeSessionFragment(window.location, window.history);
      const token = fragmentToken ?? getStoredToken();
      if (!token) {
        setSyncStatus({ kind: "signed-out" });
        return;
      }
      setSyncStatus({ kind: "syncing" });
      try {
        const ownerId = await fetchMe(apiBase, token);
        if (!ownerId) {
          clearStoredToken();
          setSyncStatus({ kind: "signed-out" });
          return;
        }
        const result = await runOpenSync(apiBase, token, dexieSyncStore);
        setSyncStatus(
          result.errors.length > 0
            ? {
                kind: "error",
                message: result.errors.map((e) => `${e.id}: ${e.message}`).join("; "),
              }
            : { kind: "idle" },
        );
        // If another device's newer copy of the character currently on
        // screen was just pulled in, refresh in-memory state immediately
        // rather than waiting for an unrelated re-render to notice.
        const activeId = docRef.current?.id;
        if (activeId && result.deleted.includes(activeId) && refData) {
          // The character on screen was deleted on another device; adopt
          // whatever remains (or a fresh blank doc) rather than keep showing a
          // doc that no longer exists in the store (#39).
          invalidateSnapshot(undoStateRef.current);
          setDoc(reconcileGrantedCantrips(await loadOrCreateActive(), refData));
        } else if (activeId && result.pulled.includes(activeId) && refData) {
          const refreshed = await db.characters.get(activeId);
          if (refreshed) {
            // The doc on screen was just overwritten by another device's
            // copy — any local undo snapshot is now for a doc that no longer
            // exists in this lineage, so drop it rather than risk restoring
            // over the just-pulled remote state.
            invalidateSnapshot(undoStateRef.current);
            setDoc(reconcileGrantedCantrips(refreshed, refData));
          }
        }
        if (result.pulled.length > 0 || result.pushed.length > 0 || result.deleted.length > 0)
          void refreshList();
      } catch (e) {
        setSyncStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [status, refData, refreshList]);

  // Autosave to IndexedDB (debounced). The pending timer is kept in a ref
  // (not just the effect's local closure) so character-switching actions
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

  // Stage 5 push-on-change (DESIGN.md §2.1: "...and pushes on change").
  // `pendingUserEditRef` is set by `update()` immediately before the `doc`
  // change that triggers this effect, and consumed (read + cleared) here —
  // this is what distinguishes "the user actually edited something" from
  // every *other* reason `doc` can change (switching/importing/resetting a
  // character, the HP-autofill effect below, the initial load itself), none
  // of which should provoke a push: those either aren't new information for
  // the server, or (switch/import/reset) go through their own explicit
  // `adopt()` path instead. Best-effort and silent-by-default: a flaky
  // connection or a stale-version conflict only ever update `syncStatus`,
  // never the doc-editing path itself (the project's "never require a
  // server round trip" rule, applied to sync).
  const pendingUserEditRef = useRef(false);
  const pendingPushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!doc || !pendingUserEditRef.current) return;
    pendingUserEditRef.current = false;
    const apiBase = apiBaseUrl();
    if (!apiBase) return;
    const token = getStoredToken();
    if (!token) return;
    const docToPush = doc;
    pendingPushRef.current = setTimeout(() => {
      pendingPushRef.current = null;
      void (async () => {
        setSyncStatus((prev) => (prev.kind === "conflict" ? prev : { kind: "syncing" }));
        const outcome = await pushOnChange(apiBase, token, docToPush);
        if (outcome.kind === "ok") {
          setSyncStatus((prev) => (prev.kind === "conflict" ? prev : { kind: "idle" }));
        } else if (outcome.kind === "conflict") {
          setSyncStatus({ kind: "conflict", conflict: outcome.conflict });
        } else {
          setSyncStatus({ kind: "error", message: outcome.message });
        }
      })();
    }, 2000);
    return () => {
      if (pendingPushRef.current != null) {
        clearTimeout(pendingPushRef.current);
        pendingPushRef.current = null;
      }
    };
  }, [doc]);

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
    setDoc((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      // Every call here is a genuine local edit (a UI-triggered model
      // transition) — bump the sync version so Stage 5's optimistic-
      // concurrency push/pull (src/sync/) has a monotonic counter to compare
      // against. Skip the bump when the transition itself signals "no
      // change" via reference equality (the established `return doc;` guard
      // pattern throughout model/doc.ts, e.g. blank-input no-ops) — this is
      // never called by a background effect, only by explicit user actions,
      // so bumping unconditionally on real transitions can't create a loop.
      if (next === prev) return prev;
      // One-deep undo snapshot (feedback/toasts+undo audit slice): `prev` is
      // exactly the doc a caller's `undoLast()` should restore. Recorded
      // unconditionally on every real transition (not just the ones that
      // surface an Undo toast) — cheap, and it's what makes `undoLast()`
      // always undo whatever the player *actually* just did.
      recordSnapshot(undoStateRef.current, prev);
      pendingUserEditRef.current = true;
      return { ...next, version: prev.version + 1 };
    });
  }, []);

  const undoLast = useCallback(() => {
    // `consumeSnapshot` mutates (clears the pointer) — that MUST happen
    // exactly once, so it's called here in the plain callback body, not
    // inside the `setDoc` updater below. React does not guarantee a
    // functional setState updater is invoked exactly once (e.g. it can run
    // an extra time while reconciling with another store update in the same
    // tick — this app hit that in practice via ToastHost's
    // `useSyncExternalStore`); a mutating side effect inside one is exactly
    // the "updater functions must be pure" trap React's docs warn about; the
    // first bug-fixed draft of this function had `consumeSnapshot` inside
    // the updater and undo silently no-op'd every other click.
    const activeId = docRef.current?.id;
    if (activeId === undefined) return;
    const snapshot = consumeSnapshot(undoStateRef.current, activeId);
    if (!snapshot) return;
    // Same flagging `update()` does — undo is a genuine local edit too, so
    // it autosaves/pushes exactly like any other transition. Deliberately
    // NOT routed through `update()` itself: that would `recordSnapshot` the
    // pre-undo state, re-arming a second "undo" that would just redo the
    // change — this is meant to be single-step, not a toggle.
    pendingUserEditRef.current = true;
    setDoc((prev) => {
      // Pure: `snapshot` was already captured above, so this can safely run
      // more than once with no observable difference. Re-checks `prev.id`
      // as a last-moment guard in case the active character changed between
      // reading `docRef` above and this commit.
      if (!prev || prev.id !== snapshot.id) return prev;
      return { ...snapshot, version: prev.version + 1 };
    });
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
      // The active character is about to change (switch/create/import/reset/
      // delete all funnel through here) — an undo snapshot from the OLD
      // character must never be restorable onto the new one.
      invalidateSnapshot(undoStateRef.current);
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
        // Best-effort remote delete so the deletion leaves a server tombstone
        // and propagates to other devices instead of resurfacing (#39). Never
        // fails the local delete — the character is gone from this device
        // regardless of whether the server round-trip succeeds.
        const apiBase = apiBaseUrl();
        const token = getStoredToken();
        if (apiBase && token) {
          try {
            await deleteRemoteCharacter(apiBase, token, id);
          } catch {
            // Offline / API error: the local delete stands. It may resurface
            // on a later open-sync until a delete reaches the server —
            // acceptable for a single-user tool.
          }
        }
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
      setDoc((d) => {
        if (!d || d.live.hp.current !== 0 || d.live.hp.temp !== 0) return d;
        // A genuine local change to live state — bump + flag it the same way
        // `update()` does, so it eventually reaches the sync push too.
        pendingUserEditRef.current = true;
        return {
          ...d,
          version: d.version + 1,
          live: { ...d.live, hp: { ...d.live.hp, current: max } },
        };
      });
    }
  }, [sheet]);

  const signIn = useCallback(() => {
    const apiBase = apiBaseUrl();
    if (!apiBase) return; // sync disabled — nothing to sign in to
    window.location.href = loginUrl(apiBase, window.location.origin);
  }, []);

  const signOut = useCallback(async () => {
    const apiBase = apiBaseUrl();
    const token = getStoredToken();
    clearStoredToken();
    setSyncStatus(apiBase ? { kind: "signed-out" } : { kind: "disabled" });
    if (apiBase && token) {
      try {
        await apiLogout(apiBase, token);
      } catch {
        // Best-effort — the local token is already cleared either way, so
        // this device is signed out regardless of whether the server-side
        // session row got cleaned up.
      }
    }
  }, []);

  const resolveConflict = useCallback(
    async (action: "reload" | "overwrite") => {
      if (syncStatus.kind !== "conflict") return;
      const { conflict } = syncStatus;
      // `acceptRemoteDoc` may hand back a doc from another device that
      // predates this device's schema version — migrate before use, same as
      // every other doc that enters this app (dexieSyncStore.put does this
      // too, independently, for the copy it persists).
      const resolved = migrateDoc(
        action === "reload" ? acceptRemoteDoc(conflict) : forceOverwriteDoc(conflict),
      );
      await dexieSyncStore.put(resolved);
      // Only replace the in-memory doc if the conflict was actually for the
      // character currently on screen — the user may have switched
      // characters while this conflict was pending.
      if (doc?.id === conflict.local.id && refData) {
        // The doc content is being replaced by whichever side won the
        // conflict — any pending undo snapshot predates that and would
        // restore over it, so drop it.
        invalidateSnapshot(undoStateRef.current);
        setDoc(reconcileGrantedCantrips(resolved, refData));
      }
      void refreshList();

      if (action === "reload") {
        setSyncStatus({ kind: "idle" });
        return;
      }
      const apiBase = apiBaseUrl();
      const token = getStoredToken();
      if (!apiBase || !token) {
        setSyncStatus({ kind: "idle" });
        return;
      }
      const outcome = await pushOnChange(apiBase, token, resolved);
      if (outcome.kind === "ok") setSyncStatus({ kind: "idle" });
      else if (outcome.kind === "conflict")
        setSyncStatus({ kind: "conflict", conflict: outcome.conflict });
      else setSyncStatus({ kind: "error", message: outcome.message });
    },
    [syncStatus, doc, refData, refreshList],
  );

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
    undoLast,
    switchCharacter,
    createCharacter,
    importCharacter,
    resetAll,
    deleteCharacter,
    syncStatus,
    signIn,
    signOut,
    resolveConflict,
  };
}
