import type { Feat } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import { asStringArray, normalizeSources } from "./common.js";
import { parsePrerequisites } from "./prereqs.js";

export function transformFeat(doc: RawDoc): Feat {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const desc = sys.description as Record<string, unknown> | undefined;
  const descValue = typeof desc?.value === "string" ? desc.value : undefined;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("feats", doc._id),
    description: descValue,
    sources: normalizeSources(sys.sources),
    subType: typeof sys.subType === "string" ? sys.subType : undefined,
    tags: asStringArray(sys.tags),
    prerequisites: parsePrerequisites(descValue),
  };
}
