import { useMemo, useState } from "react";

import type { ActiveBuff, Buff, CharacterDoc } from "@pf1/schema";

import { Panel } from "../builder/Panel.js";
import { NumberField } from "../builder/NumberField.js";
import {
	addBuff,
	advanceRound,
	makeActiveBuff,
	makeCustomBuff,
	removeBuff,
	setBuffRounds,
	suggestRounds,
	type DurationUnit,
	roundsToDisplay,
	toRounds,
} from "../../model/buffs.js";
import { signed } from "../../model/names.js";
import type { BuilderProps } from "../builder/types.js";

/** Common typed-modifier targets for the custom-buff door (not exhaustive). */
const TARGETS = [
	"attack",
	"mattack",
	"rattack",
	"ac",
	"allSavingThrows",
	"fort",
	"ref",
	"will",
	"str",
	"dex",
	"con",
	"int",
	"wis",
	"cha",
	"init",
	"cmb",
	"cmd",
	"skills",
];
const TYPES = [
	"untyped",
	"enh",
	"morale",
	"luck",
	"sacred",
	"competence",
	"dodge",
	"deflection",
	"resistance",
	"circumstance",
];

export function BuffsPanel({ doc, sheet, refData, update }: BuilderProps) {
	const [query, setQuery] = useState("");
	const [step, setStep] = useState(1);
	const casterLevel = Math.max(1, sheet.level);

	const matches = useMemo(() => {
		const q = query.trim().toLowerCase();
		return Object.values(refData.buffs)
			.filter((b) => !q || b.name.toLowerCase().includes(q))
			.sort((a, b) => a.name.localeCompare(b.name))
			.slice(0, 60);
	}, [refData.buffs, query]);

	const add = (buff: Buff) =>
		update((d) =>
			addBuff(
				d,
				makeActiveBuff(buff, {
					casterLevel,
					remainingRounds: suggestRounds(buff, casterLevel),
				}),
			),
		);

	const tick = (n: number) => update((d) => advanceRound(d, n).doc);

	return (
		<Panel
			title="Buffs"
			step="bf"
			right={
				<div className="round-ctl">
					<button
						type="button"
						className="btn-act round"
						onClick={() => tick(step)}
					>
						Advance {step === 1 ? "round" : `${step} rds`}
					</button>
					<NumberField
						className="num"
						size={2}
						value={step}
						min={1}
						commitOnChange
						onCommit={(n) => setStep(n)}
						aria-label="Rounds per advance"
					/>
				</div>
			}
		>
			{doc.live.activeBuffs.length === 0 ? (
				<div className="empty">No active buffs.</div>
			) : (
				<div className="buff-list">
					{doc.live.activeBuffs.map((b) => (
						<BuffRow key={b.instanceId} buff={b} update={update} />
					))}
				</div>
			)}

			<h4 className="tracker-sub">Add a buff</h4>
			<input
				className="search"
				type="text"
				placeholder="Search the buff compendium…"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>
			<div className="scroll short">
				{matches.map((buff) => (
					<div className="pick-row" key={buff.id}>
						<div className="pmain">
							<div className="pname">{buff.name}</div>
							<div className="preq">
								{buff.changes.slice(0, 4).map((c, i) => (
									<span key={i}>
										{c.target} {formulaHint(c.formula)}
									</span>
								))}
							</div>
						</div>
						<button
							type="button"
							className="pick-btn add"
							onClick={() => add(buff)}
						>
							Add
						</button>
					</div>
				))}
			</div>

			<CustomBuffForm
				onAdd={(name, target, type, value, rounds) =>
					update((d) =>
						addBuff(
							d,
							makeCustomBuff(name, [{ formula: String(value), target, type }], {
								remainingRounds: rounds,
							}),
						),
					)
				}
			/>
		</Panel>
	);
}

/** Show a numeric formula as a signed value; leave anything with @paths verbatim. */
function formulaHint(formula: string): string {
	const n = Number(formula);
	return Number.isFinite(n) ? signed(n) : formula;
}

/**
 * A single active-buff row with unit-aware duration display and entry.
 *
 * The unit (rds / min / hr) is local state, initialized from the buff's current
 * `remainingRounds` via {@link roundsToDisplay}. Changing the unit or the value
 * converts back to whole rounds via {@link toRounds} and calls `setBuffRounds`.
 */
