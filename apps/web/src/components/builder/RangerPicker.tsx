import type { CharacterDoc } from "@pf1/schema";

import {
  COMBAT_STYLES,
  FAVORED_ENEMY_TYPES,
  FAVORED_TERRAIN_TYPES,
  addFavoredEnemy,
  addFavoredTerrain,
  favoredEnemyBudget,
  favoredTerrainBudget,
  isRanger,
  removeFavoredEnemy,
  removeFavoredTerrain,
  setCombatStyle,
  setFavoredEnemyBonus,
  setFavoredEnemyType,
  setFavoredTerrainBonus,
  setFavoredTerrainType,
  type FavoredBudget,
} from "../../model/ranger.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { NumberField } from "./NumberField.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface RangerPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Ranger situational selections — Favored Enemy, Favored Terrain, and Combat
 * Style (PF1 CRB pp. 64–65). Free-choice / soft-validated, matching the other
 * class pickers: the budget line hints how many picks and how much bonus the
 * ranger's level grants, but nothing is enforced. The favored-enemy/terrain
 * bonuses don't touch the sheet directly — they surface by attaching them to a
 * saved roll (see the Saved Rolls panel), so this picker only records the
 * choices and their assigned bonuses.
 */
export function RangerPicker({ doc, update }: RangerPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Ranger", false);

  if (!isRanger(doc)) return null;

  const enemies = doc.build.favoredEnemies ?? [];
  const terrains = doc.build.favoredTerrains ?? [];
  const enemyBudget = favoredEnemyBudget(doc);
  const terrainBudget = favoredTerrainBudget(doc);
  const combatStyle = doc.build.combatStyle ?? "";
  const styleLabel = COMBAT_STYLES.find((s) => s.id === combatStyle)?.label;

  return (
    <div className="subsection ranger-picker">
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
          Ranger
          {styleLabel ? <span className="hint"> · {styleLabel}</span> : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          {/* ── Combat Style ─────────────────────────────────────────── */}
          <div className="ranger-block">
            <label className="ranger-style-label">
              Combat Style
              <select
                className="bloodline-select"
                value={combatStyle}
                onChange={(e) => update((d) => setCombatStyle(d, e.target.value || null))}
              >
                <option value="">— none chosen —</option>
                {COMBAT_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">
              The chosen style's bonus feats can be taken without meeting their normal prerequisites
              (they show as "combat style" in the feat list). The bonus-feat count is already
              applied automatically.
            </p>
          </div>

          {/* ── Favored Enemy ────────────────────────────────────────── */}
          <FavoredList
            title="Favored Enemy"
            choices={FAVORED_ENEMY_TYPES}
            entries={enemies}
            budget={enemyBudget}
            onAdd={() => update((d) => addFavoredEnemy(d))}
            onRemove={(i) => update((d) => removeFavoredEnemy(d, i))}
            onType={(i, type) => update((d) => setFavoredEnemyType(d, i, type))}
            onBonus={(i, bonus) => update((d) => setFavoredEnemyBonus(d, i, bonus))}
            note="+2 attack, damage, and Bluff/Knowledge/Perception/Sense Motive/Survival vs. the type."
          />

          {/* ── Favored Terrain ──────────────────────────────────────── */}
          <FavoredList
            title="Favored Terrain"
            choices={FAVORED_TERRAIN_TYPES}
            entries={terrains}
            budget={terrainBudget}
            onAdd={() => update((d) => addFavoredTerrain(d))}
            onRemove={(i) => update((d) => removeFavoredTerrain(d, i))}
            onType={(i, type) => update((d) => setFavoredTerrainType(d, i, type))}
            onBonus={(i, bonus) => update((d) => setFavoredTerrainBonus(d, i, bonus))}
            note="+2 initiative and Knowledge (geography)/Perception/Stealth/Survival while in the terrain."
          />
        </>
      )}
    </div>
  );
}

/** A row editor for a favored-enemy / favored-terrain list, with a budget hint. */
function FavoredList({
  title,
  choices,
  entries,
  budget,
  onAdd,
  onRemove,
  onType,
  onBonus,
  note,
}: {
  title: string;
  choices: readonly { id: string; label: string }[];
  entries: { type: string; bonus: number }[];
  budget: FavoredBudget;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onType: (index: number, type: string) => void;
  onBonus: (index: number, bonus: number) => void;
  note: string;
}) {
  const overChosen = budget.chosen > budget.slots;
  const overBudget = budget.bonusAssigned > budget.bonusBudget;
  return (
    <div className="ranger-block">
      <div className="ranger-block-head">
        <span className="hint">{title}</span>
        <button type="button" className="btn-ghost" onClick={onAdd}>
          + add
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="hint">None chosen.</p>
      ) : (
        <div className="ranger-rows">
          {entries.map((e, i) => (
            <div className="ranger-row" key={i}>
              <select
                className="bloodline-select"
                value={e.type}
                aria-label={`${title} ${i + 1} type`}
                onChange={(ev) => onType(i, ev.target.value)}
              >
                <option value="">— choose —</option>
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <NumberField
                className="num"
                size={2}
                min={0}
                step={2}
                value={e.bonus}
                onCommit={(n) => onBonus(i, n ?? 0)}
                aria-label={`${title} ${i + 1} bonus`}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => onRemove(i)}
                aria-label={`remove ${title} ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <p className={`hint ranger-budget${overChosen || overBudget ? " warn" : ""}`}>
        {budget.chosen}/{budget.slots} chosen · {budget.bonusAssigned}/{budget.bonusBudget} bonus
        {overChosen || overBudget ? " — over your level's allotment" : ""}
      </p>
      <p className="hint">{note}</p>
    </div>
  );
}
