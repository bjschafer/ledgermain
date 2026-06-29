import type { Item } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  asNumber,
  normalizeChanges,
  normalizeContextNotes,
  normalizeSources,
} from "./common.js";

export function transformItem(doc: RawDoc): Item {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const desc = sys.description as Record<string, unknown> | undefined;
  const aura = sys.aura as Record<string, unknown> | undefined;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("items", doc._id),
    description: typeof desc?.value === "string" ? desc.value : undefined,
    sources: normalizeSources(sys.sources),
    subType: typeof sys.subType === "string" ? sys.subType : undefined,
    slot: typeof sys.slot === "string" ? sys.slot : undefined,
    price: asNumber(sys.price),
    cl: asNumber(sys.cl),
    changes: normalizeChanges(sys.changes),
    contextNotes: normalizeContextNotes(sys.contextNotes),
    aura:
      aura && typeof aura.school === "string"
        ? { school: aura.school }
        : undefined,
  };
}
