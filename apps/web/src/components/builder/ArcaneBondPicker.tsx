import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { setArcaneBond } from "../../model/doc.js";
import { setFamiliar } from "../../model/familiar.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { FeatureDescription } from "./ClassFeaturesList.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface ArcaneBondPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  sheet: DerivedSheet;
  update: Updater;
}

/**
 * Wizard arcane bond (PF1 L1 choice): a familiar or a bonded object. Choosing
 * "Familiar" here just sets the bond type and defers everything else (species,
 * name, the tracked stat block) to `FamiliarPicker` below — auto-creating a
 * default tracked familiar (`doc.build.familiar`) the first time so there's
 * one species picker, not two disagreeing ones. The familiar's master bonus
 * (hand-authored table in `@pf1/engine` familiars.ts) is applied from that
 * same tracked-familiar field (see `collect.ts`'s "tracked familiar" block) —
 * this picker no longer applies it a second time. A bonded object is recorded
 * by name; its RAW mechanics (cast any spellbook spell 1/day; concentration DC
 * 20 + spell level when casting without it) are surfaced as text, not modeled
 * numerically.
 */
export function ArcaneBondPicker({ doc, refData, sheet, update }: ArcaneBondPickerProps) {
  const isWizard = doc.identity.classes.some((c) => c.tag === "wizard");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:ArcaneBond", false);
  if (!isWizard) return null;

  const bond = doc.build.arcaneBond;
  const bondSummary =
    bond?.type === "familiar"
      ? `Familiar${doc.build.familiar ? ` · ${doc.build.familiar.name}` : ""}`
      : bond?.type === "object"
        ? `Bonded object${bond.bondedItemName ? ` · ${bond.bondedItemName}` : ""}`
        : null;
  const featureDescription = sheet.classFeatures.find(
    (f) => f.classTag === "wizard" && f.name === "Arcane Bond",
  );
  const description = featureDescription
    ? refData.classFeatures[featureDescription.featureId]?.description
    : undefined;

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
          Arcane Bond
          {bondSummary ? <span className="hint"> · {bondSummary}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint arcane-bond-hint">
            Wizards form an arcane bond at level 1: a familiar (grants you its master bonus, and
            Alertness while it's within arm's reach) or a bonded object (cast any one spell from
            your spellbook once per day; casting without the object in hand requires a concentration
            check, DC 20 + spell level).
          </p>
          <div className="chips arcane-bond-type">
            <button
              type="button"
              className="chip"
              aria-pressed={bond?.type === "familiar"}
              onClick={() =>
                update((d) => {
                  if (d.build.arcaneBond?.type === "familiar") return setArcaneBond(d, null);
                  const kind = d.build.familiar?.speciesId ?? "cat";
                  const withBond = setArcaneBond(d, { type: "familiar", familiarKind: kind });
                  return withBond.build.familiar
                    ? withBond
                    : setFamiliar(withBond, kind, "Familiar");
                })
              }
            >
              Familiar
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={bond?.type === "object"}
              onClick={() =>
                update((d) =>
                  d.build.arcaneBond?.type === "object"
                    ? setArcaneBond(d, null)
                    : setArcaneBond(d, { type: "object" }),
                )
              }
            >
              Bonded object
            </button>
          </div>

          {bond?.type === "familiar" && (
            <p className="hint arcane-bond-effect">
              Pick its species and name in the Familiar section below — its master bonus applies
              from there.
            </p>
          )}

          {bond?.type === "object" && (
            <input
              type="text"
              className="arcane-bond-object-name"
              placeholder="Bonded object (e.g. ring, staff, wand…)"
              value={bond.bondedItemName ?? ""}
              onChange={(e) =>
                update((d) => setArcaneBond(d, { type: "object", bondedItemName: e.target.value }))
              }
              aria-label="Bonded object name"
            />
          )}

          {description && <FeatureDescription html={description} />}
        </>
      )}
    </div>
  );
}
