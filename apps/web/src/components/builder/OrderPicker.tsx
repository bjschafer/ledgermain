import { useMemo } from "react";

import { challengeRiderText, ordersForClass } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setCavalierOrder } from "../../model/doc.js";
import { SKILL_NAMES } from "../../model/names.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface OrderPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Cavalier/samurai order selection (PF1 grants exactly one, chosen at L1,
 * never changed thereafter). Free-choice: the vendored data has no
 * per-order structure (see `@pf1/engine` `cavalier-orders.ts`'s doc
 * comment), so validation is "soft warning only" per the project's
 * hybrid-prereqs philosophy — mirrors `MysteryPicker`/`DisciplinePicker`.
 *
 * `build.cavalierOrder` is a single shared field for both classes (RAW lets
 * a samurai freely pick a cavalier order in place of Warrior/Ronin) — the
 * option list is class-scoped via `ordersForClass`, so a pure cavalier never
 * sees Warrior/Ronin, while a samurai sees all eight.
 *
 * Order skills and the 2nd/8th/15th-level order abilities are display-only
 * prose (same posture as `MysteryPicker`'s bonus class skills — see
 * `cavalier-orders.ts`'s doc comment for the documented `classSkillSet`
 * wiring gap this doesn't attempt to close). The Challenge rider IS a real
 * number, shown live via `challengeRiderText` against the character's
 * current cavalier/samurai level — but it's target-scoped ("against the
 * challenge target", "while mounted", ...) so it's shown as reference text
 * only, never folded into AC/attack/damage automatically.
 */
export function OrderPicker({ doc, update }: OrderPickerProps) {
  const cavalierLevel = doc.identity.classes.find((c) => c.tag === "cavalier")?.level ?? 0;
  const samuraiLevel = doc.identity.classes.find((c) => c.tag === "samurai")?.level ?? 0;
  const isCavalier = cavalierLevel > 0;
  const isSamurai = samuraiLevel > 0;
  const classLevel = Math.max(cavalierLevel, samuraiLevel);
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Order", false);

  const options = useMemo(() => {
    const classTag = isSamurai ? "samurai" : "cavalier";
    return [...ordersForClass(classTag)].sort((a, b) => a.name.localeCompare(b.name));
  }, [isSamurai]);

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
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint order-picker-hint">
            Pick one order (PF1 grants one at level 1, never changed thereafter). It grants two
            bonus class skills (display-only), a rider on the Challenge ability, and abilities at
            2nd/8th/15th level. Free-choice — no edict/alignment validation.
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
              </option>
            ))}
          </select>

          {orderDef && (
            <div className="order-preview">
              <p className="order-edicts">
                <span className="hint">Edicts</span> {orderDef.edicts}
              </p>
              <div className="order-class-skills">
                <span className="hint">Bonus Class Skills</span>
                <p>{orderDef.orderSkills.map((id) => SKILL_NAMES[id] ?? id).join(", ") || "—"}</p>
              </div>
              <div className="order-challenge">
                <span className="hint">Challenge{classLevel > 0 ? ` (Lv ${classLevel})` : ""}</span>
                <p>{challengeRiderText(orderDef, classLevel || 1)}</p>
              </div>
              <ul className="order-abilities">
                {orderDef.abilities.map((a) => (
                  <li key={a.name}>
                    <span className="cf-level">Lv {a.level}</span>{" "}
                    <span className="cf-name">{a.name}</span>
                    <p className="order-ability-summary">{a.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
