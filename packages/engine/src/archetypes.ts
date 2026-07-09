/**
 * Resolve a character's granted base-class features and any archetype swaps
 * layered on top: which base feature is struck through, which archetype
 * feature replaced it (or, when the dataset couldn't pair a slot
 * unambiguously, a prose-only soft warning instead of a swap), and — for the
 * hand-verified slice in `archetype-effects.ts` (issue #7) or the
 * machine-extracted slice in `archetype-effects-extracted.ts` (issue #45) —
 * the archetype feature's own mechanical `detail` summary. The vendored
 * archetype dataset itself carries no numeric effects (see `packages/schema/
 * src/refdata.ts` `ArchetypeFeature` doc comment); any numbers shown here
 * come from `resolveArchetypeFeatureEffect` (`archetype-effects-resolve.ts`),
 * never the dataset.
 */

import type {
  AbilityId,
  CharacterDoc,
  ClassFeatureGrant,
  DerivedArchetype,
  DerivedArchetypeFeature,
  DerivedClassFeature,
  RefData,
} from "@pf1/schema";

import { ALCHEMIST_DISCOVERIES } from "./alchemist-discoveries.js";
import { ANTIPALADIN_CRUELTIES } from "./antipaladin-cruelties.js";
import { ARCANIST_EXPLOITS } from "./arcanist-exploits.js";
import { resolveArchetypeFeatureEffect } from "./archetype-effects-resolve.js";
import { BLOODLINES, type BloodlineResourcePool } from "./bloodlines.js";
import { BLOODRAGER_BLOODLINES } from "./bloodrager-bloodlines.js";
import { MAGUS_ARCANA } from "./magus-arcana.js";
import { NINJA_TRICKS } from "./ninja-tricks.js";
import { MONK_KI_POWERS } from "./monk-ki-powers.js";
import { MONK_STYLE_STRIKES } from "./monk-style-strikes.js";
import { ORACLE_REVELATIONS } from "./oracle-revelations.js";
import { RAGE_POWERS } from "./rage-powers.js";
import { ROGUE_TALENTS } from "./rogue-talents.js";
import { WITCH_HEXES } from "./witch-hexes.js";
import { findShamanHex, SHAMAN_SPIRITS } from "./shaman-spirits.js";
import { INVESTIGATOR_TALENTS } from "./investigator-talents.js";
import { VIGILANTE_SOCIAL_TALENTS, VIGILANTE_TALENTS } from "./vigilante-talents.js";
import { SHIFTER_ASPECTS } from "./shifter-aspects.js";
import {
  sneakAttackDice,
  smiteEvilDetail,
  smiteEvilLabel,
  smiteGoodLabel,
  unarmedDamageDie,
  flurryOfBlowsLabel,
  barbarianDamageReduction,
  flurryOfBlowsUnchainedLabel,
  painfulStareLabel,
  hypnoticStareLabel,
  kineticBlastDetail,
  fiendishBoonLabel,
  studiedCombatLabel,
  studiedStrikeDice,
  hiddenStrikeDice,
  shifterClawsLabel,
} from "./tables.js";
import type { AbilityView } from "./rolldata.js";

export interface ResolvedClassFeatures {
  classFeatures: DerivedClassFeature[];
  activeArchetypes: DerivedArchetype[];
}

/** A single class-feature grant the character qualifies for, with its granting context. */
export interface GrantedFeature {
  classTag: string;
  level: number;
  grant: ClassFeatureGrant;
  /** Set when this grant came from a chosen domain/school/bloodline/exploit/arcana/revelation/hex/discovery/spirit/cruelty/trick/ki power/style strike/rogue talent rather than the class itself. */
  origin?: {
    kind:
      | "domain"
      | "school"
      | "bloodline"
      | "exploit"
      | "arcana"
      | "revelation"
      | "hex"
      | "discovery"
      | "spirit"
      | "cruelty"
      | "trick"
      | "ragePower"
      | "kiPower"
      | "styleStrike"
      | "rogueTalent"
      | "investigatorTalent"
      | "vigilanteSocialTalent"
      | "vigilanteTalent"
      | "shifterAspect";
    label: string;
  };
  /**
   * Pre-computed display detail for grants with no vendored `RefData.classFeatures`
   * entry to look up (bloodline powers — see `bloodlines.ts`; hand-authored, not in
   * the vendored pack). `undefined` for domain/school/base-class grants, which
   * `resolveClassFeatures` derives `detail` for itself (or leaves undefined).
   */
  detail?: string;
  /**
   * Pre-computed uses/day pool for grants with no vendored `uses.maxFormula` to
   * read (bloodline powers). `deriveResourcePools` uses this directly instead of
   * looking up `refData.classFeatures[grant.featureId]` when set.
   */
  resourcePool?: BloodlineResourcePool;
}

/**
 * Every class-feature grant a character currently qualifies for: base-class
 * features (gated by that class's level) plus any granted by a chosen cleric
 * domain or wizard arcane school (gated by the granting class's level — a
 * domain power scales off cleric level, a school power off wizard level).
 * Shared by `resolveClassFeatures` (display) and `deriveResourcePools`
 * (uses/day tracking) so both stay in sync automatically.
 */
