import { fiendishBoonLabel } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { setAntipaladinBoon } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface FiendishBoonPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Antipaladin Fiendish Boon (PF1 APG L5 choice, issue #65 wave B): a
 * scaling weapon-enhancement bond or a permanent fiendish servant. Mirrors
 * `ArcaneBondPicker`'s two-chip shape. Unlike the wizard's Arcane Bond
 * (whose familiar option DOES apply a real master-bonus `Change`), the
 * weapon-boon numbers here stay a display-only summary line — see
 * `fiendishBoonLabel`'s doc comment for why (same restraint paladin's own
 * Divine Bond gets, which has no modeled numbers or `build.*` field at all).
 * The servant option is recorded but not built out (companion stat block —
 * deferred to issue #68), same "recorded, not tracked" posture the
 * ArcaneBondPicker's bonded-object name field has.
 */
export function FiendishBoonPicker({ doc, update }: FiendishBoonPickerProps) {
  const isAntipaladin = doc.identity.classes.some((c) => c.tag === "antipaladin");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:FiendishBoon", false);
  if (!isAntipaladin) return null;

  const level = doc.identity.classes.find((c) => c.tag === "antipaladin")?.level ?? 0;
  const boon = doc.build.antipaladinBoon;

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
          Fiendish Boon
          {boon ? (
            <span className="hint"> · {boon === "weapon" ? "Weapon" : "Servant"}</span>
          ) : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint arcane-bond-hint">
            At 5th level, an antipaladin gains a boon from her dark patrons: a scaling
            weapon-enhancement bond, or a permanent fiendish servant. Once chosen, the form can't be
            changed (PF1 RAW).
          </p>
          <div className="chips arcane-bond-type">
            <button
              type="button"
              className="chip"
              aria-pressed={boon === "weapon"}
              onClick={() =>
                update((d) => setAntipaladinBoon(d, boon === "weapon" ? null : "weapon"))
              }
            >
              Weapon
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={boon === "servant"}
              onClick={() =>
                update((d) => setAntipaladinBoon(d, boon === "servant" ? null : "servant"))
              }
            >
              Servant
            </button>
          </div>
          <p className="hint arcane-bond-effect">{fiendishBoonLabel(level, boon)}</p>
        </>
      )}
    </div>
  );
}
