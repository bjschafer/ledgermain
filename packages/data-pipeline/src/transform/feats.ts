import type { Feat } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import { asStringArray, descriptionValue, normalizeSources, type UuidResolver } from "./common.js";
import { parsePrerequisites } from "./prereqs.js";

export function transformFeat(doc: RawDoc, resolveUuid: UuidResolver): Feat {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const desc = sys.description as Record<string, unknown> | undefined;
  // Prereq parsing needs the raw `@UUID[...]{Name}` markup to detect feat
  // refs (see prereqs.ts's extractFeatRefs) — resolve it to plain text only
  // for the description shown to the user, after prereqs are parsed.
  const rawDescValue = typeof desc?.value === "string" ? desc.value : undefined;

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("feats", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    subType: typeof sys.subType === "string" ? sys.subType : undefined,
    tags: asStringArray(sys.tags),
    prerequisites: parsePrerequisites(rawDescValue, resolveUuid),
  };
}
