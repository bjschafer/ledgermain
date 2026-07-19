import {
  ABILITY_IDS,
  setAbility,
  setAbilityIncreaseCount,
  setAbilityPointBuyBudget,
  totalLevel,
} from "../../model/doc.js";
import { ABILITY_ABBR, signed } from "../../model/names.js";
import { POINT_BUY_BUDGETS, totalPointBuyCost } from "../../model/pointBuy.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { Explainer } from "../Explainer.js";
import { DumbbellIcon } from "../icons.js";
import { NumberField } from "./NumberField.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function AbilitiesSection({ doc, sheet, update }: BuilderProps) {
  const allowed = Math.floor(totalLevel(doc) / 4);
  const increases = doc.build.abilityIncreases ?? [];
  const assigned = increases.length;
  // Ability-score-increases subsection: default collapsed (only relevant every 4 levels)
  const [incCollapsed, toggleIncCollapsed] = useCollapsed("subsection:AbilityIncreases", true);

  // Point buy (issue #86): off/absent = no readout at all. Reads doc.abilities
  // directly — the pre-racial base scores the six NumberFields below edit —
  // never the racial-adjusted `sheet.abilities`.
  const budget = doc.build.abilityPointBuyBudget;
  const isStandardBudget = budget != null && POINT_BUY_BUDGETS.some((b) => b.points === budget);
  const budgetSelectValue = budget == null ? "off" : isStandardBudget ? String(budget) : "custom";
  const pointBuy = totalPointBuyCost(doc.abilities);
  const overBudget = budget != null && pointBuy.spent > budget;
  const outOfRangeNames = pointBuy.outOfRange.map((id) => ABILITY_ABBR[id]).join(", ");

  return (
    <Panel
      title="Ability Scores"
      step="ii"
      icon={<DumbbellIcon />}
      storageKey="panel:AbilityScores"
      right={<span className="hint">base scores · racial mods shown below</span>}
    >
      <div className="abilities-grid">
        {ABILITY_IDS.map((id) => {
          const score = sheet.abilities[id];
          // Only true racial modifiers (race changes + flexible +2 choice) carry
          // the race's id as their sourceId. Level-up increases, items, buffs,
          // etc. must not be folded into the "race" label.
          const racial = score.components
            .filter((c) => c.applied && c.sourceId === doc.identity.race)
            .reduce((sum, c) => sum + c.value, 0);
          return (
            <div className="ability-cell" key={id}>
              <div className="abbr">{ABILITY_ABBR[id]}</div>
              <NumberField
                value={doc.abilities[id]}
                min={1}
                max={50}
                block
                onCommit={(n) => update((d) => setAbility(d, id, n))}
                aria-label={`${ABILITY_ABBR[id]} base score`}
              />
              <div className="mod">
                <b className="num">{signed(score.mod)}</b>
                {racial !== 0 ? ` · ${signed(racial)} race` : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div className="point-buy-row">
        <label className="hint" htmlFor="point-buy-budget">
          Point buy
        </label>
        <select
          id="point-buy-budget"
          className="point-buy-select"
          value={budgetSelectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "off") update((d) => setAbilityPointBuyBudget(d, null));
            else if (v === "custom") update((d) => setAbilityPointBuyBudget(d, budget ?? 15));
            else update((d) => setAbilityPointBuyBudget(d, Number(v)));
          }}
        >
          <option value="off">Off</option>
          {POINT_BUY_BUDGETS.map((b) => (
            <option key={b.points} value={b.points}>
              {b.label} ({b.points})
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        {budgetSelectValue === "custom" && (
          <NumberField
            className="num"
            size={3}
            value={budget ?? 15}
            min={0}
            max={99}
            onCommit={(n) => update((d) => setAbilityPointBuyBudget(d, n))}
            aria-label="Custom point-buy budget"
          />
        )}
        {budget != null && (
          <span
            className={`hint point-buy-readout${overBudget || outOfRangeNames ? " warn-over" : ""}`}
            title={
              outOfRangeNames
                ? `${outOfRangeNames} outside the 7–18 purchase range — not priced`
                : overBudget
                  ? "Over budget — free-choice, GMs house-rule freely"
                  : undefined
            }
          >
            {pointBuy.spent} of {budget} points
            {outOfRangeNames ? " · some scores outside 7–18" : ""}
          </span>
        )}
      </div>

      <Explainer title="What is point buy?">
        <p className="hint">
          The Core Rulebook's purchase-cost system for the six base ability scores (before racial
          modifiers): each score from 7 to 18 costs a fixed number of points, and a table budget
          (Low 10 / Standard 15 / High 20 / Epic 25, or a custom house-ruled total) caps the sum.
          This is a running total only — nothing here blocks input.
        </p>
      </Explainer>

      {allowed >= 1 && (
        <div className="subsection">
          <div
            className="subsection-header"
            onClick={toggleIncCollapsed}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") toggleIncCollapsed();
            }}
            aria-expanded={!incCollapsed}
          >
            <h3>
              Ability Score Increases · {assigned} / {allowed} assigned
            </h3>
            <Caret open={!incCollapsed} />
          </div>
          {!incCollapsed && (
            <>
              <p className="hint" style={{ margin: "8px 0" }}>
                +1 every 4 character levels{" "}
                <span style={{ color: "var(--faint)" }}>(levels 4, 8, 12, …)</span>
              </p>
              <div className="ability-inc-grid">
                {ABILITY_IDS.map((id) => {
                  const count = increases.filter((a) => a === id).length;
                  return (
                    <div className="ability-inc-cell" key={id}>
                      <div className="abbr">{ABILITY_ABBR[id]}</div>
                      <NumberField
                        className="num"
                        size={2}
                        value={count}
                        min={0}
                        max={allowed}
                        minusDisabled={count === 0}
                        plusDisabled={assigned >= allowed}
                        onCommit={(n) => update((d) => setAbilityIncreaseCount(d, id, n))}
                        aria-label={`${ABILITY_ABBR[id]} increases`}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
