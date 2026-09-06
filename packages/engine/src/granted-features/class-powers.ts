/**
 * Per-class picks that grant a named power: exploits, arcana, revelations,
 * hexes, discoveries, spirit abilities, tricks, cruelties, and blessings.
 */

import { resolveAlchemistDiscovery } from "../alchemist-discoveries.js";
import { ANTIPALADIN_CRUELTIES } from "../antipaladin-cruelties.js";
import { resolveArcanistExploit } from "../arcanist-exploits.js";
import { resolveMesmeristBoldStare } from "../mesmerist-bold-stares.js";
import { resolveMesmeristTrick } from "../mesmerist-tricks.js";
import { resolveMagusArcanum } from "../magus-arcana.js";
import { ORACLE_REVELATIONS } from "../oracle-revelations.js";
import { resolveWitchHex } from "../witch-hexes.js";
import { resolveGeneralShamanHex } from "../shaman-hexes.js";
import { findShamanHex, SHAMAN_SPIRITS } from "../shaman-spirits.js";
import { type GrantedFeaturesContext } from "./shared.js";

/** Arcanist exploits. */
export function collectArcanistExploits(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Arcanist exploits (vendored catalog overlay) — hand-authored table first,
  // falling back to the vendored catalog via `resolveArcanistExploit` (see
  // arcanist-exploits.ts), gated on actual arcanist levels the same way
  // domain/school/bloodline grants are gated above. A non-arcanist with a
  // stale `arcanistExploits` field gets nothing. Unlike bloodline powers, base
  // exploits carry no individual level gate of their own (the ACG
  // picks-per-level budget lives in `model/arcanistExploits.ts`, not here) —
  // every chosen, recognized exploit id is granted at a flat display level of
  // 1 so it groups with the character's earliest features rather than
  // inventing a fake per-exploit level.
  const arcanistLevel = doc.identity.classes.find((c) => c.tag === "arcanist")?.level ?? 0;
  if (arcanistLevel > 0) {
    for (const exploitId of doc.build.arcanistExploits ?? []) {
      const exploit = resolveArcanistExploit(exploitId, refData);
      if (!exploit) continue;
      out.push({
        classTag: "arcanist",
        level: 1,
        grant: {
          level: 1,
          uuid: `exploit:${exploit.id}`,
          featureId: `exploit:${exploit.id}`,
          name: exploit.name,
          resolved: true,
        },
        origin: { kind: "exploit", label: "Arcanist Exploit" },
        // Exploits have no vendored RefData.classFeatures entry to derive a
        // description from (unlike base class features), so `detail` carries
        // the exploit's own rules summary rather than a terse dice/DC string
        // — otherwise the row would show only a bare name.
        detail: exploit.summary,
        contextNotes: exploit.contextNotes,
      });
    }
  }
}

/** Magus arcana. */
export function collectMagusArcana(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Magus arcana (vendored catalog) — hand-authored table first, falling back
  // to the vendored catalog for a vendored-only pick (see `magus-arcana.ts`'s
  // `resolveMagusArcanum`), gated on actual magus levels the same way arcanist
  // exploits are gated above. A non-magus with a stale `magusArcana` field
  // gets nothing. Like exploits, base arcana carry no individual level gate
  // HERE (the picker's own `minLevel` soft-filters what's offered — see
  // `model/magusArcana.ts`); every chosen, recognized arcana id is granted at
  // a flat display level of 3 (the earliest a magus has any arcana at all) so
  // it groups sensibly rather than inventing a fake per-arcana level.
  const magusLevel = doc.identity.classes.find((c) => c.tag === "magus")?.level ?? 0;
  if (magusLevel > 0) {
    for (const arcanaId of doc.build.magusArcana ?? []) {
      const arcana = resolveMagusArcanum(arcanaId, refData);
      if (!arcana) continue;
      out.push({
        classTag: "magus",
        level: 3,
        grant: {
          level: 3,
          uuid: `arcana:${arcana.id}`,
          featureId: `arcana:${arcana.id}`,
          name: arcana.name,
          resolved: true,
        },
        origin: { kind: "arcana", label: "Magus Arcana" },
        // Arcana have no vendored RefData.classFeatures entry to derive a
        // description from (unlike base class features), so `detail` carries
        // the arcana's own rules summary — otherwise the row would show only
        // a bare name.
        detail: arcana.summary,
        contextNotes: arcana.contextNotes,
      });
    }
  }
}

