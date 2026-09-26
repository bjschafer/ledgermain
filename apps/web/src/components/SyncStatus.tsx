import type { SyncConflict } from "../sync/planSync.js";
import type { SyncStatus as SyncStatusValue } from "../sync/status.js";
import type { ConflictResolution } from "../state/useCharacter.js";

export interface SyncStatusProps {
  status: SyncStatusValue;
  onSignIn: () => void;
  onSignOut: () => void;
}

/**
 * The masthead's compact sync indicator (Stage 5, DESIGN.md §2.1). Renders
 * nothing when sync is disabled (no `VITE_API_URL` configured) — the
 * default, local-only experience is completely untouched by this component's
 * existence. States that need the player to act (an expired session, a
 * conflict) also get a `SyncBanner`; this only points at them.
 */
export function SyncStatus({ status, onSignIn, onSignOut }: SyncStatusProps) {
  if (status.kind === "disabled") return null;

  if (status.kind === "signed-out") {
    return (
      <button type="button" className="sync-signin" onClick={onSignIn}>
        Sign in to sync
      </button>
    );
  }

  if (status.kind === "expired") {
    return (
      <button type="button" className="sync-signin sync-expired" onClick={onSignIn}>
        Not syncing: sign in
      </button>
    );
  }

  const trouble = status.kind === "error" || status.kind === "conflict";
  const label =
    status.kind === "syncing"
      ? "Syncing…"
      : status.kind === "error"
        ? "Not synced"
        : status.kind === "conflict"
          ? "Sync conflict"
          : "Synced";

  return (
    <div
      className={`sync-status${trouble ? " sync-error" : ""}`}
      title={
        status.kind === "error"
          ? `${status.message}\nYour edits are saved on this device and will sync when the connection comes back.`
          : undefined
      }
    >
      <span>{label}</span>
      <button type="button" className="sync-signout" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}

export interface SyncBannerProps {
  status: SyncStatusValue;
  onSignIn: () => void;
  onResolveConflict: (action: ConflictResolution) => void;
}

function savedAt(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "at an unknown time"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ConflictPrompt({
  conflict,
  queued,
  onResolve,
}: {
  conflict: SyncConflict;
  queued: number;
  onResolve: (action: ConflictResolution) => void;
}) {
  const name = conflict.local.identity.name || "An unnamed character";
  return (
    <div className="sync-banner" role="alert">
      <div className="sync-banner-body">
        <strong>{name} was changed on this device and on another one.</strong>
        <span>
          This device saved it {savedAt(conflict.local.updatedAt)}; the other{" "}
          {savedAt(conflict.remote.updatedAt)}. Pick which to keep.
          {queued > 0 ? ` (${queued} more after this.)` : ""}
        </span>
      </div>
      <div className="sync-banner-actions">
        <button
          type="button"
          className="sync-banner-primary"
          onClick={() => onResolve("keep-both")}
        >
          Keep both
        </button>
        <button type="button" onClick={() => onResolve("overwrite")}>
          Keep this device's
        </button>
        <button type="button" onClick={() => onResolve("reload")}>
          Use the other device's
        </button>
      </div>
    </div>
  );
}

/**
 * The full-width sync notice under the masthead, for the two states where
 * doing nothing quietly costs the player something: a session the server
 * stopped accepting (edits pile up here and never reach other devices), and
 * a conflict (both devices edited, and only the player can pick). Neither
 * resolves itself, so neither is left to a masthead label to explain.
 */
export function SyncBanner({ status, onSignIn, onResolveConflict }: SyncBannerProps) {
  if (status.kind === "conflict") {
    return (
      <ConflictPrompt
        conflict={status.conflict}
        queued={status.queued}
        onResolve={onResolveConflict}
      />
    );
  }
  if (status.kind !== "expired") return null;
  return (
    <div className="sync-banner" role="alert">
      <div className="sync-banner-body">
        <strong>Your sign-in expired, so this device has stopped syncing.</strong>
        <span>
          Edits made here are saved on this device, but your other devices won't see them until you
          sign in again.
        </span>
      </div>
      <div className="sync-banner-actions">
        <button type="button" className="sync-banner-primary" onClick={onSignIn}>
          Sign in again
        </button>
      </div>
    </div>
  );
}
