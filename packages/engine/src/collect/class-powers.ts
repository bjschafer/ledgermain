/**
 * Per-class power picks that resolve through a vendored catalog plus a
 * hand-authored effect table.
 */
import type { Change } from "@pf1/schema";

import { resolveAlchemistDiscovery } from "../alchemist-discoveries.js";
import { ARCANIST_EXPLOITS } from "../arcanist-exploits.js";
import { resolveMagusArcanum } from "../magus-arcana.js";
import { ORACLE_CURSES } from "../oracle-curses.js";
import { ORACLE_REVELATIONS } from "../oracle-revelations.js";
import { resolveGeneralShamanHex } from "../shaman-hexes.js";
import {
  findShamanHex,
  SHAMAN_GREATER_SPIRIT_LEVEL,
  SHAMAN_MANIFESTATION_LEVEL,
  SHAMAN_SPIRITS,
  SHAMAN_TRUE_SPIRIT_LEVEL,
  type ShamanSpiritAbility,
} from "../shaman-spirits.js";
import { resolveWitchHex } from "../witch-hexes.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Arcanist exploits (build choice). */
export function collectArcanistExploits(ctx: CollectContext): void {
  const { doc, rollData, out, gateOpen } = ctx;
  // Exploit ids are hand-authored clean-room content (not in the vendored
  // Foundry data pack — see `@pf1/engine` `arcanist-exploits.ts`), same
  // posture as `traits.ts` above. Gated on the character actually having
  // arcanist levels (a non-arcanist with a stale `arcanistExploits` field
  // gets nothing). Every base exploit is `displayOnly` with `changes: []`
  // today (see that file's doc comment), so this loop currently contributes
  // no numeric modifiers — it's wired the same way traits/bloodline powers
  // are so a future exploit with a real unconditional Change works for free.
  const arcanistLevel = doc.identity.classes.find((c) => c.tag === "arcanist")?.level ?? 0;
  if (arcanistLevel > 0) {
    for (const exploitId of doc.build.arcanistExploits ?? []) {
      const exploit = ARCANIST_EXPLOITS[exploitId];
      if (!exploit) continue;
      for (const ch of exploit.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          exploit.name,
          exploit.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}

/** Magus arcana (build choice, vendored catalog). */
export function collectMagusArcana(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  // Arcana ids resolve through the hand-authored table first, falling back
  // to the vendored catalog (`RefData.magusArcana`) for a vendored-only pick
  // — see `@pf1/engine` `magus-arcana.ts`'s `resolveMagusArcanum`. Gated on
  // the character actually having magus levels. Every base arcana is
  // `displayOnly` with `changes: []` today (see that file's doc comment), so
  // this loop currently contributes no numeric modifiers — wired the same
  // way for a future arcana with a real unconditional Change to work for
  // free.
  const magusLevel = doc.identity.classes.find((c) => c.tag === "magus")?.level ?? 0;
  if (magusLevel > 0) {
    for (const arcanaId of doc.build.magusArcana ?? []) {
      const arcana = resolveMagusArcanum(arcanaId, refData);
      if (!arcana) continue;
      for (const ch of arcana.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          arcana.name,
          arcana.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}

/** Oracle revelations (build choice). */
export function collectOracleRevelations(ctx: CollectContext): void {
  const { doc, rollData, out, gateOpen } = ctx;
  // Most revelations are `displayOnly` with `changes: []`, but a promoted
  // handful carry real changes and three carry choose-one `choiceChanges`
  // (see `oracle-revelations.ts`'s doc comment) — scoped to the character's
  // chosen mystery.
  const oracleLevelForRevelations =
    doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
  if (oracleLevelForRevelations > 0 && doc.build.oracleMystery) {
    for (const revelationId of doc.build.oracleRevelations ?? []) {
      const revelation = ORACLE_REVELATIONS[revelationId];
      if (!revelation || revelation.mysteryTag !== doc.build.oracleMystery) continue;
      // Choose-one revelations: the pick lives under the revelation's own
      // key, or — for the Dragon mystery's associated element
      // (`choiceFromMystery`) — under the MYSTERY's key, since RAW makes
      // that choice when the mystery is selected. No stored pick, or a
      // stale option id, emits nothing (same safe default as rage powers).
      let choiceChanges: readonly Change[] = [];
      if (revelation.choiceChanges) {
        const key = revelation.choiceFromMystery
          ? `oracleMystery:${revelation.mysteryTag}`
          : `oracleRevelation:${revelation.id}`;
        const picked = doc.build.pickChoices?.[key];
        choiceChanges = (picked && revelation.choiceChanges[picked]) || [];
      }
      for (const ch of [...revelation.changes, ...choiceChanges]) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          revelation.name,
          revelation.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}

/** Witch hexes (build choice, vendored catalog). */
export function collectWitchHexes(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  // Hex ids resolve through the hand-authored table first, falling back to
  // the vendored catalog (`RefData.hexes`) for a vendored-only pick — see
  // `@pf1/engine` `witch-hexes.ts`'s `resolveWitchHex`. Gated on the
  // character actually having witch levels. Nearly every hex is `displayOnly`
  // with `changes: []` — only the handful whose benefit is unconditional and
  // lands on the witch's own sheet carries a real Change (see that file's doc
  // comment for the bar and the deferred near-misses).
  const witchLevel = doc.identity.classes.find((c) => c.tag === "witch")?.level ?? 0;
  if (witchLevel > 0) {
    for (const hexId of doc.build.witchHexes ?? []) {
      const hex = resolveWitchHex(hexId, refData);
      if (!hex) continue;
      for (const ch of hex.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          hex.name,
          hex.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}

/** Shaman hexes (build choice, general catalog). */
export function collectShamanHexes(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  // Hex ids may be spirit-scoped (`<spiritTag>:<name>` — `findShamanHex`,
  // hand-authored in `shaman-spirits.ts`) or drawn from the vendored,
  // spirit-agnostic GENERAL catalog (`resolveGeneralShamanHex`,
  // `shaman-hexes.ts`). A spirit-scoped hex's `changes[]` only applies while
  // it belongs to the CURRENTLY chosen spirit — same "tolerate but don't
  // apply a leftover pick from an abandoned spirit" rule
  // `collectGrantedFeatures` (archetypes.ts) already uses for display,
  // extended to numbers so switching away from a spirit silently drops any
  // Change its hexes granted rather than leaving it stuck on. Almost every
  // spirit hex is `displayOnly` with `changes: []` (see `shaman-spirits.ts`'s
  // doc comment) — one promotion exists (Flame's Cinder Dance, a flat
  // landSpeed bump) — and every general hex is `displayOnly` with `changes:
  // []` today (see `shaman-hexes.ts`'s doc comment) — wired the same way for
  // a future entry with a real unconditional/buff-gated Change to work for
  // free.
  const shamanLevel = doc.identity.classes.find((c) => c.tag === "shaman")?.level ?? 0;
  if (shamanLevel > 0) {
    const currentSpiritTag = doc.build.shamanSpirit;
    for (const hexId of doc.build.shamanHexes ?? []) {
      const spiritHex = findShamanHex(hexId);
      if (spiritHex) {
        if (hexId.split(":")[0] !== currentSpiritTag) continue;
        for (const ch of spiritHex.changes) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            spiritHex.name,
            spiritHex.id,
            out,
            ch.operator,
            ch.saveCategories,
            ch.maneuverCategories,
            ch.acCategories,
          );
        }
        continue;
      }
      const hex = resolveGeneralShamanHex(hexId, refData);
      if (!hex) continue;
      for (const ch of hex.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          hex.name,
          hex.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }

    // Greater/True Spirit Ability + Manifestation — gained at fixed shaman
    // class-level thresholds (`SHAMAN_GREATER_
    // SPIRIT_LEVEL`/`SHAMAN_TRUE_SPIRIT_LEVEL`/`SHAMAN_MANIFESTATION_LEVEL`,
    // verified against aonprd.com's Shaman class page), not a budgeted pick,
    // so there's no id list to iterate — just the current spirit's own three
    // tiers, each independently gated on the shaman having actually reached
    // that level. Most tiers are `changes: []` (see `shaman- spirits.ts`'s doc
    // comment); wired the same way for a future promotion to work for free.
    const currentSpirit = currentSpiritTag ? SHAMAN_SPIRITS[currentSpiritTag] : undefined;
    if (currentSpirit) {
      const tiers: [ShamanSpiritAbility, number, string][] = [
        [currentSpirit.greaterAbility, SHAMAN_GREATER_SPIRIT_LEVEL, "greater"],
        [currentSpirit.trueAbility, SHAMAN_TRUE_SPIRIT_LEVEL, "true"],
        [currentSpirit.manifestation, SHAMAN_MANIFESTATION_LEVEL, "manifestation"],
      ];
      for (const [ability, minLevel, tierId] of tiers) {
        if (shamanLevel < minLevel) continue;
        for (const ch of ability.changes ?? []) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            ability.name,
            `spirit:${currentSpirit.tag}:${tierId}`,
            out,
            ch.operator,
            ch.saveCategories,
            ch.maneuverCategories,
            ch.acCategories,
          );
        }
      }
    }
  }
}

/** Alchemist discoveries (build choice). */
export function collectAlchemistDiscoveries(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  // Discovery ids are hand-authored clean-room content (not in the vendored
  // Foundry data pack — see `@pf1/engine` `alchemist-discoveries.ts`), same
  // posture as magus arcana above. Gated on the character actually having
  // alchemist levels. Every discovery is `displayOnly` with `changes: []`
  // today (see that file's doc comment), so this loop currently contributes
  // no numeric modifiers — wired the same way for a future discovery with a
  // real unconditional Change to work for free.
  const alchemistLevel = doc.identity.classes.find((c) => c.tag === "alchemist")?.level ?? 0;
  if (alchemistLevel > 0) {
    for (const discoveryId of doc.build.alchemistDiscoveries ?? []) {
      const discovery = resolveAlchemistDiscovery(discoveryId, refData);
      if (!discovery) continue;
      for (const ch of discovery.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          discovery.name,
          discovery.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}

/** Oracle's curse (build choice). */
export function collectOracleCurse(ctx: CollectContext): void {
  const { doc, rollData, out, gateOpen } = ctx;
  // Curse ids are hand-authored clean-room content (not linked from the
  // vendored Oracle class def — see `@pf1/engine` `oracle-curses.ts`), same
  // posture as arcanist exploits above. Gated on the character actually
  // having oracle levels (a non-oracle with a stale `oracleCurse` field gets
  // nothing). Most base curses are `changes: []` (situational tiered
  // benefits, contextNotes only); only Wasting (-4 Cha-based skills) and Lame
  // (variable landSpeed penalty) carry a real unconditional Change today.
  const oracleLevel = doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
  if (oracleLevel > 0 && doc.build.oracleCurse) {
    const curse = ORACLE_CURSES[doc.build.oracleCurse];
    if (curse) {
      for (const ch of curse.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          curse.name,
          `curse:${curse.tag}`,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}
