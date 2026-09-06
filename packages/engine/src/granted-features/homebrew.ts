/**
 * GM-authored campaign content, which has no class table to hang off.
 */
import { type GrantedFeaturesContext } from "./shared.js";

/** Homebrew abilities (`build.homebrew.classFeatures`). */
export function collectHomebrewFeatures(ctx: GrantedFeaturesContext): void {
  const { doc, out } = ctx;
  // GM-granted campaign content, so the grant is synthesized here from the
  // authored entry itself. Feeding them through this one funnel is
  // what gets them display (`resolveClassFeatures`), resource pools
  // (`resources.ts`'s `deriveResourcePools`, which reads `uses` off the
  // overlaid `refData.classFeatures` entry), and provenance for free. Their
  // `changes[]` are the one exception — vendored class-feature changes aren't
  // applied generically, so `collect/traits.ts` applies homebrew ones on its own
  // path. The homebrew id doubles as the grant uuid: `hb-`-prefixed ids can
  // never collide with a vendored uuid, so an archetype swap can't target one.
  for (const [id, ability] of Object.entries(doc.build.homebrew?.classFeatures ?? {})) {
    out.push({
      classTag: ability.classTag ?? "",
      level: ability.level,
      grant: {
        level: ability.level,
        uuid: id,
        featureId: id,
        name: ability.name,
        resolved: true,
      },
      origin: { kind: "custom", label: "Custom" },
    });
  }
}
