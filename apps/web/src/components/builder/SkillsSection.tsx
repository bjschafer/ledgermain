import { useMemo, useState } from "react";

import { setSkillRank, totalLevel } from "../../model/doc.js";
import { signed, skillName } from "../../model/names.js";
import { skillBudget } from "../../model/skills.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function SkillsSection({ doc, sheet, refData, update }: BuilderProps) {
  const [query, setQuery] = useState("");

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

  return (
    <Panel
      title="Skills"
      step="v"
      right={
        <span className={`budge${over ? " over" : ""}`}>
          ranks <b>{budget.spent}</b> / {budget.total} · <b>{budget.remaining}</b> left
        </span>
      }
    >
      {maxRank === 0 ? (
        <p className="empty">Add a class first — skill ranks come from class levels.</p>
      ) : (
        <>
          <input
            className="search"
            type="text"
            placeholder="Filter skills…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {skills.map((s) => (
              <div className="skill-row" key={s.id}>
                <div>
                  <div className="sname">
                    {skillName(s.id)}{" "}
                    {s.classSkill ? <span className="smeta tag-cls">class</span> : null}
                  </div>
                  <div className="smeta">
                    {s.ability.toUpperCase()} {signed(s.abilityMod)}
                    {s.classSkillBonus ? ` · class +${s.classSkillBonus}` : ""}
                    {s.acp ? ` · acp ${s.acp}` : ""}
                  </div>
                </div>
                <input
                  className="rank-input num"
                  type="number"
                  min={0}
                  max={maxRank}
                  value={doc.build.skillRanks[s.id] ?? 0}
                  onChange={(e) => update((d) => setSkillRank(d, s.id, Number(e.target.value)))}
                  aria-label={`${skillName(s.id)} ranks`}
                />
                <span className="stotal num">{signed(s.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
