import { useMemo } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";

import { eligibleAdvancementTargets } from "../../model/casterLevel.js";
import { setCastingAdvancementTarget } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface CastingAdvancementPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const SLOT_LABEL: Record<"arcane" | "divine" | "any", string> = {
  arcane: "Advances arcane casting",
  divine: "Advances divine casting",
  any: "Advances spellcasting (any type)",
};

const SLOT_EMPTY_HINT: Record<"arcane" | "divine" | "any", string> = {
  arcane: "requires an arcane casting class in this build",
  divine: "requires a divine casting class in this build",
  any: "requires a spellcasting class in this build",
};

function classNameByTag(refData: RefData, tag: string): string {
  return Object.values(refData.classes).find((c) => c.tag === tag)?.name ?? tag;
}

interface AdvancementEntry {
  tag: string;
  name: string;
  slots: { kind: "arcane" | "divine" | "any"; levels: number[] }[];
}

/**
 * One target picker per prestige class's casting-advancement slot (issue #66
 * chunk 3) — e.g. Eldritch Knight's single arcane slot, or Mystic Theurge's
 * arcane + divine pair. Self-filtering, same posture as `AnimalCompanionPicker`
 * /`FamiliarPicker`: renders nothing when no class on the build has any
 * `castingAdvancement` slots at all. All the validation logic (eligible
 * targets, storage, cleanup on class removal) already lives in
 * `model/casterLevel.ts` / `model/doc.ts` (issue #66 chunk 2) — this is a thin
 * view over `eligibleAdvancementTargets` + `setCastingAdvancementTarget`.
 */
export function CastingAdvancementPicker({ doc, refData, update }: CastingAdvancementPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:CastingAdvancement", false);

  const entries: AdvancementEntry[] = useMemo(() => {
    const out: AdvancementEntry[] = [];
    for (const c of doc.identity.classes) {
      const def = Object.values(refData.classes).find((cl) => cl.tag === c.tag);
      if (def?.castingAdvancement?.length) {
        out.push({ tag: c.tag, name: def.name, slots: def.castingAdvancement });
      }
    }
    return out;
  }, [doc.identity.classes, refData]);

  if (entries.length === 0) return null;

  return (
    <div className="subsection casting-advancement-picker">
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
        <h3>Casting Advancement</h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint">
            Each slot advances an existing spellcasting class's spells per day / spells known and
            caster level only — never that class's other features (bloodline powers, domains,
            discoveries, etc).
          </p>
          {entries.map((entry) => (
            <div key={entry.tag} className="casting-advancement-class">
              <div className="casting-advancement-class-name">{entry.name}</div>
              {entry.slots.map((slot, i) => {
                const options = eligibleAdvancementTargets(doc, refData, entry.tag, i);
                const chosen = doc.build.castingAdvancement?.[entry.tag]?.[i] ?? "";
                return (
                  <div className="casting-advancement-slot" key={i}>
                    <label className="feat-choice-label">
                      {SLOT_LABEL[slot.kind]}:
                      {options.length === 0 ? (
                        <span className="hint" style={{ marginLeft: 6 }}>
                          {SLOT_EMPTY_HINT[slot.kind]}
                        </span>
                      ) : (
                        <select
                          className="feat-choice-select"
                          value={chosen ?? ""}
                          onChange={(e) =>
                            update((d) =>
                              setCastingAdvancementTarget(
                                d,
                                refData,
                                entry.tag,
                                i,
                                e.target.value || null,
                              ),
                            )
                          }
                        >
                          <option value="">— none —</option>
                          {options.map((tag) => (
                            <option key={tag} value={tag}>
                              {classNameByTag(refData, tag)}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
