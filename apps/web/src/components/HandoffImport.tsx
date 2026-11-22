import { useEffect, useState } from "react";

import { addMovedCharacters } from "../db/characters.js";
import { decodeHandoff, moveUrl, type HandoffPart } from "../model/legacyHost.js";
import { writeSessionLog } from "../state/sessionLog.js";

type ViewState =
  | { kind: "reading" }
  | { kind: "error"; message: string }
  | { kind: "confirm"; handoff: HandoffPart }
  | { kind: "saving" }
  | { kind: "done"; handoff: HandoffPart; added: number };

/**
 * The receiving end of a move from the app's old address
 * (`model/legacyHost.ts`). Shown instead of the app, which mounts once this
 * calls `onDone`. Nothing is written until the player confirms: anyone can
 * build one of these links.
 */
export function HandoffImport({ encoded, onDone }: { encoded: string; onDone: () => void }) {
  const [state, setState] = useState<ViewState>({ kind: "reading" });

  useEffect(() => {
    let cancelled = false;
    decodeHandoff(encoded)
      .then((handoff) => {
        if (!cancelled) setState({ kind: "confirm", handoff });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [encoded]);

  // Drops the payload from the address bar and from this history entry, so a
  // reload or a bookmark doesn't offer the same move again.
  const finish = () => {
    window.history.replaceState(null, "", window.location.pathname);
    onDone();
  };

  const bringIn = async (handoff: HandoffPart) => {
    setState({ kind: "saving" });
    try {
      const added = await addMovedCharacters(
        handoff.characters.map((c) => c.doc),
        handoff.activeId,
      );
      for (const { doc, log } of handoff.characters) {
        if (added.includes(doc.id)) writeSessionLog(doc.id, log);
      }
      setState({ kind: "done", handoff, added: added.length });
    } catch {
      setState({
        kind: "error",
        message:
          "This browser wouldn't save them. If you're in a private window, try a normal one.",
      });
    }
  };

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="wordmark">
            Ledger<span className="gilt">main</span>
          </div>
          <div className="tagline">Moving in</div>
        </div>
      </header>
      {(state.kind === "reading" || state.kind === "saving") && (
        <div className="state-screen">
          <div>
            <div className="glyph">✦</div>
            <p>{state.kind === "reading" ? "Unpacking…" : "Saving…"}</p>
          </div>
        </div>
      )}
      {state.kind === "error" && (
        <main className="legacy-move">
          <h1>Couldn't bring these characters in</h1>
          <p>{state.message}</p>
          <p>
            <button type="button" className="btn-gold" onClick={finish}>
              Open Ledgermain
            </button>
          </p>
        </main>
      )}
      {state.kind === "confirm" && (
        <main className="legacy-move">
          <h1>Bring your characters from the old address?</h1>
          <p>
            {state.handoff.parts > 1 && `Part ${state.handoff.part} of ${state.handoff.parts}. `}
            These come from Ledgermain's old address. Any you already have here stay as they are.
          </p>
          <ul className="legacy-move-names">
            {state.handoff.characters.map(({ doc }) => (
              <li key={doc.id}>{doc.identity.name || "Unnamed character"}</li>
            ))}
          </ul>
          <p className="legacy-move-actions">
            <button type="button" className="btn-gold" onClick={() => void bringIn(state.handoff)}>
              Bring them in
            </button>
            <button type="button" className="btn-ghost" onClick={finish}>
              Not now
            </button>
          </p>
        </main>
      )}
      {state.kind === "done" && <Done state={state} onFinish={finish} />}
    </div>
  );
}

function Done({
  state: { handoff, added },
  onFinish,
}: {
  state: Extract<ViewState, { kind: "done" }>;
  onFinish: () => void;
}) {
  const kept = handoff.characters.length - added;
  const more = handoff.part < handoff.parts;
  const movedIn =
    added === 0
      ? "Nothing new moved in."
      : `${added === 1 ? "One character" : `${added} characters`} moved in.`;
  return (
    <main className="legacy-move">
      <h1>
        {more ? `Part ${handoff.part} of ${handoff.parts} is here` : "Welcome to the new place"}
      </h1>
      <p>
        {movedIn}
        {kept > 0 && ` ${kept === 1 ? "One was" : `${kept} were`} already here and kept as is.`}
      </p>
      <p>
        {more ? (
          <button
            type="button"
            className="btn-gold"
            onClick={() => {
              window.history.replaceState(null, "", window.location.pathname);
              window.location.assign(moveUrl(handoff.part + 1));
            }}
          >
            Back to the old address for the rest
          </button>
        ) : (
          <button type="button" className="btn-gold" onClick={onFinish}>
            Open Ledgermain
          </button>
        )}
      </p>
    </main>
  );
}
