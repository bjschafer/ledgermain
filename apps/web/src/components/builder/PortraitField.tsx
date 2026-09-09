import { useId, useRef, useState } from "react";

import {
  encodePortrait,
  PORTRAIT_ACCEPT,
  PORTRAIT_SIZE,
  portraitSrc,
} from "../../model/portrait.js";
import { setPortrait } from "../../model/doc.js";
import type { BuilderProps } from "./types.js";

/**
 * Pick (or drop) a character portrait. The picked file is never stored as
 * picked: `encodePortrait` re-draws it small before it reaches the document,
 * which is what keeps a phone photo from blowing the 2 MB document cap on its
 * own. Failures land in the field rather than a toast, since the thing that
 * failed is right there.
 */
export function PortraitField({ doc, update }: Pick<BuilderProps, "doc" | "update">) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const src = portraitSrc(doc.identity.portrait);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      const encoded = await encodePortrait(file);
      update((d) => setPortrait(d, encoded));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      // Let the same file be picked again after a failure or a removal.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="field portrait-field">
      {/* A plain div rather than a `label`: the field holds two controls (the
          picker and Remove), and a label wrapping both would make clicking
          Remove also open the file dialog. */}
      <label htmlFor={inputId}>Portrait</label>
      <div className="portrait-row">
        {src ? (
          <img
            className="portrait-preview"
            src={src}
            alt={`Portrait of ${doc.identity.name || "this character"}`}
            width={PORTRAIT_SIZE}
            height={PORTRAIT_SIZE}
          />
        ) : (
          <div className="portrait-preview portrait-preview--empty" aria-hidden="true">
            ✦
          </div>
        )}
        <div className="portrait-controls">
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={PORTRAIT_ACCEPT}
            disabled={busy}
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
          {src ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => update((d) => setPortrait(d, null))}
            >
              Remove
            </button>
          ) : null}
          <p className="hint">
            Shrunk to a {PORTRAIT_SIZE}px square and stored with the character, so it travels with
            an export and works offline.
          </p>
          {error ? <p className="hint warn-over">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
