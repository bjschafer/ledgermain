import { useMemo, useState } from "react";

import type { ArmorRef, Change, ItemInstance, WornArmor } from "@pf1/schema";
import {
  gearUnitWeight,
  tryEvaluateFormula,
  unappliedChanges,
  unappliedTargetLabel,
} from "@pf1/engine";

import {
  addCustomGearItem,
  addGearItem,
  addWornArmor,
  addWornArmorFromRef,
  type MoneyField,
  removeGear,
  setGearCharges,
  setGearEquipped,
  setGearQuantity,
  setMoney,
  updateGearItem,
} from "../../model/doc.js";
import { abilityNotes, ARMOR_ABILITIES } from "../../model/abilities.js";
import { ARMOR_MATERIALS } from "../../model/materials.js";
import { NumberField } from "./NumberField.js";
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

const BLANK_ARMOR: { armor: WornArmor; name: string } = {
  armor: { slot: "armor", ac: 0 },
  name: "",
};

/** Inline form for adding or editing worn armor/shield. Mirrors WeaponForm. */
function ArmorForm({
  initial,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: { armor: WornArmor; name: string };
  onSave: (armor: WornArmor, name: string) => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [form, setForm] = useState<WornArmor>({ ...initial.armor });
  const [name, setName] = useState(initial.name);
  const [abilities, setAbilities] = useState<string[]>(initial.armor.abilities ?? []);

  function field<K extends keyof WornArmor>(key: K, val: WornArmor[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleAbility(id: string) {
    setAbilities((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
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
    if (armor.abilities?.length) clean.abilities = armor.abilities;
    // Masterwork is only meaningful at +0 — a magic enhancement bonus
    // already implies it (mirrors the weapon masterwork invariant).
    if (armor.masterwork && !armor.enhancement) clean.masterwork = true;
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
            onChange={(e) => field("slot", e.target.value as "armor" | "shield")}
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
          <input
            type="number"
            value={form.ac}
            min={0}
            onChange={(e) => field("ac", Number(e.target.value))}
          />
        </label>
        {isArmorSlot && (
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
              <span>Armor Check Penalty (negative)</span>
              <input
                type="number"
                value={form.acp ?? 0}
                onChange={(e) => field("acp", Number(e.target.value))}
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
        )}
      </div>
      {ARMOR_ABILITIES.length > 0 && (
        <div className="ability-chips">
          {ARMOR_ABILITIES.map((a) => (
            <button
              key={a.id}
              type="button"
              className="chip"
              aria-pressed={abilities.includes(a.id)}
              title={
                a.note
                  ? `${a.name} (+${a.bonusEquivalent}) — ${a.note}`
                  : `${a.name} (+${a.bonusEquivalent})`
              }
              onClick={() => toggleAbility(a.id)}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
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

/**
 * Compact "this item has effects the sheet can't apply" flag, shown when an
 * item's changes include a target `compute()` doesn't consume (see
 * `@pf1/engine`'s targets.ts) — e.g. Amulet of Mighty Fists' `nattack`/
 * `ndamage`, or Circlet of Persuasion's `chaChecks`. Non-blocking, matches
 * the existing `.soft` prose-prereq warning style. Manual armor entries have
 * no `changes` array to check, so they never show this badge.
 */
function PartialBadge({ changes }: { changes: readonly Change[] }) {
  const missing = unappliedChanges(changes);
  if (missing.length === 0) return null;
  const labels = missing.map((c) => unappliedTargetLabel(c.target));
  return (
    <span className="soft" title={`Not auto-applied: ${labels.join(", ")}`}>
      ⚠ partial
    </span>
  );
}

/**
 * Maximum charges for a linked item's `uses.maxFormula` (issue #16), e.g. a
 * Staff of Healing's 10. Every `maxFormula` in the current vendored slice is
 * a plain numeric constant (no `@item.level`/`@cl` reference — verified
 * against the full items pack), so this never needs item-instance context;
 * `tryEvaluateFormula` still guards against a future non-numeric value by
 * returning `null` rather than crashing the gear list. Only "charges"-style
 * pools are surfaced (potions/scrolls with `per: "single"` are one-shot and
 * tracked by removing the gear entry instead, not a charge counter).
 */
function itemMaxCharges(item: { uses?: { maxFormula?: string; per?: string } } | undefined) {
  const formula = item?.uses?.maxFormula;
  if (!formula) return null;
  try {
    const max = tryEvaluateFormula(formula);
    return max !== null && Number.isFinite(max) && max > 0 ? Math.trunc(max) : null;
  } catch {
    return null;
  }
}

/** A one-line summary of a {@link ArmorRef} for the picker preview. */
function armorRefMeta(a: ArmorRef): string {
  const weight = a.weightClass ? `${WEIGHT_LABEL[a.weightClass] ?? "—"} ` : "";
  const slot = a.slot === "shield" ? "Shield" : `${weight}Armor`;
  const dex = a.maxDex != null ? ` · max Dex +${a.maxDex}` : "";
  const acp = a.acp ? ` · ACP −${a.acp}` : "";
  return `${slot}${dex}${acp}`;
}

const MONEY_FIELDS: { field: MoneyField; label: string }[] = [
  { field: "pp", label: "pp" },
  { field: "gp", label: "gp" },
  { field: "sp", label: "sp" },
  { field: "cp", label: "cp" },
];

const BLANK_CUSTOM_GEAR = { name: "", weight: 0, price: 0, quantity: 1 };

export function GearSection({ doc, sheet, refData, update }: BuilderProps) {
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
  const [armorAbilities, setArmorAbilities] = useState<string[]>([]);
  const [armorMasterwork, setArmorMasterwork] = useState<boolean>(false);
  const [editingGearIndex, setEditingGearIndex] = useState<number | null>(null);

  // Custom mundane gear (ammo, rations, rope, ...) quick-add form.
  const [showCustomGear, setShowCustomGear] = useState(false);
  const [customGear, setCustomGear] = useState(BLANK_CUSTOM_GEAR);

  const gear = doc.build.gear;
  const money = doc.live.money ?? {};
  const encumbrance = sheet.encumbrance;

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

  function handleAddCustomGear() {
    update((d) =>
      addCustomGearItem(d, customGear.name, {
        weight: customGear.weight,
        price: customGear.price,
        quantity: customGear.quantity,
      }),
    );
    setShowCustomGear(false);
    setCustomGear(BLANK_CUSTOM_GEAR);
  }

  function closeArmorPicker() {
    setShowArmorPicker(false);
    setArmorMode("select");
    setArmorQuery("");
    setArmorEnhancement(0);
    setArmorMaterial("steel");
    setArmorAbilities([]);
    setArmorMasterwork(false);
  }

  function handleAddArmorRef(armor: ArmorRef) {
    update((d) =>
      addWornArmorFromRef(
        d,
        armor,
        armorEnhancement,
        armorMaterial,
        armorAbilities,
        armorMasterwork,
      ),
    );
    closeArmorPicker();
  }

  function toggleArmorAbility(id: string) {
    setArmorAbilities((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  function handleAddCustomArmor(armor: WornArmor, name: string) {
    const label = name || (armor.slot === "armor" ? "Worn Armor" : "Shield");
    update((d) => addWornArmor(d, armor, label));
    closeArmorPicker();
  }

  function handleEditArmor(index: number, armor: WornArmor, name: string) {
    const patch: Partial<ItemInstance> = { armor, name };
    update((d) => updateGearItem(d, index, patch));
    setEditingGearIndex(null);
  }

  return (
    <Panel title="Gear & Inventory" step="viii" storageKey="panel:Gear" defaultCollapsed={false}>
      {/* Wealth (issue #16) — always tracked, unlike encumbrance. */}
      <div className="wealth-row">
        <span className="eyebrow">Wealth</span>
        <div className="wealth-fields">
          {MONEY_FIELDS.map(({ field, label }) => (
            <label key={field} className="field wealth-field">
              <span>{label}</span>
              <NumberField
                className="num"
                size={5}
                value={money[field] ?? 0}
                min={0}
                max={9999999}
                commitOnChange
                onCommit={(n) => update((d) => setMoney(d, field, n))}
                aria-label={`${label} (coins)`}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Load readout (issue #16) — only meaningful when the optional
          encumbrance rule is enabled in Settings; otherwise no UI at all. */}
      {encumbrance && (
        <div className={`load-row load-${encumbrance.tier}`}>
          <span className="eyebrow">Load</span>
          <div className="load-summary">
            <span className="load-weight num">{encumbrance.totalWeight} lb</span>
            <span className="load-thresholds hint">
              light ≤{encumbrance.thresholds.light} · medium ≤{encumbrance.thresholds.medium} ·
              heavy ≤{encumbrance.thresholds.heavy}
            </span>
            <span className={`chip display-only load-tier-badge load-tier-${encumbrance.tier}`}>
              {encumbrance.tier[0]!.toUpperCase()}
              {encumbrance.tier.slice(1)} load
            </span>
          </div>
          {encumbrance.tier !== "light" && (
            <p className="hint load-penalty-note">
              Max Dex +{encumbrance.maxDexCap} to AC · ACP {encumbrance.acp} · land speed reduced
            </p>
          )}
        </div>
      )}

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
              (inst.armor
                ? `${inst.armor.slot === "shield" ? "Shield" : "Armor"} (${inst.armor.ac} AC)`
                : "Unknown item");
            const changes = itemDef?.changes ?? [];
            const unitWeight = gearUnitWeight(inst, refData);
            const unitPrice = itemDef?.price ?? inst.price;
            const qty = inst.quantity ?? 1;
            const maxCharges = itemMaxCharges(itemDef);
            const chargesUsed = Math.min(inst.chargesUsed ?? 0, maxCharges ?? Infinity);

            if (editingGearIndex === i && inst.armor) {
              return (
                <div key={i} className="gear-row">
                  <ArmorForm
                    initial={{ armor: inst.armor, name: inst.name ?? "" }}
                    onSave={(armor, name) => handleEditArmor(i, armor, name)}
                    onCancel={() => setEditingGearIndex(null)}
                    saveLabel="Save changes"
                  />
                </div>
              );
            }

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
                  <div className="gear-name">
                    {displayName} {itemDef && <PartialBadge changes={changes} />}
                  </div>
                  {inst.armor && (
                    <div className="gear-meta">
                      AC +{inst.armor.ac}
                      {inst.armor.enhancement ? ` +${inst.armor.enhancement} enh` : ""}
                      {inst.armor.masterwork && !inst.armor.enhancement ? " · masterwork" : ""}
                      {inst.armor.maxDex != null ? ` · max Dex +${inst.armor.maxDex}` : ""}
                      {inst.armor.acp ? ` · ACP ${inst.armor.acp}` : ""}
                      {inst.armor.material ? ` · ${inst.armor.material}` : ""}
                      {abilityNotes(inst.armor.abilities)
                        .map((n) => ` · ${n.note ? `${n.name} (${n.note})` : n.name}`)
                        .join("")}
                    </div>
                  )}
                  {inst.equipped && changes.length > 0 && (
                    <div className="gear-changes">
                      {changes.map((ch, ci) => (
                        <span key={ci} className="gear-change">
                          {changeLabel(ch)}
                        </span>
                      ))}
                    </div>
                  )}
                  {(unitWeight > 0 || unitPrice) && (
                    <div className="gear-meta">
                      {unitWeight > 0 &&
                        (qty > 1
                          ? `${unitWeight * qty} lb (${unitWeight} lb × ${qty})`
                          : `${unitWeight} lb`)}
                      {unitWeight > 0 && unitPrice ? " · " : ""}
                      {unitPrice ? `${unitPrice} gp` : ""}
                    </div>
                  )}
                  {maxCharges != null && (
                    <div className="gear-meta gear-charges">
                      <span>
                        charges: {maxCharges - chargesUsed}/{maxCharges}
                      </span>
                      <NumberField
                        className="num"
                        size={2}
                        value={chargesUsed}
                        min={0}
                        max={maxCharges}
                        commitOnChange
                        onCommit={(n) => update((d) => setGearCharges(d, i, n))}
                        aria-label={`${displayName} charges used`}
                      />
                    </div>
                  )}
                </div>
                <label className="gear-qty" title="Quantity">
                  <span className="hint">qty</span>
                  <NumberField
                    className="num"
                    size={3}
                    value={qty}
                    min={0}
                    max={99999}
                    commitOnChange
                    onCommit={(n) => update((d) => setGearQuantity(d, i, n))}
                    aria-label={`${displayName} quantity`}
                  />
                </label>
                {inst.armor && (
                  <button
                    type="button"
                    className="pick-btn add"
                    onClick={() => {
                      setShowArmorPicker(false);
                      setEditingGearIndex(i);
                    }}
                  >
                    Edit
                  </button>
                )}
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
          <button type="button" className="btn-ghost" onClick={() => setShowItemPicker(true)}>
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
                onClick={() => {
                  setShowItemPicker(false);
                  setItemQuery("");
                }}
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
                      <div className="pname">
                        {item.name} <PartialBadge changes={item.changes} />
                      </div>
                      {item.slot && (
                        <div className="preq">
                          <span>{item.slot}</span>
                          {item.changes.length > 0 && (
                            <span className="ck-met">
                              {item.changes.slice(0, 3).map((ch, i) => (
                                <span key={i}>
                                  {i > 0 ? " · " : ""}
                                  {changeLabel(ch)}
                                </span>
                              ))}
                              {item.changes.length > 3 ? (
                                <span> +{item.changes.length - 3} more</span>
                              ) : null}
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
          <button type="button" className="btn-ghost" onClick={() => setShowArmorPicker(true)}>
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
                <button type="button" className="btn-ghost" onClick={closeArmorPicker}>
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
                        <option key={n} value={n}>
                          +{n}
                        </option>
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
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field enh-field">
                    <span>Masterwork</span>
                    {armorEnhancement > 0 ? (
                      <p
                        className="field-implied compact"
                        title="Implied by the armor's magic enhancement bonus"
                      >
                        implied
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="field-toggle compact"
                        aria-pressed={armorMasterwork}
                        onClick={() => setArmorMasterwork((v) => !v)}
                      >
                        {armorMasterwork ? "Yes" : "No"}
                      </button>
                    )}
                  </label>
                </div>
                {ARMOR_ABILITIES.length > 0 && (
                  <div className="ability-chips">
                    {ARMOR_ABILITIES.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="chip"
                        aria-pressed={armorAbilities.includes(a.id)}
                        title={
                          a.note
                            ? `${a.name} (+${a.bonusEquivalent}) — ${a.note}`
                            : `${a.name} (+${a.bonusEquivalent})`
                        }
                        onClick={() => toggleArmorAbility(a.id)}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="scroll">
                  {filteredArmors.length === 0 ? (
                    <div className="empty">No armor matches.</div>
                  ) : (
                    filteredArmors.map((a) => (
                      <div key={a.id} className="pick-row">
                        <div className="pmain">
                          <div className="pname">
                            {armorEnhancement === 0 && armorMasterwork ? "Masterwork " : ""}
                            {a.name}
                            {armorEnhancement > 0 ? ` +${armorEnhancement}` : ""}
                          </div>
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
              <ArmorForm
                initial={BLANK_ARMOR}
                onSave={handleAddCustomArmor}
                onCancel={closeArmorPicker}
                saveLabel="Add to gear"
              />
            )}
          </div>
        )}
      </div>

      {/* Custom mundane gear (issue #16) — ammo, rations, rope, and anything
          else not in the vendored items pack. Weight/price are entered by
          hand since there's no RefData entry to look them up from. */}
      <div className="gear-add-row">
        {!showCustomGear ? (
          <button type="button" className="btn-ghost" onClick={() => setShowCustomGear(true)}>
            + Add custom gear (ammo, consumables, ...)
          </button>
        ) : (
          <div className="gear-armor-form">
            <div className="gear-armor-head">
              <span className="eyebrow">New Custom Gear</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setShowCustomGear(false);
                  setCustomGear(BLANK_CUSTOM_GEAR);
                }}
              >
                Cancel
              </button>
            </div>
            <div className="gear-armor-grid">
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={customGear.name}
                  placeholder="Arrows"
                  autoFocus
                  onChange={(e) => setCustomGear((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Quantity</span>
                <NumberField
                  value={customGear.quantity}
                  min={0}
                  max={99999}
                  commitOnChange
                  onCommit={(n) => setCustomGear((f) => ({ ...f, quantity: n }))}
                  aria-label="Quantity"
                />
              </label>
              <label className="field">
                <span>Unit weight (lb)</span>
                <input
                  type="number"
                  value={customGear.weight}
                  min={0}
                  step={0.1}
                  onChange={(e) => setCustomGear((f) => ({ ...f, weight: Number(e.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Unit price (gp)</span>
                <input
                  type="number"
                  value={customGear.price}
                  min={0}
                  step={0.01}
                  onChange={(e) => setCustomGear((f) => ({ ...f, price: Number(e.target.value) }))}
                />
              </label>
            </div>
            <button
              type="button"
              className="pick-btn add"
              disabled={!customGear.name.trim()}
              onClick={handleAddCustomGear}
            >
              Add to gear
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}