export function collectGrantedFeatures(doc: CharacterDoc, refData: RefData): GrantedFeature[] {
  const out: GrantedFeature[] = [];

  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      out.push({ classTag: cls.tag, level: grant.level, grant });
    }
  }

  const clericLevel = doc.identity.classes.find((c) => c.tag === "cleric")?.level ?? 0;
  if (clericLevel > 0) {
    for (const tag of doc.build.clericDomains ?? []) {
      const domain = Object.values(refData.domains).find((d) => d.tag === tag);
      if (!domain) continue;
      for (const grant of domain.features) {
        if (grant.level > clericLevel || !grant.resolved) continue;
        out.push({
          classTag: "cleric",
          level: grant.level,
          grant,
          origin: { kind: "domain", label: domain.name },
        });
      }
    }
  }

  const wizardLevel = doc.identity.classes.find((c) => c.tag === "wizard")?.level ?? 0;
  if (wizardLevel > 0) {
    // `build.wizardSchool` undefined means Universalist (back-compat — see
    // `WizardSchoolTag` doc comment in @pf1/schema): a Universalist still gets
    // Hand of the Apprentice / Metamagic Mastery, just no bonus spell slot.
    const schoolTag = doc.build.wizardSchool ?? "uni";
    const school = Object.values(refData.wizardSchools).find((s) => s.tag === schoolTag);
    if (school) {
      for (const grant of school.features) {
        if (grant.level > wizardLevel || !grant.resolved) continue;
        out.push({
          classTag: "wizard",
          level: grant.level,
          grant,
          origin: { kind: "school", label: school.name },
        });
      }
    }
  }

  // Sorcerer bloodline powers (issue #34) — hand-authored (see bloodlines.ts),
  // gated on actual sorcerer levels the same way domain/school grants are
  // gated on cleric/wizard levels above. A non-sorcerer with a stale
  // `sorcererBloodline` field (or an unresolvable bloodline tag) gets nothing.
  const sorcererLevel = doc.identity.classes.find((c) => c.tag === "sorcerer")?.level ?? 0;
  if (sorcererLevel > 0 && doc.build.sorcererBloodline) {
    const bloodline = BLOODLINES[doc.build.sorcererBloodline];
    if (bloodline) {
      for (const power of bloodline.powers) {
        if (power.level > sorcererLevel) continue;
        out.push({
          classTag: "sorcerer",
          level: power.level,
          grant: {
            level: power.level,
            uuid: `bloodline:${bloodline.tag}:${power.id}`,
            featureId: `bloodline:${bloodline.tag}:${power.id}`,
            name: power.name,
            resolved: true,
          },
          origin: { kind: "bloodline", label: `${bloodline.name} Bloodline` },
          detail: power.resourcePool?.detail,
          resourcePool: power.resourcePool,
        });
      }
    }
  }

  // Bloodrager bloodline powers (issue #65) — hand-authored (see
  // bloodrager-bloodlines.ts), gated on actual bloodrager levels the same way
  // sorcerer bloodline powers are gated above (each power at its own
  // 1st/4th/8th/12th/16th/20th level gate). A non-bloodrager with a stale
  // `bloodragerBloodline` field (or an unresolvable bloodline tag) gets
  // nothing.
  const bloodragerLevel = doc.identity.classes.find((c) => c.tag === "bloodrager")?.level ?? 0;
  if (bloodragerLevel > 0 && doc.build.bloodragerBloodline) {
    const bloodline = BLOODRAGER_BLOODLINES[doc.build.bloodragerBloodline];
    if (bloodline) {
      for (const power of bloodline.powers) {
        if (power.level > bloodragerLevel) continue;
        out.push({
          classTag: "bloodrager",
          level: power.level,
          grant: {
            level: power.level,
            uuid: `bloodragerBloodline:${bloodline.tag}:${power.id}`,
            featureId: `bloodragerBloodline:${bloodline.tag}:${power.id}`,
            name: power.name,
            resolved: true,
          },
          origin: { kind: "bloodline", label: `${bloodline.name} Bloodline` },
          detail: power.resourcePool?.detail,
          resourcePool: power.resourcePool,
        });
      }
    }
  }

  // Arcanist exploits (issue #42) — hand-authored (see arcanist-exploits.ts),
  // gated on actual arcanist levels the same way domain/school/bloodline
  // grants are gated above. A non-arcanist with a stale `arcanistExploits`
  // field gets nothing. Unlike bloodline powers, base exploits carry no
  // individual level gate of their own (the ACG picks-per-level budget lives
  // in `model/arcanistExploits.ts`, not here) — every chosen, recognized
  // exploit id is granted at a flat display level of 1 so it groups with the
  // character's earliest features rather than inventing a fake per-exploit
  // level.
  const arcanistLevel = doc.identity.classes.find((c) => c.tag === "arcanist")?.level ?? 0;
  if (arcanistLevel > 0) {
    for (const exploitId of doc.build.arcanistExploits ?? []) {
      const exploit = ARCANIST_EXPLOITS[exploitId];
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
      });
    }
  }

  // Magus arcana (issue #61) — hand-authored (see magus-arcana.ts), gated on
  // actual magus levels the same way arcanist exploits are gated above. A
  // non-magus with a stale `magusArcana` field gets nothing. Like exploits,
  // base arcana carry no individual level gate HERE (the picker's own
  // `minLevel` soft-filters what's offered — see `model/magusArcana.ts`);
  // every chosen, recognized arcana id is granted at a flat display level of
  // 3 (the earliest a magus has any arcana at all) so it groups sensibly
  // rather than inventing a fake per-arcana level.
  const magusLevel = doc.identity.classes.find((c) => c.tag === "magus")?.level ?? 0;
  if (magusLevel > 0) {
    for (const arcanaId of doc.build.magusArcana ?? []) {
      const arcana = MAGUS_ARCANA[arcanaId];
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
      });
    }
  }

  // Oracle revelations (issue #61) — hand-authored (see
  // oracle-revelations.ts), gated on actual oracle levels AND a chosen
  // mystery (a revelation id from a DIFFERENT mystery than the one currently
  // selected, or a non-oracle/stale field, is silently skipped — mirrors the
  // "unresolvable id" tolerance every other hand-authored table here uses).
  // Granted at a flat display level of 1, same rationale as exploits/arcana
  // above.
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
      });
    }
  }

  // Witch hexes (issue #65) — hand-authored (see witch-hexes.ts), gated on
  // actual witch levels the same way magus arcana is gated above. Unlike
  // revelations, hexes are NOT patron-scoped (a witch's patron only grants
  // bonus spells — see witch-patrons.ts) so every chosen, recognized hex id
  // is granted regardless of `build.witchPatron`. Granted at a flat display
  // level of 1, same rationale as exploits/arcana above.
  const witchLevel = doc.identity.classes.find((c) => c.tag === "witch")?.level ?? 0;
  if (witchLevel > 0) {
    for (const hexId of doc.build.witchHexes ?? []) {
      const hex = WITCH_HEXES[hexId];
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
        origin: { kind: "hex", label: "Hex" },
        detail: hex.summary,
      });
    }
  }

  // Alchemist discoveries (issue #65) — hand-authored (see
  // alchemist-discoveries.ts), gated on actual alchemist levels the same way
  // magus arcana is gated above. Granted at a flat display level of 2 (the
  // earliest an alchemist has any discovery at all), same rationale as
  // exploits/arcana above.
  const alchemistLevel = doc.identity.classes.find((c) => c.tag === "alchemist")?.level ?? 0;
  if (alchemistLevel > 0) {
    for (const discoveryId of doc.build.alchemistDiscoveries ?? []) {
      const discovery = ALCHEMIST_DISCOVERIES[discoveryId];
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
      });
    }
  }

  // Barbarian rage powers (issue #65/#67) — hand-authored (see
  // rage-powers.ts), gated on actual barbarian levels (either edition — see
  // `RAGE_POWERS`'s doc comment for why chained/barbarianUnchained share one
  // table). Granted at a flat display level of 2 (the earliest a barbarian
  // has any rage power at all), same rationale as exploits/arcana above.
  // `classTag` uses whichever of the two the character actually has (falling
  // back to "barbarian" if — unusually — both are present, matching
  // `defenses.ts`'s barbarianLevel() summing posture: display attribution to
  // one tag is cosmetic only, the pick itself isn't scoped per edition).
  const barbarianClassTag = doc.identity.classes.find(
    (c) => c.tag === "barbarian" || c.tag === "barbarianUnchained",
  )?.tag;
  if (barbarianClassTag) {
    for (const powerId of doc.build.ragePowers ?? []) {
      const power = RAGE_POWERS[powerId];
      if (!power) continue;
      out.push({
        classTag: barbarianClassTag,
        level: 2,
        grant: {
          level: 2,
          uuid: `ragePower:${power.id}`,
          featureId: `ragePower:${power.id}`,
          name: power.name,
          resolved: true,
        },
        origin: { kind: "ragePower", label: "Rage Power" },
        detail: power.summary,
      });
    }
  }

  // Monk (Unchained) ki powers + style strikes (issue #65) — hand-authored
  // (see monk-ki-powers.ts/monk-style-strikes.ts), gated on actual
  // monkUnchained levels the same way alchemist discoveries is gated above.
  // Granted at a flat display level of 4 (ki powers)/5 (style strikes) — the
  // earliest level each subsystem has any picks at all — same rationale as
  // exploits/arcana above.
  const monkUnchainedLevel =
    doc.identity.classes.find((c) => c.tag === "monkUnchained")?.level ?? 0;
  if (monkUnchainedLevel > 0) {
    for (const powerId of doc.build.monkKiPowers ?? []) {
      const power = MONK_KI_POWERS[powerId];
      if (!power) continue;
      out.push({
        classTag: "monkUnchained",
        level: 4,
        grant: {
          level: 4,
          uuid: `kiPower:${power.id}`,
          featureId: `kiPower:${power.id}`,
          name: power.name,
          resolved: true,
        },
        origin: { kind: "kiPower", label: "Ki Power" },
        detail: power.summary,
      });
    }
    for (const strikeId of doc.build.monkStyleStrikes ?? []) {
      const strike = MONK_STYLE_STRIKES[strikeId];
      if (!strike) continue;
      out.push({
        classTag: "monkUnchained",
        level: 5,
        grant: {
          level: 5,
          uuid: `styleStrike:${strike.id}`,
          featureId: `styleStrike:${strike.id}`,
          name: strike.name,
          resolved: true,
        },
        origin: { kind: "styleStrike", label: "Style Strike" },
        detail: strike.summary,
      });
    }
  }

  // Rogue talents (issue #65) — hand-authored (see rogue-talents.ts), SHARED
  // between the chained rogue and Rogue (Unchained) (`build.rogueTalents`);
  // gated on whichever of the two classes the character actually has,
  // matching that class's own tag/level for display (a character with both,
  // unusual but not illegal, is credited under "rogue"). Granted at a flat
  // display level of 2, the earliest either class has any talent picks at
  // all, same rationale as exploits/arcana above.
  const rogueClass = doc.identity.classes.find(
    (c) => c.tag === "rogue" || c.tag === "rogueUnchained",
  );
  if (rogueClass && rogueClass.level > 0) {
    for (const talentId of doc.build.rogueTalents ?? []) {
      const talent = ROGUE_TALENTS[talentId];
      if (!talent) continue;
      out.push({
        classTag: rogueClass.tag,
        level: 2,
        grant: {
          level: 2,
          uuid: `rogueTalent:${talent.id}`,
          featureId: `rogueTalent:${talent.id}`,
          name: talent.name,
          resolved: true,
        },
        origin: { kind: "rogueTalent", label: "Rogue Talent" },
        detail: talent.summary,
      });
    }
  }

  // Shaman spirit ability + hexes (issue #65) — hand-authored (see
  // shaman-spirits.ts), gated on actual shaman levels AND a chosen spirit,
  // same shape as oracle revelations above. The spirit's own 1st-level
  // Spirit Ability is granted automatically (not a budgeted pick); hexes are
  // filtered to the CURRENT spirit's own hex list, tolerating a leftover
  // pick from a since-abandoned spirit the same way revelations tolerate a
  // stale mystery.
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
        if (!hexDef || hexDef.id.split(":")[0] !== spirit.tag) continue;
        out.push({
          classTag: "shaman",
          level: 1,
          grant: {
            level: 1,
            uuid: `hex:${hexDef.id}`,
            featureId: `hex:${hexDef.id}`,
            name: hexDef.name,
            resolved: true,
          },
          origin: { kind: "hex", label: "Hex" },
          detail: hexDef.summary,
        });
      }
    }
  }

  // Antipaladin cruelties (issue #65 wave B) — hand-authored (see
  // antipaladin-cruelties.ts), gated on actual antipaladin levels the same
  // way alchemist discoveries are gated above. Granted at a flat display
  // level of 3 (the earliest an antipaladin has any cruelty at all), same
  // rationale as discoveries/exploits/arcana above.
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
      });
    }
  }

  // Ninja tricks (issue #65 wave B) — hand-authored (see ninja-tricks.ts),
  // gated on actual ninja levels the same way alchemist discoveries are
  // gated above. Granted at a flat display level of 2 (the earliest a ninja
  // has any trick at all), same rationale as discoveries/exploits/arcana
  // above.
  const ninjaLevel = doc.identity.classes.find((c) => c.tag === "ninja")?.level ?? 0;
  if (ninjaLevel > 0) {
    for (const trickId of doc.build.ninjaTricks ?? []) {
      const trick = NINJA_TRICKS[trickId];
      if (!trick) continue;
      out.push({
        classTag: "ninja",
        level: 2,
        grant: {
          level: 2,
          uuid: `trick:${trick.id}`,
          featureId: `trick:${trick.id}`,
          name: trick.name,
          resolved: true,
        },
        origin: { kind: "trick", label: "Ninja Trick" },
        detail: trick.summary,
      });
    }
  }

  // Investigator talents (issue #65) — hand-authored (see
  // investigator-talents.ts), gated on actual investigator levels the same
  // way alchemist discoveries are gated above. Granted at a flat display
  // level of 3 (the earliest an investigator has any talent at all), same
  // rationale as exploits/arcana above.
  const investigatorLevel = doc.identity.classes.find((c) => c.tag === "investigator")?.level ?? 0;
  if (investigatorLevel > 0) {
    for (const talentId of doc.build.investigatorTalents ?? []) {
      const talent = INVESTIGATOR_TALENTS[talentId];
      if (!talent) continue;
      out.push({
        classTag: "investigator",
        level: 3,
        grant: {
          level: 3,
          uuid: `investigatorTalent:${talent.id}`,
          featureId: `investigatorTalent:${talent.id}`,
          name: talent.name,
          resolved: true,
        },
        origin: { kind: "investigatorTalent", label: "Investigator Talent" },
        detail: talent.summary,
      });
    }
  }

  // Vigilante social + vigilante talents (issue #65) — hand-authored (see
  // vigilante-talents.ts), gated on actual vigilante levels. Two
  // independent pools (PF1 RAW grants them from two different class
  // features — see `build.vigilanteSocialTalents`/`vigilanteTalents`' doc
  // comments), granted at flat display levels of 1 and 2 respectively (the
  // earliest each pool has any pick at all).
  const vigilanteLevel = doc.identity.classes.find((c) => c.tag === "vigilante")?.level ?? 0;
  if (vigilanteLevel > 0) {
    for (const talentId of doc.build.vigilanteSocialTalents ?? []) {
      const talent = VIGILANTE_SOCIAL_TALENTS[talentId];
      if (!talent) continue;
      out.push({
        classTag: "vigilante",
        level: 1,
        grant: {
          level: 1,
          uuid: `vigilanteSocialTalent:${talent.id}`,
          featureId: `vigilanteSocialTalent:${talent.id}`,
          name: talent.name,
          resolved: true,
        },
        origin: { kind: "vigilanteSocialTalent", label: "Social Talent" },
        detail: talent.summary,
      });
    }
    for (const talentId of doc.build.vigilanteTalents ?? []) {
      const talent = VIGILANTE_TALENTS[talentId];
      if (!talent) continue;
      out.push({
        classTag: "vigilante",
        level: 2,
        grant: {
          level: 2,
          uuid: `vigilanteTalent:${talent.id}`,
          featureId: `vigilanteTalent:${talent.id}`,
          name: talent.name,
          resolved: true,
        },
        origin: { kind: "vigilanteTalent", label: "Vigilante Talent" },
        detail: talent.summary,
      });
    }
  }

  // Shifter aspects (issue #65) — hand-authored (see shifter-aspects.ts),
  // gated on actual shifter levels. Granted at a flat display level of 1
  // (the earliest a shifter has any aspect at all), same rationale as
  // exploits/arcana above. Whether the minor form is currently toggled ON
  // (`live.activeBuffs`) is separate live-session state, not reflected here
  // — this list is "aspects known", matching every other build-time pick.
  const shifterLevel = doc.identity.classes.find((c) => c.tag === "shifter")?.level ?? 0;
  if (shifterLevel > 0) {
    for (const aspectId of doc.build.shifterAspects ?? []) {
      const aspect = SHIFTER_ASPECTS[aspectId];
      if (!aspect) continue;
      out.push({
        classTag: "shifter",
        level: 1,
        grant: {
          level: 1,
          uuid: `shifterAspect:${aspect.id}`,
          featureId: `shifterAspect:${aspect.id}`,
          name: aspect.name,
          resolved: true,
        },
        origin: { kind: "shifterAspect", label: "Aspect" },
        detail: aspect.summary,
      });
    }
  }

  return out;
}

