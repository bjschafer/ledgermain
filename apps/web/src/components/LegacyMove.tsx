import { useEffect, useState } from "react";

import type { CharacterDoc } from "@pf1/schema";

import { charactersToMove, getStoredActiveId } from "../db/characters.js";
import { characterExportFilename, characterExportJson } from "../model/exportCharacter.js";
import {
  APP_ORIGIN,
  handoffUrl,
  parseMoveHash,
  planHandoff,
  type HandoffPlan,
} from "../model/legacyHost.js";
import { parseShareHash } from "../model/shareLink.js";
import { readSessionLog } from "../state/sessionLog.js";

type ViewState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; docs: CharacterDoc[]; plan: HandoffPlan };

/**
 * What the app's old address shows instead of the app (`model/legacyHost.ts`).
 * A visitor with nothing of their own stored here goes straight to the new
 * address; anyone else gets one button that carries their characters over.
 * This tree never mounts the app, so nothing here can create, seed, or edit a
 * character, which is what keeps every visit's plan identical.
 */
export function LegacyMove() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const { hash, pathname, search } = window.location;
    // A share link reads from the API, not from this origin's storage.
    if (parseShareHash(hash)) {
      window.location.replace(`${APP_ORIGIN}/${hash}`);
      return;
    }
    void (async () => {
      const docs = await charactersToMove();
      if (cancelled) return;
      if (docs.length === 0) {
        window.location.replace(`${APP_ORIGIN}${pathname}${search}${hash}`);
        return;
      }
      const plan = await planHandoff(
        docs.map((doc) => ({ doc, log: readSessionLog(doc.id) })),
        getStoredActiveId(),
      );
      if (cancelled) return;
      // The new address sent the player back for the next part.
      const requested = parseMoveHash(hash);
      const next = requested === null ? undefined : plan.parts[requested - 1];
      if (next) {
        window.location.assign(handoffUrl(next));
        return;
      }
      setState({ kind: "ready", docs, plan });
    })().catch(() => {
      if (!cancelled) setState({ kind: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="wordmark">
            Ledger<span className="gilt">main</span>
          </div>
          <div className="tagline">Now at ledgermain.app</div>
        </div>
      </header>
      {state.kind === "loading" && (
        <div className="state-screen">
          <div>
            <div className="glyph">✦</div>
            <p>Checking for your characters…</p>
          </div>
        </div>
      )}
      {state.kind === "error" && (
        <main className="legacy-move">
          <h1>Ledgermain has moved</h1>
          <p>
            This browser wouldn't let Ledgermain read the characters saved at this address. If
            you're in a private window, open this page in a normal one to bring them along.
          </p>
          <p>
            <a className="btn-gold" href={APP_ORIGIN}>
              Go to ledgermain.app
            </a>
          </p>
        </main>
      )}
      {state.kind === "ready" && <MoveOffer docs={state.docs} plan={state.plan} />}
    </div>
  );
}

function MoveOffer({ docs, plan }: { docs: CharacterDoc[]; plan: HandoffPlan }) {
  const [first] = plan.parts;
  const count = docs.length === 1 ? "one character" : `${docs.length} characters`;
  return (
    <main className="legacy-move">
      <h1>Ledgermain has moved to ledgermain.app</h1>
      <p>This browser has {count} saved at the old address:</p>
      <ul className="legacy-move-names">
        {docs.map((doc) => (
          <li key={doc.id}>{doc.identity.name || "Unnamed character"}</li>
        ))}
      </ul>
      {first && (
        <>
          <p>
            Bring them along. They're copied to ledgermain.app, and nothing here is deleted. If
            you're signed in to sync, you'll need to sign in again there.
          </p>
          <p>
            <button
              type="button"
              className="btn-gold"
              onClick={() => window.location.assign(handoffUrl(first))}
            >
              Move my characters
            </button>
          </p>
          {plan.parts.length > 1 && (
            <p className="hint">
              That's too much for one trip, so they go over in {plan.parts.length} parts.
              ledgermain.app sends you back here between them.
            </p>
          )}
        </>
      )}
      {plan.tooLarge.length > 0 && (
        <>
          <p>
            {plan.tooLarge.length === 1 ? "This one is" : "These are"} too large to carry over this
            way. Download {plan.tooLarge.length === 1 ? "it" : "them"}, then use Import in Settings
            at ledgermain.app:
          </p>
          <ul className="legacy-move-names">
            {plan.tooLarge.map((doc) => (
              <li key={doc.id}>
                <button type="button" className="btn-ghost" onClick={() => download(doc)}>
                  Download {doc.identity.name || "character"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="hint">
        Already moved them? <a href={APP_ORIGIN}>Go to ledgermain.app</a>. If you added Ledgermain
        to your home screen, add it again from the new address.
      </p>
    </main>
  );
}

function download(doc: CharacterDoc) {
  const blob = new Blob([characterExportJson(doc)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = characterExportFilename(doc);
  a.click();
  URL.revokeObjectURL(url);
}
