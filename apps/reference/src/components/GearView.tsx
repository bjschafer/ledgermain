import type { ArmorRef, Item, WeaponRef } from "@pf1/schema";

import {
  formatCrit,
  formatPrice,
  formatWeight,
  proficiencyLabel,
  schoolName,
  signed,
} from "../shared/format.js";
import { Description, Row, Sources } from "./parts.js";

/** Weapons carry no description upstream — the stat block IS the entry. */
export function WeaponView({ weapon }: { weapon: WeaponRef }) {
  return (
    <>
      <p className="detail-sub">
        {[proficiencyLabel(weapon.proficiency), weapon.category].filter(Boolean).join(" · ")}
      </p>
      <div className="rows">
        <Row label="Damage">{weapon.damageDice}</Row>
        <Row label="Critical">{formatCrit(weapon.critRange, weapon.critMult)}</Row>
        <Row label="Type">{weapon.weaponSubtype}</Row>
        <Row label="Groups">{weapon.weaponGroups?.join(", ")}</Row>
        <Row label="Base type">{weapon.baseTypes?.join(", ")}</Row>
        <Row label="Price">{formatPrice(weapon.price)}</Row>
        <Row label="Weight">{formatWeight(weapon.weight)}</Row>
      </div>
      <Sources sources={weapon.sources} />
    </>
  );
}

/** Armor and shields, likewise description-free upstream. */
export function ArmorView({ armor }: { armor: ArmorRef }) {
  return (
    <>
      <p className="detail-sub">
        {[armor.slot === "shield" ? "shield" : "armor", proficiencyLabel(armor.proficiency)]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="rows">
        <Row label="AC bonus">{signed(armor.ac)}</Row>
        <Row label="Max Dex">{armor.maxDex !== undefined ? signed(armor.maxDex) : null}</Row>
        <Row label="Check penalty">{armor.acp ? signed(-armor.acp) : null}</Row>
        <Row label="Spell failure">{armor.asf ? `${armor.asf}%` : null}</Row>
        <Row label="Base type">{armor.baseTypes?.join(", ")}</Row>
        <Row label="Price">{formatPrice(armor.price)}</Row>
        <Row label="Weight">{formatWeight(armor.weight)}</Row>
      </div>
      <Sources sources={armor.sources} />
    </>
  );
}

export function ItemView({ item }: { item: Item }) {
  // Magic is inferred, not declared: the vendored `subType` has no "magic"
  // value, so an aura and/or a caster level is the only signal there is.
  const magic = item.aura !== undefined || item.cl !== undefined;
  return (
    <>
      <p className="detail-sub">
        {[item.subType, item.slot, magic ? "magic" : null].filter(Boolean).join(" · ")}
      </p>
      <div className="rows">
        <Row label="Price">{formatPrice(item.price)}</Row>
        <Row label="Weight">{formatWeight(item.weight)}</Row>
        <Row label="Slot">{item.slot}</Row>
        <Row label="Caster level">{item.cl !== undefined ? `${item.cl}` : null}</Row>
        <Row label="Aura">{schoolName(item.aura?.school)}</Row>
        <Row label="Contains">{item.contents?.map((c) => c.name).join(", ")}</Row>
      </div>
      <Description html={item.description} />
      <Sources sources={item.sources} />
    </>
  );
}