/**
 * uuid of every base-class-feature grant currently swapped out by an active
 * archetype (gated by the character's CURRENT level in the granting class,
 * unlike {@link archetypeSwappedUuids} which ignores level and is used for
 * pre-pick conflict detection instead) -> the archetype feature name that
 * replaces it. Shared by `resolveClassFeatures` (struck-through display) and
 * `collectModifiers` (so a swapped-out base feature's `changes[]` — e.g. Armor
 * Training's `mDexA`/`acpA`, Diamond Soul's `spellResist` — stop contributing
 * the moment the swap actually takes effect; see `collect.ts`'s "granted
 * class features" section, and the issue #7 audit that found this WAS a real
 * bug prior to this function existing: `collectModifiers` iterated
 * `classDef.features` with no awareness of `doc.build.archetypes` at all).
 */
export function activeArchetypeSwaps(doc: CharacterDoc, refData: RefData): Map<string, string> {
  const replacedByUuid = new Map<string, string>();
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;
    for (const f of Object.values(refData.archetypeFeatures)) {
      if (f.archetypeId !== archetypeId || f.level > clsLevel) continue;
      const targetUuid = resolvedSwapTargetUuid(f);
      if (targetUuid) replacedByUuid.set(targetUuid, f.name);
      for (const extraUuid of additionalSwapTargetUuids(f)) {
        replacedByUuid.set(extraUuid, f.name);
      }
    }
  }
  return replacedByUuid;
}

