import { useMemo } from "react";

import {
  bloodragerBloodlineMovesNumbers,
  featNameSlug,
  mergedBloodragerBloodlineCatalog,
} from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setBloodragerBloodline, setBloodragerBloodlineVariant } from "../../model/doc.js";
import { bloodragerBonusSpellsKnown } from "../../model/spellcasting.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface BloodragerBloodlinePickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Bloodrager bloodline selection (PF1 grants exactly one, chosen at L1, never
 * changed thereafter). Free-choice: "soft warning only" per the project's
 * hybrid-prereqs philosophy — mirrors `DisciplinePicker` exactly (fully
 * hand-authored table, not derived from a vendored refData list, same as
 * `@pf1/engine` `BLOODRAGER_BLOODLINES`'s doc comment explains for why it
 * can't reuse `refData.bloodlineSpellLists` the way sorcerer's picker does).
 *
 * Browses the FULL published bloodline catalog
 * (`mergedBloodragerBloodlineCatalog`) — every published bloodline is
 * hand-authored in the engine table, so the preview always shows power
 * summaries. The `badge-modeled` "M" marks the ones that carry live mechanics
 * (`bloodragerBloodlineMovesNumbers`: a Change or resource pool somewhere),
 * not merely rules text.
 *
 * The chosen bloodline:
 *  - grants bloodline POWERS at 1st/4th/8th/12th/16th/20th level — shown in
 *    `ClassFeaturesList` elsewhere in the builder (tagged "— <Name>
 *    Bloodline"), previewed here;
 *  - restricts the bloodrager's "Bloodline Feat (BLO)" slots (6th level and
 *    every 3 levels thereafter) to the bloodline's bonus-feat list — see
 *    `model/featSlots.ts`'s `bloodragerBloodline` slot kind;
 *  - grants ONE bonus spell known at each of 7th/10th/13th/16th bloodrager
 *    level (fixed schedule, NOT the sorcerer's `2L+1` cadence) — previewed
 *    here via `bloodragerBonusSpellsKnown`; display-only preview for now
 *    (not yet spliced into the known-spells list UI the way sorcerer's
 *    bloodline spells are).
 */
export function BloodragerBloodlinePicker({
  doc,
  refData,
  update,
}: BloodragerBloodlinePickerProps) {
  const isBloodrager = doc.identity.classes.some((c) => c.tag === "bloodrager");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:BloodragerBloodline", false);

  const catalog = useMemo(
    () => [...mergedBloodragerBloodlineCatalog(refData)].sort((a, b) => a.tag.localeCompare(b.tag)),
    [refData],
  );

  const chosen = doc.build.bloodragerBloodline ?? "";
  const bloodlineDef = catalog.find((b) => b.tag === chosen);
  const variant = doc.build.bloodragerBloodlineVariant ?? "";
  const bloodragerLevel = doc.identity.classes.find((c) => c.tag === "bloodrager")?.level ?? 0;

  if (!isBloodrager) return null;

  const bonusSpells = bloodragerBonusSpellsKnown(refData, chosen || undefined, 16);

  // Reverse-lookup a `featNameSlug` back to its display name against
  // `refData.feats` — `bonusFeatSlugs` stores slugs (e.g. "power-attack"),
  // not vendored feat ids, so a direct `refData.feats[slug]` lookup would
  // never hit. Built once per render since the list is short (≤8 entries).
  const feats = Object.values(refData.feats);
  const bonusFeatNames = (bloodlineDef?.bonusFeatSlugs ?? []).map(
    (slug) => feats.find((f) => featNameSlug(f.name) === slug)?.name ?? slug,
  );

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
              {bloodlineDef && bloodragerBloodlineMovesNumbers(bloodlineDef) && (
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
            Pick one bloodline (PF1 grants one at level 1, never changed thereafter). Every
            bloodline grants its powers at 1st/4th/8th/12th/16th/20th level, restricts your
            Bloodline Feat picks (6th level and every 3 thereafter), and grants one bonus spell
            known at 7th/10th/13th/16th level. Entries marked{" "}
            <span className="badge-modeled">M</span> move real numbers or tracked uses on your
            sheet; the rest show their rules text to apply at the table. Free choice, no heritage
            validation.
          </p>
          <select
            className="bloodline-select"
            value={chosen}
            onChange={(e) => update((d) => setBloodragerBloodline(d, e.target.value || null))}
          >
            <option value="">None chosen</option>
            {catalog.map((b) => (
              <option key={b.tag} value={b.tag}>
                {b.tag}
                {bloodragerBloodlineMovesNumbers(b) ? " (M)" : ""}
              </option>
            ))}
          </select>

          {bloodlineDef?.variantOptions && (
            <div className="bloodline-variant-picker">
              <label htmlFor="bloodrager-bloodline-variant-select" className="hint">
                {bloodlineDef.variantPrompt ?? "Variant"}
              </label>
              <select
                id="bloodrager-bloodline-variant-select"
                className="bloodline-variant-select"
                value={variant}
                onChange={(e) =>
                  update((d) => setBloodragerBloodlineVariant(d, e.target.value || null))
                }
              >
                <option value="">None chosen</option>
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
                <ul className="bloodline-powers">
                  {bloodlineDef.powers.map((p) => (
                    <li key={p.id} className={p.level > bloodragerLevel ? "not-yet" : undefined}>
                      <span className="cf-level">Lv {p.level}</span>{" "}
                      <span className="cf-name">{p.name}</span>
                      <p className="hint">{p.summary}</p>
                    </li>
                  ))}
                </ul>

                <div className="bloodline-bonus-feats">
                  <span className="hint">Bonus Feats (Bloodline Feat, 6th+)</span>
                  <p className="hint">{bonusFeatNames.join(", ")}</p>
                </div>

                <ul className="bloodline-bonus-spells">
                  {bonusSpells.map((sp) => (
                    <li
                      key={`${sp.grantedAtLevel}:${sp.name}`}
                      className={sp.grantedAtLevel > bloodragerLevel ? "not-yet" : undefined}
                    >
                      <span className="cf-level">Lv {sp.grantedAtLevel}</span>{" "}
                      <span className="cf-name">{sp.name}</span>
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
