import type { Buff } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  asNumber,
  normalizeChanges,
  normalizeContextNotes,
  normalizeSources,
} from "./common.js";

export function transformBuff(doc: RawDoc): Buff {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const desc = sys.description as Record<string, unknown> | undefined;
  const duration = sys.duration as Record<string, unknown> | undefined;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("buffs", doc._id),
    description: typeof desc?.value === "string" ? desc.value : undefined,
    sources: normalizeSources(sys.sources),
    subType: typeof sys.subType === "string" ? sys.subType : undefined,
    changes: normalizeChanges(sys.changes),
    contextNotes: normalizeContextNotes(sys.contextNotes),
    duration: duration
      ? {
          end: typeof duration.end === "string" ? duration.end : undefined,
          units: typeof duration.units === "string" ? duration.units : undefined,
          value: duration.value == null ? undefined : String(duration.value),
        }
      : undefined,
    level: asNumber(sys.level),
  };
}
