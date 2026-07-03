import type { CSSProperties } from "react";

import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { ABILITY_IDS } from "../model/doc.js";
import { casterLevelForClass, isCasterTag } from "../model/casterLevel.js";
import { combinedLanguages } from "../model/languages.js";
import {
	ABILITY_ABBR,
	ALIGNMENT_LABELS,
	SAVE_NAMES,
	signed,
	signedSequence,
	skillName,
} from "../model/names.js";
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
	// Per-class caster level. PF1 CL is per casting class, never summed; the
	// engine's `@cl` and model/casterLevel.ts both treat CL as max over full-caster
	// tags, but the sheet lists each so a multiclass caster can read them off.
	// `casterLevelForClass` is the seam where paladin/ranger-style divergences
	// (CL != class level) get wired in — don't read c.level directly here.
	const casterLine = doc.identity.classes
		.filter((c) => isCasterTag(c.tag))
		.map((c) => {
			const def = Object.values(refData.classes).find((cl) => cl.tag === c.tag);
			const cl = casterLevelForClass(c.tag, c.level);
			return `CL ${def?.name ?? c.tag} ${cl}`;
		})
		.join(" / ");

	const rollableSkills = Object.values(sheet.skills)
		.filter((s) => s.usable)
		.sort((a, b) => skillName(a.id).localeCompare(skillName(b.id)));

	// Tie the HP box's fill level to remaining HP (drains as damage is taken).
	const hpMax = sheet.hp.max;
	const hpEffective = doc.live.hp.current - doc.live.hp.nonlethal;
	const hpPct = hpMax > 0 ? Math.max(0, Math.min(1, hpEffective / hpMax)) : 1;
	const hpLow = hpMax > 0 && hpEffective <= Math.floor(hpMax / 4);

	return (
		<section className="sheet" aria-label="Live character sheet">
			<div className="char-name">{doc.identity.name || "Unnamed"}</div>
			<div className="char-sub">
				{[race?.name, classLine].filter(Boolean).join(" · ") ||
					"No race or class chosen"}
				{sheet.level > 0 ? ` · Lvl ${sheet.level}` : ""}
			</div>
			{casterLine ? (
				<div className="char-sub char-caster">{casterLine}</div>
			) : null}
			{(() => {
				const id = doc.identity;
				const alignLabel = id.alignment
					? (ALIGNMENT_LABELS[id.alignment] ?? id.alignment)
					: null;
				const details = [
					alignLabel,
					id.deity ? `Deity: ${id.deity}` : null,
					id.gender,
					id.age ? `Age ${id.age}` : null,
					[id.height, id.weight].filter(Boolean).join(", ") || null,
				].filter(Boolean);
				return details.length > 0 ? (
					<div className="char-identity">{details.join(" · ")}</div>
				) : null;
			})()}
			{(() => {
				const languages = combinedLanguages(doc, refData);
				return languages.length > 0 ? (
					<div className="char-identity char-languages">
						Languages: {languages.join(", ")}
					</div>
				) : null;
			})()}

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
			<div
				className="stat-hero-band"
				data-hp-low={hpLow}
				style={{ "--hp-pct": `${hpPct * 100}%` } as CSSProperties}
			>
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
						value={signedSequence(sheet.attack.melee.total, sheet.attack.melee.iteratives)}
						components={sheet.attack.melee.components}
						provTitle="Melee attack"
					/>
					<StatSeal
						label="Ranged"
						value={signedSequence(sheet.attack.ranged.total, sheet.attack.ranged.iteratives)}
						components={sheet.attack.ranged.components}
						provTitle="Ranged attack"
					/>
					<StatSeal label="BAB" value={signed(sheet.bab)} className="seal--compact" />
					<StatSeal label="CMB" value={signed(sheet.cmb)} />
				</div>
			</div>

			{/* Per-weapon attacks ----------------------------------------- */}
			{sheet.attacks.length > 0 && (
				<div className="stat-group">
					<div className="stat-group-header">
						<span className="stat-group-legend">Attacks</span>
						<div className="stat-group-rule" />
					</div>
					<div className="weapon-attack-list">
						{sheet.attacks.map((atk, i) => {
							// Combine damageDice + signed numeric bonus into one display string.
							const bonusStr = atk.damageBonus.total !== 0 ? signed(atk.damageBonus.total) : null;
							const dmgStr =
								[atk.damageDice, bonusStr].filter(Boolean).join("") ||
								signed(atk.damageBonus.total);
							return (
								<div key={i} className="weapon-attack-row">
									<span className="weapon-attack-name">{atk.name}</span>
									<div className="weapon-attack-stats">
										<StatSeal
											label="Attack"
											value={signedSequence(atk.attack.total, atk.attack.iteratives)}
											components={atk.attack.components}
											provTitle={`${atk.name} attack`}
											className="seal--compact"
										/>
										<StatSeal
											label="Dmg"
											value={dmgStr}
											components={
												atk.damageBonus.components.length > 0
													? atk.damageBonus.components
													: undefined
											}
											provTitle={`${atk.name} damage`}
											className="seal--compact"
										/>
										<StatSeal
											label="Crit"
											value={atk.crit}
											className="seal--compact"
										/>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

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
					{(sheet.speeds.fly ?? 0) > 0 && (
						<StatSeal
							label="Fly"
							value={sheet.speeds.fly!}
							foot="ft"
							className="seal--compact"
						/>
					)}
					{(sheet.speeds.swim ?? 0) > 0 && (
						<StatSeal
							label="Swim"
							value={sheet.speeds.swim!}
							foot="ft"
							className="seal--compact"
						/>
					)}
					{(sheet.speeds.climb ?? 0) > 0 && (
						<StatSeal
							label="Climb"
							value={sheet.speeds.climb!}
							foot="ft"
							className="seal--compact"
						/>
					)}
					{(sheet.speeds.burrow ?? 0) > 0 && (
						<StatSeal
							label="Burrow"
							value={sheet.speeds.burrow!}
							foot="ft"
							className="seal--compact"
						/>
					)}
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
