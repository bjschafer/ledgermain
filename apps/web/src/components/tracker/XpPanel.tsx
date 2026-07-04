import { useState } from "react";

import { addXp, xpProgress } from "../../model/xp.js";
import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Live XP tracker — optional rule (issue #27), only rendered when
 * `build.settings.xpEnabled` is set (see `Tracker.tsx`). Display-only: it
 * never auto-levels the character, it just surfaces "how far to the next
 * level" per the chosen advancement track (`model/xp.ts`).
 */
export function XpPanel({ doc, update }: BuilderProps) {
  const progress = xpProgress(doc);
  const [amount, setAmount] = useState(0);

  return (
    <Panel title="Experience" step="✦" storageKey="panel:Xp">
      <div className="xp-display">
        <span className="xp-count num">{progress.current.toLocaleString()} XP</span>
        <span className="hint">
          {progress.nextThreshold != null
            ? `next level at ${progress.nextThreshold.toLocaleString()} XP (${progress.track})`
            : `max tracked level (${progress.track})`}
        </span>
      </div>

      {progress.readyToLevel && <p className="hint xp-ready">Ready to level up!</p>}

      <div className="xp-controls">
        <NumberField
          className="num"
          size={6}
          value={amount}
          min={-999_999}
          max={999_999}
          stepper={false}
          onCommit={(n) => setAmount(n)}
          aria-label="XP amount to add"
        />
        <button
          type="button"
          className="btn-act"
          disabled={amount === 0}
          onClick={() => {
            update((d) => addXp(d, amount));
            setAmount(0);
          }}
        >
          Add XP
        </button>
      </div>
    </Panel>
  );
}
