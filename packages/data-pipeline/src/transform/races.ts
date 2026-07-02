import type { Race, SizeId } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  asStringArray,
  descriptionValue,
  normalizeChanges,
  normalizeContextNotes,
  normalizeSources,
  type UuidResolver,
} from "./common.js";

export function transformRace(doc: RawDoc, resolveUuid: UuidResolver): Race {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const speedsRaw = (sys.speeds ?? {}) as Record<string, unknown>;
  const speeds: Record<string, number> = {};
  for (const [mode, val] of Object.entries(speedsRaw)) {
    if (typeof val === "number") speeds[mode] = val;
  }

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("races", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    size: (typeof sys.size === "string" ? sys.size : "med") as SizeId,
    speeds,
    languages: asStringArray(sys.languages),
    creatureTypes: asStringArray(sys.creatureTypes),
    creatureSubtypes: asStringArray(sys.creatureSubtypes),
    changes: normalizeChanges(sys.changes),
    contextNotes: normalizeContextNotes(sys.contextNotes, resolveUuid),
  };
}
