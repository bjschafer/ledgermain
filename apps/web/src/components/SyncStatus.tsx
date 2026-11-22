import { useState } from "react";

import type { RefData } from "@pf1/schema";

import { deviceName } from "../state/deviceName.js";
import type { ConflictResolution } from "../state/useCharacter.js";
import { describeGap } from "../sync/compareConflict.js";
import type { SyncConflict } from "../sync/planSync.js";
import type { SyncStatus as SyncStatusValue } from "../sync/status.js";

import { ConflictCompare } from "./ConflictCompare.js";

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
  /** Reference data for the comparison; it waits until this has loaded. */
  refData?: RefData;
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
  refData,
}: {
  conflict: SyncConflict;
  queued: number;
  onResolve: (action: ConflictResolution) => void;
  refData?: RefData;
}) {
  const [comparing, setComparing] = useState(false);
  const name = conflict.local.identity.name || "An unnamed character";
  const here = deviceName();
  const there = conflict.remote.savedOn;
  const gap = describeGap(conflict.local.updatedAt, conflict.remote.updatedAt);
  return (
    <div className="sync-banner" role="alert">
      <div className="sync-banner-body">
        <strong>{name} was changed on this device and on another one.</strong>
        <span>
          This device ({here}) saved it {savedAt(conflict.local.updatedAt)}; the other device
          {there ? ` (${there})` : ""} saved it {savedAt(conflict.remote.updatedAt)}
          {gap ? `, ${gap}` : ""}. Pick which to keep.
          {queued > 0 ? ` (${queued} more after this.)` : ""}
        </span>
      </div>
      <div className="sync-banner-actions">
        {refData && (
          <button type="button" aria-expanded={comparing} onClick={() => setComparing((v) => !v)}>
            {comparing ? "Hide differences" : "Compare"}
          </button>
        )}
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
      {comparing && refData && (
        <ConflictCompare
          conflict={conflict}
          refData={refData}
          localLabel={`This device (${here})`}
          remoteLabel={there ? `Other device (${there})` : "Other device"}
        />
      )}
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
export function SyncBanner({ status, onSignIn, onResolveConflict, refData }: SyncBannerProps) {
  if (status.kind === "conflict") {
    return (
      <ConflictPrompt
        // A new conflict starts collapsed rather than inheriting the last one's state.
        key={status.conflict.local.id}
        conflict={status.conflict}
        queued={status.queued}
        onResolve={onResolveConflict}
        refData={refData}
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
