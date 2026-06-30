import { useState } from "react";

import type { WeaponInstance } from "@pf1/schema";

import { addWeapon, removeWeapon, updateWeapon } from "../../model/doc.js";
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

export function WeaponsSection({ doc, update }: BuilderProps) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const weapons = doc.build.weapons ?? [];

	function handleAdd(w: WeaponInstance) {
		update((d) => addWeapon(d, w));
		setShowAddForm(false);
	}

	function handleEdit(index: number, w: WeaponInstance) {
		update((d) => updateWeapon(d, index, w));
		setEditingIndex(null);
	}

	function startEdit(index: number) {
		setShowAddForm(false);
		setEditingIndex(index);
	}

	function startAdd() {
		setEditingIndex(null);
		setShowAddForm(true);
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
				{!showAddForm ? (
					<button type="button" className="btn-ghost" onClick={startAdd}>
						+ Add weapon
					</button>
				) : (
					<WeaponForm
						initial={BLANK_WEAPON}
						onSave={handleAdd}
						onCancel={() => setShowAddForm(false)}
						saveLabel="Add to weapons"
					/>
				)}
			</div>
		</Panel>
	);
}
