/**
 * Hand-apply reminders from active sources, projected onto the derived sheet
 * so the stat they modify can show them too. The source rows keep rendering
 * their own copies; this is the same note, not a second one.
 *
 * "Active" mirrors `collect.ts`: a paused/excluded buff contributes nothing, a
 * racial trait only counts for the current race, an equipped item must be
 * equipped, and a swapped-out class feature is skipped. Coverage filtering is
 * the one question this module asks of the promotion tables (`noteCoverage`):
 * a note whose whole benefit is already a structured number on the sheet is
 * dropped rather than repeated as a manual reminder.
 */

import type {
  CharacterDoc,
  ContextNote,
  DerivedClassFeature,
  RefData,
  SituationalNote,
} from "@pf1/schema";

import { isBuffLive } from "./duration.js";
import { featNameSlug } from "./feat-effects.js";
import { resolveFeatEffect } from "./feat-effects-resolve.js";
import { noteCoverage, type NoteCatalog } from "./note-coverage.js";
import { effectiveRaceContextNotes, RACIAL_TRAITS } from "./racial-traits.js";
import { resolveTraitDef } from "./traits.js";

export function collectSituationalNotes(
  doc: CharacterDoc,
  refData: RefData,
  classFeatures: readonly DerivedClassFeature[],
): SituationalNote[] {
  const out: SituationalNote[] = [];
  const seen = new Set<string>();

  const add = (
    notes: readonly ContextNote[] | undefined,
    source: string,
    catalog?: NoteCatalog,
    casterLevel?: number,
  ): void => {
    for (const note of notes ?? []) {
      if (catalog && noteCoverage(catalog, note) === "full") continue;
      const key = `${note.target}\u0000${note.text}\u0000${source}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        target: note.target,
        text: note.text,
        source,
        ...(casterLevel === undefined ? {} : { casterLevel }),
      });
    }
  };

  for (const buff of doc.live.activeBuffs ?? []) {
    if (!isBuffLive(buff) || buff.excludeMaster) continue;
    add(buff.contextNotes, buff.name, { catalog: "buff", buffName: buff.name }, buff.casterLevel);
  }

  const addFeat = (featId: string): void => {
    const feat = refData.feats[featId];
    if (!feat) return;
    const resolved = resolveFeatEffect(featNameSlug(feat.name));
    if (resolved?.entry.type !== "static") return;
    add(resolved.entry.contextNotes, feat.name);
  };
  for (const featId of doc.build.feats ?? []) addFeat(featId);
  for (const instance of doc.build.extraFeats ?? []) addFeat(instance.featId);

  for (const traitId of doc.build.traits ?? []) {
    const trait = resolveTraitDef(traitId, refData) ?? doc.build.homebrew?.traits?.[traitId];
    if (!trait) continue;
    add(trait.contextNotes, trait.name, { catalog: "characterTrait" });
  }

  const race = refData.races[doc.identity.race];
  if (race) {
    const activeRacialTraits = (doc.build.racialTraits ?? [])
      .map((id) => RACIAL_TRAITS[id])
      .filter((t): t is NonNullable<typeof t> => t != null && t.race === race.name);
    const activeVendoredTraits = (doc.build.vendoredRacialTraits ?? [])
      .map((id) => refData.racialTraits[id])
      .filter((t): t is NonNullable<typeof t> => t != null && t.race.includes(race.name));

    add(effectiveRaceContextNotes(race, activeRacialTraits, activeVendoredTraits), race.name, {
      catalog: "race",
      raceName: race.name,
    });
    for (const trait of activeRacialTraits) {
      add(trait.contextNotes, trait.name, { catalog: "racialTrait" });
    }
    for (const trait of activeVendoredTraits) {
      add(trait.contextNotes, trait.name, { catalog: "racialTrait" });
    }
  }

  for (const instance of doc.build.gear ?? []) {
    if (!instance.equipped || !instance.itemId) continue;
    const item = refData.items[instance.itemId];
    if (item) add(item.contextNotes, item.name);
  }

  for (const feature of classFeatures) {
    if (!feature.applied) continue;
    add(feature.contextNotes, feature.name);
  }

  return out;
}
