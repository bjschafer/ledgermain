import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { compute } from "@pf1/engine";
import type { RefData } from "@pf1/schema";

import { resolveRefData } from "../model/homebrew.js";
import { migrateDoc } from "../model/migrations.js";
import { LIVE_SHARE_POLL_MS } from "../model/shareLink.js";
import { loadRefData } from "../refdata/loader.js";
import { fetchShared, type SharedCharacter } from "../sync/client.js";
import { apiBaseUrl } from "../sync/config.js";

import { Sheet } from "./Sheet.js";

type ViewState =
  | { kind: "loading" }
  | { kind: "gone" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      share: SharedCharacter;
      refData: RefData;
      checkedAt: Date;
      /** The last poll failed; what's on screen is the last copy that loaded. */
      stale: boolean;
    };

function StateScreen({ glyph, children }: { glyph: string; children: React.ReactNode }) {
  return (
    <div className="state-screen">
      <div>
        <div className="glyph">{glyph}</div>
        {children}
      </div>
    </div>
  );
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/**
 * Someone else's character, opened from a share link. Everything the player's
 * own app does to a document is absent by construction rather than hidden:
 * this tree never reads or writes the reader's storage, never signs in, and
 * renders only the derived sheet, computed here from the shared document the
 * same way the player's own client computes it.
 *
 * A live share re-reads while the page is visible, passing the version already
 * on screen so an unchanged character costs an empty response.
 */
export function SharedSheet({ token }: { token: string }) {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const apiBase = apiBaseUrl();

  useEffect(() => {
    if (!apiBase) {
      setState({
        kind: "error",
        message: "Shared sheets aren't available on this copy of the app.",
      });
      return;
    }
    let cancelled = false;
    void Promise.all([loadRefData(), fetchShared(apiBase, token)])
      .then(([refData, read]) => {
        if (cancelled) return;
        if (read.status !== "ok") {
          setState({ kind: "gone" });
          return;
        }
        setState({
          kind: "ready",
          share: read.share,
          refData,
          checkedAt: new Date(),
          stale: false,
        });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, token]);

  useLivePolling(apiBase, token, state, setState);

  const derived = useMemo(() => {
    if (state.kind !== "ready") return null;
    const doc = migrateDoc(state.share.doc);
    const refData = resolveRefData(doc, state.refData);
    return { doc, refData, sheet: compute(doc, refData) };
  }, [state]);

  const name = derived?.doc.identity.name;
  useEffect(() => {
    document.title = name ? `${name} · Ledgermain` : "Shared sheet · Ledgermain";
  }, [name]);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="wordmark">
            Ledger<span className="gilt">main</span>
          </div>
          <div className="tagline">Shared sheet · read only</div>
        </div>
        <div className="masthead-right">
          {state.kind === "ready" && <ShareStatus state={state} />}
          <a className="btn-ghost" href={window.location.pathname}>
            Open your own sheet
          </a>
        </div>
      </header>

      {state.kind === "loading" && (
        <StateScreen glyph="✦">
          <p>Unrolling the compendium…</p>
        </StateScreen>
      )}
      {state.kind === "gone" && (
        <StateScreen glyph="✦">
          <p>This link doesn't lead anywhere any more.</p>
          <p className="hint">The player may have stopped sharing it, or deleted the character.</p>
        </StateScreen>
      )}
      {state.kind === "error" && (
        <StateScreen glyph="⚠">
          <p>Couldn't load this shared sheet.</p>
          <p className="hint">{state.message}</p>
        </StateScreen>
      )}
      {derived && (
        <main className="shared-sheet">
          <Sheet doc={derived.doc} sheet={derived.sheet} refData={derived.refData} />
        </main>
      )}
    </div>
  );
}

function ShareStatus({ state }: { state: Extract<ViewState, { kind: "ready" }> }) {
  if (state.share.kind === "snapshot") {
    return (
      <span className="hint shared-status">
        Snapshot from {dateFormat.format(new Date(state.share.createdAt))}
      </span>
    );
  }
  return (
    <span className={`hint shared-status${state.stale ? " is-stale" : ""}`} aria-live="polite">
      {state.stale
        ? `Live, but offline since ${timeFormat.format(state.checkedAt)}`
        : `Live, checked ${timeFormat.format(state.checkedAt)}`}
    </span>
  );
}

function useLivePolling(
  apiBase: string | undefined,
  token: string,
  state: ViewState,
  setState: (update: (prev: ViewState) => ViewState) => void,
) {
  const live = state.kind === "ready" && state.share.kind === "live";
  // Read through a ref so the interval isn't torn down on every poll result.
  const versionRef = useRef<number | undefined>(undefined);
  versionRef.current = state.kind === "ready" ? state.share.doc.version : undefined;

  const poll = useCallback(async () => {
    if (!apiBase || document.visibilityState !== "visible") return;
    try {
      const read = await fetchShared(apiBase, token, versionRef.current);
      setState((prev) => {
        if (prev.kind !== "ready") return prev;
        if (read.status === "gone") return { kind: "gone" };
        const share = read.status === "ok" ? read.share : prev.share;
        return { ...prev, share, checkedAt: new Date(), stale: false };
      });
    } catch {
      setState((prev) => (prev.kind === "ready" ? { ...prev, stale: true } : prev));
    }
  }, [apiBase, token, setState]);

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => void poll(), LIVE_SHARE_POLL_MS);
    // A GM who tabs back in wants the current sheet now, not at the next tick.
    const onVisible = () => void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, poll]);
}
