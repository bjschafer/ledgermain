import { useMemo, useState } from "react";

import { deriveResourcePools } from "@pf1/engine";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import {
	addManualPool,
	drainResource,
	remaining,
	removePool,
	restAllResources,
	restoreResource,
	syncDerivedPools,
} from "../../model/resources.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Drain/restore limited-use pools. Class-feature pools (Rage rounds/day, Channel
 * Energy) are derived from `uses.maxFormula`; item charges and other one-off
 * pools are manual because the vendored data has no charge tables. Prepared
 * spell slots have their own panel ({@link PreparedSpellsPanel}); this is no
 * longer where spells are tracked.
 */
export function ResourcesPanel({ doc, sheet, refData, update }: BuilderProps) {
	const derived = useMemo(
		() => deriveResourcePools(doc, refData, sheet.abilities),
		[doc, refData, sheet.abilities],
	);
	const derivedIds = new Set(derived.map((p) => p.id));
	const manualEntries = Object.entries(doc.live.resources).filter(
		([id]) => !derivedIds.has(id),
	);

	const [label, setLabel] = useState("");
	const [poolMax, setPoolMax] = useState(4);

	const drain = (id: string) =>
		update((d) => drainResource(syncDerivedPools(d, derived), id, 1));
	const restore = (id: string) =>
		update((d) => restoreResource(syncDerivedPools(d, derived), id, 1));

	const hasAny = derived.length > 0 || manualEntries.length > 0;

	return (
		<Panel
			title="Resources"
			step="rs"
			storageKey="panel:Resources"
			right={
				<button
					type="button"
					className="btn-ghost rest"
					onClick={() => update((d) => restAllResources(d))}
				>
					Rest (full)
				</button>
			}
		>
			{!hasAny ? (
				<div className="empty">
					No pools. Add item charges or other one-off pools below.
				</div>
			) : (
				<div className="res-list">
					{derived.map((pool) => {
						const stored = doc.live.resources[pool.id];
						const used = stored?.used ?? 0;
						return (
							<ResourceRow
								key={pool.id}
								name={pool.name}
								sub={pool.per ? `per ${pool.per}` : "derived"}
								left={pool.max - used}
								max={pool.max}
								onDrain={() => drain(pool.id)}
								onRestore={() => restore(pool.id)}
							/>
						);
					})}
					{manualEntries.map(([id, pool]) => (
						<ResourceRow
							key={id}
							name={id}
							sub="manual"
							left={remaining(pool)}
							max={pool.max}
							onDrain={() => drain(id)}
							onRestore={() => restore(id)}
							onRemove={() => update((d) => removePool(d, id))}
						/>
					))}
				</div>
			)}

			<h4 className="tracker-sub">Add a manual pool (item charges, misc)</h4>
			<div className="res-add">
				<input
					type="text"
					placeholder="e.g. Wand charges"
					value={label}
					onChange={(e) => setLabel(e.target.value)}
				/>
				<NumberField
					className="num"
					size={3}
					value={poolMax}
					min={0}
					commitOnChange
					onCommit={(n) => setPoolMax(n)}
					aria-label="Max"
				/>
				<button
					type="button"
					className="pick-btn add"
					onClick={() => {
						update((d) =>
							addManualPool(d, label, Number.isNaN(poolMax) ? 0 : poolMax),
						);
						setLabel("");
					}}
				>
					Add
				</button>
			</div>
		</Panel>
	);
}

function ResourceRow({
	name,
	sub,
	left,
	max,
	onDrain,
	onRestore,
	onRemove,
}: {
	name: string;
	sub: string;
	left: number;
	max: number;
	onDrain: () => void;
	onRestore: () => void;
	onRemove?: () => void;
}) {
	return (
		<div className="res-row">
			<div className="res-main">
				<div className="res-name">{name}</div>
				<div className="res-sub">{sub}</div>
			</div>
			<div className="res-count num">
				{left}
				<span className="res-slash">/</span>
				{max}
			</div>
			<div className="res-btns">
				<button
					type="button"
					className="btn-ghost"
					onClick={onDrain}
					disabled={left <= 0}
					aria-label={`spend ${name}`}
				>
					−
				</button>
				<button
					type="button"
					className="btn-ghost"
					onClick={onRestore}
					disabled={left >= max}
					aria-label={`restore ${name}`}
				>
					+
				</button>
				{onRemove ? (
					<button
						type="button"
						className="btn-ghost"
						onClick={onRemove}
						aria-label={`remove ${name}`}
					>
						✕
					</button>
				) : null}
			</div>
		</div>
	);
}
