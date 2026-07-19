import { SHIFTER_ASPECTS } from "@pf1/engine";

import { Panel } from "../builder/Panel.js";
import { ClawIcon } from "../icons.js";
import { isAspectMinorFormActive, toggleAspectMinorForm } from "../../model/shifterAspects.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Shifter minor-form toggle (issue #65) — the in-play counterpart to
 * `ShifterAspectPicker` (builder), which is where aspects are KNOWN. This
 * panel lets a shifter turn a known aspect's minor form on/off during play,
 * mirroring `ResourcesPanel`'s `LinkedBuffToggle` shape (Rage/Mutagen), but
 * built directly from the hand-authored `SHIFTER_ASPECTS` table rather than
 * a resource pool's `linkedBuffIds` — see `model/shifterAspects.ts`'s doc
 * comment for why (no vendored buff to link).
 *
 * Major form (Wild Shape into the aspect's battle form) is NOT here —
 * deferred to issue #70 (polymorph); each aspect's card says so.
 */
export function ShifterAspectPanel({ doc, update }: BuilderProps) {
  const isShifter = doc.identity.classes.some((c) => c.tag === "shifter");
  const known = doc.build.shifterAspects ?? [];

  if (!isShifter || known.length === 0) return null;

  return (
    <Panel title="Shifter Aspects" icon={<ClawIcon />} storageKey="panel:Shifter Aspects">
      <p className="hint">
        Toggle a known aspect's minor form on/off. Major form (Wild Shape) isn't modeled yet — see
        issue #70.
      </p>
      <div className="chips">
        {known.map((id) => {
          const aspect = SHIFTER_ASPECTS[id];
          if (!aspect) return null;
          const active = isAspectMinorFormActive(doc, id);
          return (
            <button
              key={id}
              type="button"
              className={`res-linked-buff${active ? " active" : ""}`}
              title={
                active
                  ? `Deactivate ${aspect.name} minor form`
                  : `Activate ${aspect.name} minor form`
              }
              onClick={() => update((d) => toggleAspectMinorForm(d, id))}
            >
              {active ? `${aspect.name} Active ✓` : `Activate ${aspect.name}`}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
