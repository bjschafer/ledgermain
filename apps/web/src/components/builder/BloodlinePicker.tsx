import { useMemo } from "react";

import {
  bloodlineMovesNumbers,
  mergedSorcererBloodlineCatalog,
  type MergedSorcererBloodlineEntry,
} from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setSorcererBloodline, setSorcererBloodlineVariant } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface BloodlinePickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

function normalizeBloodlineTag(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Sorcerer bloodline selection (PF1 grants exactly one, chosen at L1).
 * Free-choice: the vendored data has no sorcerer-heritage mapping, so
 * validation is "soft warning only" per the project's hybrid-prereqs
 * philosophy.
 *
 * The pickable tag list is the UNION of `refData.bloodlineSpellLists` (the
 * bonus-SPELLS-known source; bloodlines no upstream spell tags via
 * `learnedAt.bloodline` get hand-authored lists as a data-pipeline
 * supplement, see `src/supplements.ts`) and the full published
 * ARCANA/POWERS catalog (`mergedSorcererBloodlineCatalog`, issue #74) — a tag present
 * in both keeps the `bloodlineSpellLists` spelling (so
 * bonus-spell derivation, keyed on that exact tag, keeps working) with the
 * catalog's prose/mechanics attached for preview. ("Kobold" is that
 * spelling; the vendored prose catalog's "Kobold Sorcerer" is bridged to it
 * by the engine's alias map.)
 *
 * The chosen bloodline grants one bonus spell known per odd sorcerer level
 * starting at 3; the known-list panel merges those in with a "bloodline"
 * badge, and the tracker's Spells panel makes them castable. This picker also
 * sets the choice for bloodline ARCANA + POWERS — every published bloodline
 * is hand-authored in the engine table, so the preview always shows the
 * arcana + power summaries. The `badge-modeled` "M" marks the ones that
 * carry live mechanics (`bloodlineMovesNumbers`: a Change or resource pool
 * somewhere), not merely rules text. `ClassFeaturesList` (elsewhere in the
 * builder) shows the granted powers themselves, tagged "— <Name>
 * Bloodline"; this panel just previews them.
 */
export function BloodlinePicker({ doc, refData, update }: BloodlinePickerProps) {
  const isSorcerer = doc.identity.classes.some((c) => c.tag === "sorcerer");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Bloodline", false);

  const options = useMemo(() => {
    const catalog = mergedSorcererBloodlineCatalog(refData);
    const catalogByNorm = new Map(catalog.map((b) => [normalizeBloodlineTag(b.name), b]));
    const seen = new Set<string>();
    const rows: { tag: string; merged: MergedSorcererBloodlineEntry | undefined }[] = [];
    for (const tag of Object.keys(refData.bloodlineSpellLists).filter((t) => t.length > 0)) {
      const norm = normalizeBloodlineTag(tag);
      seen.add(norm);
      rows.push({ tag, merged: catalogByNorm.get(norm) });
    }
    for (const b of catalog) {
      const norm = normalizeBloodlineTag(b.name);
      if (seen.has(norm)) continue;
      seen.add(norm);
      rows.push({ tag: b.tag, merged: b });
    }
    return rows.sort((a, b) => a.tag.localeCompare(b.tag));
  }, [refData]);

  const chosen = doc.build.sorcererBloodline ?? "";
  const bloodlineDef = options.find((o) => o.tag === chosen)?.merged;
  const variant = doc.build.sorcererBloodlineVariant ?? "";

  if (!isSorcerer) return null;

  return (
    <div className="subsection bloodline-picker">
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
          Bloodline
          {chosen ? (
            <span className="hint">
              {" "}
              · {chosen}
              {bloodlineDef && bloodlineMovesNumbers(bloodlineDef) && (
                <span className="badge-modeled"> M</span>
              )}
            </span>
          ) : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint bloodline-picker-hint">
            Pick one bloodline (PF1 grants one at level 1). It grants one bonus spell known per odd
            sorcerer level (3, 5, 7, …), drawn from that bloodline's spell list. Browses the full
            published arcana/powers catalog; entries marked <span className="badge-modeled">M</span>{" "}
            move real numbers or tracked uses on your sheet, and the rest show their rules text to
            apply at the table. Free choice, no heritage validation.
          </p>
          <select
            className="bloodline-select"
            value={chosen}
            onChange={(e) => update((d) => setSorcererBloodline(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {options.map((o) => (
              <option key={o.tag} value={o.tag}>
                {o.tag}
                {o.merged && bloodlineMovesNumbers(o.merged) ? " (M)" : ""}
              </option>
            ))}
          </select>

          {bloodlineDef?.variantOptions && (
            <div className="bloodline-variant-picker">
              <label htmlFor="bloodline-variant-select" className="hint">
                {bloodlineDef.variantPrompt ?? "Variant"}
              </label>
              <select
                id="bloodline-variant-select"
                className="bloodline-variant-select"
                value={variant}
                onChange={(e) =>
                  update((d) => setSorcererBloodlineVariant(d, e.target.value || null))
                }
              >
                <option value="">— none chosen —</option>
                {bloodlineDef.variantOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {bloodlineDef &&
            (bloodlineDef.displayOnly ? (
              bloodlineDef.description ? (
                <FeatureDescription html={bloodlineDef.description} />
              ) : null
            ) : (
              <div className="bloodline-preview">
                <div className="bloodline-arcana">
                  <span className="hint">Bloodline Arcana</span>
                  <p>{bloodlineDef.arcana.summary}</p>
                </div>
                <ul className="bloodline-powers">
                  {bloodlineDef.powers.map((p) => (
                    <li key={p.id}>
                      <span className="cf-level">Lv {p.level}</span>{" "}
                      <span className="cf-name">{p.name}</span>
                      <p className="hint">{p.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
