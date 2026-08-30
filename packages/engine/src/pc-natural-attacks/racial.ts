/**
 * PC natural attacks granted by races and racial traits — see `types.ts`'s
 * header for the table family's charter and `index.ts` for the resolver.
 *
 * - `RACE_NATURAL_ATTACKS`, keyed by `Race.name` — a natural weapon the
 *   race's own base description grants outright (rare; most published
 *   examples are actually a named racial trait, which belongs below
 *   instead). Subject to standard-trait suppression via `standardTraitName`.
 * - `RACIAL_TRAIT_NATURAL_ATTACKS`, keyed by a racial-trait id — either a
 *   vendored `RefData.racialTraits` id or a hand-authored `RACIAL_TRAITS` id
 *   (`racial-traits.ts`; the two stores' ids never collide). This is where
 *   most race-granted natural weapons belong (tengu's Gifted Adept doesn't
 *   grant one, but e.g. a "Claws" or "Bite" alternate racial trait would).
 *
 * Both tables are hand-verified against the vendored `racial-traits.json`/
 * `races.json` description text (or, for the seven core races' own
 * `RACIAL_TRAITS` alternates, that hand table's own text) during authoring —
 * dice sizes and the primary/secondary call are quoted, not assumed, because
 * the standard "1d4 claw" guess is wrong about as often as it's right (a 1d3
 * bite is common on Small-adjacent or minor-natural-weapon races).
 *
 * Deliberately NOT wired here, despite carrying a real bite/claw grant in the
 * vendored text:
 *   - Dhampir "Fangs" (`IJRr9hW0I3JvpP43`): the bite only triggers as part of
 *     a grapple damage check, or as a standard action against a bound/
 *     helpless/paralyzed target — an opponent-state-gated action option, not
 *     a standing attack line a full-attack routine can include.
 *   - Tiefling/Aasimar "Variant Tiefling/Aasimar Abilities"
 *     (`5YDsKDGSzLMoH1dv`/`ZW41vB78wXvRWWfs`): a d% GM/player random table
 *     with ~100 unrelated results, two of which happen to be a bite or claws
 *     — not a discrete trait grant this table's per-trait keying can target.
 *   - Every Skinwalker "Change Shape (Skinwalker - ...)" heritage trait: its
 *     natural attack only exists while shapechanged, a transformation this
 *     PC-body table (by design; see `types.ts`) never models — already
 *     tracked as residue in `racial-trait-classification/racesSZ.ts`.
 */

import type { PcNaturalAttackDef, RaceNaturalAttackDef } from "./types.js";

