/**
 * Talent- and power-list picks: rage powers, ki powers and style strikes, and
 * the rogue/ninja/investigator/vigilante/slayer/shifter families.
 */
import { resolveNinjaTrick } from "../ninja-tricks.js";
import { resolveMonkKiPower } from "../monk-ki-powers.js";
import { resolveMonkStyleStrike } from "../monk-style-strikes.js";
import { resolveRagePower } from "../rage-powers.js";
import { resolveRogueTalent } from "../rogue-talents.js";
import { resolveSlayerTalent } from "../slayer-talents.js";
import { resolveInvestigatorTalent } from "../investigator-talents.js";
import { resolveVigilanteSocialTalent, resolveVigilanteTalent } from "../vigilante-talents.js";
import { resolveShifterAspect } from "../shifter-aspects.js";
import { type GrantedFeaturesContext } from "./shared.js";

/** Barbarian rage powers. */
export function collectRagePowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Barbarian rage powers — hand-authored (see rage-powers.ts), gated on
  // actual barbarian levels (either edition — see `RAGE_POWERS`'s doc comment
  // for why chained/barbarianUnchained share one table). Granted at a flat
  // display level of 2 (the earliest a barbarian has any rage power at all),
  // same rationale as exploits/arcana above. `classTag` uses whichever of the
  // two the character actually has (falling back to "barbarian" if — unusually
  // — both are present, matching `defenses.ts`'s barbarianLevel summing
  // posture: display attribution to one tag is cosmetic only, the pick itself
  // isn't scoped per edition).
  const barbarianClassTag = doc.identity.classes.find(
    (c) => c.tag === "barbarian" || c.tag === "barbarianUnchained",
  )?.tag;
  if (barbarianClassTag) {
    for (const powerId of doc.build.ragePowers ?? []) {
      const power = resolveRagePower(powerId, refData);
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
        contextNotes: power.contextNotes,
      });
    }
  }
}

/** Monk (Unchained) ki powers and style strikes. */
export function collectMonkKiPowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Monk (Unchained) ki powers + style strikes — hand-authored (see
  // monk-ki-powers.ts/monk-style-strikes.ts), gated on actual monkUnchained
  // levels the same way alchemist discoveries is gated above. Granted at a
  // flat display level of 4 (ki powers)/5 (style strikes) — the earliest level
  // each subsystem has any picks at all — same rationale as exploits/arcana
  // above.
  const monkUnchainedLevel =
    doc.identity.classes.find((c) => c.tag === "monkUnchained")?.level ?? 0;
  if (monkUnchainedLevel > 0) {
    for (const powerId of doc.build.monkKiPowers ?? []) {
      const power = resolveMonkKiPower(powerId, refData);
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
        contextNotes: power.contextNotes,
      });
    }
    for (const strikeId of doc.build.monkStyleStrikes ?? []) {
      const strike = resolveMonkStyleStrike(strikeId, refData);
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
        contextNotes: strike.contextNotes,
      });
    }
  }
}

/** Rogue talents, shared by both rogue classes. */
export function collectRogueTalents(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Rogue talents — hand-authored (see rogue-talents.ts), SHARED between the
  // chained rogue and Rogue (Unchained) (`build.rogueTalents`); gated on
  // whichever of the two classes the character actually has, matching that
  // class's own tag/level for display (a character with both, unusual but not
  // illegal, is credited under "rogue"). Granted at a flat display level of 2,
  // the earliest either class has any talent picks at all, same rationale as
  // exploits/arcana above.
  const rogueClass = doc.identity.classes.find(
    (c) => c.tag === "rogue" || c.tag === "rogueUnchained",
  );
  if (rogueClass && rogueClass.level > 0) {
    for (const talentId of doc.build.rogueTalents ?? []) {
      const talent = resolveRogueTalent(talentId, refData);
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
        contextNotes: talent.contextNotes,
      });
    }
  }
}

