import { setAlignment, setName } from "../../model/doc.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

const ALIGNMENTS = ["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"];

export function IdentitySection({ doc, update }: BuilderProps) {
  return (
    <Panel title="Identity" step="i">
      <label className="field">
        <span>Character name</span>
        <input
          type="text"
          value={doc.identity.name}
          onChange={(e) => update((d) => setName(d, e.target.value))}
        />
      </label>
      <label className="field">
        <span>Alignment</span>
        <select
          value={doc.identity.alignment ?? ""}
          onChange={(e) => update((d) => setAlignment(d, e.target.value))}
        >
          <option value="">—</option>
          {ALIGNMENTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
    </Panel>
  );
}