export const RACE_NATURAL_ATTACKS: Readonly<Record<string, readonly RaceNaturalAttackDef[]>> = {
  // aonprd.com "Lizardfolk": two separate defs (not one two-line def) because
  // the wielded-weapon caveat below belongs to the bite only — a shared
  // `note` would misattach it to the claws too (see `index.ts`'s
  // `flattenLines`, which stamps one def's `note` onto every line it owns).
  Lizardfolk: [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: "1d3" }],
      note: "Primary only while fighting unarmed; becomes a secondary attack (-5 to hit, half Str to damage) when also making manufactured-weapon attacks, a combination this table doesn't track.",
    },
    {
      slug: "claws",
      attacks: [{ name: "Claw", count: 2, mediumDice: "1d4" }],
    },
  ],

  // aonprd.com "Sahuagin": same bite-vs-claws split as Lizardfolk above, and
  // the same "secondary if wielding manufactured weapons" bite caveat.
  Sahuagin: [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: "1d4" }],
      note: "Primary only while fighting unarmed; becomes a secondary attack (-5 to hit, half Str to damage) when also making manufactured-weapon attacks, a combination this table doesn't track.",
    },
    {
      slug: "claws",
      attacks: [{ name: "Claw", count: 2, mediumDice: "1d4" }],
    },
  ],

  // aonprd.com "Cecaelia" Offensive Racial Traits, "Tentacle Attacks (3 RP)":
  // "two tentacle attacks that deal 1d4 points of damage. These attacks are
  // primary natural attacks" — an explicit override of
  // `natural-attacks.ts`'s default (a bare "Tentacle" classifies secondary
  // by name). Reach 10 ft. isn't modeled; this table has no reach field.
  Cecaelia: [
    {
      slug: "tentacles",
      attacks: [{ name: "Tentacle", count: 2, mediumDice: "1d4", kind: "primary" }],
    },
  ],

  // aonprd.com "Changeling" Offensive Racial Traits, "Claws": "two claw
  // attacks (1d4 points of damage each)". Suppressed by the vendored "Hag
  // Magic (AoE)" trait, whose own `replacedTraitNames` names `"Claws"`
  // exactly (already documented as prose-only in `racial-traits.ts`'s own
  // suppression audit — this is its numeric half).
  Changeling: [
    {
      slug: "claws",
      standardTraitName: "Claws",
      attacks: [{ name: "Claw", count: 2, mediumDice: "1d4" }],
    },
  ],

  // aonprd.com "Kitsune" Offensive Racial Traits, "Natural Weapons (Ex)": "In
  // her natural form, a kitsune has a bite attack that deals 1d4 points of
  // damage." A kitsune's DEFAULT play state is her natural (vulpine) form —
  // Change Shape (Su) is the opt-in disguise into a human form that loses the
  // bite, not modeled as a toggle here (no buff/state tracks it), so this
  // grant applies unconditionally, same posture as every other always-on
  // race grant in this table.
  Kitsune: [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: "1d4" }],
      note: "Unavailable while using Change Shape to appear human, a form this table doesn't track — assumed to be in natural form.",
    },
  ],

  // aonprd.com "Adaro" Offensive Racial Traits, "Powerful Bite (3 RP)": "a
  // natural bite attack that deals 1d6 points of damage. This bite is a
  // primary attack, or a secondary attack if the creature is wielding
  // manufactured weapons" — same unarmed caveat as Lizardfolk/Sahuagin above.
  Adaro: [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: "1d6" }],
      note: "Primary only while fighting unarmed; becomes a secondary attack (-5 to hit, half Str to damage) when also making manufactured-weapon attacks, a combination this table doesn't track.",
    },
  ],

  // aonprd.com "Grindylow" Offensive Racial Traits, "Bite": "a natural bite
  // attack that deals 1d3 points of damage. This bite is a primary attack,
  // or a secondary attack if the creature is wielding manufactured weapons."
  Grindylow: [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: "1d3" }],
      note: "Primary only while fighting unarmed; becomes a secondary attack (-5 to hit, half Str to damage) when also making manufactured-weapon attacks, a combination this table doesn't track.",
    },
  ],

  // aonprd.com "Kuru" Offensive Racial Traits, "Bite Attack": "a natural bite
  // attack that deals 1d6 points of damage" — no wielded-weapon caveat in the
  // published text (unlike the races above), so wired plain. The race's
  // "Cannibalistic Vitality" temp-HP-on-hit rider isn't modeled (no
  // on-hit-trigger surface in this static sheet).
  Kuru: [{ slug: "bite", attacks: [{ name: "Bite", mediumDice: "1d6" }] }],

  // aonprd.com "Reptoid" Offensive Racial Traits, "Natural Weapons (Ex)":
  // "When in its natural form, a reptoid has a bite attack and two claw
  // attacks that deal 1d3 points of damage each." Same natural-form-is-the-
  // default posture as Kitsune above: Change Shape (Su) is the opt-in
  // disguise, not tracked as a toggle, so both lines apply unconditionally.
  // One shared def (not split like Lizardfolk/Sahuagin) because the
  // natural-form caveat below applies to bite AND claws alike.
  Reptoid: [
    {
      slug: "natural-weapons",
      attacks: [
        { name: "Bite", mediumDice: "1d3" },
        { name: "Claw", count: 2, mediumDice: "1d3" },
      ],
      note: "Unavailable while using Change Shape to appear humanoid, a form this table doesn't track — assumed to be in natural form.",
    },
  ],

  // aonprd.com "Rougarou" Offensive Racial Traits, "Natural Weapon": "a bite
  // attack that deals 1d4 points of damage. This is a secondary attack if a
  // rougarou wields a manufactured weapon" — the inverse phrasing of the
  // Lizardfolk-style caveat (primary is the unstated default), same effect.
  Rougarou: [
    {
      slug: "bite",
      attacks: [{ name: "Bite", mediumDice: "1d4" }],
      note: "Primary only while fighting unarmed; becomes a secondary attack (-5 to hit, half Str to damage) when also making manufactured-weapon attacks, a combination this table doesn't track.",
    },
  ],

  // aonprd.com "Tengu" Offensive Racial Traits, "Natural Weapons": "A tengu
  // has a bite attack that deals 1d3 points of damage." Suppressed by the
  // vendored "Deft Swords" alternate, whose `replacedTraitNames` spells the
  // standard trait `"Natural Weapon"` (singular) despite the race's own
  // heading using the plural "Natural Weapons" — matching this string
  // exactly (not the race heading) is what the suppression lookup in
  // `index.ts`/`spell-like-abilities/index.ts`'s sibling helper actually
  // compares against.
  Tengu: [
    {
      slug: "bite",
      standardTraitName: "Natural Weapon",
      attacks: [{ name: "Bite", mediumDice: "1d3" }],
    },
  ],
};

