import { KINETICIST_METAKINESIS, gatherPowerModeLabel } from "@pf1/engine";
import type { KineticistGatherPowerMode } from "@pf1/schema";

import {
  clearKineticistBlastLoadout,
  kineticistLevel,
  knownKineticistInfusions,
  setKineticistBlastInfusion,
  setKineticistGatherPower,
  toggleKineticistMetakinesis,
} from "../../model/kineticistBuild.js";
import { Panel } from "../builder/Panel.js";
import { BoltIcon } from "../icons.js";
import type { BuilderProps } from "../builder/types.js";

const GATHER_MODES: readonly KineticistGatherPowerMode[] = [
  "move",
  "fullRound",
  "fullRoundThenMove",
];

/**
 * How the kineticist is shaping her blast right now: up to one form and one
 * substance infusion, a Gather Power stance, and any Metakinesis. Every part
 * of it is a per-activation choice rather than a build pick, which is why it
 * lives here beside Buffs and Conditions instead of in the builder, and why
 * "Bare blast" clears the whole thing in one press.
 *
 * The panel shows what the loadout costs and what it makes targets roll; the
 * blast lines on the sheet show the rest (range, area, damage qualifiers),
 * because those differ per blast and these don't.
 */
export function BlastLoadoutPanel({ doc, sheet, refData, update }: BuilderProps) {
  if (kineticistLevel(doc) <= 0 || sheet.kineticBlasts.length === 0) return null;

  const level = kineticistLevel(doc);
  const loadout = doc.live.kineticistBlastLoadout;
  const forms = knownKineticistInfusions(doc, refData, "form");
  const substances = knownKineticistInfusions(doc, refData, "substance");
  const metakinesis = loadout?.metakinesis ?? [];
  const armed =
    Boolean(loadout?.form) ||
    Boolean(loadout?.substance) ||
    Boolean(loadout?.gatherPower) ||
    metakinesis.length > 0;

  // Every blast shares the loadout's save DCs and reductions, so the summary
  // reads off the first line rather than being recomputed per blast.
  const sample = sheet.kineticBlasts[0]!;

  return (
    <Panel title="Blast Loadout" icon={<BoltIcon />} storageKey="panel:Blast Loadout">
      <p className="hint">
        What you are shaping this blast with. Each of these is chosen fresh every time you throw, so
        clear it when the round ends.
      </p>

      {forms.length === 0 && substances.length === 0 ? (
        <p className="hint">No infusions picked yet. Choose some in the Classes tab.</p>
      ) : null}

      <div className="loadout-row">
        <label className="loadout-label" htmlFor="blast-form">
          Form
        </label>
        <select
          id="blast-form"
          value={loadout?.form ?? ""}
          disabled={forms.length === 0}
          onChange={(e) => update((d) => setKineticistBlastInfusion(d, "form", e.target.value))}
        >
          <option value="">None</option>
          {forms.map((inf) => (
            <option key={inf.id} value={inf.id}>
              {inf.name} ({inf.burn} burn)
            </option>
          ))}
        </select>
      </div>

      <div className="loadout-row">
        <label className="loadout-label" htmlFor="blast-substance">
          Substance
        </label>
        <select
          id="blast-substance"
          value={loadout?.substance ?? ""}
          disabled={substances.length === 0}
          onChange={(e) =>
            update((d) => setKineticistBlastInfusion(d, "substance", e.target.value))
          }
        >
          <option value="">None</option>
          {substances.map((inf) => (
            <option key={inf.id} value={inf.id}>
              {inf.name} ({inf.burn} burn)
            </option>
          ))}
        </select>
      </div>

      <div className="loadout-row">
        <label className="loadout-label" htmlFor="blast-gather">
          Gather Power
        </label>
        <select
          id="blast-gather"
          value={loadout?.gatherPower ?? ""}
          onChange={(e) =>
            update((d) =>
              setKineticistGatherPower(
                d,
                (e.target.value || null) as KineticistGatherPowerMode | null,
              ),
            )
          }
        >
          <option value="">Did not gather</option>
          {GATHER_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {gatherPowerModeLabel(mode, level)}
            </option>
          ))}
        </select>
      </div>

      {level >= KINETICIST_METAKINESIS[0]!.minLevel ? (
        <div className="loadout-row loadout-metakinesis">
          <span className="loadout-label">Metakinesis</span>
          <div className="loadout-toggles">
            {KINETICIST_METAKINESIS.filter((m) => level >= m.minLevel).map((m) => (
              <button
                key={m.id}
                type="button"
                className={`res-linked-buff${metakinesis.includes(m.id) ? " active" : ""}`}
                title={m.summary}
                onClick={() => update((d) => toggleKineticistMetakinesis(d, m.id))}
              >
                {m.name} ({m.burn})
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sample.infusions.length > 0 ? (
        <ul className="loadout-infusion-list">
          {sample.infusions.map((inf) => (
            <li key={inf.id}>
              <b>{inf.name}</b>
              {inf.save ? (
                <span className="loadout-save">
                  {" "}
                  {inf.save.type === "fort"
                    ? "Fort"
                    : inf.save.type === "ref"
                      ? "Ref"
                      : "Will"} DC{" "}
                  {inf.save.dc} {inf.save.effect}
                </span>
              ) : null}
              <span className="hint"> · {inf.summary}</span>
              {inf.note ? <span className="hint"> {inf.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="hint">
        Blast counts as a {ordinal(sample.effectiveSpellLevel)}-level effect, so every save DC
        against it is {10 + sample.effectiveSpellLevel} plus the governing modifier. Form infusion
        DCs use Dexterity, substance infusion DCs use Constitution.
      </p>

      <button
        type="button"
        className="res-linked-buff"
        disabled={!armed}
        onClick={() => update((d) => clearKineticistBlastLoadout(d))}
      >
        Bare blast (clear all)
      </button>
    </Panel>
  );
}

function ordinal(n: number): string {
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}
