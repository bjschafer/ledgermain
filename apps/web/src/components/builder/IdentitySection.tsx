import {
  setAge,
  setAlignment,
  setAppearance,
  setDeity,
  setGender,
  setHeight,
  setName,
  setWeight,
} from "../../model/doc.js";
import { ALIGNMENT_LABELS } from "../../model/names.js";
import { PersonIcon } from "../icons.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

const ALIGNMENTS = ["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"];

export function IdentitySection({ doc, update }: BuilderProps) {
  return (
    <Panel title="Identity" step="i" icon={<PersonIcon />} storageKey="panel:Identity">
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
              {ALIGNMENT_LABELS[a] ?? a}
            </option>
          ))}
        </select>
      </label>
      <details className="identity-more">
        <summary>More details</summary>
        <label className="field">
          <span>Deity</span>
          <input
            type="text"
            value={doc.identity.deity ?? ""}
            onChange={(e) => update((d) => setDeity(d, e.target.value))}
          />
        </label>
        <label className="field">
          <span>Gender</span>
          <input
            type="text"
            value={doc.identity.gender ?? ""}
            onChange={(e) => update((d) => setGender(d, e.target.value))}
          />
        </label>
        <label className="field">
          <span>Age</span>
          <input
            type="text"
            value={doc.identity.age ?? ""}
            onChange={(e) => update((d) => setAge(d, e.target.value))}
          />
        </label>
        <label className="field">
          <span>Height</span>
          <input
            type="text"
            value={doc.identity.height ?? ""}
            onChange={(e) => update((d) => setHeight(d, e.target.value))}
          />
        </label>
        <label className="field">
          <span>Weight</span>
          <input
            type="text"
            value={doc.identity.weight ?? ""}
            onChange={(e) => update((d) => setWeight(d, e.target.value))}
          />
        </label>
        <label className="field">
          <span>Appearance</span>
          <textarea
            rows={3}
            value={doc.identity.appearance ?? ""}
            onChange={(e) => update((d) => setAppearance(d, e.target.value))}
          />
        </label>
      </details>
    </Panel>
  );
}
