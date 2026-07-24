import { useMemo, useState } from "react";

import { totalLevel } from "../../model/doc.js";
import { signed, skillName } from "../../model/names.js";
import { permanentIntMod, skillBudget } from "../../model/skills.js";
import { InfoTip } from "../InfoTip.js";
import { BookIcon } from "../icons.js";
import { Panel } from "./Panel.js";
import { SkillManager } from "./SkillManager.js";
import type { BuilderProps } from "./types.js";

export function SkillsSection({ doc, sheet, refData, update }: BuilderProps) {
  const [managerOpen, setManagerOpen] = useState(false);

  const budget = useMemo(
    () => skillBudget(doc, refData, permanentIntMod(doc, refData)),
    [doc, refData],
  );
  const maxRank = totalLevel(doc);

  // The panel summarizes only skills the character has actually invested ranks
  // in — assigning ranks across the full list happens in the SkillManager.
  const invested = useMemo(
    () =>
      Object.values(sheet.skills)
        .filter((s) => (doc.build.skillRanks[s.id] ?? 0) > 0)
        .sort((a, b) => skillName(a.id).localeCompare(skillName(b.id))),
    [sheet.skills, doc.build.skillRanks],
  );

  const over = budget.remaining < 0;

  return (
    <Panel
      title="Skills"
      step="vi"
      icon={<BookIcon />}
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
          <div className="spell-manager-launch">
            <button type="button" className="btn-gold" onClick={() => setManagerOpen(true)}>
              Assign skills
            </button>
            <span className="hint">
              {budget.remaining > 0
                ? `${budget.remaining} rank${budget.remaining === 1 ? "" : "s"} left to spend`
                : over
                  ? "over budget — trim some ranks"
                  : "all ranks assigned"}
            </span>
          </div>

          {managerOpen && (
            <SkillManager
              doc={doc}
              sheet={sheet}
              refData={refData}
              update={update}
              onClose={() => setManagerOpen(false)}
            />
          )}

          <div className="scroll">
            {invested.length === 0 ? (
              <div className="empty">No ranks assigned yet — “Assign skills” to spend them.</div>
            ) : (
              invested.map((s) => (
                <div className="skill-row skill-summary-row" key={s.id}>
                  <div>
                    <div className="sname">
                      {skillName(s.id)}{" "}
                      {s.classSkill ? (
                        <span className="tag-cls" title="class skill">
                          class
                        </span>
                      ) : null}
                    </div>
                    <div className="smeta">
                      {s.ability.toUpperCase()} {signed(s.abilityMod)}
                      {s.classSkillBonus ? ` · class +${s.classSkillBonus}` : ""}
                      {s.acp ? ` · acp ${s.acp}` : ""}
                    </div>
                  </div>
                  <span className="skill-summary-ranks">
                    {doc.build.skillRanks[s.id] ?? 0} rank
                    {(doc.build.skillRanks[s.id] ?? 0) === 1 ? "" : "s"}
                  </span>
                  {s.usable ? (
                    <span className="stotal num">{signed(s.total)}</span>
                  ) : (
                    <InfoTip
                      className="stotal num unusable"
                      content="Trained only — no ranks invested"
                    >
                      {signed(s.total)}
                    </InfoTip>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
