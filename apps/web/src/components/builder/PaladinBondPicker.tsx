import type { CharacterDoc } from "@pf1/schema";

import { setPaladinBond } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface PaladinBondPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Paladin Divine Bond (PF1 CRB L5 choice): a scaling weapon-enhancement bond,
 * or a mount that functions as a druid's animal companion (the paladin's
 * level as her effective druid level). Mirrors `FiendishBoonPicker`'s
 * two-chip shape. The weapon option's numbers stay a display-only summary
 * line, same restraint the antipaladin's Fiendish Boon weapon option gets —
 * the weapon math stays manual. The mount option DOES apply a real
 * effective-level grant (`@pf1/engine`'s `COMPANION_EFFECT_CLASS_FEATURES`
 * onto the tracked companion's stat block), unlike the antipaladin's servant
 * option (a Summon Monster-shaped fiendish creature, not this companion
 * model at all).
 */
export function PaladinBondPicker({ doc, update }: PaladinBondPickerProps) {
  const isPaladin = doc.identity.classes.some((c) => c.tag === "paladin");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:PaladinBond", false);
  if (!isPaladin) return null;

  const level = doc.identity.classes.find((c) => c.tag === "paladin")?.level ?? 0;
  if (level < 5) return null;

  const bond = doc.build.paladinBond;

  return (
    <div className="subsection arcane-bond-picker">
      <div
        className="subsection-header"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleCollapsed();
        }}
        aria-expanded={!collapsed}
      >
        <h3>
          Divine Bond
          {bond ? <span className="hint"> · {bond === "weapon" ? "Weapon" : "Mount"}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint arcane-bond-hint">
            At 5th level, a paladin forms a divine bond with her god: a scaling weapon-enhancement
            bond, or a mount that functions as a druid's animal companion. Once chosen, the form
            can't be changed.
          </p>
          <div className="chips arcane-bond-type">
            <button
              type="button"
              className="chip"
              aria-pressed={bond === "weapon"}
              onClick={() => update((d) => setPaladinBond(d, bond === "weapon" ? null : "weapon"))}
            >
              Weapon
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={bond === "mount"}
              onClick={() => update((d) => setPaladinBond(d, bond === "mount" ? null : "mount"))}
            >
              Mount
            </button>
          </div>
          <p className="hint arcane-bond-effect">
            {bond === "mount"
              ? "Mount functions as a druid's animal companion, using paladin level as effective druid level. See the Companion panel."
              : bond === "weapon"
                ? "Scaling weapon-enhancement bond, standard action, usable a limited number of times per day. Weapon math stays manual."
                : "Choose weapon or mount below, fixed once chosen (PF1 RAW)."}
          </p>
        </>
      )}
    </div>
  );
}