/** Oracle revelations. */
export function collectOracleRevelations(ctx: GrantedFeaturesContext): void {
  const { doc, out } = ctx;
  // Oracle revelations — hand-authored (see oracle-revelations.ts), gated on
  // actual oracle levels AND a chosen mystery (a revelation id from a
  // DIFFERENT mystery than the one currently selected, or a non-oracle/stale
  // field, is silently skipped — mirrors the "unresolvable id" tolerance every
  // other hand-authored table here uses). Granted at a flat display level of
  // 1, same rationale as exploits/arcana above.
  const oracleLevel = doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
  if (oracleLevel > 0 && doc.build.oracleMystery) {
    for (const revelationId of doc.build.oracleRevelations ?? []) {
      const revelation = ORACLE_REVELATIONS[revelationId];
      if (!revelation || revelation.mysteryTag !== doc.build.oracleMystery) continue;
      out.push({
        classTag: "oracle",
        level: 1,
        grant: {
          level: 1,
          uuid: `revelation:${revelation.id}`,
          featureId: `revelation:${revelation.id}`,
          name: revelation.name,
          resolved: true,
        },
        origin: { kind: "revelation", label: "Revelation" },
        detail: revelation.summary,
        contextNotes: revelation.contextNotes,
      });
    }
  }
}

/** Witch hexes. */
export function collectWitchHexes(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Witch hexes (vendored catalog) — hand-authored table first, falling back
  // to the vendored catalog for a vendored-only pick (see `witch-hexes.ts`'s
  // `resolveWitchHex`), gated on actual witch levels the same way magus arcana
  // is gated above. Unlike revelations, hexes are NOT patron-scoped (a witch's
  // patron only grants bonus spells — see witch-patrons.ts) so every chosen,
  // recognized hex id is granted regardless of `build.witchPatron`. Granted at
  // a flat display level of 1, same rationale as exploits/arcana above.
  const witchLevel = doc.identity.classes.find((c) => c.tag === "witch")?.level ?? 0;
  if (witchLevel > 0) {
    for (const hexId of doc.build.witchHexes ?? []) {
      const hex = resolveWitchHex(hexId, refData);
      if (!hex) continue;
      out.push({
        classTag: "witch",
        level: 1,
        grant: {
          level: 1,
          uuid: `hex:${hex.id}`,
          featureId: `hex:${hex.id}`,
          name: hex.name,
          resolved: true,
        },
        origin: {
          kind: "hex",
          label: hex.tier === "major" ? "Major Hex" : hex.tier === "grand" ? "Grand Hex" : "Hex",
        },
        detail: hex.summary,
        contextNotes: hex.contextNotes,
      });
    }
  }
}

/** Alchemist discoveries. */
export function collectAlchemistDiscoveries(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Alchemist discoveries — hand-authored (see alchemist-discoveries.ts),
  // gated on actual alchemist levels the same way magus arcana is gated above.
  // Granted at a flat display level of 2 (the earliest an alchemist has any
  // discovery at all), same rationale as exploits/arcana above.
  const alchemistLevel = doc.identity.classes.find((c) => c.tag === "alchemist")?.level ?? 0;
  if (alchemistLevel > 0) {
    for (const discoveryId of doc.build.alchemistDiscoveries ?? []) {
      const discovery = resolveAlchemistDiscovery(discoveryId, refData);
      if (!discovery) continue;
      out.push({
        classTag: "alchemist",
        level: 2,
        grant: {
          level: 2,
          uuid: `discovery:${discovery.id}`,
          featureId: `discovery:${discovery.id}`,
          name: discovery.name,
          resolved: true,
        },
        origin: { kind: "discovery", label: "Discovery" },
        detail: discovery.summary,
        contextNotes: discovery.contextNotes,
      });
    }
  }
}