/** Ninja tricks. */
export function collectNinjaTricks(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Ninja tricks (B) — hand-authored (see ninja-tricks.ts), gated on actual
  // ninja levels the same way alchemist discoveries are gated above. Granted
  // at a flat display level of 2 (the earliest a ninja has any trick at all),
  // same rationale as discoveries/exploits/arcana above.
  const ninjaLevel = doc.identity.classes.find((c) => c.tag === "ninja")?.level ?? 0;
  if (ninjaLevel > 0) {
    for (const trickId of doc.build.ninjaTricks ?? []) {
      const trick = resolveNinjaTrick(trickId, refData);
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
        contextNotes: trick.contextNotes,
      });
    }
  }
}

/** Investigator talents. */
export function collectInvestigatorTalents(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Investigator talents (vendored catalog overlay) — hand-authored table
  // first, falling back to the vendored catalog via
  // `resolveInvestigatorTalent` (see investigator-talents.ts), gated on actual
  // investigator levels the same way alchemist discoveries are gated above.
  // Granted at a flat display level of 3 (the earliest an investigator has any
  // talent at all), same rationale as exploits/arcana above.
  const investigatorLevel = doc.identity.classes.find((c) => c.tag === "investigator")?.level ?? 0;
  if (investigatorLevel > 0) {
    for (const talentId of doc.build.investigatorTalents ?? []) {
      const talent = resolveInvestigatorTalent(talentId, refData);
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
        contextNotes: talent.contextNotes,
      });
    }
  }
}

/** Vigilante talents and social talents. */
export function collectVigilanteTalents(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Vigilante social + vigilante talents — hand-authored (see
  // vigilante-talents.ts), gated on actual vigilante levels. Two independent
  // pools (PF1 RAW grants them from two different class features — see
  // `build.vigilanteSocialTalents`/`vigilanteTalents`' doc comments), granted
  // at flat display levels of 1 and 2 respectively (the earliest each pool has
  // any pick at all).
  const vigilanteLevel = doc.identity.classes.find((c) => c.tag === "vigilante")?.level ?? 0;
  if (vigilanteLevel > 0) {
    for (const talentId of doc.build.vigilanteSocialTalents ?? []) {
      const talent = resolveVigilanteSocialTalent(talentId, refData);
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
        contextNotes: talent.contextNotes,
      });
    }
    for (const talentId of doc.build.vigilanteTalents ?? []) {
      const talent = resolveVigilanteTalent(talentId, refData);
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
        contextNotes: talent.contextNotes,
      });
    }
  }
}

/** Slayer talents. */
export function collectSlayerTalents(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Slayer talents (hand-table follow-up) — resolved through
  // `resolveSlayerTalent` (hand-authored table first, vendored catalog
  // fallback — see slayer-talents.ts's doc comment). Gated on actual slayer
  // levels. Granted at a flat display level of 2 (the earliest a slayer has
  // any talent at all), same rationale as discoveries/exploits/arcana above.
  const slayerLevel = doc.identity.classes.find((c) => c.tag === "slayer")?.level ?? 0;
  if (slayerLevel > 0) {
    for (const talentId of doc.build.slayerTalents ?? []) {
      const talent = resolveSlayerTalent(talentId, refData);
      if (!talent) continue;
      out.push({
        classTag: "slayer",
        level: 2,
        grant: {
          level: 2,
          uuid: `slayerTalent:${talent.id}`,
          featureId: `slayerTalent:${talent.id}`,
          name: talent.name,
          resolved: true,
        },
        origin: { kind: "slayerTalent", label: "Slayer Talent" },
        detail: talent.summary,
        contextNotes: talent.contextNotes,
      });
    }
  }
}

/** Shifter aspects. */
export function collectShifterAspects(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Shifter aspects — hand-authored (see shifter-aspects.ts), gated on actual
  // shifter levels. Granted at a flat display level of 1 (the earliest a
  // shifter has any aspect at all), same rationale as exploits/arcana above.
  // Whether the minor form is currently toggled ON (`live.activeBuffs`) is
  // separate live-session state, not reflected here — this list is "aspects
  // known", matching every other build-time pick.
  const shifterLevel = doc.identity.classes.find((c) => c.tag === "shifter")?.level ?? 0;
  if (shifterLevel > 0) {
    for (const aspectId of doc.build.shifterAspects ?? []) {
      const aspect = resolveShifterAspect(aspectId, refData);
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
        contextNotes: aspect.contextNotes,
      });
    }
  }
}
