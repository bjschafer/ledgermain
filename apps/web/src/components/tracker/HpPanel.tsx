import { useState } from "react";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import {
	addNonlethal,
	applyDamage,
	applyHealing,
	healNonlethal,
	restHp,
	setTempHp,
} from "../../model/hp.js";
import type { BuilderProps } from "../builder/types.js";

/** Current/temp/nonlethal HP with fast damage + healing controls. */
export function HpPanel({ doc, sheet, update }: BuilderProps) {
	const [amount, setAmount] = useState(5);
	const max = sheet.hp.max;
	const { current, temp, nonlethal } = doc.live.hp;
	const effective = current - nonlethal;
	const isLow = effective <= Math.floor(max / 4);
	const fillPct = max > 0 ? Math.max(0, Math.min(1, effective / max)) : 1;

	const amt = Number.isNaN(amount) ? 0 : amount;

	return (
		<Panel title="Hit Points" step="hp" storageKey="panel:PlayHP">
			<div className="hp-display">
				<div className="hp-big num" data-low={isLow}>
					{current}
					<span className="hp-slash">/</span>
					{max}
				</div>
				<div className="hp-side">
					{temp > 0 ? (
						<span className="hp-chip temp num">+{temp} temp</span>
					) : null}
					{nonlethal > 0 ? (
						<span className="hp-chip nl num">{nonlethal} nonlethal</span>
					) : null}
				</div>
			</div>
			<div className="hp-fill-track">
				<div
					className="hp-fill-bar"
					data-low={isLow}
					style={{ width: `${fillPct * 100}%` }}
				/>
			</div>

			<div className="hp-controls">
				<NumberField
					className="hp-amt num"
					size={4}
					value={amount}
					min={0}
					commitOnChange
					onCommit={(n) => setAmount(n)}
					aria-label="Amount"
				/>
				<button
					type="button"
					className="btn-act dmg"
					onClick={() => update((d) => applyDamage(d, amt))}
				>
					Damage
				</button>
				<button
					type="button"
					className="btn-act heal"
					onClick={() => update((d) => applyHealing(d, amt, max))}
				>
					Heal
				</button>
			</div>

			<div className="hp-row">
				<label className="hp-inline">
					<span>Temp HP</span>
					<NumberField
						className="num"
						size={3}
						value={temp}
						min={0}
						onCommit={(n) => update((d) => setTempHp(d, n))}
						aria-label="Temporary HP"
					/>
				</label>
				<div className="hp-nl">
					<span className="hp-inline-label">Nonlethal</span>
					<button
						type="button"
						className="btn-ghost"
						onClick={() => update((d) => addNonlethal(d, amt))}
					>
						+{amt}
					</button>
					<button
						type="button"
						className="btn-ghost"
						onClick={() => update((d) => healNonlethal(d, amt))}
					>
						−{amt}
					</button>
				</div>
				<button
					type="button"
					className="btn-ghost rest"
					onClick={() => update((d) => restHp(d, max))}
				>
					Rest ⤿
				</button>
			</div>
		</Panel>
	);
}