/** Shaman spirit ability and hexes. */
export function collectShamanSpiritPowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Shaman spirit ability + hexes (general-hex catalog) — hand-authored (see
  // shaman-spirits.ts), gated on actual shaman levels AND a chosen spirit,
  // same shape as oracle revelations above. The spirit's own 1st-level Spirit
  // Ability is granted automatically (not a budgeted pick); hexes are either
  // the CURRENT spirit's own hex list (tolerating a leftover pick from a
  // since-abandoned spirit the same way revelations tolerate a stale mystery)
  // or, when a picked id isn't spirit-scoped, the vendored GENERAL shaman-hex
  // catalog (`resolveGeneralShamanHex` — ACG's own spirit-agnostic "Shaman
  // Hexes" table, see `shaman-hexes.ts`), which has no spirit-scoping
  // restriction.
  const shamanLevel = doc.identity.classes.find((c) => c.tag === "shaman")?.level ?? 0;
  if (shamanLevel > 0 && doc.build.shamanSpirit) {
    const spirit = SHAMAN_SPIRITS[doc.build.shamanSpirit];
    if (spirit) {
      out.push({
        classTag: "shaman",
        level: 1,
        grant: {
          level: 1,
          uuid: `spirit:${spirit.tag}:ability`,
          featureId: `spirit:${spirit.tag}:ability`,
          name: spirit.ability.name,
          resolved: true,
        },
        origin: { kind: "spirit", label: `${spirit.name} Spirit` },
        detail: spirit.ability.summary,
      });
      for (const hexId of doc.build.shamanHexes ?? []) {
        const hexDef = findShamanHex(hexId);
        const spiritHexDef = hexDef && hexDef.id.split(":")[0] === spirit.tag ? hexDef : undefined;
        const generalHex = spiritHexDef ? undefined : resolveGeneralShamanHex(hexId, refData);
        if (!spiritHexDef && !generalHex) continue;
        const name = spiritHexDef?.name ?? generalHex!.name;
        const detail = spiritHexDef?.summary ?? generalHex!.summary;
        // `ShamanSpiritHex` (a spirit's own hex list) carries no `contextNotes`
        // field, unlike the general shaman-hex catalog — only the latter has one.
        const contextNotes = generalHex?.contextNotes;
        out.push({
          classTag: "shaman",
          level: 1,
          grant: {
            level: 1,
            uuid: `hex:${hexId}`,
            featureId: `hex:${hexId}`,
            name,
            resolved: true,
          },
          origin: { kind: "hex", label: "Hex" },
          detail,
          contextNotes,
        });
      }
    }
  }
}

/** Mesmerist tricks and bold stares. */
export function collectMesmeristPowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Mesmerist tricks — hand-authored (see mesmerist-tricks.ts), gated on
  // actual mesmerist levels the same way magus arcana is gated above. Granted
  // at a flat display level of 1, same rationale as exploits/arcana above.
  // (Note: "trick" is also `witch`/ `ninja`'s hex/trick-flavored kind
  // terminology elsewhere in this app, but `classTag` disambiguates every
  // origin.kind consumer the same way it already disambiguates "hex" between
  // witch and shaman.)
  const mesmeristLevel = doc.identity.classes.find((c) => c.tag === "mesmerist")?.level ?? 0;
  if (mesmeristLevel > 0) {
    for (const trickId of doc.build.mesmeristTricks ?? []) {
      const trick = resolveMesmeristTrick(trickId, refData);
      if (!trick) continue;
      out.push({
        classTag: "mesmerist",
        level: 1,
        grant: {
          level: 1,
          uuid: `trick:${trick.id}`,
          featureId: `trick:${trick.id}`,
          name: trick.name,
          resolved: true,
        },
        origin: { kind: "trick", label: "Trick" },
        detail: trick.actionNote ? `${trick.actionNote} — ${trick.summary}` : trick.summary,
      });
    }

    // Bold stares — hand-authored (see mesmerist-bold-stares.ts). Each pick
    // also enriches the Hypnotic Stare class feature's own `detail` line — see
    // the "Hypnotic Stare" dispatch in `resolveClassFeatures` below — but is
    // ALSO surfaced here as its own class-feature row (informational), same
    // discoverability posture picked hexes/revelations/tricks get.
    for (const stareId of doc.build.mesmeristBoldStares ?? []) {
      const stare = resolveMesmeristBoldStare(stareId, refData);
      if (!stare) continue;
      out.push({
        classTag: "mesmerist",
        level: 3,
        grant: {
          level: 3,
          uuid: `stare:${stare.id}`,
          featureId: `stare:${stare.id}`,
          name: stare.name,
          resolved: true,
        },
        origin: { kind: "stare", label: "Bold Stare" },
        detail: stare.summary,
      });
    }
  }
}

