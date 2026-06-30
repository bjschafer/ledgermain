import {
	ABILITY_IDS,
	addAbilityIncrease,
	removeAbilityIncrease,
	setAbility,
	totalLevel,
} from "../../model/doc.js";
import { ABILITY_ABBR, signed } from "../../model/names.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { NumberField } from "./NumberField.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function AbilitiesSection({ doc, sheet, update }: BuilderProps) {
	const allowed = Math.floor(totalLevel(doc) / 4);
	const increases = doc.build.abilityIncreases ?? [];
	const assigned = increases.length;
	// Ability-score-increases subsection: default collapsed (only relevant every 4 levels)
	const [incCollapsed, toggleIncCollapsed] = useCollapsed(
		"subsection:AbilityIncreases",
		true,
	);

	return (
		<Panel
			title="Ability Scores"
			step="ii"
			storageKey="panel:AbilityScores"
			right={
				<span className="hint">base scores · racial mods shown below</span>
			}
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
						<span className="panel-caret">{incCollapsed ? "▸" : "▾"}</span>
					</div>
					{!incCollapsed && (
						<>
							<p className="hint" style={{ margin: "8px 0" }}>
								+1 every 4 character levels{" "}
								<span style={{ color: "var(--faint)" }}>
									(levels 4, 8, 12, …)
								</span>
							</p>
							<div className="ability-inc-grid">
								{ABILITY_IDS.map((id) => {
									const count = increases.filter((a) => a === id).length;
									return (
										<div className="ability-inc-cell" key={id}>
											<div className="abbr">{ABILITY_ABBR[id]}</div>
											<div className="ability-inc-stepper">
												<button
													type="button"
													aria-label={`Remove ${ABILITY_ABBR[id]} increase`}
													disabled={count === 0}
													onClick={() =>
														update((d) => removeAbilityIncrease(d, id))
													}
												>
													−
												</button>
												<span className="num">{count}</span>
												<button
													type="button"
													aria-label={`Add ${ABILITY_ABBR[id]} increase`}
													disabled={assigned >= allowed}
													onClick={() =>
														update((d) => addAbilityIncrease(d, id))
													}
												>
													+
												</button>
											</div>
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
