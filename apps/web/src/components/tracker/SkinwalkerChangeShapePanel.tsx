import { Panel } from "../builder/Panel.js";
import { PawIcon } from "../icons.js";
import {
  changeShapeHasEffect,
  isChangeShapeActive,
  isSkinwalker,
  toggleChangeShape,
} from "../../model/skinwalker.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Skinwalker Change Shape toggle — the in-play counterpart to picking a
 * "-Kin" heritage. Unlike `ShifterAspectPanel`'s per-aspect buttons, this is
 * a single always-available switch (Change Shape is at-will, no daily-use
 * pool), mirroring its "live toggle, no standing build.* half" shape. Only
 * the heritage's ability-score rider is modeled: natural attacks, bestial
 * speed, and senses from the bestial form are not.
 */
export function SkinwalkerChangeShapePanel({ doc, refData, update }: BuilderProps) {
  if (!isSkinwalker(doc, refData)) return null;

  const active = isChangeShapeActive(doc);
  const hasEffect = changeShapeHasEffect(doc, refData);

  return (
    <Panel title="Change Shape" icon={<PawIcon />} storageKey="panel:Change Shape">
      <p className="hint">
        Toggle your bestial form on/off. Only the ability bonus from your heritage is modeled:
        natural attacks, bestial speed, and senses are not.
      </p>
      {!hasEffect ? (
        <p className="hint">
          No heritage picked yet with a modeled bonus, so toggling this currently changes nothing on
          the sheet.
        </p>
      ) : null}
      <button
        type="button"
        className={`res-linked-buff${active ? " active" : ""}`}
        title={active ? "Return to humanoid form" : "Change Shape"}
        onClick={() => update((d) => toggleChangeShape(d))}
      >
        {active ? "Bestial Form Active ✓" : "Change Shape"}
      </button>
    </Panel>
  );
}
