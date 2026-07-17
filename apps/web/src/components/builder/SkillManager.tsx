import { useMemo, useState } from "react";

import { PARAMETERIZED_SKILL_PREFIXES } from "@pf1/engine";

import { addSkillInstance, setSkillRank, totalLevel } from "../../model/doc.js";
import { signed, skillName, SKILL_NAMES } from "../../model/names.js";
import { skillBudget } from "../../model/skills.js";
import { Dialog } from "../Dialog.js";
import { InfoTip } from "../InfoTip.js";
import { NumberField } from "./NumberField.js";
import type { BuilderProps } from "./types.js";

/** crf/pro/prf, in a stable display order (matches PARAMETERIZED_SKILL_PREFIXES). */
const SUBSKILL_BASES = [...PARAMETERIZED_SKILL_PREFIXES];

/**
 * The full-screen skill editor. The builder panel is sized to *summarize* the
 * skills a character has ranks in; assigning ranks across all ~35 skills wants
 * more room — a wide table with the ability/class/ACP breakdown visible, the
 * rank-budget pinned in the header, and the Craft/Profession/Perform add-row at
 * the bottom. Matches the spellbook/feat manager pattern.
 */
export function SkillManager({
  doc,
  sheet,
  refData,
  update,
  onClose,
}: Omit<BuilderProps, "undoLast"> & { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [newBase, setNewBase] = useState(SUBSKILL_BASES[0]!);
  const [newLabel, setNewLabel] = useState("");

  const budget = useMemo(
    () => skillBudget(doc, refData, sheet.abilities.int.mod),
    [doc, refData, sheet.abilities.int.mod],
  );
  const maxRank = totalLevel(doc);

  const skills = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(sheet.skills)
      .filter((s) => !q || skillName(s.id).toLowerCase().includes(q))
      .sort((a, b) => skillName(a.id).localeCompare(skillName(b.id)));
  }, [sheet.skills, query]);

  const over = budget.remaining < 0;

  function addSubskill() {
    if (!newLabel.trim()) return;
    update((d) => addSkillInstance(d, newBase, newLabel));
    setNewLabel("");
  }

  return (
    <Dialog
      title="Skills"
      subtitle={
        <span className={`budge${over ? " over" : ""}`}>
          ranks <b>{budget.spent}</b> / {budget.total} · <b>{budget.remaining}</b> left
        </span>
      }
      onClose={onClose}
      right={<span className="dialog-esc-hint">esc to close</span>}
    >
      <div className="skill-manager">
        <div className="skill-manager-filters">
          <input
            className="search"
            type="text"
            placeholder="Filter skills…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter skills"
            autoFocus
          />
        </div>

        <div className="skill-manager-body">
          <div className="skill-row skill-table-head">
            <span>Skill</span>
            <span className="skill-col-num">Ranks</span>
            <span className="skill-col-num">Total</span>
          </div>
          {skills.map((s) => (
            <div className="skill-row skill-manager-row" key={s.id}>
              <div>
                <div className="sname">
                  {skillName(s.id)}{" "}
                  {s.classSkill ? (
                    <span className="tag-cls" title="class skill">
                      class
                    </span>
                  ) : null}
                  {s.trainedOnly ? (
                    <InfoTip
                      className="tag-trained"
                      content="Trained only — cannot be used without ranks"
                    >
                      trained only
                    </InfoTip>
                  ) : null}
                  {s.id.includes(".") ? (
                    <button
                      type="button"
                      className="skill-remove"
                      title={`Remove ${skillName(s.id)}`}
                      onClick={() => update((d) => setSkillRank(d, s.id, 0))}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                <div className="smeta">
                  {s.ability.toUpperCase()} {signed(s.abilityMod)}
                  {s.classSkillBonus ? ` · class +${s.classSkillBonus}` : ""}
                  {s.acp ? ` · acp ${s.acp}` : ""}
                </div>
              </div>
              <NumberField
                className="num"
                size={3}
                value={doc.build.skillRanks[s.id] ?? 0}
                min={0}
                max={maxRank}
                onCommit={(n) => update((d) => setSkillRank(d, s.id, n))}
                aria-label={`${skillName(s.id)} ranks`}
              />
              {s.usable ? (
                <span className="stotal num">{signed(s.total)}</span>
              ) : (
                <InfoTip className="stotal num unusable" content="Trained only — no ranks invested">
                  {signed(s.total)}
                </InfoTip>
              )}
            </div>
          ))}
        </div>

        <div className="skill-add-row skill-manager-add">
          <select
            value={newBase}
            onChange={(e) => setNewBase(e.target.value)}
            aria-label="Craft/Profession/Perform type"
          >
            {SUBSKILL_BASES.map((base) => (
              <option key={base} value={base}>
                {SKILL_NAMES[base] ?? base}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="e.g. Alchemy, Oratory, Blacksmithing…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSubskill();
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            disabled={!newLabel.trim()}
            onClick={addSubskill}
          >
            + Add
          </button>
        </div>
      </div>
    </Dialog>
  );
}
