import type { Trait } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  asStringArray,
  descriptionValue,
  normalizeChanges,
  normalizeContextNotes,
  normalizeSources,
  normalizeUses,
  type UuidResolver,
} from "./common.js";

/**
 * Transforms one `pf-traits` YAML doc (`type: feat`, `system.subType: trait`)
 * into a {@link Trait}. Same document shape as `transformFeat` — traits and
 * feats are both Foundry `feat` items, distinguished only by `subType` — so
 * this reuses the same `common.ts` normalizers; the one difference is
 * `traitType` (traits' category) in place of feats' prerequisite parsing
 * (traits carry no structured prerequisites worth parsing: their "Requirements"
 * prose is almost always an in-game faction/campaign gate, not a PF1 rules
 * prerequisite).
 */
export function transformTrait(doc: RawDoc, resolveUuid: UuidResolver): Trait {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("traits", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    traitType: typeof sys.traitType === "string" ? sys.traitType : "campaign",
    tags: asStringArray(sys.tags),
    changes: normalizeChanges(sys.changes),
    contextNotes: normalizeContextNotes(sys.contextNotes, resolveUuid),
    uses: normalizeUses(sys.uses),
  };
}