/**
 * Archetype feature ids whose vendored `pairedBaseFeatureUuid` is a data bug:
 * the feature's own rules text is purely ADDITIVE ("adds X to the list...
 * regardless of the style chosen"), so honoring the pairing would suppress the
 * entire base feature with nothing backfilled. Hand-verified against the
 * published rules; the #45 extraction waves' classification audits cite each.
 */
const MISPAIRED_ADDITIVE_FEATURES: ReadonlySet<string> = new Set([
  // Adds Monstrous Mount to the combat-style bonus-feat list; vendored data
  // pairs it to Combat Style Feat's base uuid, which zeroed the ranger's
  // whole bonus-feat progression.
  "ranger:sable-company-marine:hippogriff-companion:2",
]);

/**
 * Archetype feature ids whose vendored `pairedBaseFeatureUuid` points at the
 * WRONG base feature entirely (not merely "additive" like
 * {@link MISPAIRED_ADDITIVE_FEATURES} above) -> the CORRECT base-feature uuid
 * to suppress instead, or `null` when the feature's real replacement target
 * has no numeric `Change` of its own to point at (handled by a separate
 * hand-authored mechanism — see the entry's comment).
 *
 * Issue #46: Fighter's Brawler archetype. The vendored CSV-pairing script
 * appears to have matched each Brawler feature to the base FIGHTER feature at
 * the SAME class level, rather than by the feature's own "replaces ..."
 * prose — all three mispairings below land on a same-level fighter feature
 * that has nothing to do with what the Brawler feature actually replaces.
 * Verified against the published archetype text (d20pfsrd Brawler, matches
 * the vendored `description` field verbatim):
 *   - Close Control (2nd): "This ability replaces armor training 1." Vendored
 *     pairing points at Bravery (fighter's OWN level-2 feature) instead of
 *     Armor Training.
 *   - Close Combatant (3rd): "This ability replaces weapon training 1 and 2."
 *     Vendored pairing points at Armor Training (fighter's level-3 feature)
 *     instead of Weapon Training — the mispairing issue #46 was filed for.
 *     Weapon Training's own `changes[]` is empty upstream (its per-group
 *     bonus is hand-authored in `collect.ts`, gated on `weaponTrainingReplaced`
 *     / `WEAPON_TRAINING_REPLACEMENTS` below — NOT on this pairing), so
 *     there's no numeric double-suppression risk in remapping this to Weapon
 *     Training's uuid; it only fixes the classFeatures display (Weapon
 *     Training now shows struck through by Close Combatant instead of Armor
 *     Training).
 *   - Menacing Stance (7th): "This ability replaces armor training 2, 3, and
 *     4 and armor mastery." Vendored pairing points at "Armor Training (Heavy
 *     Armor)" (fighter's OWN level-7 feature, `changes: []`, purely a
 *     move-at-full-speed-in-heavy-armor rider) instead of the base Armor
 *     Training feature that actually carries the `mDexA`/`acpA` progression.
 *     Remapped to Armor Training's uuid, joining Close Control (tier 1) to
 *     suppress the rest of the atomic mDexA/acpA formula — together they
 *     cover the entire progression with no partial-tier gap: Close Control
 *     alone (levels 2–6) already suppresses the *whole* formula safely,
 *     because the formula's value at those levels IS exactly tier 1's value
 *     (`clamp(floor((unlevel+1)/4), 0, 4)` == 1 for levels 3–6, its only
 *     nonzero value below level 7); Menacing Stance then keeps it suppressed
 *     from level 7 on. "Armor Training (Heavy Armor)" itself is left alone
 *     (not remapped to anything) since it isn't named in Menacing Stance's
 *     replacement text and carries no numbers either way.
 */
