import { FAMILIARS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { setArcaneBond } from "../../model/doc.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface ArcaneBondPickerProps {
	doc: CharacterDoc;
	update: Updater;
}

/** Summarize a familiar's master bonus for display, e.g. "+3 Fly". */
const FAMILIAR_BONUS_LABELS: Record<string, string> = {
	bat: "+3 Fly",
	cat: "+3 Stealth",
	lizard: "+3 Climb",
	monkey: "+3 Acrobatics",
	rat: "+2 Fortitude saves",
	raven: "+3 Appraise",
	toad: "+3 hit points",
	viper: "+3 Bluff",
	weasel: "+2 Reflex saves",
};

/**
 * Wizard arcane bond (PF1 L1 choice): a familiar or a bonded object. A
 * familiar's master bonus is applied by the engine (hand-authored table in
 * `@pf1/engine` familiars.ts) and shows up with provenance in the sheet's
 * skill/save/HP breakdowns; conditional bonuses (hawk, owl) are display notes
 * only. A bonded object is recorded by name; its RAW mechanics (cast any
 * spellbook spell 1/day; concentration DC 20 + spell level when casting
 * without it) are surfaced as text, not modeled numerically.
 */
export function ArcaneBondPicker({ doc, update }: ArcaneBondPickerProps) {
	const isWizard = doc.identity.classes.some((c) => c.tag === "wizard");
	if (!isWizard) return null;

	const bond = doc.build.arcaneBond;
	const familiar =
		bond?.type === "familiar" && bond.familiarKind
			? FAMILIARS[bond.familiarKind]
			: undefined;

	return (
		<div className="subsection arcane-bond-picker">
			<h4 className="tracker-sub">Arcane Bond</h4>
			<p className="hint arcane-bond-hint">
				Wizards form an arcane bond at level 1: a familiar (grants you its
				master bonus, and Alertness while it's within arm's reach) or a bonded
				object (cast any one spell from your spellbook once per day; casting
				without the object in hand requires a concentration check, DC 20 +
				spell level).
			</p>
			<div className="chips arcane-bond-type">
				<button
					type="button"
					className="chip"
					aria-pressed={bond?.type === "familiar"}
					onClick={() =>
						update((d) =>
							d.build.arcaneBond?.type === "familiar"
								? setArcaneBond(d, null)
								: setArcaneBond(d, { type: "familiar", familiarKind: "bat" }),
						)
					}
				>
					Familiar
				</button>
				<button
					type="button"
					className="chip"
					aria-pressed={bond?.type === "object"}
					onClick={() =>
						update((d) =>
							d.build.arcaneBond?.type === "object"
								? setArcaneBond(d, null)
								: setArcaneBond(d, { type: "object" }),
						)
					}
				>
					Bonded object
				</button>
			</div>

			{bond?.type === "familiar" && (
				<>
					<select
						className="arcane-bond-select"
						value={bond.familiarKind ?? ""}
						onChange={(e) =>
							update((d) =>
								setArcaneBond(d, { type: "familiar", familiarKind: e.target.value }),
							)
						}
						aria-label="Familiar kind"
					>
						{Object.entries(FAMILIARS).map(([kind, def]) => (
							<option key={kind} value={kind}>
								{def.name}
							</option>
						))}
					</select>
					{familiar && (
						<p className="hint arcane-bond-effect">
							{FAMILIAR_BONUS_LABELS[bond.familiarKind!]
								? `Master bonus: ${FAMILIAR_BONUS_LABELS[bond.familiarKind!]} (applied to your sheet).`
								: null}
							{familiar.note ? ` ${familiar.name}: ${familiar.note}.` : null}
						</p>
					)}
				</>
			)}

			{bond?.type === "object" && (
				<input
					type="text"
					className="arcane-bond-object-name"
					placeholder="Bonded object (e.g. ring, staff, wand…)"
					value={bond.bondedItemName ?? ""}
					onChange={(e) =>
						update((d) =>
							setArcaneBond(d, { type: "object", bondedItemName: e.target.value }),
						)
					}
					aria-label="Bonded object name"
				/>
			)}
		</div>
	);
}
