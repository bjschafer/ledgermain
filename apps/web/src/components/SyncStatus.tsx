import type { SyncStatus as SyncStatusValue } from "../sync/status.js";

export interface SyncStatusProps {
  status: SyncStatusValue;
  onSignIn: () => void;
  onSignOut: () => void;
  onResolveConflict: (action: "reload" | "overwrite") => void;
}

/**
 * Thin view over `useCharacter.ts`'s `syncStatus` (Stage 5, DESIGN.md §2.1).
 * Renders nothing when sync is disabled (no `VITE_API_URL` configured) — the
 * default, local-only experience is completely untouched by this component's
 * existence. A conflict renders as an explicit two-button prompt ("reload"
 * vs "keep mine"), matching DESIGN's "the client prompts... reload?"
 * requirement — this view never auto-resolves anything.
 */
export function SyncStatus({ status, onSignIn, onSignOut, onResolveConflict }: SyncStatusProps) {
  if (status.kind === "disabled") return null;

  if (status.kind === "conflict") {
    return (
      <div className="sync-status sync-conflict" role="alert">
        <span>A newer version of this character exists on another device.</span>
        <div className="sync-conflict-actions">
          <button type="button" onClick={() => onResolveConflict("reload")}>
            Reload their version
          </button>
          <button type="button" onClick={() => onResolveConflict("overwrite")}>
            Keep my edits
          </button>
        </div>
      </div>
    );
  }

  if (status.kind === "signed-out") {
    return (
      <button type="button" className="sync-signin" onClick={onSignIn}>
        Sign in to sync
      </button>
    );
  }

  const label =
    status.kind === "syncing"
      ? "Syncing…"
      : status.kind === "error"
        ? `Sync error: ${status.message}`
        : "Synced";

  return (
    <div className={`sync-status${status.kind === "error" ? " sync-error" : ""}`}>
      <span>{label}</span>
      <button type="button" className="sync-signout" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
