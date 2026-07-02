import type { Item } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  asNumber,
  descriptionValue,
  normalizeChanges,
  normalizeContextNotes,
  normalizeSources,
  type UuidResolver,
} from "./common.js";

export function transformItem(doc: RawDoc, resolveUuid: UuidResolver): Item {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const aura = sys.aura as Record<string, unknown> | undefined;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("items", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    subType: typeof sys.subType === "string" ? sys.subType : undefined,
    slot: typeof sys.slot === "string" ? sys.slot : undefined,
    price: asNumber(sys.price),
    cl: asNumber(sys.cl),
    changes: normalizeChanges(sys.changes),
    contextNotes: normalizeContextNotes(sys.contextNotes, resolveUuid),
    aura:
      aura && typeof aura.school === "string"
        ? { school: aura.school }
        : undefined,
  };
}
