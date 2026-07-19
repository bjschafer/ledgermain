import { Dialog } from "./Dialog.js";

/**
 * Compact destructive-confirmation modal — a thin wrapper over `Dialog` sized
 * for a one-line message (`.dialog-surface.compact`) instead of a full-screen
 * picker. Renders where the user is looking rather than inline in a list far
 * below the click that triggered it.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog title={title} onClose={onCancel} compact>
      <div className="confirm-dialog-body">
        <p className="hint">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="pick-btn remove" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