function BuffRow({
	buff,
	update,
}: {
	buff: ActiveBuff;
	update: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
	const [unit, setUnit] = useState<DurationUnit>(
		() => roundsToDisplay(buff.remainingRounds)?.unit ?? "rds",
	);

	// Convert remainingRounds to the currently-selected unit for display.
	// If the conversion rounds to 0 (e.g. 3 rounds in "hr" mode), show ∞ so
	// the user knows to pick a smaller unit or type a value.
	const factor = unit === "hr" ? 600 : unit === "min" ? 10 : 1;
	const displayVal: number | undefined =
		buff.remainingRounds != null
			? Math.round(buff.remainingRounds / factor) || undefined
			: undefined;

	return (
		<div className="buff-row">
			<div className="buff-main">
				<div className="buff-name">{buff.name}</div>
				<div className="buff-changes num">
					{buff.changes.map((c, i) => (
						<span key={i} className="buff-change">
							{c.target} {c.type ? <em>[{c.type}]</em> : null}{" "}
							{formulaHint(c.formula)}
						</span>
					))}
				</div>
			</div>
			<label className="buff-rounds">
				<NumberField
					className="num"
					size={3}
					stepper={false}
					allowEmpty
					placeholder="∞"
					value={displayVal}
					onCommit={(n) =>
						update((d) =>
							setBuffRounds(
								d,
								buff.instanceId,
								n == null ? undefined : toRounds(n, unit),
							),
						)
					}
					aria-label={`${buff.name} duration`}
				/>
				<select
					className="dur-unit"
					value={unit}
					onChange={(e) => setUnit(e.target.value as DurationUnit)}
					aria-label={`${buff.name} duration unit`}
				>
					<option value="rds">rds</option>
					<option value="min">min</option>
					<option value="hr">hr</option>
				</select>
			</label>
			<button
				type="button"
				className="btn-ghost"
				onClick={() => update((d) => removeBuff(d, buff.instanceId))}
			>
				Remove
			</button>
		</div>
	);
}

function CustomBuffForm({
	onAdd,
}: {
	onAdd: (
		name: string,
		target: string,
		type: string,
		value: number,
		rounds: number | undefined,
	) => void;
}) {
	const [name, setName] = useState("");
	const [target, setTarget] = useState("attack");
	const [type, setType] = useState("untyped");
	const [value, setValue] = useState(1);
	const [durVal, setDurVal] = useState<number | undefined>(undefined);
	const [durUnit, setDurUnit] = useState<DurationUnit>("rds");

	return (
		<details className="custom-buff">
			<summary>Custom buff (expert)</summary>
			<div className="cb-grid">
				<input
					type="text"
					placeholder="Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<select
					value={target}
					onChange={(e) => setTarget(e.target.value)}
					aria-label="Target"
				>
					{TARGETS.map((t) => (
						<option key={t} value={t}>
							{t}
						</option>
					))}
				</select>
				<select
					value={type}
					onChange={(e) => setType(e.target.value)}
					aria-label="Bonus type"
				>
					{TYPES.map((t) => (
						<option key={t} value={t}>
							{t}
						</option>
					))}
				</select>
				<NumberField
					className="num"
					size={3}
					value={value}
					onCommit={(n) => setValue(n)}
					aria-label="Value"
				/>
				<div className="dur-field">
					<NumberField
						className="num"
						size={3}
						stepper={false}
						allowEmpty
						placeholder="∞"
						value={durVal}
						onCommit={setDurVal}
						aria-label="Duration value"
					/>
					<select
						className="dur-unit"
						value={durUnit}
						onChange={(e) => setDurUnit(e.target.value as DurationUnit)}
						aria-label="Duration unit"
					>
						<option value="rds">rds</option>
						<option value="min">min</option>
						<option value="hr">hr</option>
					</select>
				</div>
				<button
					type="button"
					className="pick-btn add"
					onClick={() => {
						onAdd(
							name || `${target} ${signed(value)}`,
							target,
							type,
							Number.isNaN(value) ? 0 : value,
							durVal == null ? undefined : toRounds(durVal, durUnit),
						);
						setName("");
						setDurVal(undefined);
					}}
				>
					Add
				</button>
			</div>
		</details>
	);
}
