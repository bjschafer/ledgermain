import { useMemo, useState } from "react";

import type { RefData, WeaponInstance, WeaponRef } from "@pf1/schema";

import { addWeapon, addWeaponFromRef, removeWeapon, replaceWeapon } from "../../model/doc.js";
import {
  abilityNotes,
  type AbilityInfo,
  buildAbilityCatalog,
  sanitizeAbilities,
} from "../../model/abilities.js";
import { WEAPON_MATERIALS } from "../../model/materials.js";
import {
  staleUnarmedDamage,
  unarmedStrikeMeta,
  unarmedStrikeSource,
  unarmedStrikeWeapon,
} from "../../model/unarmedStrike.js";
import { SwordIcon } from "../icons.js";
import { AbilityPicker, pruneAbilityInfo, toggleAbilityPick } from "./AbilityPicker.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

const CATEGORIES = ["melee", "ranged"] as const;
const ATTACK_ABILITIES = [
  { value: "str" as const, label: "Strength (STR)" },
  { value: "dex" as const, label: "Dexterity (DEX)" },
];
// Dexterity belongs here for the Weapon Finesse family (Fencing Grace,
// Slashing Grace, Dervish Dance, ...): the engine auto-promotes a matching
// weapon on its own, but the field stays hand-settable for the sources it
// can't recognize — a custom weapon it can't identify, or a class feature
// like the Aldori swordlord's that grants the same swap.
const DAMAGE_ABILITIES = [
  { value: "str" as const, label: "Strength (STR)" },
  { value: "dex" as const, label: "Dexterity (DEX)" },
  { value: "none" as const, label: "None" },
];
const DAMAGE_MULTIPLIERS = [
  { value: 1, label: "×1: one-handed (default)" },
  { value: 1.5, label: "×1.5: two-handed" },
  { value: 0.5, label: "×0.5: off-hand" },
];
const PROFICIENCIES = [
  { value: "simple" as const, label: "Simple" },
  { value: "martial" as const, label: "Martial" },
  { value: "exotic" as const, label: "Exotic" },
  // Unarmed strikes and natural attacks belong to no proficiency category and
  // never take the -4. Stored as an absent `proficiency`, which the engine's
  // `isWeaponProficient` reads as "nothing to be non-proficient with".
  { value: "" as const, label: "Always proficient" },
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
  weight: 0,
  // Most custom entries end up being martial weapons — an editable default,
  // not a guess the engine trusts blindly (this drives the -4 non-proficient
  // attack penalty, so it's always set, never left blank).
  proficiency: "martial",
};