const MISPAIRED_TARGET_REMAP: ReadonlyMap<string, string | null> = new Map([
  [
    "fighter:brawler:close-control:2",
    "Compendium.pf1.class-abilities.Item.5JFfSqLMCpbRmERa", // Armor Training
  ],
  [
    "fighter:brawler:close-combatant:3",
    "Compendium.pf1.class-abilities.Item.RzEzudurxQFirFoF", // Weapon Training
  ],
  [
    "fighter:brawler:menacing-stance:7",
    "Compendium.pf1.class-abilities.Item.5JFfSqLMCpbRmERa", // Armor Training
  ],
  // Issue #72: druid:feral-child's Native Cunning (3rd) prose says "This
  // ability replaces wild shape", but the vendored pairing links Trackless
  // Step — the same level-matching CSV quirk as the brawler entries above
  // (Native Cunning is a L3 row; Trackless Step is the druid's own L3
  // feature). Trackless Step's suppression isn't lost by remapping: the
  // sibling row `druid:feral-child:favored-terrain:3` ("replaces trackless
  // step and a thousand faces") already correctly claims it. Wild Shape
  // carries `changes: []` (prose + a `uses.maxFormula` pool only), so this is
  // a classFeatures display fix; the pool still derives because
  // `deriveResourcePools` doesn't consult archetype swaps for ANY feature —
  // a pre-existing engine-wide posture, not per-entry harm introduced here.
  [
    "druid:feral-child:native-cunning:3",
    "Compendium.pf1.class-abilities.Item.sJdBOE9lwz5XAkUi", // Wild Shape
  ],
]);

/**
 * Archetype feature ids that are themselves data-quality artifacts — a
 * vendored row whose description is a byte-identical, unmodified copy of
 * some OTHER ability's text (never the archetype's own real ability at that
 * level), yet still carries a `pairedBaseFeatureUuid` from the same
 * level-matching CSV compilation quirk that produced `MISPAIRED_TARGET_REMAP`
 * above. Unlike the additive case ({@link MISPAIRED_ADDITIVE_FEATURES}) or a
 * wrong-but-real-target case ({@link MISPAIRED_TARGET_REMAP}), these rows
 * shouldn't suppress ANY base feature at all — honoring the vendored pairing
 * here strikes through a real, unrelated base feature the archetype never
 * actually touches.
 *
 * Issue #47 (consolidated #45-wave bug list): `monk:maneuver-master:evasion:9`
 * and `monk:nornkith:evasion:9`. Both archetypes already replace base Evasion
 * with their own ability at 2nd level (Resilience / Defensive Aid — each
 * correctly paired to base Evasion's own uuid), then EACH separately carries
 * a level-9 row named "Evasion" whose description is verbatim vanilla
 * base-monk Evasion text (see the classification notes in
 * `archetype-extracted/monk.ts` — flagged there as a suspected shared
 * CSV-compilation quirk). The vendored pairing on that L9 row points at the
 * base class's OWN level-9 feature SLOT, which for a monk is Improved
 * Evasion — not the (already-replaced) Evasion the row's text describes.
 * Before this fix, a Maneuver Master / Nornkith monk at level 9+ incorrectly
 * showed Improved Evasion as struck through ("replaced by Evasion") in the
 * classFeatures list, even though neither archetype's real abilities ever
 * touch it. Verified: Improved Evasion carries no vendored `Change` either
 * way (`class-features.json` id `Cc2eFfhJYlClCGEH`), so this is a
 * display-only fix, not a numeric one.
 */
const SPURIOUS_DUPLICATE_PAIRINGS: ReadonlySet<string> = new Set([
  "monk:maneuver-master:evasion:9",
  "monk:nornkith:evasion:9",
]);

/**
 * Archetype feature ids whose vendored `pairedBaseFeatureUuid` correctly
 * identifies ONE base feature they replace, but whose OWN prose says they
 * replace an additional base feature too — the vendored CSV pairing script
 * only ever links one uuid per row, so a genuinely-two-target replacement
 * can't be captured there. Every consumer of a swap-target set
 * (`activeArchetypeSwaps`, `archetypeSwappedUuids`) also consults this map
 * via {@link additionalSwapTargetUuids}. Only ids with a CONFIRMED prose-only
 * additional target (no vendored `Change` on the extra base feature —
 * checked against `class-features.json` before adding) belong here, so
 * there's no double-suppression numeric risk, matching the discipline
 * `MISPAIRED_TARGET_REMAP` above already applies.
 */
const ADDITIONAL_SWAP_TARGETS: ReadonlyMap<string, readonly string[]> = new Map([
  // Issue #47: magus:myrmidarch's Armor Training (8th) "replaces improved
  // spell combat and greater spell combat" but the vendored pairing links
  // only to Improved Spell Combat. Both base features carry `changes: []`
  // (prose-only class-abilities entries), so this is purely a classFeatures
  // display fix — Greater Spell Combat now correctly shows struck through
  // too, instead of appearing (wrongly) still available to a myrmidarch.
  [
    "magus:myrmidarch:armor-training:8",
    ["Compendium.pf1.class-abilities.Item.nWDMATASYzzAShr6"], // Greater Spell Combat
  ],
]);

