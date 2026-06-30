/**
 * Hit Points builder section. Honours the HP mode from build.settings:
 * - average/max: shows computed max + breakdown summary, legacy override field.
 * - rolled: shows a per-level roll entry list (L1 read-only / always maxed).
 */
import { setHpRoll, setMaxHpOverride, totalLevel } from "../../model/doc.js";
import { NumberField } from "./NumberField.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function HitPointsSection({
	doc,
	sheet,
	refData,
	update,
}: BuilderProps) {
	const auto = sheet.hp.auto;
	const mode = doc.build.settings?.hpMode ?? "average";
	const hpRolls = doc.build.hpRolls ?? [];
	const charLevel = totalLevel(doc);

	// Build per-level info for rolled mode
	const levelRows = buildLevelRows(doc, refData, charLevel);

	const hasOverride =
		doc.build.maxHpOverride != null && doc.build.maxHpOverride > 0;

	return (
		<Panel
			title="Hit Points"
			step="v"
			storageKey="panel:HitPoints"
			right={
				<span className="hint">
					{mode === "rolled"
						? `rolled · max ${sheet.hp.max}`
						: `average ${auto}`}
				</span>
			}
		>
			{mode === "rolled" ? (
				<>
					<p className="hint" style={{ marginBottom: 8 }}>
						Enter your rolls per character level. Level 1 is always maxed (PF1
						standard).
					</p>
					{charLevel === 0 ? (
						<p className="empty">No class levels yet.</p>
					) : (
						<div className="hp-rolls-list">
							{levelRows.map(({ charLv, die, isFirst }) => {
								const stored = hpRolls[charLv - 1];
								const displayVal = isFirst
									? die
									: (stored ?? Math.floor(die / 2) + 1);
								return (
									<div className="hp-roll-row" key={charLv}>
										<span className="hp-roll-level">Lv {charLv}</span>
										{isFirst ? (
											<>
												<span className="hp-roll-info">
													{die} (d{die} — L1 always maxed)
												</span>
												<span
													className="num"
													style={{ textAlign: "right", color: "var(--muted)" }}
												>
													{displayVal}
												</span>
											</>
										) : (
											<>
												<span className="hp-roll-info">d{die}</span>
												<NumberField
													className="num"
													size={3}
													value={displayVal}
													min={1}
													max={die}
													onCommit={(n) =>
														update((d) => setHpRoll(d, charLv, n))
													}
													aria-label={`HP roll for level ${charLv}`}
												/>
											</>
										)}
									</div>
								);
							})}
						</div>
					)}
					<div style={{ marginTop: 12 }}>
						<span className="hint">Total max HP: </span>
						<strong className="num">{sheet.hp.max}</strong>
						{auto !== sheet.hp.max && (
							<span className="hint"> · average would be {auto}</span>
						)}
					</div>
				</>
			) : (
				/* average / max mode — keep the legacy override field */
				<div className="hp-override-row">
					<label className="hp-override-label" htmlFor="hp-override-input">
						Max HP
						{hasOverride ? (
							<span className="hp-override-badge">override active</span>
						) : (
							<span className="hp-override-badge hp-override-badge--auto">
								using {mode}
							</span>
						)}
					</label>
					<NumberField
						className="num"
						size={6}
						value={doc.build.maxHpOverride ?? auto}
						min={1}
						max={100000}
						onCommit={(n) => update((d) => setMaxHpOverride(d, n))}
						aria-label="Max HP override"
					/>
					<button
						type="button"
						className="btn-ghost"
						disabled={!hasOverride}
						onClick={() => update((d) => setMaxHpOverride(d, null))}
					>
						reset to {mode}
					</button>
				</div>
			)}
		</Panel>
	);
}

// ---------------------------------------------------------------------------

interface LevelRow {
	charLv: number;
	die: number;
	isFirst: boolean;
}

function buildLevelRows(
	doc: BuilderProps["doc"],
	refData: BuilderProps["refData"],
	charLevel: number,
): LevelRow[] {
	const rows: LevelRow[] = [];
	let isFirst = true;
	let charLv = 1;
	for (const cls of doc.identity.classes) {
		const def = Object.values(refData.classes).find((c) => c.tag === cls.tag);
		const die = def?.hd ?? 8;
		for (let i = 0; i < cls.level && charLv <= charLevel; i++, charLv++) {
			rows.push({ charLv, die, isFirst });
			isFirst = false;
		}
	}
	return rows;
}