export const RACIAL_TRAIT_NATURAL_ATTACKS: Readonly<Record<string, readonly PcNaturalAttackDef[]>> =
  {
    // Tiefling "Maw or Claw" (Advanced Race Guide p. 169, replaces
    // Spell-Like Ability): "The tiefling can choose a bite attack that deals
    // 1d6 points of damage or two claws that each deal 1d4 points of damage.
    // These attacks are primary natural attacks." A build-time EITHER/OR
    // choice, gated on `doc.build.pickChoices["racialTrait:qquaaM62KEX4ulIi"]`
    // (declared for the web picker in `racial-trait-choices.ts`'s
    // `RACIAL_TRAIT_CHOICES`) — no stored pick grants neither line, matching
    // this table's usual "no stored pick, no attack" posture. Both names
    // already classify primary by `natural-attacks.ts`'s name heuristic, so
    // no explicit `kind` override is needed.
    qquaaM62KEX4ulIi: [
      {
        slug: "maw",
        attacks: [{ name: "Bite", mediumDice: "1d6" }],
        when: (doc) => doc.build.pickChoices?.["racialTrait:qquaaM62KEX4ulIi"] === "bite",
      },
      {
        slug: "claw",
        attacks: [{ name: "Claw", count: 2, mediumDice: "1d4" }],
        when: (doc) => doc.build.pickChoices?.["racialTrait:qquaaM62KEX4ulIi"] === "claws",
      },
    ],

    // aonprd.com Catfolk "Cat's Claws" (replaces Natural Hunter): "a pair of
    // claws they can use as natural weapons. These claws are primary attacks
    // that deal 1d4 points of damage."
    iPSjQFQo6BRxvAf8: [
      { slug: "cats-claws", attacks: [{ name: "Claw", count: 2, mediumDice: "1d4" }] },
    ],

    // aonprd.com Tengu "Claw Attack" (replaces Swordtrained): "two claw
    // attacks as primary natural attacks that deal 1d3 points of damage, and
    // are treated as having the Improved Unarmed Strike feat for the purpose
    // of qualifying for other feats." The IUS-for-prereqs rider isn't
    // modeled (this table has no feat-prerequisite hook).
    NuCT6chK7Td1ef47: [
      {
        slug: "claw-attack",
        attacks: [{ name: "Claw", count: 2, mediumDice: "1d3" }],
        note: "Also counts as having Improved Unarmed Strike for feat prerequisites, a qualification this table doesn't check.",
      },
    ],

    // `racial-traits.ts`'s hand-authored "Toothy" (replaces Intimidating for
    // the seven-core-race table; the vendored duplicate is de-duped out of
    // the picker by `availableVendoredRacialTraits`, so only this id is ever
    // reachable): "Protruding tusks grant a bite attack (1d4, primary
    // natural attack)."
    "half-orc-toothy": [{ slug: "toothy-bite", attacks: [{ name: "Bite", mediumDice: "1d4" }] }],

    // aonprd.com Kobold "Dragonmaw" (replaces Armor): "a bite attack that
    // deals 1d4 points of damage. Once per day, you can deal 1d6 points of
    // additional energy damage with your bite attack" (type by scale color).
    // The once-per-day energy rider isn't modeled (a resource-gated damage
    // bonus, not a standing attack property).
    OSKe4wubLjYQOswq: [
      {
        slug: "dragonmaw-bite",
        attacks: [{ name: "Bite", mediumDice: "1d4" }],
        note: "Once per day, +1d6 additional energy damage (type set by scale color) on this bite; the once-per-day rider isn't modeled.",
      },
    ],

    // aonprd.com Goblin "Hard Head, Big Teeth" (replaces Skilled): "gain a
    // bite attack as a primary natural attack that deals 1d4 points of
    // damage."
    "1MzKaqJwwWClm9vd": [
      { slug: "hard-head-big-teeth-bite", attacks: [{ name: "Bite", mediumDice: "1d4" }] },
    ],

    // aonprd.com Locathah "Blunt Head" (modifies Fast Swimmer): "provides the
    // locathah with a bite attack. This is a primary natural attack that
    // deals 1d4 points of piercing damage." (The traded-away swim-speed
    // reduction to 40 ft. is Fast Swimmer's own concern, not this table's.)
    dhSAd9l3M8b0SGAP: [{ slug: "blunt-head-bite", attacks: [{ name: "Bite", mediumDice: "1d4" }] }],

    // aonprd.com Vine Leshy "Lashvine" (replaces Change Shape, Verdant
    // Burst): "As a free action, the vine leshy can turn one hand into a
    // lashvine. A lashvine is a primary natural attack that deals 1d3 points
    // of bludgeoning damage." The free-action "turn a hand into it" framing
    // is the same always-available-despite-an-activation-verb shape as an
    // extended claw, not a real gate (see `types.ts`'s `requiredBuff`
    // guidance) — wired unconditionally, with an explicit `kind` override
    // since "Lashvine" doesn't match `natural-attacks.ts`'s name heuristic.
    "8S3LbLY78NiCmXT8": [
      {
        slug: "lashvine",
        attacks: [{ name: "Lashvine", mediumDice: "1d3", kind: "primary" }],
        note: "Using the lashvine costs that hand's grip: it can't hold items or wield a weapon while active.",
      },
    ],
  };