/**
 * The base-class-feature uuid `f` actually swaps out, after applying the
 * hand-curated corrections above — `undefined` when the vendored dataset
 * couldn't pair it (prose-only soft warning) or when a correction removes the
 * pairing outright. Shared by every swap-detection consumer in this file so
 * they never disagree with each other about the same underlying data.
 */
function resolvedSwapTargetUuid(f: {
  id: string;
  pairedBaseFeatureUuid?: string;
}): string | undefined {
  if (MISPAIRED_ADDITIVE_FEATURES.has(f.id)) return undefined;
  if (SPURIOUS_DUPLICATE_PAIRINGS.has(f.id)) return undefined;
  if (MISPAIRED_TARGET_REMAP.has(f.id)) return MISPAIRED_TARGET_REMAP.get(f.id) ?? undefined;
  return f.pairedBaseFeatureUuid;
}

/**
 * Extra base-class-feature uuids `f` ALSO swaps out beyond
 * {@link resolvedSwapTargetUuid}'s single primary target — see
 * {@link ADDITIONAL_SWAP_TARGETS}. Empty array when `f` has none.
 */
function additionalSwapTargetUuids(f: { id: string }): readonly string[] {
  return ADDITIONAL_SWAP_TARGETS.get(f.id) ?? [];
}

/**
 * Barbarian archetype ids whose feature at `level` fully replaces the
 * barbarian's Damage Reduction progression via an AMBIGUOUS (unpaired) swap —
 * i.e. one feature that folds in more than one base-feature slot at once, so
 * the CSV pairing script in `data-pipeline` can't link it via
 * `pairedBaseFeatureUuid` the normal 1:1 way. Hand-verified from the
 * published rules (Invulnerable Rager's Invulnerability replaces uncanny
 * dodge, improved uncanny dodge, AND damage reduction in one feature). Used
 * by {@link barbarianDamageReductionReplaced} alongside the normal paired-swap
 * check (which already covers e.g. Savage Barbarian/Wildborn, both clean 1:1
 * swaps of "Damage Reduction").
 */
const AMBIGUOUS_DR_REPLACEMENTS: ReadonlyMap<string, number> = new Map([
  ["barbarian:invulnerable-rager", 2],
  // barbarianUnchained has its own, separate archetype CSV/id namespace (its
  // "Invulnerable Rager" is a distinct RefData.archetypes entry,
  // "barbarianUnchained:invulnerable-rager", NOT the chained one above) —
  // same ambiguous swap shape confirmed against the vendored
  // archetype-features slice (its "Invulnerability" feature at level 2 also
  // carries no `pairedBaseFeatureUuid`).
  ["barbarianUnchained:invulnerable-rager", 2],
]);

/**
 * True when the character's barbarian Damage Reduction — `defenses.ts`'s
 * hardcoded `barbarianDamageReduction` table, not a vendored `Change` (the
 * class feature's `changes[]` is empty upstream) — has been replaced by an
 * active archetype at the character's current barbarian level. `defenses.ts`
 * uses this to skip that hardcoded contribution so it doesn't sit alongside
 * (or silently outrank) the archetype's own `dr`/`nac`-target effect from
 * `archetype-effects.ts`.
 *
 * `barbLevel` sums chained ("barbarian") and Unchained ("barbarianUnchained")
 * levels — a character would realistically only ever have one of the two,
 * but summing (rather than picking one tag) keeps this correct regardless of
 * which variant is actually on the sheet, same posture as `defenses.ts`'s own
 * `barbarianLevel` helper.
 */
export function barbarianDamageReductionReplaced(doc: CharacterDoc, refData: RefData): boolean {
  const barbLevel = doc.identity.classes
    .filter((c) => c.tag === "barbarian" || c.tag === "barbarianUnchained")
    .reduce((sum, c) => sum + c.level, 0);
  if (barbLevel < 2) return false;

  const barbClass = Object.values(refData.classes).find((c) => c.tag === "barbarian");
  const drGrantUuid = barbClass?.features.find((f) => f.name === "Damage Reduction")?.uuid;
  if (drGrantUuid && activeArchetypeSwaps(doc, refData).has(drGrantUuid)) return true;

  for (const archetypeId of doc.build.archetypes ?? []) {
    const gateLevel = AMBIGUOUS_DR_REPLACEMENTS.get(archetypeId);
    if (gateLevel !== undefined && barbLevel >= gateLevel) return true;
  }
  return false;
}

/**
 * True when the character's antipaladin Damage Reduction (Aura of Depravity,
 * 17th level — `defenses.ts`'s hardcoded `antipaladinDamageReduction` table,
 * not a vendored `Change`; see that function's doc comment) has been
 * replaced by an active archetype at the character's current antipaladin
 * level. Found via an audit of the vendored antipaladin archetype slice
 * (issue #65 wave B): Insinuator's "Aura of Indomitability" (17th level)
 * carries a `pairedBaseFeatureUuid` pointing at Aura of Depravity's uuid — a
 * clean 1:1 swap, same shape as `barbarianDamageReductionReplaced`'s common
 * case (no ambiguous unpaired antipaladin DR swap was found, so there's no
 * antipaladin equivalent of `AMBIGUOUS_DR_REPLACEMENTS` needed here).
 * Unlike Aura of Depravity, no vendored antipaladin archetype feature was
 * found replacing Unholy Champion (20th level) — its DR bump is left
 * unconditional.
 */
export function antipaladinDamageReductionReplaced(doc: CharacterDoc, refData: RefData): boolean {
  const antipaladinLevel = doc.identity.classes.find((c) => c.tag === "antipaladin")?.level ?? 0;
  if (antipaladinLevel < 17) return false;

  const antipaladinClass = Object.values(refData.classes).find((c) => c.tag === "antipaladin");
  const drGrantUuid = antipaladinClass?.features.find((f) => f.name === "Aura of Depravity")?.uuid;
  return !!drGrantUuid && activeArchetypeSwaps(doc, refData).has(drGrantUuid);
}

