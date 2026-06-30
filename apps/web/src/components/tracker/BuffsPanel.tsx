import { useMemo, useState } from "react";

import type { Buff } from "@pf1/schema";

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
						<div className="buff-row" key={b.instanceId}>
							<div className="buff-main">
								<div className="buff-name">{b.name}</div>
								<div className="buff-changes num">
									{b.changes.map((c, i) => (
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
									value={b.remainingRounds}
									onCommit={(n) =>
										update((d) => setBuffRounds(d, b.instanceId, n))
									}
									aria-label={`${b.name} rounds remaining`}
								/>
								<span>rds</span>
							</label>
							<button
								type="button"
								className="btn-ghost"
								onClick={() => update((d) => removeBuff(d, b.instanceId))}
							>
								Remove
							</button>
						</div>
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
	const [rounds, setRounds] = useState<string>("");

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
				<NumberField
					className="num"
					size={3}
					stepper={false}
					allowEmpty
					placeholder="∞ rds"
					value={rounds === "" ? undefined : Number(rounds)}
					onCommit={(n) => setRounds(n == null ? "" : String(n))}
					aria-label="Rounds"
				/>
				<button
					type="button"
					className="pick-btn add"
					onClick={() => {
						onAdd(
							name || `${target} ${signed(value)}`,
							target,
							type,
							Number.isNaN(value) ? 0 : value,
							rounds === "" ? undefined : Number(rounds),
						);
						setName("");
					}}
				>
					Add
				</button>
			</div>
		</details>
	);
}
