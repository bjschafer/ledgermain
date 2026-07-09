import { hiddenStrikeDice } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { setVigilanteSpecialization } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface VigilanteSpecializationPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Vigilante specialization selection (issue #65) — one choice at 1st level,
 * never changed thereafter (PF1 RAW). Unlike the menu pickers (hexes,
 * discoveries, talents), this is a genuine chassis-level fork: Avenger
 * swaps the vigilante's own BAB tier for full BAB (see `compute.ts`'s BAB
 * loop, which reads `doc.build.vigilanteSpecialization` directly), while
 * Stalker grants Hidden Strike precision damage (shown as a class-feature
 * detail line via `@pf1/engine` `hiddenStrikeDice`, previewed here too).
 */
export function VigilanteSpecializationPicker({ doc, update }: VigilanteSpecializationPickerProps) {
  const isVigilante = doc.identity.classes.some((c) => c.tag === "vigilante");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Vigilante Specialization", false);
  if (!isVigilante) return null;

  const level = doc.identity.classes.find((c) => c.tag === "vigilante")?.level ?? 0;
  const chosen = doc.build.vigilanteSpecialization;

  return (
    <div className="subsection mystery-picker">
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
          Specialization
          {chosen ? (
            <span className="hint"> · {chosen === "avenger" ? "Avenger" : "Stalker"}</span>
          ) : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint mystery-picker-hint">
            Pick one at 1st level, never changed thereafter. Avenger trades the vigilante's normal
            3/4 BAB for full BAB (= vigilante level). Stalker gains Hidden Strike
            {level > 0 ? ` (currently ${hiddenStrikeDice(level).diceLabel})` : ""}, extra precision
            damage against unaware/flanked/denied-Dex foes.
          </p>
          <select
            className="mystery-select"
            value={chosen ?? ""}
            onChange={(e) =>
              update((d) =>
                setVigilanteSpecialization(
                  d,
                  e.target.value === "avenger" || e.target.value === "stalker"
                    ? e.target.value
                    : null,
                ),
              )
            }
          >
            <option value="">— none chosen —</option>
            <option value="avenger">Avenger (full BAB)</option>
            <option value="stalker">Stalker (Hidden Strike)</option>
          </select>
        </>
      )}
    </div>
  );
}