/**
 * Fighter archetype ids whose OWN feature meaningfully takes over some or all
 * of the base Weapon Training mechanism — a fixed or restricted group, a
 * different cadence, or an unmodeled condition — that `archetype-extracted/
 * fighter.ts` already covers (fully or partially) with its own `Change`.
 * `weaponTrainingReplaced` uses this hand-curated set, NOT the generic
 * `pairedBaseFeatureUuid`/`activeArchetypeSwaps` swap-detection every other
 * suppression check in this file uses (`barbarianDamageReductionReplaced`
 * above): Foundry's vendored data pairs nearly EVERY fighter archetype's
 * "Weapon Training"-slot feature to the base uuid, including ones that are
 * byte-identical unmodified reflavors (Aerial Assaulter, Pack Mule, Rondelero
 * Duelist, Two-Weapon Warrior) or purely additive (Warlord adds one more
 * selectable group without restricting the normal free choice) — the generic
 * swap mechanism is too broad for this specific feature (unlike Armor
 * Training/Damage Reduction, where every real archetype pairing genuinely
 * does replace the mechanic). Suppressing the picker for those non-replacing
 * archetypes would incorrectly zero out an unrelated fighter's weapon
 * training entirely. This set was hand-built from the same prose-reading
 * pass that produced the extracted entries above — see each id's
 * classification entry for the reasoning.
 *
 * `fighter:brawler` is here because its Close Combatant feature genuinely
 * takes over the feature slot, not because of the generic swap check — even
 * with `MISPAIRED_TARGET_REMAP` above correcting Close Combatant's vendored
 * `pairedBaseFeatureUuid` to point at Weapon Training instead of Armor
 * Training (issue #46), the swap check still can't backfill the per-tier
 * `weaponTrainingGroups` picker with Close Combatant's fixed close-weapon-group
 * bonus — that's what this set is for.
 */
const WEAPON_TRAINING_REPLACEMENTS: ReadonlySet<string> = new Set([
  "fighter:archer",
  "fighter:brawler",
  "fighter:crossbowman",
  "fighter:dragoon",
  "fighter:foehammer",
  "fighter:polearm-master",
  "fighter:spear-fighter",
  "fighter:tribal-fighter",
  "fighter:two-handed-fighter",
  "fighter:unarmed-fighter",
  "fighter:ustalavic-duelist",
]);

/**
 * True when the character's base Weapon Training class feature — modeled via
 * `doc.build.weaponTrainingGroups` + `collect.ts`'s per-group bonus
 * derivation, not a vendored `Change` (the feature's `changes[]` is empty
 * upstream) — has been replaced by an active archetype. `collect.ts` uses
 * this to skip that derivation entirely so it never sits alongside (or
 * double-counts against) the archetype's own weapon-group-scoped effect from
 * `archetype-extracted/fighter.ts`. See {@link WEAPON_TRAINING_REPLACEMENTS}
 * for why this doesn't use the generic paired-swap check.
 */
export function weaponTrainingReplaced(doc: CharacterDoc): boolean {
  return (doc.build.archetypes ?? []).some((id) => WEAPON_TRAINING_REPLACEMENTS.has(id));
}

/**
 * "verified" when at least one of `archetypeId`'s features has a
 * hand-authored entry (issue #7) with a real `Change`; "extracted" when none
 * are hand-verified but at least one has a machine-extracted entry (issue
 * #45) with a real `Change`; "none" otherwise. Verified always wins at the
 * archetype level even if only one of several modeled features is verified —
 * matches `resolveArchetypeFeatureEffect`'s per-feature precedence. Used by
 * `ArchetypePicker` to badge which archetypes carry modeled numeric effects,
 * and to distinguish a hand-verified badge from a machine-extracted one so
 * the two are never visually confused. A notes-only entry (`changes: []`,
 * added to surface a `detail` summary — e.g. Scout's Charge, Archaeologist's
 * Luck) does NOT count in either tier: it has no numeric effect to badge.
 */
export type ArchetypeEffectTier = "verified" | "extracted" | "none";

export function archetypeModeledEffectTier(
  refData: RefData,
  archetypeId: string,
): ArchetypeEffectTier {
  let sawExtracted = false;
  for (const f of Object.values(refData.archetypeFeatures)) {
    if (f.archetypeId !== archetypeId) continue;
    const resolved = resolveArchetypeFeatureEffect(f.id);
    if (!resolved || resolved.effect.changes.length === 0) continue;
    if (resolved.source === "verified") return "verified";
    sawExtracted = true;
  }
  return sawExtracted ? "extracted" : "none";
}

/**
 * Back-compat convenience: true for either tier. Prefer
 * {@link archetypeModeledEffectTier} where the UI needs to distinguish them.
 */
export function archetypeHasModeledEffects(refData: RefData, archetypeId: string): boolean {
  return archetypeModeledEffectTier(refData, archetypeId) !== "none";
}

/**
 * `abilities` (from a computed sheet) lets Smite Evil's Cha-keyed detail
 * resolve against final scores; omit it to treat Cha modifier as 0 (matches
 * `deriveResourcePools`'s optional-abilities posture).
 */
