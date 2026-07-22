/**
 * Clean-room PF1 alchemist discovery table (Advanced Player's Guide +
 * selected Ultimate Magic/Ultimate Combat entries, issue #65): hand-authored
 * from the published rules (verified against the book-scoped legacy AoN
 * mirror pages, which let discoveries be split by exact source book),
 * mirroring `magus-arcana.ts`'s posture — discoveries are NOT part of the
 * vendored Foundry data pack (the Alchemist class def only links the generic
 * "Discovery"/"Grand Discovery" stub `ClassFeature`s, no per-discovery
 * breakdown — confirmed: `class-features.json` carries no per-discovery
 * entries), so there is no upstream JSON to normalize.
 *
 * Scope: the full 29-discovery Advanced Player's Guide "core" list, plus 10
 * Ultimate Magic discoveries and 2 Ultimate Combat discoveries that are
 * either directly relevant to Mutagen (the Cognatogen line — see below) or
 * were specifically worth covering for their honest mechanical shape
 * (Vestigial Arm, Preserve Organs, Tumor Familiar, Wings, Spontaneous
 * Healing, Healing Touch, Lingering Spirit, Nauseating Flesh, Poison
 * Conversion). The remaining ~35 Ultimate Magic/Ultimate Combat discoveries
 * (mostly more bomb-type riders — Blinding Bomb, Confusion Bomb, Bottled
 * Ooze, Alchemical Simulacrum/Zombie, Explosive Missile, ...) are OUT OF
 * SCOPE — add them in a follow-up, same posture as `magus-arcana.ts` scoping
 * down to base Ultimate Magic arcana.
 *
 * Base Mutagen class feature (NOT a discovery — the Alchemist's own 1st-level
 * class feature): +4 alchemical bonus to one chosen physical ability score
 * (Str/Dex/Con), -2 penalty to the linked mental score (Str→Int, Dex→Wis,
 * Con→Cha), +2 natural armor, 10 min/level duration — RAW confirmed. This
 * table does NOT re-model it; see `apps/web`'s `ResourcesPanel`/`resources.ts`
 * `resolveGrantsBuffs`, which already surfaces it as a toggleable buff for
 * free (the vendored Mutagen `ClassFeature`'s `grantsBuffs` UUIDs resolve
 * against 3 real vendored buffs — "Mutagen, Str"/"Mutagen, Dex"/"Mutagen,
 * Con" — audited before writing this file; no new mechanism needed).
 *
 * Cognatogen (Ultimate Magic) is confirmed RAW to share Mutagen's EXACT
 * numeric shape (+4/-2/+2 natural armor, same duration, "only one
 * mutagen-family effect active at a time" rule) but boosts a MENTAL score
 * instead (Int/Wis/Cha) at the cost of the linked physical score, plus 2
 * points of ability damage to the penalized score when it expires. Unlike
 * Mutagen, there is NO vendored buff data to piggyback on at all (checked
 * `buffs.json` for "Cognatogen" — zero hits) — reproducing Mutagen's toggle
 * for it would mean inventing a NEW linking mechanism (discoveries don't
 * ride `deriveResourcePools`'s vendored-`ClassFeature.grantsBuffs` pipeline
 * the way base class features do), which is more than "cheap" at this
 * table's scope. So Cognatogen (and its Greater/Grand upgrades) are
 * `displayOnly: true` here with the exact numbers spelled out in
 * `contextNotes` — deferred with a clear note rather than promising a toggle
 * that doesn't exist, same honesty bar as everything else in this file.
 *
 * Modelling posture (mirrors magus-arcana.ts/oracle-revelations.ts's honesty
 * bar): every discovery here is a bomb-type rider (mutually exclusive with
 * other bomb-type riders per RAW — Paizo's own "don't stack, one per bomb"
 * rule, worth noting but not enforced by this table), an activated/limited-
 * use ability, or a passive prose ability with no flat always-on number this
 * engine's Change system can safely target (e.g. Feral Mutagen's extra
 * natural attacks require a natural-attack builder this engine doesn't have;
 * Precise Bombs' splash-exclusion and Sticky Poison's strike-count aren't
 * sheet stats; Preserve Organs' crit/sneak-negation percentage has no Change
 * target). So EVERY entry here is `displayOnly: true` with `changes: []`; a
 * `contextNotes` reminder carries the mechanic's numbers/prerequisite
 * instead.
 */