/** Antipaladin cruelties. */
export function collectAntipaladinCruelties(ctx: GrantedFeaturesContext): void {
  const { doc, out } = ctx;
  // Antipaladin cruelties (B) — hand-authored (see antipaladin-cruelties.ts),
  // gated on actual antipaladin levels the same way alchemist discoveries are
  // gated above. Granted at a flat display level of 3 (the earliest an
  // antipaladin has any cruelty at all), same rationale as
  // discoveries/exploits/arcana above.
  const antipaladinLevel = doc.identity.classes.find((c) => c.tag === "antipaladin")?.level ?? 0;
  if (antipaladinLevel > 0) {
    for (const crueltyId of doc.build.antipaladinCruelties ?? []) {
      const cruelty = ANTIPALADIN_CRUELTIES[crueltyId];
      if (!cruelty) continue;
      out.push({
        classTag: "antipaladin",
        level: 3,
        grant: {
          level: 3,
          uuid: `cruelty:${cruelty.id}`,
          featureId: `cruelty:${cruelty.id}`,
          name: cruelty.name,
          resolved: true,
        },
        origin: { kind: "cruelty", label: "Cruelty" },
        detail: cruelty.summary,
        contextNotes: cruelty.contextNotes,
      });
    }
  }
}

/** Warpriest blessings. */
export function collectWarpriestBlessings(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Warpriest blessings (vendored prose catalog, no hand-authored mechanics
  // table — the ACG "Blessings" class feature's own vendored text already
  // states the uses/day formula and save DC, so nothing here duplicates
  // either). Each chosen blessing grants its minor power at 1st warpriest
  // level and its major power at 10th — real level gates, unlike the flat
  // display level most other hand-authored pick-lists above use, since a
  // blessing's whole point is that split. `refData.classFeatures` carries a
  // registered stub for each power (see `blessingClassFeatures` in the
  // data-pipeline transform), so `resolveClassFeatures` picks up its full
  // prose via `grant.featureId` the same way a domain's granted powers do.
  const warpriestLevel = doc.identity.classes.find((c) => c.tag === "warpriest")?.level ?? 0;
  if (warpriestLevel > 0) {
    for (const blessingId of doc.build.blessings ?? []) {
      const blessing = refData.blessings[blessingId];
      if (!blessing) continue;
      out.push({
        classTag: "warpriest",
        level: 1,
        grant: {
          level: 1,
          uuid: `${blessing.uuid}:minor`,
          featureId: blessing.minorPower.featureId,
          name: blessing.minorPower.name,
          resolved: true,
        },
        origin: { kind: "blessing", label: `${blessing.name} Blessing` },
      });
      if (warpriestLevel >= 10) {
        out.push({
          classTag: "warpriest",
          level: 10,
          grant: {
            level: 10,
            uuid: `${blessing.uuid}:major`,
            featureId: blessing.majorPower.featureId,
            name: blessing.majorPower.name,
            resolved: true,
          },
          origin: { kind: "blessing", label: `${blessing.name} Blessing` },
        });
      }
    }
  }
}
