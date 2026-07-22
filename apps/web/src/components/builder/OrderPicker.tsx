import { useMemo } from "react";

import { challengeRiderText, mergedOrdersForClass } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setCavalierOrder } from "../../model/doc.js";
import { SKILL_NAMES } from "../../model/names.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface OrderPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Cavalier/samurai order selection (PF1 grants exactly one, chosen at L1,
 * never changed thereafter). Free-choice: validation is "soft warning only"
 * per the project's hybrid-prereqs philosophy — mirrors
 * `MysteryPicker`/`DisciplinePicker`.
 *
 * Browses the FULL published order catalog (`mergedOrdersForClass` — every
 * vendored entry, overlaid with the 8 hand-authored chassis on a name
 * match, issue #74 Phase 3c) rather than just the 8 hand-authored orders. A
 * `badge-modeled` "M" marks the entries with a real, structured chassis
 * (two bonus skills, a Challenge rider, 2nd/8th/15th abilities) — the
 * remaining ~30 published orders have no such structure in the vendored
 * source (their level-tiered abilities live only as prose, see
 * `@pf1/engine` `cavalier-orders.ts`'s `mergedOrderCatalog` doc comment) and
 * show their full description text instead of the structured breakdown.
 *
 * `build.cavalierOrder` is a single shared field for both classes (RAW lets
 * a samurai freely pick a cavalier order in place of Warrior/Ronin) — the
 * option list is class-scoped via `mergedOrdersForClass`, so a pure
 * cavalier never sees Warrior/Ronin, while a samurai sees all orders.
 *
 * Order skills and the 2nd/8th/15th-level order abilities are display-only
 * prose (same posture as `MysteryPicker`'s bonus class skills — see
 * `cavalier-orders.ts`'s doc comment for the documented `classSkillSet`
 * wiring gap this doesn't attempt to close). The Challenge rider IS a real
 * number, shown live via `challengeRiderText` against the character's
 * current cavalier/samurai level (modeled orders only) — but it's
 * target-scoped ("against the challenge target", "while mounted", ...) so
 * it's shown as reference text only, never folded into AC/attack/damage
 * automatically.
 */
export function OrderPicker({ doc, refData, update }: OrderPickerProps) {
  const cavalierLevel = doc.identity.classes.find((c) => c.tag === "cavalier")?.level ?? 0;
  const samuraiLevel = doc.identity.classes.find((c) => c.tag === "samurai")?.level ?? 0;
  const isCavalier = cavalierLevel > 0;
  const isSamurai = samuraiLevel > 0;
  const classLevel = Math.max(cavalierLevel, samuraiLevel);
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Order", false);

  const options = useMemo(() => {
    const classTag = isSamurai ? "samurai" : "cavalier";
    return [...mergedOrdersForClass(refData, classTag)].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [refData, isSamurai]);

  const chosen = doc.build.cavalierOrder ?? "";
  const orderDef = options.find((o) => o.id === chosen);

  if (!isCavalier && !isSamurai) return null;

  return (
    <div className="subsection order-picker">
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
          Order
          {orderDef ? <span className="hint"> · {orderDef.name}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint order-picker-hint">
            Pick one order (PF1 grants one at level 1, never changed thereafter). Browses the full
            published catalog; entries marked <span className="badge-modeled">M</span> carry a
            structured chassis (bonus skills, Challenge rider, 2nd/8th/15th abilities) — the rest
            show their full published text instead. Free-choice — no edict/alignment validation.
            {isSamurai
              ? " A samurai may pick one of the cavalier orders instead of Warrior/Ronin."
              : null}
          </p>
          <select
            className="order-select"
            value={chosen}
            onChange={(e) => update((d) => setCavalierOrder(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.displayOnly ? "" : " (M)"}
              </option>
            ))}
          </select>

          {orderDef && (
            <div className="order-preview">
              {orderDef.edicts ? (
                <p className="order-edicts">
                  <span className="hint">Edicts</span> {orderDef.edicts}
                </p>
              ) : null}
              {orderDef.orderSkills ? (
                <div className="order-class-skills">
                  <span className="hint">Bonus Class Skills</span>
                  <p>{orderDef.orderSkills.map((id) => SKILL_NAMES[id] ?? id).join(", ") || "—"}</p>
                </div>
              ) : null}
              {orderDef.challengeTemplate ? (
                <div className="order-challenge">
                  <span className="hint">
                    Challenge{classLevel > 0 ? ` (Lv ${classLevel})` : ""}
                  </span>
                  <p>
                    {challengeRiderText(
                      { challengeTemplate: orderDef.challengeTemplate },
                      classLevel || 1,
                    )}
                  </p>
                </div>
              ) : null}
              {orderDef.abilities ? (
                <ul className="order-abilities">
                  {orderDef.abilities.map((a) => (
                    <li key={a.name}>
                      <span className="cf-level">Lv {a.level}</span>{" "}
                      <span className="cf-name">{a.name}</span>
                      <p className="order-ability-summary">{a.summary}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {orderDef.description ? <FeatureDescription html={orderDef.description} /> : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