export function resolveClassFeatures(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<AbilityId, AbilityView>,
): ResolvedClassFeatures {
  const replacedByUuid = activeArchetypeSwaps(doc, refData);
  const activeArchetypes: DerivedArchetype[] = [];

  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;

    const swappedSlots: Record<number, string> = {};
    const features: DerivedArchetypeFeature[] = [];
    const archetypeFeatures = Object.values(refData.archetypeFeatures)
      .filter((f) => f.archetypeId === archetypeId && f.level <= clsLevel)
      .sort((a, b) => a.level - b.level);

    for (const f of archetypeFeatures) {
      const resolved = resolveArchetypeFeatureEffect(f.id);
      features.push({
        level: f.level,
        name: f.name,
        description: f.description,
        ambiguous: !f.pairedBaseFeatureUuid,
        detail: resolved?.effect.detail?.(clsLevel),
        effectSource: resolved?.effect.detail ? resolved.source : undefined,
      });
      const targetUuid = resolvedSwapTargetUuid(f);
      if (targetUuid) {
        swappedSlots[f.level] = targetUuid;
      }
    }

    activeArchetypes.push({
      id: archetype.id,
      name: archetype.name,
      classTag: archetype.classTag,
      swappedSlots,
      features,
    });
  }

  const classFeatures: DerivedClassFeature[] = [];
  for (const { classTag, grant, origin, detail: providedDetail } of collectGrantedFeatures(
    doc,
    refData,
  )) {
    const classLevel = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
    const replacedBy = replacedByUuid.get(grant.uuid);
    // Sneak Attack's die count, Smite Evil's attack/damage/AC scaling, and
    // Monk's unarmed damage die / Flurry of Blows summary have no vendored
    // tag/changes (Foundry only tags channelEnergy/rage) — matched by
    // name, same posture as feat-effects.ts's name-slug lookup. Domain/school
    // grants never match these class+name pairs, so `detail` stays undefined.
    // Bloodline grants (issue #34) carry a pre-computed `providedDetail`
    // instead (no vendored feature to derive it from) — takes priority.
    // Ninja's Sneak Attack (UC) uses the IDENTICAL progression as rogue's (same
    // `floor((level+1)/2)` d6 table per the SRD) — matched here alongside
    // rogue rather than duplicating `sneakAttackDice`. Antipaladin's Smite Good
    // (APG) is likewise a mirror of paladin's Smite Evil (same math, "vs. good"
    // display suffix via `smiteGoodLabel`).
    let detail: string | undefined = providedDetail;
    if (
      detail === undefined &&
      (classTag === "rogue" || classTag === "ninja") &&
      grant.name === "Sneak Attack"
    ) {
      detail = sneakAttackDice(classLevel).diceLabel;
    } else if (detail === undefined && classTag === "paladin" && grant.name === "Smite Evil") {
      const chaMod = abilities?.cha?.mod ?? 0;
      detail = smiteEvilLabel(smiteEvilDetail(classLevel, chaMod));
    } else if (detail === undefined && classTag === "antipaladin" && grant.name === "Smite Good") {
      const chaMod = abilities?.cha?.mod ?? 0;
      detail = smiteGoodLabel(smiteEvilDetail(classLevel, chaMod));
    } else if (
      detail === undefined &&
      classTag === "antipaladin" &&
      grant.name === "Fiendish Boon"
    ) {
      // Fiendish Boon's own vendored description is a prose-only stub with
      // no numbers (`changes: []`) — same as paladin's own Divine Bond,
      // which today has no hand-authored detail at all. Unlike Divine Bond,
      // this project tracks WHICH form was chosen (`build.antipaladinBoon`)
      // so a summary line is worth showing; see `fiendishBoonLabel`'s doc
      // comment for why the weapon math itself still stays manual.
      detail = fiendishBoonLabel(classLevel, doc.build.antipaladinBoon);
    } else if (detail === undefined && classTag === "monk" && grant.name === "Unarmed Strike") {
      detail = unarmedDamageDie(classLevel).dieLabel;
    } else if (detail === undefined && classTag === "monk" && grant.name === "Flurry of Blows") {
      detail = flurryOfBlowsLabel(classLevel);
    } else if (
      detail === undefined &&
      classTag === "barbarian" &&
      grant.name === "Damage Reduction"
    ) {
      detail = barbarianDamageReduction(classLevel).label;
    } else if (
      detail === undefined &&
      classTag === "barbarianUnchained" &&
      grant.name === "Damage Reduction"
    ) {
      // Shared vendored featureId with chained barbarian's own Damage
      // Reduction (`RENIeTVjWB7Mq6Mw`) — same clean-room progression table.
      detail = barbarianDamageReduction(classLevel).label;
    } else if (
      detail === undefined &&
      classTag === "monkUnchained" &&
      grant.name === "Unarmed Strike"
    ) {
      // Shared vendored featureId with chained monk's own Unarmed Strike
      // (`a4SPdPuOFdmfJdHN`) — same "Table: Monk Unarmed Damage" progression.
      detail = unarmedDamageDie(classLevel).dieLabel;
    } else if (
      detail === undefined &&
      classTag === "monkUnchained" &&
      grant.name === "Flurry of Blows (UC)"
    ) {
      detail = flurryOfBlowsUnchainedLabel(classLevel);
    } else if (
      detail === undefined &&
      classTag === "rogueUnchained" &&
      grant.name === "Sneak Attack (UC)"
    ) {
      detail = sneakAttackDice(classLevel).diceLabel;
    } else if (detail === undefined && classTag === "mesmerist" && grant.name === "Painful Stare") {
      detail = painfulStareLabel(classLevel);
    } else if (
      detail === undefined &&
      classTag === "mesmerist" &&
      grant.name === "Hypnotic Stare"
    ) {
      detail = hypnoticStareLabel(classLevel);
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Physical Kinetic Blast"
    ) {
      // Kinetic Blast dice (Occult Adventures) — display-only summary; the
      // vendored feature's dice-bearing action formula isn't numerically
      // evaluable per the formula-DSL convention. See `kineticBlastDetail`.
      detail = kineticBlastDetail(classLevel, abilities?.con?.mod).physicalLabel;
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Energy Kinetic Blast"
    ) {
      detail = kineticBlastDetail(classLevel, abilities?.con?.mod).energyLabel;
    } else if (
      detail === undefined &&
      classTag === "investigator" &&
      grant.name === "Studied Combat"
    ) {
      // Issue #65: insight bonus to atk/dmg vs. a studied target — see
      // `studiedCombatLabel`'s doc comment (no vendored dice/changes upstream).
      const label = studiedCombatLabel(classLevel);
      if (label) detail = label;
    } else if (
      detail === undefined &&
      classTag === "investigator" &&
      grant.name === "Studied Strike"
    ) {
      detail = studiedStrikeDice(classLevel).diceLabel;
    } else if (
      detail === undefined &&
      classTag === "vigilante" &&
      grant.name === "Vigilante Specialization"
    ) {
      // Issue #65: Avenger gets full BAB (see compute.ts's BAB loop, which
      // reads this same `doc.build.vigilanteSpecialization` field) — no
      // class-feature detail line needed for that half. Stalker gets Hidden
      // Strike, whose dice this surfaces (see `hiddenStrikeDice`'s doc
      // comment — prose-only upstream, same posture as Sneak Attack).
      const spec = doc.build.vigilanteSpecialization;
      if (spec === "avenger") {
        detail = "Avenger: full BAB (= vigilante level)";
      } else if (spec === "stalker") {
        detail = `Stalker: Hidden Strike ${hiddenStrikeDice(classLevel).diceLabel}`;
      }
    } else if (detail === undefined && classTag === "shifter" && grant.name === "Shifter Claws") {
      detail = shifterClawsLabel(classLevel);
    }
    classFeatures.push({
      level: grant.level,
      classTag,
      featureId: grant.featureId,
      name: grant.name,
      applied: !replacedBy,
      replacedBy,
      detail,
      origin,
    });
  }
  classFeatures.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  return { classFeatures, activeArchetypes };
}

/**
 * Every base-class-feature uuid this archetype swaps out (across all its
 * levels, regardless of the character's current level — a swap the character
 * hasn't reached yet still makes taking a second, overlapping archetype
 * pointless once they level up). Used to detect conflicting archetype picks
 * before they're added to `build.archetypes`, since `resolveClassFeatures`
 * itself just applies swaps last-wins and silently drops the earlier one.
 */
export function archetypeSwappedUuids(refData: RefData, archetypeId: string): Set<string> {
  const uuids = new Set<string>();
  for (const f of Object.values(refData.archetypeFeatures)) {
    if (f.archetypeId !== archetypeId) continue;
    const targetUuid = resolvedSwapTargetUuid(f);
    if (targetUuid) uuids.add(targetUuid);
    for (const extraUuid of additionalSwapTargetUuids(f)) {
      uuids.add(extraUuid);
    }
  }
  return uuids;
}
