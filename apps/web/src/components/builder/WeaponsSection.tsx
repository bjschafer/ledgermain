import { useMemo, useState } from "react";

import type { WeaponInstance, WeaponRef } from "@pf1/schema";

import { addWeapon, addWeaponFromRef, removeWeapon, updateWeapon } from "../../model/doc.js";
import { WEAPON_MATERIALS } from "../../model/materials.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

const CATEGORIES = ["melee", "ranged"] as const;
const ATTACK_ABILITIES = [
	{ value: "str" as const, label: "Strength (STR)" },
	{ value: "dex" as const, label: "Dexterity (DEX)" },
];
const DAMAGE_ABILITIES = [
	{ value: "str" as const, label: "Strength (STR)" },
	{ value: "none" as const, label: "None" },
];
const DAMAGE_MULTIPLIERS = [
	{ value: 1, label: "×1 — one-handed (default)" },
	{ value: 1.5, label: "×1.5 — two-handed" },
	{ value: 0.5, label: "×0.5 — off-hand" },
];

const BLANK_WEAPON: WeaponInstance = {
	name: "",
	attackAbility: "str",
	damageAbility: "str",
	damageMultiplier: 1,
	enhancement: 0,
	damageDice: "",
	critRange: 20,
	critMult: 2,
	group: "",
	category: "melee",
};

