import type { Race, SizeId } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  asStringArray,
  normalizeChanges,
  normalizeContextNotes,
  normalizeSources,
} from "./common.js";

export function transformRace(doc: RawDoc): Race {
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
    description:
      typeof (sys.description as Record<string, unknown>)?.value === "string"
        ? ((sys.description as Record<string, unknown>).value as string)
        : undefined,
    sources: normalizeSources(sys.sources),
    size: (typeof sys.size === "string" ? sys.size : "med") as SizeId,
    speeds,
    languages: asStringArray(sys.languages),
    creatureTypes: asStringArray(sys.creatureTypes),
    creatureSubtypes: asStringArray(sys.creatureSubtypes),
    changes: normalizeChanges(sys.changes),
    contextNotes: normalizeContextNotes(sys.contextNotes),
  };
}
