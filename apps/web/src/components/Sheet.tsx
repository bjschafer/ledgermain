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

	const rollableSkills = Object.values(sheet.skills)
		.filter((s) => s.usable)
		.sort((a, b) => skillName(a.id).localeCompare(skillName(b.id)));

	return (
		<section className="sheet" aria-label="Live character sheet">
			<div className="char-name">{doc.identity.name || "Unnamed"}</div>
			<div className="char-sub">
				{[race?.name, classLine].filter(Boolean).join(" · ") ||
					"No race or class chosen"}
				{sheet.level > 0 ? ` · CL ${sheet.level}` : ""}
			</div>

			<div className="ability-strip">
				{ABILITY_IDS.map((id) => {
					const a = sheet.abilities[id];
					return (
						<div
							className="ability-pip"
							key={id}
							title={`${a.total} (base ${a.base})`}
						>
							<div className="ap-abbr">{ABILITY_ABBR[id]}</div>
							<div className="ap-mod num">{signed(a.mod)}</div>
							<div className="ap-score num">{a.total}</div>
						</div>
					);
				})}
			</div>

			<div className="rule-gold" />

			{/* HP hero band — current HP as dominant numeral, max in foot */}
			<div className="stat-hero-band">
				<StatSeal
					label="Hit Points"
					value={doc.live.hp.current}
					foot={`/ ${sheet.hp.max} max${doc.live.hp.temp > 0 ? ` · ${doc.live.hp.temp} temp` : ""}`}
					components={sheet.hp.components}
					provTitle="Hit Points breakdown"
				/>
			</div>

			{/* Defense --------------------------------------------------- */}
			<div className="stat-group">
				<div className="stat-group-header">
					<span className="stat-group-legend">Defense</span>
					<div className="stat-group-rule" />
				</div>
				<div className="stat-group-grid stat-group-grid--4">
					<StatSeal
						label="Armor Class"
						value={sheet.ac.normal}
						components={sheet.ac.components}
						provTitle="AC components"
					/>
					<StatSeal label="Touch" value={sheet.ac.touch} />
					<StatSeal label="Flat-Footed" value={sheet.ac.flatFooted} />
					<StatSeal label="CMD" value={sheet.cmd} />
				</div>
			</div>

			{/* Offense --------------------------------------------------- */}
			<div className="stat-group">
				<div className="stat-group-header">
					<span className="stat-group-legend">Offense</span>
					<div className="stat-group-rule" />
				</div>
				<div className="stat-group-grid stat-group-grid--4">
					<StatSeal
						label="Melee"
						value={signed(sheet.attack.melee.total)}
						components={sheet.attack.melee.components}
						provTitle="Melee attack"
					/>
					<StatSeal
						label="Ranged"
						value={signed(sheet.attack.ranged.total)}
						components={sheet.attack.ranged.components}
						provTitle="Ranged attack"
					/>
					<StatSeal label="BAB" value={signed(sheet.bab)} className="seal--compact" />
					<StatSeal label="CMB" value={signed(sheet.cmb)} />
				</div>
			</div>

			{/* Saving Throws ---------------------------------------------- */}
			<div className="stat-group">
				<div className="stat-group-header">
					<span className="stat-group-legend">Saves</span>
					<div className="stat-group-rule" />
				</div>
				<div className="stat-group-grid stat-group-grid--3">
					<StatSeal
						label="Fort"
						value={signed(sheet.saves.fort.total)}
						components={sheet.saves.fort.components}
						provTitle={`${SAVE_NAMES.fort} save`}
					/>
					<StatSeal
						label="Ref"
						value={signed(sheet.saves.ref.total)}
						components={sheet.saves.ref.components}
						provTitle={`${SAVE_NAMES.ref} save`}
					/>
					<StatSeal
						label="Will"
						value={signed(sheet.saves.will.total)}
						components={sheet.saves.will.components}
						provTitle={`${SAVE_NAMES.will} save`}
					/>
				</div>
			</div>

			{/* Tactical --------------------------------------------------- */}
			<div className="stat-group">
				<div className="stat-group-header">
					<span className="stat-group-legend">Tactical</span>
					<div className="stat-group-rule" />
				</div>
				<div className="stat-group-grid stat-group-grid--2">
					<StatSeal
						label="Init"
						value={signed(sheet.initiative.total)}
						components={sheet.initiative.components}
						className="seal--compact"
					/>
					<StatSeal
						label="Speed"
						value={sheet.speeds.land ?? 30}
						foot="ft"
						className="seal--compact"
					/>
				</div>
			</div>

			<h3>Skills</h3>
			{rollableSkills.length === 0 ? (
				<div className="empty">No skills available.</div>
			) : (
				<div className="sheet-skill-list">
					{rollableSkills.map((s) => (
						<div
							className={`sheet-skill${s.classSkill ? " is-class" : ""}${s.ranks === 0 ? " is-untrained" : ""}`}
							key={s.id}
							title={s.ranks === 0 ? "Untrained" : undefined}
						>
							<span className="sk-name">
								{skillName(s.id)}
								{s.classSkill ? (
									<span className="tag-cls" title="class skill">
										class
									</span>
								) : null}
							</span>
							<span className="sk-total num">{signed(s.total)}</span>
						</div>
					))}
				</div>
			)}
		</section>
	);
}
