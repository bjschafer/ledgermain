import { useMemo, useState } from "react";

import type { ArmorRef, WornArmor } from "@pf1/schema";

import {
	addGearItem,
	addWornArmor,
	addWornArmorFromRef,
	removeGear,
	setGearEquipped,
} from "../../model/doc.js";
import { ARMOR_MATERIALS } from "../../model/materials.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

/** Render a concise human-readable summary of a Change (e.g. "+2 deflection to AC"). */
function changeLabel(change: { formula: string; target: string; type: string }): string {
	const val = change.formula;
	const type = change.type && change.type !== "untyped" ? ` ${change.type}` : "";
	const target = change.target ? ` to ${change.target}` : "";
	return `${val}${type}${target}`;
}

const ARMOR_SLOTS = ["armor", "shield"] as const;
const ARMOR_TYPES = [
	{ value: 0, label: "None" },
	{ value: 1, label: "Light" },
	{ value: 2, label: "Medium" },
	{ value: 3, label: "Heavy" },
] as const;

const WEIGHT_LABEL: Record<number, string> = { 0: "None", 1: "Light", 2: "Medium", 3: "Heavy" };

const ENHANCEMENT_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

/** A one-line summary of a {@link ArmorRef} for the picker preview. */
function armorRefMeta(a: ArmorRef): string {
	const weight = a.weightClass ? `${WEIGHT_LABEL[a.weightClass] ?? "—"} ` : "";
	const slot = a.slot === "shield" ? "Shield" : `${weight}Armor`;
	const dex = a.maxDex != null ? ` · max Dex +${a.maxDex}` : "";
	const acp = a.acp ? ` · ACP −${a.acp}` : "";
	return `${slot}${dex}${acp}`;
}

