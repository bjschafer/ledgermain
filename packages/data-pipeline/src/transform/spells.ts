import type { Spell, SpellAction } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  asNumber,
  asStringArray,
  descriptionValue,
  normalizeSources,
  type UuidResolver,
} from "./common.js";

function numberMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const n = asNumber(v);
      if (n !== undefined) out[k] = n;
    }
  }
  return out;
}

function transformActions(value: unknown): SpellAction[] {
  if (!value || typeof value !== "object") return [];
  const entries = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, unknown>);
  const out: SpellAction[] = [];
  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;
    const save = a.save as Record<string, unknown> | undefined;
    const range = a.range as Record<string, unknown> | undefined;
    const duration = a.duration as Record<string, unknown> | undefined;
    const damage = a.damage as Record<string, unknown> | undefined;
    const parts = Array.isArray(damage?.parts)
      ? (damage!.parts as Record<string, unknown>[]).map((p) => ({
          formula: String(p.formula ?? ""),
          types: asStringArray(p.types),
        }))
      : [];

    out.push({
      id: String(a._id ?? ""),
      name: typeof a.name === "string" ? a.name : undefined,
      actionType: typeof a.actionType === "string" ? a.actionType : undefined,
      save: save
        ? {
            type: typeof save.type === "string" ? save.type : undefined,
            description:
              typeof save.description === "string" ? save.description : undefined,
          }
        : undefined,
      range: range
        ? {
            units: typeof range.units === "string" ? range.units : undefined,
            value: range.value == null ? undefined : String(range.value),
          }
        : undefined,
      area: typeof a.area === "string" ? a.area : undefined,
      duration: duration
        ? {
            units: typeof duration.units === "string" ? duration.units : undefined,
            value: duration.value == null ? undefined : String(duration.value),
          }
        : undefined,
      damage: parts.length > 0 ? { parts } : undefined,
    });
  }
  return out;
}

export function transformSpell(doc: RawDoc, resolveUuid: UuidResolver): Spell {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const components = (sys.components ?? {}) as Record<string, unknown>;
  const learnedAt = (sys.learnedAt ?? {}) as Record<string, unknown>;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("spells", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    level: asNumber(sys.level) ?? 0,
    school: typeof sys.school === "string" ? sys.school : undefined,
    descriptors: asStringArray(sys.descriptors),
    sr: sys.sr === false ? false : sys.sr === true ? true : undefined,
    components: {
      verbal: components.verbal === true ? true : undefined,
      somatic: components.somatic === true ? true : undefined,
      material: components.material === true ? true : undefined,
      focus: components.focus === true ? true : undefined,
      divineFocus: components.divineFocus === true ? true : undefined,
    },
    learnedAt: {
      class: numberMap(learnedAt.class),
      domain: numberMap(learnedAt.domain),
      bloodline: numberMap(learnedAt.bloodline),
      subdomain: numberMap(learnedAt.subdomain),
    },
    actions: transformActions(sys.actions),
  };
}
