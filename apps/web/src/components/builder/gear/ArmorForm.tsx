import { useMemo, useState } from "react";

import type { RefData, WornArmor } from "@pf1/schema";

import {
  type AbilityCatalogOption,
  type AbilityInfo,
  buildAbilityCatalog,
} from "../../../model/abilities.js";
import { ARMOR_MATERIALS } from "../../../model/materials.js";
import { AbilityPicker, pruneAbilityInfo, toggleAbilityPick } from "../AbilityPicker.js";
import { NumberField } from "../NumberField.js";

export const ARMOR_SLOTS = ["armor", "shield"] as const;
export const ARMOR_TYPES = [
  { value: 0, label: "None" },
  { value: 1, label: "Light" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Heavy" },
] as const;

export const WEIGHT_LABEL: Record<number, string> = {
  0: "None",
  1: "Light",
  2: "Medium",
  3: "Heavy",
};
export const SHIELD_TIERS = [
  { value: "light" as const, label: "Light (incl. buckler)" },
  { value: "heavy" as const, label: "Heavy" },
  { value: "tower" as const, label: "Tower" },
];

export const ENHANCEMENT_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

export const BLANK_ARMOR: { armor: WornArmor; name: string } = {
  armor: { slot: "armor", ac: 0 },
  name: "",
};

/** Inline form for adding or editing worn armor/shield. Mirrors WeaponForm. */
export function ArmorForm({
  initial,
  refData,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: { armor: WornArmor; name: string };
  refData: RefData;
  onSave: (armor: WornArmor, name: string) => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [form, setForm] = useState<WornArmor>({ ...initial.armor });
  const [name, setName] = useState(initial.name);
  const [abilities, setAbilities] = useState<string[]>(initial.armor.abilities ?? []);
  const [abilityInfo, setAbilityInfo] = useState<AbilityInfo>(initial.armor.abilityInfo ?? {});

  function field<K extends keyof WornArmor>(key: K, val: WornArmor[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const enhForAbilities = form.enhancement ?? 0;

  const catalog = useMemo(() => buildAbilityCatalog(refData.itemAbilities), [refData]);
  // The slot toggle below recomputes this on every flip, and — since the
  // model layer's `sanitizeAbilities` only enforces the +10 budget, not
  // which slot an ability applies to — {@link handleSlotChange} also drops
  // any already-picked ability the new slot can't carry (e.g. Bashing,
  // shield-only, surviving a flip to body armor).
  const armorAbilityOptions = useMemo(
    () =>
      catalog.options.filter((o) =>
        o.appliesTo.includes(form.slot === "shield" ? "shield" : "armor"),
      ),
    [catalog, form.slot],
  );

  function toggleAbility(option: AbilityCatalogOption) {
    const result = toggleAbilityPick(abilities, abilityInfo, option, enhForAbilities, catalog.info);
    setAbilities(result.abilities);
    setAbilityInfo(result.abilityInfo);
  }

  function handleSlotChange(slot: "armor" | "shield") {
    const applicable = slot === "shield" ? "shield" : "armor";
    const kept = abilities.filter((id) => {
      const opt = catalog.options.find((o) => o.id === id);
      return !opt || opt.appliesTo.includes(applicable);
    });
    setAbilities(kept);
    setAbilityInfo(pruneAbilityInfo(abilityInfo, kept));
    setForm((f) => ({
      ...f,
      slot,
      // Default a fresh switch into the shield slot to "light" so a shield
      // saved without ever touching the shield-type dropdown still carries a
      // real proficiency tier instead of silently staying "unknown."
      ...(slot === "shield" && !f.shieldTier ? { shieldTier: "light" as const } : {}),
    }));
  }

  function handleSave() {
    const armor: WornArmor = {
      ...form,
      ...(form.enhancement === 0 ? { enhancement: undefined } : {}),
      ...(!form.material || form.material === "steel" ? { material: undefined } : {}),
      ...(abilities.length > 0 ? { abilities } : {}),
    };
    // Omit zero-value optionals that default gracefully.
    const clean: WornArmor = { slot: armor.slot, ac: armor.ac };
    if (armor.enhancement) clean.enhancement = armor.enhancement;
    if (armor.material) clean.material = armor.material;
    if (armor.maxDex != null) clean.maxDex = armor.maxDex;
    if (armor.acp) clean.acp = armor.acp;
    if (armor.type) clean.type = armor.type;
    if (armor.asf) clean.asf = armor.asf;
    if (armor.abilities?.length) clean.abilities = armor.abilities;
    if (armor.abilities?.length && Object.keys(abilityInfo).length > 0) {
      clean.abilityInfo = abilityInfo;
    }
    // Masterwork is only meaningful at +0 — a magic enhancement bonus
    // already implies it (mirrors the weapon masterwork invariant).
    if (armor.masterwork && !armor.enhancement) clean.masterwork = true;
    if (armor.slot === "shield" && armor.shieldTier) clean.shieldTier = armor.shieldTier;
    onSave(clean, name.trim());
  }

  const isArmorSlot = form.slot === "armor";
  const hasEnhancement = (form.enhancement ?? 0) > 0;

  return (
    <div className="gear-armor-form">
      <div className="gear-armor-head">
        <span className="eyebrow">
          {saveLabel === "Add to gear" ? "New Armor / Shield" : "Edit Armor / Shield"}
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
            value={name}
            placeholder="Full Plate +3"
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Enhancement bonus</span>
          <select
            value={form.enhancement ?? 0}
            onChange={(e) => field("enhancement", Number(e.target.value))}
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
          {hasEnhancement ? (
            <p className="field-implied" title="Implied by the armor's magic enhancement bonus">
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
            {ARMOR_MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Slot</span>
          <select
            value={form.slot}
            onChange={(e) => handleSlotChange(e.target.value as "armor" | "shield")}
          >
            {ARMOR_SLOTS.map((s) => (
              <option key={s} value={s}>
                {s === "armor" ? "Body Armor" : "Shield"}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>AC Bonus</span>
          <NumberField
            value={form.ac}
            min={0}
            onCommit={(n) => field("ac", n)}
            aria-label="AC Bonus"
          />
        </label>
        <label className="field">
          <span>Arcane Spell Failure %</span>
          <NumberField
            value={form.asf ?? 0}
            min={0}
            max={100}
            onCommit={(n) => field("asf", n)}
            aria-label="Arcane Spell Failure %"
          />
        </label>
        <label className="field">
          <span>Armor Check Penalty (listed, negative)</span>
          <NumberField
            value={form.acp ?? 0}
            onCommit={(n) => field("acp", n)}
            aria-label="Armor Check Penalty"
          />
          <p className="field-implied" title="Masterwork/enhancement's -1 is applied automatically">
            Before masterwork
          </p>
        </label>
        {isArmorSlot ? (
          <>
            <label className="field">
              <span>Max Dex (blank = no cap)</span>
              <input
                type="number"
                value={form.maxDex ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value;
                  field("maxDex", v === "" ? undefined : Number(v));
                }}
              />
            </label>
            <label className="field">
              <span>Weight class</span>
              <select
                value={form.type ?? 0}
                onChange={(e) => field("type", Number(e.target.value) as WornArmor["type"])}
              >
                {ARMOR_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className="field">
            <span>Shield type</span>
            <select
              value={form.shieldTier ?? "light"}
              onChange={(e) => field("shieldTier", e.target.value as "light" | "heavy" | "tower")}
            >
              {SHIELD_TIERS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <AbilityPicker
        options={armorAbilityOptions}
        selected={abilities}
        enhancement={enhForAbilities}
        info={catalog.info}
        onToggle={toggleAbility}
        label="Magic special abilities"
        intro="Enchantments added on top of the base armor, like Shadow or Fortification."
      />
      <button
        type="button"
        className="pick-btn add"
        disabled={!name.trim() || (form.ac === 0 && isArmorSlot)}
        onClick={handleSave}
      >
        {saveLabel}
      </button>
    </div>
  );
}
