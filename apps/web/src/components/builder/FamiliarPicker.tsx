import { BASE_FAMILIARS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { clearFamiliar, setFamiliar, setFamiliarNotes } from "../../model/familiar.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface FamiliarPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Tracked familiar (PF1 arcane familiar) — species + name. Class-agnostic:
 * unlike `ArcaneBondPicker` (Wizard's arcane-bond CHOICE between a familiar
 * and a bonded object, master-bonus-only), this models the familiar itself as
 * a full trackable creature (see `@pf1/engine` `deriveFamiliar` / the
 * tracker's `FamiliarPanel`) — any class/feature that grants a familiar
 * (Wizard arcane bond, an Arcanist exploit, a feat, ...) uses this, so it's
 * not gated behind a class check.
 */
export function FamiliarPicker({ doc, update }: FamiliarPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Familiar", false);
  const familiar = doc.build.familiar;
  const species = familiar ? BASE_FAMILIARS[familiar.speciesId] : undefined;

  return (
    <div className="subsection familiar-picker">
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
          Familiar
          {familiar ? <span className="hint"> · {familiar.name}</span> : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint familiar-hint">
            A tracked familiar gets its own stat block on the Play tab — HP, AC, saves, attacks, and
            skills, derived from your level and this species. Its published master bonus (e.g. a
            cat's +3 Stealth) and Alertness (while it's within arm's reach) apply automatically to
            your own sheet.
          </p>
          {!familiar ? (
            <button
              type="button"
              className="chip"
              onClick={() => update((d) => setFamiliar(d, "cat", "Familiar"))}
            >
              Add a familiar
            </button>
          ) : (
            <>
              <div className="familiar-fields">
                <select
                  className="familiar-select"
                  value={familiar.speciesId}
                  onChange={(e) => update((d) => setFamiliar(d, e.target.value, familiar.name))}
                  aria-label="Familiar species"
                >
                  {Object.entries(BASE_FAMILIARS).map(([id, def]) => (
                    <option key={id} value={id}>
                      {def.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="familiar-name"
                  placeholder="Name"
                  value={familiar.name}
                  onChange={(e) =>
                    update((d) => setFamiliar(d, familiar.speciesId, e.target.value))
                  }
                  aria-label="Familiar name"
                />
              </div>
              <textarea
                className="familiar-notes"
                placeholder="Notes (personality, tricks, house rules…)"
                value={familiar.notes ?? ""}
                onChange={(e) => update((d) => setFamiliarNotes(d, e.target.value))}
                aria-label="Familiar notes"
              />
              {species && (
                <p className="hint familiar-effect">
                  {species.name}: {species.senses.join(", ")}. Speed{" "}
                  {Object.entries(species.speeds)
                    .map(([mode, ft]) => (mode === "land" ? `${ft} ft.` : `${mode} ${ft} ft.`))
                    .join(", ")}
                  .
                </p>
              )}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => update((d) => clearFamiliar(d))}
              >
                Remove familiar
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