/** Inline form for adding or editing a WeaponInstance. */
function WeaponForm({
  initial,
  refData,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: WeaponInstance;
  refData: RefData;
  onSave: (w: WeaponInstance) => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [form, setForm] = useState<WeaponInstance>({ ...initial });
  const [abilities, setAbilities] = useState<string[]>(initial.abilities ?? []);
  const [abilityInfo, setAbilityInfo] = useState<AbilityInfo>(initial.abilityInfo ?? {});
  const enh = form.enhancement ?? 0;

  const catalog = useMemo(() => buildAbilityCatalog(refData.itemAbilities), [refData]);
  const weaponAbilityOptions = useMemo(
    () => catalog.options.filter((o) => o.appliesTo.includes("weapon")),
    [catalog],
  );

  function field<K extends keyof WeaponInstance>(key: K, val: WeaponInstance[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setEnhancement(n: number) {
    field("enhancement", n);
    // Abilities require enhancement >= 1, and the combined bonus is capped at +10.
    const next = n < 1 ? [] : sanitizeAbilities(abilities, n, abilityInfo);
    setAbilities(next);
    setAbilityInfo(pruneAbilityInfo(abilityInfo, next));
  }

  function toggleAbility(option: (typeof weaponAbilityOptions)[number]) {
    const result = toggleAbilityPick(abilities, abilityInfo, option, enh, catalog.info);
    setAbilities(result.abilities);
    setAbilityInfo(result.abilityInfo);
  }

  function handleSave() {
    const weapon: WeaponInstance = {
      ...form,
      name: form.name.trim(),
      damageDice: form.damageDice?.trim() || undefined,
      group: form.group?.trim() || undefined,
      abilities: abilities.length > 0 ? abilities : undefined,
      abilityInfo:
        abilities.length > 0 && Object.keys(abilityInfo).length > 0 ? abilityInfo : undefined,
    };
    if (weapon.enhancement === 0) delete weapon.enhancement;
    if (weapon.critRange === 20) delete weapon.critRange;
    if (weapon.critMult === 2) delete weapon.critMult;
    if (weapon.damageMultiplier === 1) delete weapon.damageMultiplier;
    if (!weapon.material || weapon.material === "steel") delete weapon.material;
    if (!weapon.abilities) delete weapon.abilities;
    if (!weapon.abilityInfo) delete weapon.abilityInfo;
    if (!weapon.proficiency) delete weapon.proficiency;
    if (!weapon.masterwork || (weapon.enhancement ?? 0) > 0) delete weapon.masterwork;
    if (!weapon.weight) delete weapon.weight;
    if (!weapon.rangeIncrement) delete weapon.rangeIncrement;
    if (!weapon.misfire) delete weapon.misfire;
    if (!weapon.capacity) delete weapon.capacity;
    if (!weapon.firearmEra) delete weapon.firearmEra;
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
          <span>Enhancement bonus</span>
          <select
            value={form.enhancement ?? 0}
            onChange={(e) => setEnhancement(Number(e.target.value))}
          >
            {ENHANCEMENT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                +{n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Masterwork</span>
          {enh > 0 ? (
            <p className="field-implied" title="Implied by the weapon's magic enhancement bonus">
              Implied by enhancement
            </p>
          ) : (
            <button
              type="button"
              className="field-toggle"
              aria-pressed={!!form.masterwork}
              onClick={() => field("masterwork", !form.masterwork)}
            >
              {form.masterwork ? "Yes" : "No"}
            </button>
          )}
        </label>
        <label className="field">
          <span>Material</span>
          <select
            value={form.material ?? "steel"}
            onChange={(e) => field("material", e.target.value)}
          >
            {WEAPON_MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
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
          <span>Proficiency</span>
          <select
            value={form.proficiency ?? ""}
            onChange={(e) =>
              field("proficiency", (e.target.value || undefined) as WeaponInstance["proficiency"])
            }
          >
            {PROFICIENCIES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
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
            onChange={(e) => field("damageAbility", e.target.value as "str" | "dex" | "none")}
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
            min={1}
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
          <span>Weapon type (for Weapon Focus / Spec)</span>
          <input
            type="text"
            value={form.group ?? ""}
            placeholder="longsword"
            onChange={(e) => field("group", e.target.value)}
          />
        </label>
        <label className="field">
          <span>Weight (lb, for encumbrance)</span>
          <input
            type="number"
            value={form.weight ?? 0}
            min={0}
            step={0.5}
            onChange={(e) => field("weight", Number(e.target.value))}
          />
        </label>
        {form.category === "ranged" && (
          <>
            <label className="field">
              <span>Range increment (ft, blank = none)</span>
              <input
                type="number"
                value={form.rangeIncrement ?? ""}
                placeholder="—"
                min={0}
                onChange={(e) => {
                  const v = e.target.value;
                  field("rangeIncrement", v === "" ? undefined : Number(v));
                }}
              />
            </label>
            <label className="field">
              <span>Misfire (blank = not a firearm)</span>
              <input
                type="number"
                value={form.misfire ?? ""}
                placeholder="—"
                min={0}
                onChange={(e) => {
                  const v = e.target.value;
                  field("misfire", v === "" ? undefined : Number(v));
                }}
              />
            </label>
            <label className="field">
              <span>Capacity (shots, blank = not a firearm)</span>
              <input
                type="number"
                value={form.capacity ?? ""}
                placeholder="—"
                min={0}
                onChange={(e) => {
                  const v = e.target.value;
                  field("capacity", v === "" ? undefined : Number(v));
                }}
              />
            </label>
            <label className="field">
              <span>Firearm era</span>
              <select
                value={form.firearmEra ?? ""}
                onChange={(e) =>
                  field("firearmEra", (e.target.value || undefined) as WeaponInstance["firearmEra"])
                }
              >
                <option value="">Not a firearm</option>
                <option value="early">Early</option>
                <option value="advanced">Advanced</option>
                <option value="modern">Modern</option>
              </select>
            </label>
          </>
        )}
      </div>
      <AbilityPicker
        options={weaponAbilityOptions}
        selected={abilities}
        enhancement={enh}
        info={catalog.info}
        onToggle={toggleAbility}
      />
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
  if (w.proficiency) parts.push(w.proficiency);
  parts.push(w.category ?? "melee");
  parts.push(`${w.attackAbility.toUpperCase()} to hit`);
  if (w.masterwork && (w.enhancement ?? 0) === 0) parts.push("masterwork");
  if (w.damageDice || (w.enhancement ?? 0) > 0) {
    const dmg = [w.damageDice, (w.enhancement ?? 0) > 0 ? `+${w.enhancement} enh` : null]
      .filter(Boolean)
      .join(" ");
    parts.push(dmg);
  }
  const critRange = w.critRange ?? 20;
  const critMult = w.critMult ?? 2;
  parts.push(`crit ${critRange < 20 ? `${critRange}-20/×${critMult}` : `×${critMult}`}`);
  if (w.group) parts.push(`type: ${w.group}`);
  for (const note of abilityNotes(w.abilities, w.abilityInfo)) {
    parts.push(note.note ? `${note.name} (${note.note})` : note.name);
  }
  return parts.join(" · ");
}

/** One-line summary of a {@link WeaponRef} for the picker preview row. */
function weaponRefMeta(w: WeaponRef): string {
  const parts: string[] = [w.proficiency, w.category];
  if (w.damageDice) parts.push(w.damageDice);
  const critRange = w.critRange ?? 20;
  const critMult = w.critMult ?? 2;
  parts.push(`crit ${critRange < 20 ? `${critRange}-20/×${critMult}` : `×${critMult}`}`);
  if (w.group) parts.push(`type: ${w.group}`);
  return parts.join(" · ");
}

const ENHANCEMENT_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

/** Search terms that surface the synthesized unarmed strike row in the picker. */
const UNARMED_SEARCH_TERMS = ["unarmed strike", "fist", "punch", "kick"];

export function WeaponsSection({ doc, refData, update }: BuilderProps) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [addMode, setAddMode] = useState<"select" | "custom">("select");
  const [weaponQuery, setWeaponQuery] = useState("");
  const [enhancement, setEnhancement] = useState<number>(0);
  const [material, setMaterial] = useState<string>("steel");
  const [abilities, setAbilities] = useState<string[]>([]);
  const [abilityInfo, setAbilityInfo] = useState<AbilityInfo>({});
  const [masterwork, setMasterwork] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const weapons = doc.build.weapons ?? [];

  const catalog = useMemo(() => buildAbilityCatalog(refData.itemAbilities), [refData]);
  const weaponAbilityOptions = useMemo(
    () => catalog.options.filter((o) => o.appliesTo.includes("weapon")),
    [catalog],
  );

  const filteredWeapons = useMemo(() => {
    const q = weaponQuery.trim().toLowerCase();
    return Object.values(refData.weapons)
      .filter((w) => !q || w.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 80);
  }, [refData.weapons, weaponQuery]);

  // The unarmed strike has no compendium entry to pick, so it's synthesized
  // from the character's own class levels and size — see `model/unarmedStrike.ts`.
  const unarmed = useMemo(() => unarmedStrikeSource(doc, refData), [doc, refData]);
  const showUnarmedRow = useMemo(() => {
    const q = weaponQuery.trim().toLowerCase();
    return !q || UNARMED_SEARCH_TERMS.some((term) => term.includes(q) || q.includes(term));
  }, [weaponQuery]);

  function handleEnhancementChange(n: number) {
    setEnhancement(n);
    // Abilities require enhancement >= 1, and the combined bonus is capped at +10.
    const next = n < 1 ? [] : sanitizeAbilities(abilities, n, abilityInfo);
    setAbilities(next);
    setAbilityInfo(pruneAbilityInfo(abilityInfo, next));
  }

  function toggleAbility(option: (typeof weaponAbilityOptions)[number]) {
    const result = toggleAbilityPick(abilities, abilityInfo, option, enhancement, catalog.info);
    setAbilities(result.abilities);
    setAbilityInfo(result.abilityInfo);
  }

  function resetPickerState() {
    setEnhancement(0);
    setMaterial("steel");
    setAbilities([]);
    setAbilityInfo({});
    setMasterwork(false);
  }

  function handleAdd(w: WeaponInstance) {
    update((d) => addWeapon(d, w));
    setShowAddCard(false);
    setAddMode("select");
    resetPickerState();
  }

  function handleAddFromRef(w: WeaponRef) {
    update((d) =>
      addWeaponFromRef(d, w, enhancement, material, abilities, masterwork, abilityInfo),
    );
    setShowAddCard(false);
    setAddMode("select");
    setWeaponQuery("");
    resetPickerState();
  }

  function handleEdit(index: number, w: WeaponInstance) {
    update((d) => replaceWeapon(d, index, w));
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
    resetPickerState();
  }

  function closeAddCard() {
    setShowAddCard(false);
    setAddMode("select");
    setWeaponQuery("");
    resetPickerState();
  }

  return (
    <Panel
      title="Weapons"
      step="ix"
      icon={<SwordIcon />}
      storageKey="panel:Weapons"
      defaultCollapsed={false}
    >
      {weapons.length === 0 ? (
        <p className="empty">No weapons added yet.</p>
      ) : (
        <div className="gear-list">
          {weapons.map((w, i) =>
            editingIndex === i ? (
              <div key={i} className="gear-row">
                <WeaponForm
                  initial={w}
                  refData={refData}
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
                {staleUnarmedDamage(w, doc, refData) ? (
                  <button
                    type="button"
                    className="pick-btn add"
                    onClick={() =>
                      update((d) =>
                        replaceWeapon(d, i, {
                          ...w,
                          damageDice: staleUnarmedDamage(w, doc, refData),
                        }),
                      )
                    }
                  >
                    Set to {staleUnarmedDamage(w, doc, refData)}
                  </button>
                ) : null}
                <button type="button" className="pick-btn add" onClick={() => startEdit(i)}>
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
                  <button type="button" className="btn-ghost" onClick={() => setAddMode("select")}>
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
                      onChange={(e) => handleEnhancementChange(Number(e.target.value))}
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
                    <select value={material} onChange={(e) => setMaterial(e.target.value)}>
                      {WEAPON_MATERIALS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field enh-field">
                    <span>Masterwork</span>
                    {enhancement > 0 ? (
                      <p
                        className="field-implied compact"
                        title="Implied by the weapon's magic enhancement bonus"
                      >
                        implied
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="field-toggle compact"
                        aria-pressed={masterwork}
                        onClick={() => setMasterwork((v) => !v)}
                      >
                        {masterwork ? "Yes" : "No"}
                      </button>
                    )}
                  </label>
                </div>
                <AbilityPicker
                  options={weaponAbilityOptions}
                  selected={abilities}
                  enhancement={enhancement}
                  info={catalog.info}
                  onToggle={toggleAbility}
                />
                <div className="scroll">
                  {showUnarmedRow ? (
                    <div className="pick-row">
                      <div className="pmain">
                        <div className="pname">
                          Unarmed Strike
                          {enhancement > 0 ? ` +${enhancement}` : ""}
                        </div>
                        <div className="preq">
                          <span>{unarmedStrikeMeta(unarmed)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="pick-btn add"
                        onClick={() => handleAdd(unarmedStrikeWeapon(doc, refData, enhancement))}
                      >
                        Add
                      </button>
                    </div>
                  ) : null}
                  {filteredWeapons.length === 0 && !showUnarmedRow ? (
                    <div className="empty">No weapons match.</div>
                  ) : (
                    filteredWeapons.map((w) => (
                      <div key={w.id} className="pick-row">
                        <div className="pmain">
                          <div className="pname">
                            {enhancement === 0 && masterwork ? "Masterwork " : ""}
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
                    <div className="empty">Showing first 80. Refine your search.</div>
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
                refData={refData}
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