export function GearSection({ doc, refData, update }: BuilderProps) {
	// Magic item picker state
	const [itemQuery, setItemQuery] = useState("");
	const [showItemPicker, setShowItemPicker] = useState(false);

	// Worn armor picker state — `showArmorPicker` opens the card;
	// `armorMode` toggles between "select" (search RefData) and "custom" (manual).
	const [showArmorPicker, setShowArmorPicker] = useState(false);
	const [armorMode, setArmorMode] = useState<"select" | "custom">("select");
	const [armorQuery, setArmorQuery] = useState("");
	const [armorEnhancement, setArmorEnhancement] = useState<number>(0);
	const [armorMaterial, setArmorMaterial] = useState<string>("steel");
	// Custom-entry form state (the legacy manual form)
	const [armorSlot, setArmorSlot] = useState<"armor" | "shield">("armor");
	const [armorName, setArmorName] = useState("");
	const [armorAc, setArmorAc] = useState(0);
	const [armorMaxDex, setArmorMaxDex] = useState<string>("");
	const [armorAcp, setArmorAcp] = useState(0);
	const [armorType, setArmorType] = useState(0);

	const gear = doc.build.gear;

	// Filtered items list for the magic-item picker
	const filteredItems = useMemo(() => {
		const q = itemQuery.trim().toLowerCase();
		return Object.values(refData.items)
			.filter((item) => !q || item.name.toLowerCase().includes(q))
			.sort((a, b) => a.name.localeCompare(b.name))
			.slice(0, 80);
	}, [refData.items, itemQuery]);

	// Filtered armors list for the worn-armor picker
	const filteredArmors = useMemo(() => {
		const q = armorQuery.trim().toLowerCase();
		return Object.values(refData.armors)
			.filter((a) => !q || a.name.toLowerCase().includes(q))
			.sort((a, b) => a.name.localeCompare(b.name))
			.slice(0, 80);
	}, [refData.armors, armorQuery]);

	function handleAddItem(itemId: string) {
		update((d) => addGearItem(d, itemId));
		setShowItemPicker(false);
		setItemQuery("");
	}

	function closeArmorPicker() {
		setShowArmorPicker(false);
		setArmorMode("select");
		setArmorQuery("");
		setArmorEnhancement(0);
		setArmorMaterial("steel");
	}

	function handleAddArmorRef(armor: ArmorRef) {
		update((d) => addWornArmorFromRef(d, armor, armorEnhancement, armorMaterial));
		closeArmorPicker();
	}

	function handleAddArmor() {
		const armor: WornArmor = {
			slot: armorSlot,
			ac: armorAc,
			...(armorMaxDex !== "" ? { maxDex: Number(armorMaxDex) } : {}),
			...(armorAcp !== 0 ? { acp: armorAcp } : {}),
			...(armorType !== 0 ? { type: armorType } : {}),
		};
		const name = armorName.trim() || (armorSlot === "armor" ? "Worn Armor" : "Shield");
		update((d) => addWornArmor(d, armor, name));
		// Reset custom form
		setArmorName("");
		setArmorAc(0);
		setArmorMaxDex("");
		setArmorAcp(0);
		setArmorType(0);
		setArmorSlot("armor");
		closeArmorPicker();
	}

	return (
		<Panel title="Gear & Inventory" step="viii" storageKey="panel:Gear" defaultCollapsed={false}>
			{/* Current gear list */}
			{gear.length === 0 ? (
				<p className="empty">No gear added yet.</p>
			) : (
				<div className="gear-list">
					{gear.map((inst, i) => {
						const itemDef = inst.itemId ? refData.items[inst.itemId] : undefined;
						const armorRef = inst.armorId ? refData.armors[inst.armorId] : undefined;
						const displayName =
							itemDef?.name ??
							inst.name ??
							armorRef?.name ??
							(inst.armor ? `${inst.armor.slot === "shield" ? "Shield" : "Armor"} (${inst.armor.ac} AC)` : "Unknown item");
						const changes = itemDef?.changes ?? [];

return (
						<div key={i} className={`gear-row${inst.equipped ? "" : " is-unequipped"}`}>
							<label className="gear-equip" title={inst.equipped ? "Unequip" : "Equip"}>
								<input
									type="checkbox"
									checked={inst.equipped}
									onChange={(e) => update((d) => setGearEquipped(d, i, e.target.checked))}
								/>
							</label>
							<div className="gear-main">
								<div className="gear-name">{displayName}</div>
								{inst.armor && (
									<div className="gear-meta">
										AC +{inst.armor.ac}
										{inst.armor.maxDex != null ? ` · max Dex +${inst.armor.maxDex}` : ""}
										{inst.armor.acp ? ` · ACP ${inst.armor.acp}` : ""}
									</div>
								)}
									{inst.equipped && changes.length > 0 && (
										<div className="gear-changes">
											{changes.map((ch, ci) => (
												<span key={ci} className="gear-change">{changeLabel(ch)}</span>
											))}
										</div>
									)}
								</div>
								<button
									type="button"
									className="pick-btn remove"
									onClick={() => update((d) => removeGear(d, i))}
									title="Remove from gear"
								>
									Remove
								</button>
							</div>
						);
					})}
				</div>
			)}

			{/* Add magic item */}
			<div className="gear-add-row">
				{!showItemPicker ? (
					<button
						type="button"
						className="btn-ghost"
						onClick={() => setShowItemPicker(true)}
					>
						+ Add magic item
					</button>
				) : (
					<div className="gear-picker">
						<div className="gear-picker-head">
							<input
								className="search"
								type="text"
								placeholder="Search magic items…"
								value={itemQuery}
								onChange={(e) => setItemQuery(e.target.value)}
								autoFocus
							/>
							<button
								type="button"
								className="btn-ghost"
								onClick={() => { setShowItemPicker(false); setItemQuery(""); }}
							>
								Cancel
							</button>
						</div>
						<div className="scroll">
							{filteredItems.length === 0 ? (
								<div className="empty">No items match.</div>
							) : (
								filteredItems.map((item) => (
									<div key={item.id} className="pick-row">
										<div className="pmain">
											<div className="pname">{item.name}</div>
											{item.slot && (
												<div className="preq">
													<span>{item.slot}</span>
													{item.changes.length > 0 && (
														<span className="ck-met">
															{item.changes.slice(0, 3).map((ch, i) => (
																<span key={i}>{i > 0 ? " · " : ""}{changeLabel(ch)}</span>
															))}
															{item.changes.length > 3 ? <span> +{item.changes.length - 3} more</span> : null}
														</span>
													)}
												</div>
											)}
										</div>
										<button
											type="button"
											className="pick-btn add"
											onClick={() => handleAddItem(item.id)}
										>
											Add
										</button>
									</div>
								))
							)}
							{Object.keys(refData.items).length > 80 && filteredItems.length === 80 ? (
								<div className="empty">Showing first 80 — refine your search.</div>
							) : null}
						</div>
					</div>
				)}
			</div>

			{/* Add worn armor / shield */}
			<div className="gear-add-row">
				{!showArmorPicker ? (
					<button
						type="button"
						className="btn-ghost"
						onClick={() => setShowArmorPicker(true)}
					>
						+ Add worn armor / shield
					</button>
				) : (
					<div className="gear-armor-form">
						<div className="gear-armor-head">
							<span className="eyebrow">
								{armorMode === "select" ? "Select Armor / Shield" : "Custom Armor / Shield"}
							</span>
							<div className="head-actions">
								{armorMode === "custom" && (
									<button
										type="button"
										className="btn-ghost"
										onClick={() => setArmorMode("select")}
									>
										← Back to list
									</button>
								)}
								<button
									type="button"
									className="btn-ghost"
									onClick={closeArmorPicker}
								>
									Cancel
								</button>
							</div>
						</div>

						{armorMode === "select" ? (
							<div className="gear-picker">
								<div className="gear-picker-head">
									<input
										className="search"
										type="text"
										placeholder="Search armor & shields…"
										value={armorQuery}
										onChange={(e) => setArmorQuery(e.target.value)}
										autoFocus
									/>
									<label className="field enh-field">
										<span>Enh.</span>
										<select
											value={armorEnhancement}
											onChange={(e) => setArmorEnhancement(Number(e.target.value))}
										>
											{ENHANCEMENT_OPTIONS.map((n) => (
												<option key={n} value={n}>+{n}</option>
											))}
										</select>
									</label>
									<label className="field enh-field">
										<span>Material</span>
										<select
											value={armorMaterial}
											onChange={(e) => setArmorMaterial(e.target.value)}
										>
											{ARMOR_MATERIALS.map((m) => (
												<option key={m.id} value={m.id}>{m.name}</option>
											))}
										</select>
									</label>
								</div>
								<div className="scroll">
									{filteredArmors.length === 0 ? (
										<div className="empty">No armor matches.</div>
									) : (
										filteredArmors.map((a) => (
											<div key={a.id} className="pick-row">
												<div className="pmain">
													<div className="pname">{a.name}</div>
													<div className="preq">
														<span>{armorRefMeta(a)}</span>
														<span className="ck-met">AC +{a.ac}</span>
													</div>
												</div>
												<button
													type="button"
													className="pick-btn add"
													onClick={() => handleAddArmorRef(a)}
												>
													Add
												</button>
											</div>
										))
									)}
									{Object.keys(refData.armors).length > 80 && filteredArmors.length === 80 ? (
										<div className="empty">Showing first 80 — refine your search.</div>
									) : null}
								</div>
								<button
									type="button"
									className="btn-ghost armor-custom-link"
									onClick={() => setArmorMode("custom")}
								>
									+ Custom entry…
								</button>
							</div>
						) : (
							<>
								<div className="gear-armor-grid">
									<label className="field">
										<span>Slot</span>
										<select
											value={armorSlot}
											onChange={(e) => setArmorSlot(e.target.value as "armor" | "shield")}
										>
											{ARMOR_SLOTS.map((s) => (
												<option key={s} value={s}>
													{s === "armor" ? "Body Armor" : "Shield"}
												</option>
											))}
										</select>
									</label>
									<label className="field">
										<span>Name</span>
										<input
											type="text"
											placeholder={armorSlot === "armor" ? "Chainmail" : "Heavy Steel Shield"}
											value={armorName}
											onChange={(e) => setArmorName(e.target.value)}
										/>
									</label>
									<label className="field">
										<span>AC Bonus</span>
										<input
											type="number"
											value={armorAc}
											onChange={(e) => setArmorAc(Number(e.target.value))}
										/>
									</label>
									{armorSlot === "armor" && (
										<>
											<label className="field">
												<span>Max Dex (blank = no cap)</span>
												<input
													type="number"
													value={armorMaxDex}
													placeholder="—"
													onChange={(e) => setArmorMaxDex(e.target.value)}
												/>
											</label>
											<label className="field">
												<span>Armor Check Penalty</span>
												<input
													type="number"
													value={armorAcp}
													onChange={(e) => setArmorAcp(Number(e.target.value))}
												/>
											</label>
											<label className="field">
												<span>Weight class</span>
												<select
													value={armorType}
													onChange={(e) => setArmorType(Number(e.target.value))}
												>
													{ARMOR_TYPES.map(({ value, label }) => (
														<option key={value} value={value}>{label}</option>
													))}
												</select>
											</label>
										</>
									)}
								</div>
								<button
									type="button"
									className="pick-btn add"
									onClick={handleAddArmor}
									disabled={armorAc === 0 && armorSlot === "armor"}
								>
									Add to gear
								</button>
							</>
						)}
					</div>
				)}
			</div>
		</Panel>
	);
}
