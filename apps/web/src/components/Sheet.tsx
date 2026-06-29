import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { ABILITY_IDS } from "../model/doc.js";
import { ABILITY_ABBR, SAVE_NAMES, signed, skillName } from "../model/names.js";
import { StatSeal } from "./StatSeal.js";

/**
 * The live character sheet — a pure render of `compute()` output. It holds no
 * build logic; it updates because `useCharacter` recomputes on every doc change.
 */
export function Sheet({
  doc,
  sheet,
  refData,
}: {
  doc: CharacterDoc;
  sheet: DerivedSheet;
  refData: RefData;
}) {
  const race = refData.races[doc.identity.race];
  const classLine = doc.identity.classes
    .map((c) => {
      const def = Object.values(refData.classes).find((cl) => cl.tag === c.tag);
      return `${def?.name ?? c.tag} ${c.level}`;
    })
    .join(" / ");

  const investedSkills = Object.values(sheet.skills)
    .filter((s) => s.ranks > 0)
    .sort((a, b) => skillName(a.id).localeCompare(skillName(b.id)));

  return (
    <section className="sheet" aria-label="Live character sheet">
      <div className="char-name">{doc.identity.name || "Unnamed"}</div>
      <div className="char-sub">
        {[race?.name, classLine].filter(Boolean).join(" · ") || "No race or class chosen"}
        {sheet.level > 0 ? ` · CL ${sheet.level}` : ""}
      </div>

      <div className="ability-strip">
        {ABILITY_IDS.map((id) => {
          const a = sheet.abilities[id];
          return (
            <div className="ability-pip" key={id} title={`${a.total} (base ${a.base})`}>
              <div className="ap-abbr">{ABILITY_ABBR[id]}</div>
              <div className="ap-mod num">{signed(a.mod)}</div>
              <div className="ap-score num">{a.total}</div>
            </div>
          );
        })}
      </div>

      <div className="rule-gold" />

      <div className="seal-grid">
        <StatSeal
          label="Armor Class"
          value={sheet.ac.normal}
          foot={`touch ${sheet.ac.touch} · ff ${sheet.ac.flatFooted}`}
          components={sheet.ac.components}
          provTitle="AC components"
        />
        <StatSeal label="Hit Points" value={sheet.hp.max} foot="max" />
        <StatSeal label="Init" value={signed(sheet.initiative.total)} components={sheet.initiative.components} />
        <StatSeal label="BAB" value={signed(sheet.bab)} />
        <StatSeal label="Fort" value={signed(sheet.saves.fort.total)} components={sheet.saves.fort.components} provTitle={`${SAVE_NAMES.fort} save`} />
        <StatSeal label="Ref" value={signed(sheet.saves.ref.total)} components={sheet.saves.ref.components} provTitle={`${SAVE_NAMES.ref} save`} />
        <StatSeal label="Will" value={signed(sheet.saves.will.total)} components={sheet.saves.will.components} provTitle={`${SAVE_NAMES.will} save`} />
        <StatSeal label="CMD" value={sheet.cmd} />
        <StatSeal label="Melee" value={signed(sheet.attack.melee.total)} components={sheet.attack.melee.components} provTitle="Melee attack" />
        <StatSeal label="Ranged" value={signed(sheet.attack.ranged.total)} components={sheet.attack.ranged.components} provTitle="Ranged attack" />
        <StatSeal label="CMB" value={signed(sheet.cmb)} />
        <StatSeal label="Speed" value={sheet.speeds.land ?? 30} foot="ft" />
      </div>

      <h3>Skills with ranks</h3>
      {investedSkills.length === 0 ? (
        <div className="empty">No ranks allocated yet.</div>
      ) : (
        <div className="sheet-skill-list">
          {investedSkills.map((s) => (
            <div className={`sheet-skill${s.classSkill ? " is-class" : ""}`} key={s.id}>
              <span className="sk-name">{skillName(s.id)}</span>
              <span className="sk-total num">{signed(s.total)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