import type { AlchemistDiscovery, Change, ContextNote, RefData, SourceRef } from "@pf1/schema";

export interface AlchemistDiscoveryDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /**
   * Earliest alchemist level this discovery can be selected at — 2 (the
   * earliest any discovery is available) unless the source book states a
   * higher minimum. Soft-filtered only (see file doc comment); never blocks
   * selection.
   */
  minLevel: number;
  /** Typed modifiers granted by the discovery (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (bomb-rider exclusivity, prerequisite discovery, activation cost/count, ...). */
  contextNotes?: ContextNote[];
  /** Always true here — no discovery has a flat always-on numeric effect this engine can safely target. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });
const bombRiderNote = note(
  "Bomb-type rider — RAW mutually exclusive with other bomb-type discoveries per bomb thrown.",
);

interface RawDiscovery {
  id: string;
  name: string;
  summary: string;
  minLevel?: number;
  contextNotes?: ContextNote[];
}

function build(entries: RawDiscovery[]): AlchemistDiscoveryDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    summary: e.summary,
    minLevel: e.minLevel ?? 2,
    changes: [],
    contextNotes: e.contextNotes,
    displayOnly: true,
  }));
}

const DISCOVERY_LIST: AlchemistDiscoveryDef[] = build([
  // --- Advanced Player's Guide (29) ------------------------------------
  {
    id: "acidBomb",
    name: "Acid Bomb",
    summary: "Bombs deal acid damage; a direct hit also deals 1d6 acid one round later.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "combineExtracts",
    name: "Combine Extracts",
    minLevel: 8,
    summary: "Combine two prepared extracts into a single dose occupying a slot 2 levels higher.",
    contextNotes: [note("Which two formulae is chosen at preparation time — not tracked here.")],
  },
  {
    id: "concentratePoison",
    name: "Concentrate Poison",
    summary:
      "Merge two doses of the same poison into one stronger dose (+50% frequency duration, +2 save DC).",
  },
  {
    id: "concussiveBomb",
    name: "Concussive Bomb",
    minLevel: 6,
    summary: "Bombs deal sonic damage; a direct hit also deafens the target for 1 minute.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "delayedBomb",
    name: "Delayed Bomb",
    minLevel: 8,
    summary: "A thrown bomb can be set to detonate after a chosen delay of a few rounds.",
  },
  {
    id: "dilution",
    name: "Dilution",
    minLevel: 12,
    summary: "Once per day, split one potion or extract into two weaker doses.",
  },
  {
    id: "dispellingBomb",
    name: "Dispelling Bomb",
    minLevel: 6,
    summary:
      "A bomb triggers a targeted dispel magic against the target instead of dealing damage.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "elixirOfLife",
    name: "Elixir of Life",
    minLevel: 16,
    summary:
      "Once per day, brew an elixir that functions as true resurrection (or a self-only delayed resurrection).",
  },
  {
    id: "enhancePotion",
    name: "Enhance Potion",
    summary:
      "A number of times per day equal to your Intelligence modifier, a potion you drink uses your alchemist level as its caster level.",
    contextNotes: [
      note("Activated, Int-mod uses/day — not wired as a tracked resource pool here."),
    ],
  },
  {
    id: "eternalPotion",
    name: "Eternal Potion",
    minLevel: 16,
    summary: "Make an Extend Potion-affected potion's duration permanent.",
    contextNotes: [note("Requires the Extend Potion discovery.")],
  },
  {
    id: "explosiveBomb",
    name: "Explosive Bomb",
    summary: "Bomb splash radius increases to 10 ft.; a direct hit also sets the target on fire.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "extendPotion",
    name: "Extend Potion",
    summary:
      "A number of times per day equal to your Intelligence modifier, double the duration of a non-instantaneous potion you drink.",
    contextNotes: [
      note("Activated, Int-mod uses/day — not wired as a tracked resource pool here."),
    ],
  },
  {
    id: "fastBombs",
    name: "Fast Bombs",
    minLevel: 8,
    summary:
      "Throw multiple bombs in a single full-round action if your base attack bonus allows extra attacks.",
    contextNotes: [note("Action-economy option only — no numeric sheet effect to model.")],
  },
  {
    id: "feralMutagen",
    name: "Feral Mutagen",
    summary:
      "While a mutagen is active, gain two claw attacks and a bite attack as primary natural attacks at your full base attack bonus, plus +2 on Intimidate checks.",
    contextNotes: [
      note(
        "Natural-attack grant while mutagen active — this engine has no natural-attack builder to wire it into; add the attacks manually.",
      ),
    ],
  },
  {
    id: "forceBomb",
    name: "Force Bomb",
    minLevel: 8,
    summary: "Bombs deal force damage; a direct hit knocks the target prone unless it saves.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "frostBomb",
    name: "Frost Bomb",
    summary:
      "Bombs deal cold damage; a direct hit staggers the target on its next turn unless it saves.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "greaterMutagen",
    name: "Greater Mutagen",
    minLevel: 12,
    summary:
      "Your mutagen instead grants +4 to two chosen physical ability scores and +6 natural armor, with the usual mental penalties.",
    contextNotes: [
      note(
        "Scales the base Mutagen buff's numbers — apply by hand (the toggleable Mutagen buffs surfaced via the resource pool are the base +4/-2/+2 values, not this upgrade).",
      ),
    ],
  },
  {
    id: "grandMutagen",
    name: "Grand Mutagen",
    minLevel: 16,
    summary:
      "Requires Greater Mutagen. Your mutagen instead grants +4/+6/+8 across three chosen physical ability scores and +6 natural armor, with mental penalties to all three linked scores.",
    contextNotes: [
      note(
        "Scales the base Mutagen buff's numbers — apply by hand (the toggleable Mutagen buffs surfaced via the resource pool are the base +4/-2/+2 values, not this upgrade). Requires Greater Mutagen.",
      ),
    ],
  },
  {
    id: "infuseMutagen",
    name: "Infuse Mutagen",
    summary:
      "Costs 2 points of Intelligence damage and 1,000 gp per use. Your mutagen no longer becomes inert when you brew a new one — only the most recently brewed dose applies.",
  },
  {
    id: "infernoBomb",
    name: "Inferno Bomb",
    minLevel: 16,
    summary: "Requires Smoke Bomb. Your smoke-cloud bomb instead functions as incendiary cloud.",
    contextNotes: [bombRiderNote, note("Requires the Smoke Bomb discovery.")],
  },
  {
    id: "infusion",
    name: "Infusion",
    summary:
      "Your extracts remain magical after being set down and can be drunk by someone else; still counts against your daily prepared extracts.",
  },
  {
    id: "madnessBomb",
    name: "Madness Bomb",
    minLevel: 12,
    summary:
      "A direct hit deals 1d4 Wisdom damage, but the bomb's normal damage is reduced by 2d6.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "poisonBomb",
    name: "Poison Bomb",
    minLevel: 12,
    summary: "Requires Smoke Bomb. Your smoke-cloud bomb instead functions as cloudkill.",
    contextNotes: [bombRiderNote, note("Requires the Smoke Bomb discovery.")],
  },
  {
    id: "preciseBombs",
    name: "Precise Bombs",
    summary:
      "Exclude a number of squares equal to your Intelligence modifier from your bombs' splash damage area.",
    contextNotes: [note("Area-exclusion utility — not a sheet stat this engine tracks.")],
  },
  {
    id: "shockBomb",
    name: "Shock Bomb",
    summary: "Bombs deal electricity damage; a direct hit also dazzles the target for 1d4 rounds.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "smokeBomb",
    name: "Smoke Bomb",
    summary: "A bomb creates a fog-cloud-like smoke cloud instead of dealing damage.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "stickyBomb",
    name: "Sticky Bomb",
    minLevel: 10,
    summary:
      "A bomb's effect persists, dealing splash damage again one round after the initial hit.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "stickyPoison",
    name: "Sticky Poison",
    minLevel: 6,
    summary:
      "A poison applied to a weapon remains active for a number of successful strikes equal to your Intelligence modifier, instead of just one.",
  },
  {
    id: "stinkBomb",
    name: "Stink Bomb",
    summary: "Requires Smoke Bomb. Your smoke-cloud bomb instead functions as stinking cloud.",
    contextNotes: [bombRiderNote, note("Requires the Smoke Bomb discovery.")],
  },
  // --- Ultimate Magic (10 selected) ------------------------------------
  {
    id: "cognatogen",
    name: "Cognatogen",
    summary:
      "As Mutagen, but grants +4 alchemical bonus to a chosen MENTAL ability score (Int, Wis, or Cha), -2 to the linked physical score (Int→Str, Wis→Dex, Cha→Con), +2 natural armor, 10 min/level; deals 2 points of ability damage to the penalized score when it expires.",
    contextNotes: [
      note(
        "Same numeric shape as base Mutagen, but no vendored buff exists to toggle it automatically (unlike Mutagen's 3 vendored buffs) — apply the +4/-2/+2 by hand while active.",
      ),
    ],
  },
  {
    id: "greaterCognatogen",
    name: "Greater Cognatogen",
    minLevel: 12,
    summary:
      "Requires Cognatogen. Your cognatogen instead grants +4 to two chosen mental ability scores and +6 natural armor, with the usual physical penalties.",
    contextNotes: [note("Scales Cognatogen's numbers — apply by hand. Requires Cognatogen.")],
  },
  {
    id: "grandCognatogen",
    name: "Grand Cognatogen",
    minLevel: 16,
    summary:
      "Requires Greater Cognatogen. Your cognatogen instead grants +4/+6/+8 across three chosen mental ability scores and +6 natural armor, with physical penalties to all three linked scores.",
    contextNotes: [
      note("Scales Cognatogen's numbers — apply by hand. Requires Greater Cognatogen."),
    ],
  },
  {
    id: "vestigialArm",
    name: "Vestigial Arm",
    summary:
      "Grow an extra fully-functional arm that can wield a weapon (two-weapon-fighting style) or hold an item; can be taken more than once for additional arms.",
    contextNotes: [
      note(
        "Extra manipulator/attack — this engine has no extra-limb attack builder; add manually.",
      ),
    ],
  },
  {
    id: "preserveOrgans",
    name: "Preserve Organs",
    summary:
      "Gain a 25% chance to negate a confirmed critical hit or sneak attack against you (as if immune), rising to 50%/75% if taken up to three times.",
    contextNotes: [
      note(
        "Percentage chance to negate a crit/sneak — no Change target exists for this; track manually.",
      ),
    ],
  },
  {
    id: "tumorFamiliar",
    name: "Tumor Familiar",
    summary:
      "Grow a detachable tumor that functions as a full familiar (with an animal's abilities) whether attached to you or not.",
    contextNotes: [
      note(
        "Reminder: set up the familiar in the Familiar section of the Classes panel — this entry is informational.",
      ),
    ],
  },
  {
    id: "wings",
    name: "Wings",
    minLevel: 6,
    summary:
      "Grow functional wings, granting flight as the fly spell for a pool of minutes per day equal to your alchemist level; can be taken repeatedly to add more minutes/day.",
    contextNotes: [
      note(
        "Limited-use flight pool, not a permanent fly speed — apply manually while active.",
        "speed.fly",
      ),
    ],
  },
  {
    id: "spontaneousHealing",
    name: "Spontaneous Healing",
    summary:
      "As a free action, once per round, heal 5 hit points from a daily pool of 5 hp per 2 alchemist levels; triggers automatically while unconscious if the pool has points remaining.",
    contextNotes: [
      note("Daily healing pool — not wired as a tracked resource pool here; track manually."),
    ],
  },
  {
    id: "healingTouch",
    name: "Healing Touch",
    minLevel: 6,
    summary:
      "Requires Spontaneous Healing. Channel your Spontaneous Healing into another creature via touch, and your daily healing pool doubles to 5 hp per alchemist level.",
    contextNotes: [note("Requires the Spontaneous Healing discovery.")],
  },
  {
    id: "lingeringSpirit",
    name: "Lingering Spirit",
    minLevel: 4,
    summary:
      "Treat your Constitution score as 10 points higher solely for determining how many negative hit points you can sustain before dying.",
    contextNotes: [
      note(
        "Death-threshold safety net — this engine doesn't model an incapacitation/death threshold stat.",
      ),
    ],
  },
  // --- Ultimate Combat (2 selected) -------------------------------------
  {
    id: "nauseatingFlesh",
    name: "Nauseating Flesh",
    minLevel: 12,
    summary:
      "Any creature that bites, engulfs, or swallows you whole must save or be nauseated for 1d4 rounds.",
  },
  {
    id: "poisonConversion",
    name: "Poison Conversion",
    minLevel: 6,
    summary:
      "Spend 1 minute at an alchemy lab to convert a dose of poison between contact, ingested, inhaled, and injury delivery methods.",
    contextNotes: [note("Target delivery method is chosen per use — not tracked here.")],
  },
]);

export const ALCHEMIST_DISCOVERIES: Record<string, AlchemistDiscoveryDef> = Object.fromEntries(
  DISCOVERY_LIST.map((d) => [d.id, d]),
);

export const ALCHEMIST_DISCOVERY_IDS: readonly string[] = DISCOVERY_LIST.map((d) => d.id);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3c: `RefData.alchemistDiscoveries` (see that type's doc
 * comment) is the FULL published discovery catalog (168 entries, far beyond
 * this file's 41 hand-verified core-plus-selected-splatbook entries) —
 * prose only. Same "hand-authored wins on a name collision, vendored
 * catalog is the browsable/fallback source of definitions" pattern
 * `rage-powers.ts`'s `mergedRagePowerCatalog` documents in full.
 *
 * Collision audit (all 41 hand-authored entries, run against the pinned Pf
 * Data 1e slice): every one matched a vendored entry by normalized name — no
 * drift, no alias needed, no orphan. No name collides within the vendored
 * catalog itself either.
 */

