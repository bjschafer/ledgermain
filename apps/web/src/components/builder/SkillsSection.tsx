import { useMemo, useState } from "react";

import { setSkillRank, totalLevel } from "../../model/doc.js";
import { signed, skillName } from "../../model/names.js";
import { skillBudget } from "../../model/skills.js";
import { NumberField } from "./NumberField.js";
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
      storageKey="panel:Skills"
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
                    {s.classSkill ? (
                      <span className="tag-cls" title="class skill">
                        class
                      </span>
                    ) : null}
                    {s.trainedOnly ? (
                      <span
                        className="tag-trained"
                        title="trained only — cannot be used without ranks"
                      >
                        trained only
                      </span>
                    ) : null}
                  </div>
                  <div className="smeta">
                    {s.ability.toUpperCase()} {signed(s.abilityMod)}
                    {s.classSkillBonus ? ` · class +${s.classSkillBonus}` : ""}
                    {s.acp ? ` · acp ${s.acp}` : ""}
                  </div>
                </div>
                <NumberField
                  className="rank-input num"
                  value={doc.build.skillRanks[s.id] ?? 0}
                  min={0}
                  max={maxRank}
                  onCommit={(n) => update((d) => setSkillRank(d, s.id, n))}
                  aria-label={`${skillName(s.id)} ranks`}
                />
                <span
                  className={`stotal num${s.usable ? "" : " unusable"}`}
                  title={s.usable ? undefined : "trained only — no ranks invested"}
                >
                  {signed(s.total)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
