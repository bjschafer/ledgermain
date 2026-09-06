/**
 * Base-class feature grants: what a class's own level table hands out,
 * before any chosen option adds to it.
 */
import { classByTag } from "../refdata-index.js";
import { type GrantedFeaturesContext } from "./shared.js";

/** Each class's own level-gated feature grants. */
export function collectBaseClassFeatures(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  for (const cls of doc.identity.classes) {
    const classDef = classByTag(refData, cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      out.push({ classTag: cls.tag, level: grant.level, grant });
    }
  }
}
