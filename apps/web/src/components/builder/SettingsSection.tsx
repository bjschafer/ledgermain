/**
 * Settings section — shown when the user switches to the "Settings" mode tab.
 * Controls: HP mode, FCB rule toggle, max hero-point cap, and manual stat
 * overrides for the bounded allowlist. Each control calls a pure model
 * transition and delegates persistence to the parent's `update` callback.
 */
import {
	setFcbHouserule,
	setHeroPointsCap,
	setHpMode,
	setStatOverride,
	STAT_OVERRIDE_KEYS,
	type StatOverrideKey,
} from "../../model/doc.js";
import { HERO_POINT_CAP } from "../../model/heroPoints.js";
import { NumberField } from "./NumberField.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

/** Human-readable labels for the stat-override allowlist. */
const STAT_LABEL: Record<StatOverrideKey, string> = {
	"hp.max": "HP max",
	"ac.normal": "AC (normal)",
	"speeds.land": "Land speed",
	"initiative.total": "Initiative",
	bab: "BAB",
	cmd: "CMD",
	cmb: "CMB",
	"saves.fort.total": "Fort save",
	"saves.ref.total": "Ref save",
	"saves.will.total": "Will save",
};

export function SettingsSection({ doc, sheet, update }: BuilderProps) {
	const settings = doc.build.settings ?? {};
	const hpMode = settings.hpMode ?? "average";
	const fcbHouserule = settings.fcbHouserule ?? false;
	const heroCap = settings.heroPointsCap ?? HERO_POINT_CAP;
	const overrides = settings.statOverrides ?? {};

	return (
		<>
			{/* HP mode */}
			<Panel title="HP Mode" step="⚙">
				<p className="hint" style={{ marginBottom: 12 }}>
					Controls how maximum HP is computed when levelling up.
				</p>
				<div className="chips">
					{(["average", "max", "rolled"] as const).map((m) => (
						<button
							key={m}
							type="button"
							className="chip"
							aria-pressed={hpMode === m}
							onClick={() => update((d) => setHpMode(d, m))}
						>
							{m === "average"
								? "Average (default)"
								: m === "max"
									? "Maximised"
									: "Rolled"}
						</button>
					))}
				</div>
				<p className="hint" style={{ marginTop: 10, fontSize: 12 }}>
					{hpMode === "average" &&
						"L1 = max HD; each subsequent level = ⌊HD/2⌋ + 1."}
					{hpMode === "max" && "Every level equals the full die value."}
					{hpMode === "rolled" &&
						"L1 = max HD; enter your rolls per level in the Hit Points panel."}
				</p>
			</Panel>

			{/* FCB rule toggle */}
			<Panel title="Favored Class Bonus Rule" step="⚙">
				<p className="hint" style={{ marginBottom: 12 }}>
					Standard PF1: each favored-class level grants <em>one</em> of +1 HP,
					+1 skill rank, or alternate. House-rule: a "Both" option adds +1 HP
					AND +1 skill rank simultaneously.
				</p>
				<div className="chips">
					<button
						type="button"
						className="chip"
						aria-pressed={!fcbHouserule}
						onClick={() => update((d) => setFcbHouserule(d, false))}
					>
						Standard PF1
					</button>
					<button
						type="button"
						className="chip"
						aria-pressed={fcbHouserule}
						onClick={() => update((d) => setFcbHouserule(d, true))}
					>
						House-rule (Both)
					</button>
				</div>
			</Panel>

			{/* Hero point cap */}
			<Panel title="Hero Point Cap" step="⚙">
				<p className="hint" style={{ marginBottom: 12 }}>
					Override the maximum number of hero points this character may hold at
					once. Default: {HERO_POINT_CAP}.
				</p>
				<div className="settings-row">
					<label className="hint" htmlFor="hero-cap-input">
						Maximum hero points
					</label>
					<NumberField
						className="num"
						size={3}
						value={heroCap}
						min={1}
						max={999}
						onCommit={(n) => update((d) => setHeroPointsCap(d, n))}
						aria-label="Hero point cap"
					/>
					{settings.heroPointsCap != null && (
						<button
							type="button"
							className="btn-ghost"
							onClick={() => update((d) => setHeroPointsCap(d, null))}
						>
							reset to {HERO_POINT_CAP}
						</button>
					)}
				</div>
			</Panel>

			{/* Stat overrides */}
			<Panel title="Manual Stat Overrides" step="⚙">
				<p className="hint" style={{ marginBottom: 12 }}>
					Force a derived stat to a specific value. Leave blank to use the
					computed value. The breakdown shows the override as a separate
					component.
				</p>
				<div className="stat-overrides-grid">
					{STAT_OVERRIDE_KEYS.map((key) => {
						const override = overrides[key];
						const computed = resolveComputed(key, sheet);
						return (
							<div key={key} className="stat-override-row">
								<span className="hint stat-override-label">
									{STAT_LABEL[key]}
								</span>
								<span className="hint num stat-override-computed">
									{computed != null ? computed : "—"}
								</span>
								<NumberField
									className="num"
									size={5}
									value={override ?? computed ?? 0}
									min={-999}
									max={99999}
									onCommit={(n) =>
										update((d) =>
											setStatOverride(d, key, Number.isNaN(n) ? null : n),
										)
									}
									aria-label={`Override ${STAT_LABEL[key]}`}
								/>
								{override != null && (
									<button
										type="button"
										className="btn-ghost"
										onClick={() => update((d) => setStatOverride(d, key, null))}
									>
										clear
									</button>
								)}
							</div>
						);
					})}
				</div>
			</Panel>
		</>
	);
}

/** Look up the current computed value for a stat-override key from the sheet. */
function resolveComputed(
	key: StatOverrideKey,
	sheet: BuilderProps["sheet"],
): number | null {
	switch (key) {
		case "hp.max":
			return sheet.hp.max;
		case "ac.normal":
			return sheet.ac.normal;
		case "speeds.land":
			return sheet.speeds.land ?? null;
		case "initiative.total":
			return sheet.initiative.total;
		case "bab":
			return sheet.bab;
		case "cmd":
			return sheet.cmd;
		case "cmb":
			return sheet.cmb;
		case "saves.fort.total":
			return sheet.saves.fort.total;
		case "saves.ref.total":
			return sheet.saves.ref.total;
		case "saves.will.total":
			return sheet.saves.will.total;
		default:
			return null;
	}
}
