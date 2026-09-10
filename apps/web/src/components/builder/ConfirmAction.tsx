import { useState } from "react";

/**
 * A destructive action gated behind a type-to-confirm input: the button stays
 * disabled until the user types `confirmWord` exactly.
 */
export function ConfirmAction({
  description,
  confirmWord,
  buttonLabel,
  disabled,
  onConfirm,
}: {
  description: string;
  confirmWord: string;
  buttonLabel: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const canConfirm = confirmText.trim().toUpperCase() === confirmWord;

  return (
    <>
      <p className="hint" style={{ marginBottom: 12 }}>
        {description}
      </p>
      <div className="settings-row">
        <input
          type="text"
          className="danger-confirm"
          placeholder={`Type "${confirmWord}" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          aria-label={`Type ${confirmWord} to confirm`}
        />
        <button
          type="button"
          className="btn-ghost btn-danger"
          disabled={!canConfirm || disabled}
          onClick={() => {
            onConfirm();
            setConfirmText("");
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </>
  );
}