/** Inline form for adding or editing a WeaponInstance. */
function WeaponForm({
	initial,
	onSave,
	onCancel,
	saveLabel,
}: {
	initial: WeaponInstance;
	onSave: (w: WeaponInstance) => void;
	onCancel: () => void;
	saveLabel: string;
}) {
	const [form, setForm] = useState<WeaponInstance>({ ...initial });

	function field<K extends keyof WeaponInstance>(key: K, val: WeaponInstance[K]) {
		setForm((f) => ({ ...f, [key]: val }));
	}

	function handleSave() {
		const weapon: WeaponInstance = {
			...form,
			name: form.name.trim(),
			// Omit empty optional strings so they don't linger as "" in the doc.
			damageDice: form.damageDice?.trim() || undefined,
			group: form.group?.trim() || undefined,
		};
		// Omit zero-value optional numbers that default gracefully.
		if (weapon.enhancement === 0) delete weapon.enhancement;
		if (weapon.critRange === 20) delete weapon.critRange;
		if (weapon.critMult === 2) delete weapon.critMult;
		if (weapon.damageMultiplier === 1) delete weapon.damageMultiplier;
		onSave(weapon);
	}

	return (
		<div className="gear-armor-form">
			<div className="gear-armor-head">
				<span className="eyebrow">
					{saveLabel === "Add to weapons" ? "New Weapon" : "Edit Weapon"}
				</span>
				<button type="button" className="btn-ghost" onClick={onCancel}>
					Cancel
				</button>
			</div>
			<div className="gear-armor-grid">
				<label className="field">
					<span>Name</span>
					<input
						type="text"
						value={form.name}
						placeholder="Longsword +1"
						autoFocus
						onChange={(e) => field("name", e.target.value)}
					/>
				</label>
				<label className="field">
					<span>Category</span>
					<select
						value={form.category ?? "melee"}
						onChange={(e) => field("category", e.target.value as "melee" | "ranged")}
					>
						{CATEGORIES.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
				</label>
				<label className="field">
					<span>Attack ability</span>
					<select
						value={form.attackAbility}
						onChange={(e) => field("attackAbility", e.target.value as "str" | "dex")}
					>
						{ATTACK_ABILITIES.map(({ value, label }) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				</label>
				<label className="field">
					<span>Damage ability</span>
					<select
						value={form.damageAbility ?? "str"}
						onChange={(e) => field("damageAbility", e.target.value as "str" | "none")}
					>
						{DAMAGE_ABILITIES.map(({ value, label }) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				</label>
				<label className="field">
					<span>Damage multiplier</span>
					<select
						value={form.damageMultiplier ?? 1}
						onChange={(e) => field("damageMultiplier", Number(e.target.value))}
					>
						{DAMAGE_MULTIPLIERS.map(({ value, label }) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
				</label>
				<label className="field">
					<span>Enhancement bonus</span>
					<input
						type="number"
						value={form.enhancement ?? 0}
						min={0}
						max={10}
						onChange={(e) => field("enhancement", Number(e.target.value))}
					/>
				</label>
				<label className="field">
					<span>Damage dice (display only)</span>
					<input
						type="text"
						value={form.damageDice ?? ""}
						placeholder="1d8"
						onChange={(e) => field("damageDice", e.target.value)}
					/>
				</label>
				<label className="field">
					<span>Critical range (low end, default 20)</span>
					<input
						type="number"
						value={form.critRange ?? 20}
						min={15}
						max={20}
						onChange={(e) => field("critRange", Number(e.target.value))}
					/>
				</label>
				<label className="field">
					<span>Critical multiplier (default 2)</span>
					<input
						type="number"
						value={form.critMult ?? 2}
						min={2}
						max={4}
						onChange={(e) => field("critMult", Number(e.target.value))}
					/>
				</label>
				<label className="field">
					<span>Weapon type (for Weapon Focus / Spec, e.g. "longsword")</span>
					<input
						type="text"
						value={form.group ?? ""}
						placeholder="longsword"
						onChange={(e) => field("group", e.target.value)}
					/>
				</label>
			</div>
			<button
				type="button"
				className="pick-btn add"
				disabled={!form.name.trim()}
				onClick={handleSave}
			>
				{saveLabel}
			</button>
		</div>
	);
}

/** Render a concise one-line summary for a weapon in the list. */
function weaponMeta(w: WeaponInstance): string {
	const parts: string[] = [];
	parts.push(w.category ?? "melee");
	parts.push(`${w.attackAbility.toUpperCase()} to hit`);
	if (w.damageDice || (w.enhancement ?? 0) > 0) {
		const dmg = [
			w.damageDice,
			(w.enhancement ?? 0) > 0 ? `+${w.enhancement} enh` : null,
		]
			.filter(Boolean)
			.join(" ");
		parts.push(dmg);
	}
	const critRange = w.critRange ?? 20;
	const critMult = w.critMult ?? 2;
	parts.push(`crit ${critRange < 20 ? `${critRange}–20/×${critMult}` : `×${critMult}`}`);
	if (w.group) parts.push(`type: ${w.group}`);
	return parts.join(" · ");
}

/** One-line summary of a {@link WeaponRef} for the picker preview row. */
function weaponRefMeta(w: WeaponRef): string {
	const parts: string[] = [w.proficiency, w.category];
	if (w.damageDice) parts.push(w.damageDice);
	const critRange = w.critRange ?? 20;
	const critMult = w.critMult ?? 2;
	parts.push(`crit ${critRange < 20 ? `${critRange}–20/×${critMult}` : `×${critMult}`}`);
	if (w.group) parts.push(`type: ${w.group}`);
	return parts.join(" · ");
}

const ENHANCEMENT_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

export function WeaponsSection({ doc, refData, update }: BuilderProps) {
	const [showAddCard, setShowAddCard] = useState(false);
	const [addMode, setAddMode] = useState<"select" | "custom">("select");
	const [weaponQuery, setWeaponQuery] = useState("");
	const [enhancement, setEnhancement] = useState<number>(0);
	const [material, setMaterial] = useState<string>("steel");
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const weapons = doc.build.weapons ?? [];

	const filteredWeapons = useMemo(() => {
		const q = weaponQuery.trim().toLowerCase();
		return Object.values(refData.weapons)
			.filter((w) => !q || w.name.toLowerCase().includes(q))
			.sort((a, b) => a.name.localeCompare(b.name))
			.slice(0, 80);
	}, [refData.weapons, weaponQuery]);

	function handleAdd(w: WeaponInstance) {
		update((d) => addWeapon(d, w));
		setShowAddCard(false);
		setAddMode("select");
		setEnhancement(0);
		setMaterial("steel");
	}

	function handleAddFromRef(w: WeaponRef) {
		update((d) => addWeaponFromRef(d, w, enhancement, material));
		setShowAddCard(false);
		setAddMode("select");
		setWeaponQuery("");
		setEnhancement(0);
		setMaterial("steel");
	}

	function handleEdit(index: number, w: WeaponInstance) {
		update((d) => updateWeapon(d, index, w));
		setEditingIndex(null);
	}

	function startEdit(index: number) {
		setShowAddCard(false);
		setEditingIndex(index);
	}

	function startAdd() {
		setEditingIndex(null);
		setShowAddCard(true);
		setAddMode("select");
		setWeaponQuery("");
		setEnhancement(0);
		setMaterial("steel");
	}

	function closeAddCard() {
		setShowAddCard(false);
		setAddMode("select");
		setWeaponQuery("");
		setEnhancement(0);
		setMaterial("steel");
	}

	return (
		<Panel title="Weapons" step="ix" storageKey="panel:Weapons" defaultCollapsed={false}>
			{weapons.length === 0 ? (
				<p className="empty">No weapons added yet.</p>
			) : (
				<div className="gear-list">
					{weapons.map((w, i) =>
						editingIndex === i ? (
							<div key={i} className="gear-row">
								<WeaponForm
									initial={w}
									onSave={(updated) => handleEdit(i, updated)}
									onCancel={() => setEditingIndex(null)}
									saveLabel="Save changes"
								/>
							</div>
						) : (
							<div key={i} className="gear-row">
								<div className="gear-main">
									<div className="gear-name">{w.name}</div>
									<div className="gear-meta">{weaponMeta(w)}</div>
								</div>
								<button
									type="button"
									className="pick-btn add"
									onClick={() => startEdit(i)}
								>
									Edit
								</button>
								<button
									type="button"
									className="pick-btn remove"
									onClick={() => update((d) => removeWeapon(d, i))}
								>
									Remove
								</button>
							</div>
						),
					)}
				</div>
			)}

			<div className="gear-add-row">
				{!showAddCard ? (
					<button type="button" className="btn-ghost" onClick={startAdd}>
						+ Add weapon
					</button>
				) : (
					<div className="gear-armor-form">
						<div className="gear-armor-head">
							<span className="eyebrow">
								{addMode === "select" ? "Select Weapon" : "Custom Weapon"}
							</span>
							<div className="head-actions">
								{addMode === "custom" && (
									<button
										type="button"
										className="btn-ghost"
										onClick={() => setAddMode("select")}
									>
										← Back to list
									</button>
								)}
								<button type="button" className="btn-ghost" onClick={closeAddCard}>
									Cancel
								</button>
							</div>
						</div>

						{addMode === "select" ? (
							<div className="gear-picker">
								<div className="gear-picker-head">
									<input
										className="search"
										type="text"
										placeholder="Search weapons…"
										value={weaponQuery}
										onChange={(e) => setWeaponQuery(e.target.value)}
										autoFocus
									/>
								<label className="field enh-field">
									<span>Enh.</span>
									<select
										value={enhancement}
										onChange={(e) => setEnhancement(Number(e.target.value))}
									>
										{ENHANCEMENT_OPTIONS.map((n) => (
											<option key={n} value={n}>
												+{n}
											</option>
										))}
									</select>
								</label>
								<label className="field enh-field">
									<span>Material</span>
									<select
										value={material}
										onChange={(e) => setMaterial(e.target.value)}
									>
										{WEAPON_MATERIALS.map((m) => (
											<option key={m.id} value={m.id}>{m.name}</option>
										))}
									</select>
								</label>
							</div>
								<div className="scroll">
									{filteredWeapons.length === 0 ? (
										<div className="empty">No weapons match.</div>
									) : (
										filteredWeapons.map((w) => (
											<div key={w.id} className="pick-row">
												<div className="pmain">
													<div className="pname">
														{w.name}
														{enhancement > 0 ? ` +${enhancement}` : ""}
													</div>
													<div className="preq">
														<span>{weaponRefMeta(w)}</span>
													</div>
												</div>
												<button
													type="button"
													className="pick-btn add"
													onClick={() => handleAddFromRef(w)}
												>
													Add
												</button>
											</div>
										))
									)}
									{Object.keys(refData.weapons).length > 80 && filteredWeapons.length === 80 ? (
										<div className="empty">Showing first 80 — refine your search.</div>
									) : null}
								</div>
								<button
									type="button"
									className="btn-ghost armor-custom-link"
									onClick={() => setAddMode("custom")}
								>
									+ Custom entry…
								</button>
							</div>
						) : (
							<WeaponForm
								initial={BLANK_WEAPON}
								onSave={handleAdd}
								onCancel={closeAddCard}
								saveLabel="Add to weapons"
							/>
						)}
					</div>
				)}
			</div>
		</Panel>
	);
}