/** Empty — see the collision-audit comment above; kept for the same reason `rage-powers.ts`'s alias map is kept empty. */
const ALCHEMIST_DISCOVERY_NAME_ALIASES: Record<string, string> = {};

function normalizeDiscoveryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap HTML->text preview for a vendored-only entry's picker row — see `rage-powers.ts`'s identical helper. */
function plainTextPreview(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** A catalog entry the picker can browse — either the hand-authored def (matched) with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedAlchemistDiscoveryEntry extends AlchemistDiscoveryDef {
  /** Ability-type suffix as published — absent for most entries (see `AlchemistDiscovery.nameSuffix`'s doc comment) and for the hand-authored-only case (none exist here — see the collision audit above). */
  nameSuffix?: string;
  /** Grouping tag from the source, e.g. "Primary Bomb Discoveries", "Grand Discoveries". */
  category?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredToDef(entry: AlchemistDiscovery): MergedAlchemistDiscoveryEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    // NOT `entry.level` — not a level-gate (see `AlchemistDiscovery.level`'s
    // doc comment). A vendored-only entry gets the same 2nd-level floor
    // every discovery shares, rather than a fabricated per-entry minimum.
    minLevel: 2,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked discovery id (`doc.build.alchemistDiscoveries` entries)
 * to its definition — hand-authored table first (mechanics-authoritative),
 * falling back to the vendored catalog for an id that only exists there.
 * Used by `collect.ts`/`archetypes.ts` instead of indexing
 * `ALCHEMIST_DISCOVERIES` directly, so a vendored-only pick resolves to a
 * real (display-only) definition rather than being silently dropped.
 */
export function resolveAlchemistDiscovery(
  id: string,
  refData: RefData,
): AlchemistDiscoveryDef | undefined {
  const hand = ALCHEMIST_DISCOVERIES[id];
  if (hand) return hand;
  const vendored = refData.alchemistDiscoveries?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id and real mechanics, but
 * carrying the vendored entry's prose/sources along for display); no
 * hand-authored-only entries exist to append per the collision audit above.
 * `!entry.displayOnly` marks which rows carry real mechanics, for the
 * picker's "M" badge.
 */
export function mergedAlchemistDiscoveryCatalog(refData: RefData): MergedAlchemistDiscoveryEntry[] {
  const handByNormName = new Map<string, AlchemistDiscoveryDef>();
  for (const d of DISCOVERY_LIST) {
    handByNormName.set(normalizeDiscoveryName(ALCHEMIST_DISCOVERY_NAME_ALIASES[d.id] ?? d.name), d);
  }

  const vendored = Object.values(refData.alchemistDiscoveries ?? {});
  const merged: MergedAlchemistDiscoveryEntry[] = [];
  for (const v of vendored) {
    const handMatch = handByNormName.get(normalizeDiscoveryName(v.name));
    merged.push(
      handMatch
        ? {
            ...handMatch,
            nameSuffix: v.nameSuffix,
            category: v.category,
            description: v.description,
            sources: v.sources,
          }
        : vendoredToDef(v),
    );
  }
  return merged;
}
