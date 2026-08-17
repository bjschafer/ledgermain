/**
 * Alchemist's slice of the pipeline (2026-08-08). 219 vendored archetype
 * features across every alchemist archetype in the data pull, read
 * individually and bucketed as `numeric` / `situational` / `subsystem` /
 * `blocked` per the per-class file convention (`index.ts`'s doc comment).
 * This file owns BOTH `ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION`.
 *
 * ── Alchemist-specific mechanical facts this pass relies on ───────────────
 *
 * 1. **Discoveries** are a modeled pick-list subsystem
 *    (`alchemist-discoveries.ts`). Any feature that adds, swaps, or
 *    restricts the discovery list (including granting a specific discovery
 *    as a bonus, or changing the discovery cadence) is `subsystem`.
 * 2. **Bombs** ride a vendored resource pool — the base "Bomb" class feature
 *    carries `changes: []` and `uses.maxFormula: "@class.unlevel +
 *    @abilities.int.mod"` (confirmed directly against
 *    `class-features.json`). Bomb DAMAGE itself (the 1d6-scaling dice, its
 *    type, and any per-die/flat modifier to it) is not a `Change`-modeled
 *    value anywhere in this engine at all — there is no applied target for
 *    it (see `targets.ts`). A feature that changes the bomb pool's daily
 *    COUNT is `blocked` (double-counts the vendored `uses.maxFormula`); a
 *    feature that changes bomb damage MAGNITUDE (die size up or down, a
 *    flat per-die bonus, an added secondary damage instance) is also
 *    `blocked` (promises a number with no target to express it — same bar,
 *    different failure mode). A feature that only RETYPES bomb damage (fire
 *    to cold/acid/etc.) with the same unchanged progression, or adds a
 *    non-damage rider (shape, stealth, marking, a discovery grant, an
 *    action-economy trick spending extra bomb charges), is `subsystem` —
 *    nothing is being promised that isn't already unmodeled.
 * 3. **Mutagen** (and Cognatogen) are vendored BUFFs the player toggles
 *    (`grantsBuffs` resolving to real `RefData.buffs` entries, wired into
 *    `resources.ts`'s pool). A feature that directly modifies THE SAME
 *    mutagen ability's numbers (explicitly "alters"/"modifies the mutagen
 *    class feature", or adds a number "whenever a mutagen is created/used")
 *    is `blocked` — it would need buff-patch plumbing, not an always-on
 *    archetype Change. A feature that REPLACES mutagen wholesale with an
 *    unrelated, wholly unmodeled consumable (its own brew/imbibe/duration
 *    shape, no vendored buff data at all) is `subsystem` — there is nothing
 *    vendored to conflict with, it is simply an unimplemented resource,
 *    same posture as every other activated/limited-use ability this table
 *    leaves unmodeled.
 * 4. **Poison Resistance/Use/Immunity, Swift Alchemy/Poisoning** (the base
 *    features most archetypes replace to make room) all carry `changes: []`
 *    upstream (confirmed against `class-features.json`) — replacing them
 *    frees up the slot without suppressing any real number, so a
 *    replacement archetype feature that grants an unrelated always-on
 *    number (a skill bonus, an energy resistance, a category-scoped save
 *    bonus) is safe to extract on its own merits, no suppression check
 *    needed.
 * 5. **Trapfinding** grants ("as the rogue class feature", or "as if he
 *    were a rogue with trapfinding") mirror a real vendored convention
 *    already used elsewhere in this data pull: the base Trapfinding class
 *    feature (`class-features.json` id `pEODJDoTk7uhCZY7`) carries exactly
 *    one Change — `skill.dev` (Disable Device) scaling at
 *    `max(1, floor(@class.unlevel / 2))` — deliberately dropping the
 *    "Perception checks to locate traps" half, since Perception has no way
 *    to scope a bonus to "just for finding traps." Every alchemist
 *    archetype feature that grants Trapfinding by name mirrors that same
 *    formula/target for consistency with the rest of the vendored data.
 *
 * Vendored-data oddities found (recorded, not fixed — no other file in this
 * pipeline may be touched): SEVEN pairs/groups of archetype-feature ids
 * share byte-identical `description` text within the same archetype
 * (`dragonblood-chymist` draconic-resistances/-immunity,
 * `plague-bringer` disease-resistance/-immunity,
 * `internal-alchemist` disease-resistance/-immunity,
 * `horticulturist` plant-voice/speak-with-plants,
 * `crypt-breaker` alkahest-bombs/alkahest-bomb-damage-increase,
 * `reanimator` bomb/simple-reanimation — the latter pair's shared text is
 * pure copy-paste of the GENERIC base Bomb ability, not reanimator-specific
 * prose at all — and `herbalist`'s SIX seed-pod-condition ids, which all
 * carry the complete Seed Pod ability text including every condition tier).
 * Extracting a real number under more than one id sharing identical prose
 * within one archetype would double it once a character reaches both
 * features' level gates, so at most one id per group may carry the number.
 * Three groups (`plague-bringer`, `internal-alchemist`, `horticulturist`)
 * have one id per group designated canonical, carrying the wired `numeric`
 * entry for the real number the shared prose describes, while the sibling
 * id stays `blocked`/`subsystem` noting it is a reprint of the canonical
 * id's text with no independent grant. The remaining four groups
 * (`dragonblood-chymist`, `crypt-breaker`, `reanimator`, `herbalist`) have
 * no canonical id: every id in them stays `blocked`/`subsystem` with a
 * note. `eldritch-poisoner` additionally carries five level-0 ids (`cure`,
 * `effect`, `frequency`, `save`, `type`) that are not features at all —
 * they are the individual column cells of the arcanotoxin poison's SRD
 * stat block (Type/Save/Frequency/Effect/Cure), scraped as standalone
 * archetype features by the third-party compilation.
 * Also: `brown-fur-transmuter`'s three features are pure arcanist mechanics
 * (arcanist exploits, an arcane reservoir) with no alchemist content at
 * all — filed under the `alchemist:` class tag in the vendored pull despite
 * describing an unrelated class's resources.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── alchemist:aerochemist ──
  "alchemist:aerochemist:aerodynamic-prowess:2": {
    archetypeId: "alchemist:aerochemist",
    name: "Aerodynamic Prowess",
    level: 2,
    bucket: "numeric",
    note: "flat, unconditional Fly-skill bonus scaling at 2nd/5th/8th; replaces poison resistance (changes: [] upstream, nothing suppressed)",
  },
  "alchemist:aerochemist:aeromantic-concoction:1": {
    archetypeId: "alchemist:aerochemist",
    name: "Aeromantic Concoction",
    level: 1,
    bucket: "subsystem",
    note: "brewed/imbibed consumable (Acrobatics bonus, feather fall/fly SLAs) replacing mutagen with an unrelated, wholly unmodeled resource — see class note 3",
  },
  "alchemist:aerochemist:bombs-away:2": {
    archetypeId: "alchemist:aerochemist",
    name: "Bombs Away",
    level: 2,
    bucket: "situational",
    note: "real, scaling attack-roll bonus with thrown weapons, but conditioned on the target being at least 10 ft below the aerochemist — a relative-position condition the engine can't check",
  },

  // ── alchemist:alchemical-sapper ──
  "alchemist:alchemical-sapper:camouflage-bomb:3": {
    archetypeId: "alchemist:alchemical-sapper",
    name: "Camouflage Bomb",
    level: 3,
    bucket: "subsystem",
    note: "adds a Perception DC to notice a planted bomb — action-economy/trap-detection rider, no self-stat number",
  },
  "alchemist:alchemical-sapper:delayed-bomb:1": {
    archetypeId: "alchemist:alchemical-sapper",
    name: "Delayed Bomb",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonus discovery (delayed bomb) — discovery-list mechanic, see class note 1",
  },
  "alchemist:alchemical-sapper:demolition-bomb:1": {
    archetypeId: "alchemist:alchemical-sapper",
    name: "Demolition Bomb",
    level: 1,
    bucket: "blocked",
    note: "doubles bomb damage and adds hardness-ignoring — a real magnitude change to bomb damage, which has no applied target in this engine (see class note 2)",
  },
  "alchemist:alchemical-sapper:master-engineer:2": {
    archetypeId: "alchemist:alchemical-sapper",
    name: "Master Engineer",
    level: 2,
    bucket: "numeric",
    note: "flat, unconditional +1/2 level bonus to three explicitly-named skills (Knowledge [engineering] = fixed id `ken`; Craft [stonemasonry]/[traps] = named parameterized `crf.<slug>` instances, same convention as the vendored Pesh Expert's `crf.alchemy`); replaces poison resistance",
  },
  "alchemist:alchemical-sapper:selective-detonation:10": {
    archetypeId: "alchemist:alchemical-sapper",
    name: "Selective Detonation",
    level: 10,
    bucket: "subsystem",
    note: "lets designated allies pass a trip mine safely — ally-scoped trap mechanic, no self number",
  },
  "alchemist:alchemical-sapper:trip-mine:6": {
    archetypeId: "alchemist:alchemical-sapper",
    name: "Trip Mine",
    level: 6,
    bucket: "subsystem",
    note: "spends multiple bomb charges to plant a trap dealing normal (or, at 4 charges, demolition-bomb) damage — an action-economy/resource variant, not a change to the bomb's own magnitude",
  },

  // ── alchemist:alchemical-trapper ──
  "alchemist:alchemical-trapper:bomb-trap:2": {
    archetypeId: "alchemist:alchemical-trapper",
    name: "Bomb Trap",
    level: 2,
    bucket: "subsystem",
    note: "converts a bomb into a placed trap — action-economy/trap mechanic, no self-stat number",
  },
  "alchemist:alchemical-trapper:trapfinding:4": {
    archetypeId: "alchemist:alchemical-trapper",
    name: "Trapfinding",
    level: 4,
    bucket: "numeric",
    note: "grants Trapfinding verbatim as the rogue class feature — mirrors the vendored Trapfinding Change (skill.dev only, see class note 5)",
  },

  // ── alchemist:aquachymist ──
  "alchemist:aquachymist:amphibious-mutagen:2": {
    archetypeId: "alchemist:aquachymist",
    name: "Amphibious Mutagen",
    level: 2,
    bucket: "subsystem",
    note: "adds breathe-air-and-water to the existing mutagen — a trait, not a numeric change to mutagen's own bonuses",
  },
  "alchemist:aquachymist:sureseal-alchemy:1": {
    archetypeId: "alchemist:aquachymist",
    name: "Sureseal Alchemy",
    level: 1,
    bucket: "subsystem",
    note: "waterproofs alchemical items — no number",
  },
  "alchemist:aquachymist:underwater-bombs:1": {
    archetypeId: "alchemist:aquachymist",
    name: "Underwater Bombs",
    level: 1,
    bucket: "subsystem",
    note: "retypes bomb damage to steam (usable underwater) with a targeting/range rider — no magnitude change (class note 2)",
  },

  // ── alchemist:beastmorph ──
  "alchemist:beastmorph:beastform-mutagen:3": {
    archetypeId: "alchemist:beastmorph",
    name: "Beastform Mutagen",
    level: 3,
    bucket: "subsystem",
    note: "grants an alter-self-shaped ability alongside mutagen — no flat number, replaces swift alchemy",
  },
  "alchemist:beastmorph:grand-beastform-mutagen:14": {
    archetypeId: "alchemist:beastmorph",
    name: "Grand Beastform Mutagen",
    level: 14,
    bucket: "subsystem",
    note: "beast-shape-III-shaped ability grant alongside mutagen — no flat number",
  },
  "alchemist:beastmorph:greater-beastform-mutagen:10": {
    archetypeId: "alchemist:beastmorph",
    name: "Greater Beastform Mutagen",
    level: 10,
    bucket: "subsystem",
    note: "beast-shape-II-shaped ability grant alongside mutagen — no flat number",
  },
  "alchemist:beastmorph:improved-beastform-mutagen:6": {
    archetypeId: "alchemist:beastmorph",
    name: "Improved Beastform Mutagen",
    level: 6,
    bucket: "subsystem",
    note: "beast-shape-I-shaped ability grant alongside mutagen — no flat number",
  },

  // ── alchemist:blazing-torchbearer ──
  "alchemist:blazing-torchbearer:everburning-flame:1": {
    archetypeId: "alchemist:blazing-torchbearer",
    name: "Everburning Flame",
    level: 1,
    bucket: "subsystem",
    note: "item trait (everburning torch) plus an at-will SLA — no self-stat number",
  },
  "alchemist:blazing-torchbearer:explosive-torch:4": {
    archetypeId: "alchemist:blazing-torchbearer",
    name: "Explosive Torch",
    level: 4,
    bucket: "situational",
    note: "real +2d6 fire damage, but only on the next single melee attack within 1d4 rounds after priming it — a per-attack activated condition",
  },
  "alchemist:blazing-torchbearer:intense-light:2": {
    archetypeId: "alchemist:blazing-torchbearer",
    name: "Intense Light",
    level: 2,
    bucket: "subsystem",
    note: "torch light-radius increase plus a 1/day blind burst — no applied target for light radius or an AoE blind",
  },

  // ── alchemist:blightseeker ──
  "alchemist:blightseeker:blight-engineering:14": {
    archetypeId: "alchemist:blightseeker",
    name: "Blight Engineering",
    level: 14,
    bucket: "subsystem",
    note: "lets two blights stack on one spore bomb — bomb-rider mechanic, no self number",
  },
  "alchemist:blightseeker:blights:1": {
    archetypeId: "alchemist:blightseeker",
    name: "Blights",
    level: 1,
    bucket: "subsystem",
    note: "unlocks a list of status-effect bomb riders — pick-list mechanic, no self number",
  },
  "alchemist:blightseeker:spore-bomb:1": {
    archetypeId: "alchemist:blightseeker",
    name: "Spore Bomb",
    level: 1,
    bucket: "blocked",
    note: "changes the base bomb damage die from 1d6 to 1d4 per increment — a magnitude change with no applied target (class note 2)",
  },

  // ── alchemist:blood-alchemist ──
  "alchemist:blood-alchemist:alchemist-circles:1": {
    archetypeId: "alchemist:blood-alchemist",
    name: "Alchemist Circles",
    level: 1,
    bucket: "subsystem",
    note: "choice-gated spell-like-ability grant (any formula-book spell of the right level) fueled by a blood pool and an unused extract slot — no stored pick to key from, replaces bombs",
  },
  "alchemist:blood-alchemist:blood-knowledge:4": {
    archetypeId: "alchemist:blood-alchemist",
    name: "Blood Knowledge",
    level: 4,
    bucket: "subsystem",
    note: "spends an extract slot for a divination effect — resource mechanic, no self number",
  },
  "alchemist:blood-alchemist:lifeblood:1": {
    archetypeId: "alchemist:blood-alchemist",
    name: "Lifeblood",
    level: 1,
    bucket: "subsystem",
    note: "coup-de-grace-triggered bonus extract resource, replaces mutagen with an unrelated ability — class note 3",
  },

  // ── alchemist:bogborn-alchemist ──
  "alchemist:bogborn-alchemist:amphibious-mutagen:1": {
    archetypeId: "alchemist:bogborn-alchemist",
    name: "Amphibious Mutagen",
    level: 1,
    bucket: "blocked",
    note: "grants a 15-ft. swim speed whenever the mutagen is active — a real number added directly to the mutagen toggle (class note 3), needs buff-patch plumbing",
  },

  // ── alchemist:bramble-brewer ──
  "alchemist:bramble-brewer:briar-bombs:2": {
    archetypeId: "alchemist:bramble-brewer",
    name: "Briar Bombs",
    level: 2,
    bucket: "subsystem",
    note: "tanglefoot-bomb discovery variant that deals no damage (radius/terrain rider only) — no self number",
  },
  "alchemist:bramble-brewer:dendrite-mutagen:1": {
    archetypeId: "alchemist:bramble-brewer",
    name: "Dendrite Mutagen",
    level: 1,
    bucket: "blocked",
    note: "replaces mutagen's own numbers (natural armor, ability bonus, plus new fast healing) with a different schedule — direct mutagen-number modification, class note 3",
  },

  // ── alchemist:brown-fur-transmuter ──
  "alchemist:brown-fur-transmuter:powerful-change:3": {
    archetypeId: "alchemist:brown-fur-transmuter",
    name: "Powerful Change",
    level: 3,
    bucket: "subsystem",
    note: "pure arcanist mechanic (arcane reservoir spend on a transmutation spell's ability bonus) filed under the alchemist tag — no alchemist content, no engine hook for arcane reservoir",
  },
  "alchemist:brown-fur-transmuter:share-transmutation:9": {
    archetypeId: "alchemist:brown-fur-transmuter",
    name: "Share Transmutation",
    level: 9,
    bucket: "subsystem",
    note: "arcanist arcane-reservoir mechanic (range conversion) — unmodeled, unrelated to alchemist",
  },
  "alchemist:brown-fur-transmuter:transmutation-supremacy:20": {
    archetypeId: "alchemist:brown-fur-transmuter",
    name: "Transmutation Supremacy",
    level: 20,
    bucket: "subsystem",
    note: "arcanist capstone modifying the two abilities above — same unmodeled arcane-reservoir mechanic",
  },

  // ── alchemist:chirurgeon ──
  "alchemist:chirurgeon:anaesthetic:5": {
    archetypeId: "alchemist:chirurgeon",
    name: "Anaesthetic",
    level: 5,
    bucket: "subsystem",
    note: "grants a specific named bonus feat (Skill Focus [Heal]) plus a Heal-check side effect — a named feat grant, not an open bonusFeats count",
  },
  "alchemist:chirurgeon:infused-curative:2": {
    archetypeId: "alchemist:chirurgeon",
    name: "Infused Curative",
    level: 2,
    bucket: "subsystem",
    note: "extract-preparation mechanic (auto-infusion) — no self-stat number",
  },
  "alchemist:chirurgeon:power-over-death:10": {
    archetypeId: "alchemist:chirurgeon",
    name: "Power Over Death",
    level: 10,
    bucket: "subsystem",
    note: "adds a spell to the formula book — no Change-shaped number",
  },

  // ── alchemist:clone-master ──
  "alchemist:clone-master:bomb:1": {
    archetypeId: "alchemist:clone-master",
    name: "Bomb",
    level: 1,
    bucket: "blocked",
    note: "reduces bomb damage dice one step (d6 to d4, etc.) — a magnitude change with no applied target (class note 2)",
  },
  "alchemist:clone-master:rebirth:8": {
    archetypeId: "alchemist:clone-master",
    name: "Rebirth",
    level: 8,
    bucket: "subsystem",
    note: "prepared-clone resurrection contingency — no self-stat number",
  },

  // ── alchemist:concocter ──
  "alchemist:concocter:extracting-mixology:6": {
    archetypeId: "alchemist:concocter",
    name: "Extracting Mixology",
    level: 6,
    bucket: "subsystem",
    note: "combines an extract and a potion with a random-table outcome — unmodeled resource mechanic",
  },
  "alchemist:concocter:mutagenic-mixology:2": {
    archetypeId: "alchemist:concocter",
    name: "Mutagenic Mixology",
    level: 2,
    bucket: "subsystem",
    note: "brews a SEPARATE, limited-use-per-day mutagen-shaped potion (doesn't count against or modify the alchemist's own mutagen) — a parallel unmodeled resource, not a direct mutagen-number edit",
  },

  // ── alchemist:construct-rider ──
  "alchemist:construct-rider:internal-reservoir:6": {
    archetypeId: "alchemist:construct-rider",
    name: "Internal Reservoir",
    level: 6,
    bucket: "subsystem",
    note: "mount item-storage mechanic — no self number",
  },
  "alchemist:construct-rider:vaporizing-reservoir:8": {
    archetypeId: "alchemist:construct-rider",
    name: "Vaporizing Reservoir",
    level: 8,
    bucket: "subsystem",
    note: "mount breath-weapon delivery of a bomb — mount ability, not the character's own number",
  },
  "alchemist:construct-rider:widened-vaporizer:10": {
    archetypeId: "alchemist:construct-rider",
    name: "Widened Vaporizer",
    level: 10,
    bucket: "subsystem",
    note: "widens the mount's breath-weapon area — mount ability",
  },

  // ── alchemist:crimson-chymist ──
  "alchemist:crimson-chymist:discovery:2": {
    archetypeId: "alchemist:crimson-chymist",
    name: "Discovery",
    level: 2,
    bucket: "subsystem",
    note: "unlocks a list of crimson-specific discoveries (claws, blood sight, envenomed claws) — discovery-list mechanic, see class note 1",
  },
  "alchemist:crimson-chymist:mantis-mutagen:1": {
    archetypeId: "alchemist:crimson-chymist",
    name: "Mantis Mutagen",
    level: 1,
    bucket: "subsystem",
    note: "restricts mutagen to always enhance Dexterity and reflavors its natural armor as chitin — no numeric change to mutagen's magnitude",
  },

  // ── alchemist:cruorchymist ──
  "alchemist:cruorchymist:blood-augmentation:4": {
    archetypeId: "alchemist:cruorchymist",
    name: "Blood Augmentation",
    level: 4,
    bucket: "subsystem",
    note: "grants the blood familiar a hunter animal aspect at a Con-damage cost — familiar-only ability",
  },
  "alchemist:cruorchymist:blood-familiar:1": {
    archetypeId: "alchemist:cruorchymist",
    name: "Blood Familiar",
    level: 1,
    bucket: "subsystem",
    note: "familiar grant, replaces mutagen with an unrelated ability — class note 3",
  },
  "alchemist:cruorchymist:blood-treatment:1": {
    archetypeId: "alchemist:cruorchymist",
    name: "Blood Treatment",
    level: 1,
    bucket: "subsystem",
    note: "heals the familiar at a self-Con-drain cost — familiar-only ability",
  },

  // ── alchemist:crypt-breaker ──
  "alchemist:crypt-breaker:alkahest-bomb-damage-increase:3": {
    archetypeId: "alchemist:crypt-breaker",
    name: "Alkahest Bomb Damage Increase",
    level: 3,
    bucket: "blocked",
    note: "SUSPECTED VENDORED-DATA DUPLICATE: description is byte-identical to alkahest-bombs:1's (both describe the SAME acid-damage bomb retype at the SAME dice). Extracting under both ids would double it once a crypt breaker reaches both level gates; also a magnitude change with no applied target regardless (class note 2)",
  },
  "alchemist:crypt-breaker:alkahest-bombs:1": {
    archetypeId: "alchemist:crypt-breaker",
    name: "Alkahest Bombs",
    level: 1,
    bucket: "blocked",
    note: "SUSPECTED VENDORED-DATA DUPLICATE: description is byte-identical to alkahest-bomb-damage-increase:3's — see that entry. Also a magnitude/type change to bomb damage with no applied target (class note 2)",
  },
  "alchemist:crypt-breaker:crypt-breaker-s-draught:1": {
    archetypeId: "alchemist:crypt-breaker",
    name: "Crypt Breaker's Draught",
    level: 1,
    bucket: "subsystem",
    note: "a brand-new imbibed buff (+4 Perception, a chosen sense, light blindness) replacing mutagen — no vendored buff data exists for it, unmodeled resource per class note 3",
  },
  "alchemist:crypt-breaker:enhanced-alkahest:14": {
    archetypeId: "alchemist:crypt-breaker",
    name: "Enhanced Alkahest",
    level: 14,
    bucket: "blocked",
    note: "+1 damage per die and an expanded crit range on alkahest bombs — a magnitude change to bomb damage with no applied target (class note 2)",
  },
  "alchemist:crypt-breaker:trapfinding:1": {
    archetypeId: "alchemist:crypt-breaker",
    name: "Trapfinding",
    level: 1,
    bucket: "numeric",
    note: "grants the +1/2 level Trapfinding bonus at 1st level instead of via the rogue class — mirrors the vendored Trapfinding Change (class note 5)",
  },

  // ── alchemist:deep-bomber ──
  "alchemist:deep-bomber:silent-bomb:2": {
    archetypeId: "alchemist:deep-bomber",
    name: "Silent Bomb",
    level: 2,
    bucket: "subsystem",
    note: "silences a bomb's explosion — no damage change, pure rider",
  },
  "alchemist:deep-bomber:stonekin:6": {
    archetypeId: "alchemist:deep-bomber",
    name: "Stonekin",
    level: 6,
    bucket: "subsystem",
    note: "adds tree shape/meld into stone to the formula book — no Change-shaped number",
  },
  "alchemist:deep-bomber:targeting-bomb:3": {
    archetypeId: "alchemist:deep-bomber",
    name: "Targeting Bomb",
    level: 3,
    bucket: "subsystem",
    note: "adds a faerie-fire rider to a bomb's splash — no damage-magnitude change",
  },

  // ── alchemist:dimensional-excavator ──
  "alchemist:dimensional-excavator:extradimensional-extract:4": {
    archetypeId: "alchemist:dimensional-excavator",
    name: "Extradimensional Extract",
    level: 4,
    bucket: "subsystem",
    note: "adds create pit to the formula book plus a discovery-cadence shift — no Change-shaped number",
  },
  "alchemist:dimensional-excavator:precipitous-discoveries:6": {
    archetypeId: "alchemist:dimensional-excavator",
    name: "Precipitous Discoveries",
    level: 6,
    bucket: "subsystem",
    note: "adds more pit spells to the formula book in place of a discovery — no self number",
  },

  // ── alchemist:dragonblood-chymist ──
  "alchemist:dragonblood-chymist:draconic-immunity:10": {
    archetypeId: "alchemist:dragonblood-chymist",
    name: "Draconic Immunity",
    level: 10,
    bucket: "blocked",
    note: "SUSPECTED VENDORED-DATA DUPLICATE: description is byte-identical to draconic-resistances:2's (both describe the same +2/+4/+6-then-immune paralysis/sleep progression). Extracting under both ids would double the bonus once a dragonblood chymist reaches both gates; also no `paralysis` SAVE_CATEGORIES entry exists to express half the scope regardless",
  },
  "alchemist:dragonblood-chymist:draconic-resistances:2": {
    archetypeId: "alchemist:dragonblood-chymist",
    name: "Draconic Resistances",
    level: 2,
    bucket: "blocked",
    note: "SUSPECTED VENDORED-DATA DUPLICATE: description is byte-identical to draconic-immunity:10's — see that entry. No `paralysis` SAVE_CATEGORIES entry exists either way",
  },
  "alchemist:dragonblood-chymist:dragonblood-mutagen:1": {
    archetypeId: "alchemist:dragonblood-chymist",
    name: "Dragonblood Mutagen",
    level: 1,
    bucket: "blocked",
    note: 'explicitly "modifies the mutagen class feature" — replaces its natural armor/ability-score numbers with its own schedule plus new claw/bite attacks; direct mutagen-number modification, class note 3',
  },
  "alchemist:dragonblood-chymist:explosive-breath:1": {
    archetypeId: "alchemist:dragonblood-chymist",
    name: "Explosive Breath",
    level: 1,
    bucket: "subsystem",
    note: "grants the breath weapon bomb discovery, applied to every bomb — discovery-list mechanic (class note 1)",
  },

  // ── alchemist:ectochymist ──
  "alchemist:ectochymist:advanced-ectochymistry:2": {
    archetypeId: "alchemist:ectochymist",
    name: "Advanced Ectochymistry",
    level: 2,
    bucket: "subsystem",
    note: "extends a weapon-coating rider to haunts — no self-stat number",
  },
  "alchemist:ectochymist:cool-headed:2": {
    archetypeId: "alchemist:ectochymist",
    name: "Cool-Headed",
    level: 2,
    bucket: "numeric",
    note: 'flat, unconditional save bonus scaling at 2nd/5th/8th against death and fear (both real SAVE_CATEGORIES); the third named scope, "negative energy effects", has no category and is dropped — replaces poison resistance',
  },
  "alchemist:ectochymist:ectochymical-analysis:10": {
    archetypeId: "alchemist:ectochymist",
    name: "Ectochymical Analysis",
    level: 10,
    bucket: "subsystem",
    note: "speak-with-haunt-shaped divination using a limited resource — no self-stat number",
  },
  "alchemist:ectochymist:ectoplasmic-blanche:1": {
    archetypeId: "alchemist:ectochymist",
    name: "Ectoplasmic Blanche",
    level: 1,
    bucket: "subsystem",
    note: "limited-use weapon-coating resource that lets a weapon bypass incorporeal miss chance — replaces bombs, no self-stat number",
  },
  "alchemist:ectochymist:ghost-trap:8": {
    archetypeId: "alchemist:ectochymist",
    name: "Ghost Trap",
    level: 8,
    bucket: "subsystem",
    note: "traps an incorporeal creature in a vessel — action/resource mechanic, no self number",
  },
  "alchemist:ectochymist:swift-ectochymistry:6": {
    archetypeId: "alchemist:ectochymist",
    name: "Swift Ectochymistry",
    level: 6,
    bucket: "subsystem",
    note: "lets ectoplasmic blanche be applied as a swift action — action-economy rider",
  },

  // ── alchemist:ectoplasm-master ──
  "alchemist:ectoplasm-master:ectoplasmic-extracts:1": {
    archetypeId: "alchemist:ectoplasm-master",
    name: "Ectoplasmic Extracts",
    level: 1,
    bucket: "subsystem",
    note: "expands the formula list with necromancy spells — no Change-shaped number",
  },

  // ── alchemist:eldritch-poisoner ──
  "alchemist:eldritch-poisoner:careful-injection:4": {
    archetypeId: "alchemist:eldritch-poisoner",
    name: "Careful Injection",
    level: 4,
    bucket: "subsystem",
    note: "trades sneak attack dice for a poison DC increase — a resource conversion, not a flat number",
  },
  "alchemist:eldritch-poisoner:cure:0": {
    archetypeId: "alchemist:eldritch-poisoner",
    name: "Cure",
    level: 0,
    bucket: "blocked",
    note: 'VENDORED-DATA ARTIFACT: not a real feature — the "Cure" column of the arcanotoxin poison\'s SRD stat block ("1 save"), scraped as a standalone archetype feature. No applicable Change',
  },
  "alchemist:eldritch-poisoner:discoveries:0": {
    archetypeId: "alchemist:eldritch-poisoner",
    name: "Discoveries",
    level: 0,
    bucket: "subsystem",
    note: "unlocks a list of poison/arcanotoxin-themed discoveries — discovery-list mechanic (class note 1)",
  },
  "alchemist:eldritch-poisoner:effect:0": {
    archetypeId: "alchemist:eldritch-poisoner",
    name: "Effect",
    level: 0,
    bucket: "blocked",
    note: 'VENDORED-DATA ARTIFACT: the "Effect" column of the arcanotoxin poison\'s SRD stat block ("1d2 ability damage"), scraped as a standalone feature. No applicable Change',
  },
  "alchemist:eldritch-poisoner:frequency:0": {
    archetypeId: "alchemist:eldritch-poisoner",
    name: "Frequency",
    level: 0,
    bucket: "blocked",
    note: 'VENDORED-DATA ARTIFACT: the "Frequency" column of the arcanotoxin poison\'s SRD stat block ("1/round for 2 rounds"), scraped as a standalone feature. No applicable Change',
  },
  "alchemist:eldritch-poisoner:save:0": {
    archetypeId: "alchemist:eldritch-poisoner",
    name: "Save",
    level: 0,
    bucket: "blocked",
    note: "VENDORED-DATA ARTIFACT: the \"Save\" column of the arcanotoxin poison's SRD stat block (the poison's own DC formula, not a character bonus), scraped as a standalone feature. No applicable Change",
  },
  "alchemist:eldritch-poisoner:sneak-attack:1": {
    archetypeId: "alchemist:eldritch-poisoner",
    name: "Sneak Attack",
    level: 1,
    bucket: "subsystem",
    note: "grants rogue-shaped sneak attack dice — no engine target for sneak attack dice on a non-rogue/ninja class feature grant",
  },
  "alchemist:eldritch-poisoner:toxicologist:0": {
    archetypeId: "alchemist:eldritch-poisoner",
    name: "Toxicologist",
    level: 0,
    bucket: "situational",
    note: "real +2 Craft (alchemy) bonus, but scoped to creating poisons/antitoxins specifically — a flat `skill.crf.alchemy` Change would over-apply to every other Craft (alchemy) use",
  },
  "alchemist:eldritch-poisoner:type:0": {
    archetypeId: "alchemist:eldritch-poisoner",
    name: "Type",
    level: 0,
    bucket: "blocked",
    note: 'VENDORED-DATA ARTIFACT: the "Type" column of the arcanotoxin poison\'s SRD stat block ("poison, injury"), scraped as a standalone feature. No applicable Change',
  },

  // ── alchemist:energist-negative ──
  "alchemist:energist-negative:bomb:1": {
    archetypeId: "alchemist:energist-negative",
    name: "Bomb",
    level: 1,
    bucket: "subsystem",
    note: "verbatim restatement of the generic base Bomb ability with no energist-specific delta at all — nothing to extract",
  },
  "alchemist:energist-negative:energist-bombs:1": {
    archetypeId: "alchemist:energist-negative",
    name: "Energist Bombs",
    level: 1,
    bucket: "blocked",
    note: "retypes bomb damage AND changes its progression (1d4 per 2 levels instead of 1d6 per odd level for the negative-energy path) — a magnitude change with no applied target (class note 2)",
  },
  "alchemist:energist-negative:energist-resistance:2": {
    archetypeId: "alchemist:energist-negative",
    name: "Energist Resistance",
    level: 2,
    bucket: "numeric",
    note: 'flat energy resistance equal to alchemist level "to positive or negative energy, whichever would naturally harm him" — for the ordinary (living, non-undead) alchemist this is always negative energy; replaces poison resistance',
  },
  "alchemist:energist-negative:energy-focus:1": {
    archetypeId: "alchemist:energist-negative",
    name: "Energy Focus",
    level: 1,
    bucket: "subsystem",
    note: "swaps formula-book spell access (harm/inflict for heal/cure) — no Change-shaped number",
  },
  "alchemist:energist-negative:healing-ampoule:2": {
    archetypeId: "alchemist:energist-negative",
    name: "Healing Ampoule",
    level: 2,
    bucket: "subsystem",
    note: "activated bomb-charge-spending heal/harm ampoule — targets others or undead, not the energist's own always-on stats",
  },

  // ── alchemist:energist-positive ──
  "alchemist:energist-positive:energist-bombs:1": {
    archetypeId: "alchemist:energist-positive",
    name: "Energist Bombs",
    level: 1,
    bucket: "blocked",
    note: "retypes bomb damage to positive energy (damaging undead only) — a magnitude/target-scope change with no applied target (class note 2)",
  },
  "alchemist:energist-positive:energist-resistance:2": {
    archetypeId: "alchemist:energist-positive",
    name: "Energist Resistance",
    level: 2,
    bucket: "numeric",
    note: "same Energist Resistance text as the negative-energy variant (see that entry) — for an ordinary living alchemist, still negative energy resistance = alchemist level",
  },
  "alchemist:energist-positive:energy-focus:1": {
    archetypeId: "alchemist:energist-positive",
    name: "Energy Focus",
    level: 1,
    bucket: "subsystem",
    note: "same generic Energy Focus text as the negative-energy variant — no Change-shaped number",
  },
  "alchemist:energist-positive:healing-ampoule:2": {
    archetypeId: "alchemist:energist-positive",
    name: "Healing Ampoule",
    level: 2,
    bucket: "subsystem",
    note: "same Healing Ampoule text as the negative-energy variant — targets others, not an always-on self number",
  },

  // ── alchemist:energy-scientist ──
  "alchemist:energy-scientist:attuned-resistance:2": {
    archetypeId: "alchemist:energy-scientist",
    name: "Attuned Resistance",
    level: 2,
    bucket: "situational",
    note: "real, scaling save bonus, but scoped to whichever element the energy scientist attunes to that day — a daily choice this engine has no build field to track",
  },
  "alchemist:energy-scientist:energy-bombs:1": {
    archetypeId: "alchemist:energy-scientist",
    name: "Energy Bombs",
    level: 1,
    bucket: "blocked",
    note: "retypes bomb damage to the daily-attuned element, with a magnitude penalty when a discovery mismatches it — no applied target for bomb damage (class note 2)",
  },
  "alchemist:energy-scientist:limited-extracts:1": {
    archetypeId: "alchemist:energy-scientist",
    name: "Limited Extracts",
    level: 1,
    bucket: "subsystem",
    note: "reduces extracts-per-day and restricts descriptors — no Change target for extract-slot counts",
  },
  "alchemist:energy-scientist:salvage-energy:2": {
    archetypeId: "alchemist:energy-scientist",
    name: "Salvage Energy",
    level: 2,
    bucket: "subsystem",
    note: "crafts temporary alchemical items from slain elementals — crafting mechanic, no self number",
  },

  // ── alchemist:fermenter ──
  "alchemist:fermenter:batch-brew:6": {
    archetypeId: "alchemist:fermenter",
    name: "Batch Brew",
    level: 6,
    bucket: "subsystem",
    note: "crafts extra tinctures per Craft check — crafting-throughput mechanic, no self-stat number",
  },
  "alchemist:fermenter:substance-tolerance:2": {
    archetypeId: "alchemist:fermenter",
    name: "Substance Tolerance",
    level: 2,
    bucket: "blocked",
    note: 'real, scaling save bonus, but scoped to "resist becoming addicted" — no addiction SAVE_CATEGORIES entry exists to express it',
  },
  "alchemist:fermenter:volatile-bombs:2": {
    archetypeId: "alchemist:fermenter",
    name: "Volatile Bombs",
    level: 2,
    bucket: "blocked",
    note: "+1 damage per die while under a drug/tincture/drink, at an attack-roll cost — a magnitude change to bomb damage with no applied target (class note 2)",
  },

  // ── alchemist:fire-bomber ──
  "alchemist:fire-bomber:fiery-cocktail:4": {
    archetypeId: "alchemist:fire-bomber",
    name: "Fiery Cocktail",
    level: 4,
    bucket: "subsystem",
    note: "splits an existing discovery's damage dice into a fire component — bomb-rider composition, replaces a discovery slot",
  },
  "alchemist:fire-bomber:fire-body:8": {
    archetypeId: "alchemist:fire-bomber",
    name: "Fire Body",
    level: 8,
    bucket: "subsystem",
    note: "adds elemental body I to the formula book — no Change-shaped number",
  },
  "alchemist:fire-bomber:fire-bombardier-su-or-ex:1": {
    archetypeId: "alchemist:fire-bomber",
    name: "Fire Bombardier (Su or Ex)",
    level: 1,
    bucket: "blocked",
    note: "+1 damage per die of fire damage on fire bombs — a magnitude change to bomb damage with no applied target (class note 2)",
  },
  "alchemist:fire-bomber:greater-fire-body:14": {
    archetypeId: "alchemist:fire-bomber",
    name: "Greater Fire Body",
    level: 14,
    bucket: "subsystem",
    note: "adds elemental body IV to the formula book — no Change-shaped number",
  },
  "alchemist:fire-bomber:improved-fire-body:10": {
    archetypeId: "alchemist:fire-bomber",
    name: "Improved Fire Body",
    level: 10,
    bucket: "subsystem",
    note: "adds elemental body II to the formula book — no Change-shaped number",
  },
  "alchemist:fire-bomber:weapon-and-armor-proficiency:1": {
    archetypeId: "alchemist:fire-bomber",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates base proficiency plus treats torches as simple weapons — proficiency grant, no Change",
  },

  // ── alchemist:first-world-innovator ──
  "alchemist:first-world-innovator:limited-bombs:1": {
    archetypeId: "alchemist:first-world-innovator",
    name: "Limited Bombs",
    level: 1,
    bucket: "blocked",
    note: "halves the alchemist's daily bomb count — directly alters the vendored bomb pool's `uses.maxFormula`, would double-count if backfilled separately (class note 2)",
  },
  "alchemist:first-world-innovator:primal-reagents:1": {
    archetypeId: "alchemist:first-world-innovator",
    name: "Primal Reagents",
    level: 1,
    bucket: "subsystem",
    note: "a daily randomized-effect resource (bomb/extract/mutagen tweaks) — unmodeled resource mechanic",
  },
  "alchemist:first-world-innovator:refined-reagents:2": {
    archetypeId: "alchemist:first-world-innovator",
    name: "Refined Reagents",
    level: 2,
    bucket: "subsystem",
    note: "lets primal reagents be re-rolled at a cost — resource mechanic, no self number",
  },

  // ── alchemist:gloom-chymist ──
  "alchemist:gloom-chymist:gloom:1": {
    archetypeId: "alchemist:gloom-chymist",
    name: "Gloom",
    level: 1,
    bucket: "subsystem",
    note: "retypes bomb damage to cold with the SAME unchanged 1d6-per-2-levels progression — a pure retype, nothing new to extract (class note 2)",
  },
  "alchemist:gloom-chymist:umbral-gloom:2": {
    archetypeId: "alchemist:gloom-chymist",
    name: "Umbral Gloom",
    level: 2,
    bucket: "subsystem",
    note: "shifts the local light level as a bomb rider — no applied target for light level, no damage-magnitude change",
  },

  // ── alchemist:grenadier-mc ──
  "alchemist:grenadier-mc:alchemical-weapon:2": {
    archetypeId: "alchemist:grenadier-mc",
    name: "Alchemical Weapon",
    level: 2,
    bucket: "subsystem",
    note: "transfers an alchemical item's effect onto a weapon attack — action-economy mechanic, no self-stat number",
  },
  "alchemist:grenadier-mc:directed-blast:6": {
    archetypeId: "alchemist:grenadier-mc",
    name: "Directed Blast",
    level: 6,
    bucket: "subsystem",
    note: "reshapes bomb splash into a cone — area-shape rider, no damage-magnitude change",
  },
  "alchemist:grenadier-mc:martial-weapon-proficiency:1": {
    archetypeId: "alchemist:grenadier-mc",
    name: "Martial Weapon Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "single named weapon proficiency grant — no Change",
  },
  "alchemist:grenadier-mc:precise-bombs:2": {
    archetypeId: "alchemist:grenadier-mc",
    name: "Precise Bombs",
    level: 2,
    bucket: "subsystem",
    note: "grants a bonus discovery (precise bombs) — discovery-list mechanic (class note 1)",
  },
  "alchemist:grenadier-mc:staggering-blast:10": {
    archetypeId: "alchemist:grenadier-mc",
    name: "Staggering Blast",
    level: 10,
    bucket: "situational",
    note: "real staggered-duration effect, but only on a confirmed critical hit with a bomb — a per-attack activation condition",
  },

  // ── alchemist:grenadier ──
  "alchemist:grenadier:alchemical-weapon:2": {
    archetypeId: "alchemist:grenadier",
    name: "Alchemical Weapon",
    level: 2,
    bucket: "subsystem",
    note: "same Alchemical Weapon mechanic as grenadier-mc's — action-economy mechanic, no self-stat number",
  },
  "alchemist:grenadier:directed-blast:6": {
    archetypeId: "alchemist:grenadier",
    name: "Directed Blast",
    level: 6,
    bucket: "subsystem",
    note: "same cone-reshape rider as grenadier-mc's — no damage-magnitude change",
  },
  "alchemist:grenadier:martial-weapon-proficiency:1": {
    archetypeId: "alchemist:grenadier",
    name: "Martial Weapon Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "single named weapon proficiency grant — no Change",
  },
  "alchemist:grenadier:precise-bombs:2": {
    archetypeId: "alchemist:grenadier",
    name: "Precise Bombs",
    level: 2,
    bucket: "subsystem",
    note: "grants a bonus discovery (precise bombs) — discovery-list mechanic (class note 1)",
  },
  "alchemist:grenadier:staggering-blast:10": {
    archetypeId: "alchemist:grenadier",
    name: "Staggering Blast",
    level: 10,
    bucket: "situational",
    note: "same critical-hit-triggered stagger as grenadier-mc's — per-attack activation condition",
  },

  // ── alchemist:gun-chemist ──
  "alchemist:gun-chemist:alchemical-ordnance:0": {
    archetypeId: "alchemist:gun-chemist",
    name: "Alchemical Ordnance",
    level: 0,
    bucket: "subsystem",
    note: "a firearm-ammunition analog of bombs, replacing the bomb class feature outright — same unmodeled-damage posture as bombs (class note 2)",
  },
  "alchemist:gun-chemist:cartridge-savant:2": {
    archetypeId: "alchemist:gun-chemist",
    name: "Cartridge Savant",
    level: 2,
    bucket: "subsystem",
    note: "raises the save DC of fired alchemical cartridges — no engine target for a consumable's own save DC",
  },
  "alchemist:gun-chemist:discoveries:0": {
    archetypeId: "alchemist:gun-chemist",
    name: "Discoveries",
    level: 0,
    bucket: "subsystem",
    note: "unlocks gun-chemist-specific discoveries — discovery-list mechanic (class note 1)",
  },
  "alchemist:gun-chemist:gunsmith:0": {
    archetypeId: "alchemist:gun-chemist",
    name: "Gunsmith",
    level: 0,
    bucket: "subsystem",
    note: "grants a battered gun plus the Gunsmithing feat — item/feat grant, no Change",
  },
  "alchemist:gun-chemist:repeat-fire:6": {
    archetypeId: "alchemist:gun-chemist",
    name: "Repeat Fire",
    level: 6,
    bucket: "subsystem",
    note: "grants a specific named feat (Rapid Reload, or a combat feat if already known) — not an open bonusFeats count",
  },
  "alchemist:gun-chemist:weapon-and-armor-proficiency:0": {
    archetypeId: "alchemist:gun-chemist",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency grant (simple weapons, firearms, light armor) — no Change",
  },

  // ── alchemist:herbalist ──
  "alchemist:herbalist:herbalism:1": {
    archetypeId: "alchemist:herbalist",
    name: "Herbalism",
    level: 1,
    bucket: "situational",
    note: "the Profession (herbalist) competence bonus is scoped to checks made to create alchemical items and to forage for and process herbs, not the skill wholesale (same scoping as the investigator natural philosopher's herbalism); the Craft(alchemy)-substitution and Int-to-Wis key-ability-score swap have no engine hook either",
  },
  "alchemist:herbalist:natural-magic:1": {
    archetypeId: "alchemist:herbalist",
    name: "Natural Magic",
    level: 1,
    bucket: "subsystem",
    note: "adds druid spells to the formula list — no Change-shaped number",
  },
  "alchemist:herbalist:seed-pod-blind:10": {
    archetypeId: "alchemist:herbalist",
    name: "Seed Pod (Blind)",
    level: 10,
    bucket: "subsystem",
    note: "SUSPECTED VENDORED-DATA DUPLICATE: one of six ids (deafen/reduce-vision/entangle/sicken/blind/base) sharing byte-identical full Seed Pod text within this archetype. Not itself Change-shaped (unmodeled damage dice) regardless; recorded to flag the duplication",
  },
  "alchemist:herbalist:seed-pod-deafen:1": {
    archetypeId: "alchemist:herbalist",
    name: "Seed Pod (Deafen)",
    level: 1,
    bucket: "subsystem",
    note: "same six-way Seed Pod text duplicate as seed-pod-blind:10 — see that entry",
  },
  "alchemist:herbalist:seed-pod-entangle:5": {
    archetypeId: "alchemist:herbalist",
    name: "Seed Pod (Entangle)",
    level: 5,
    bucket: "subsystem",
    note: "same six-way Seed Pod text duplicate as seed-pod-blind:10 — see that entry",
  },
  "alchemist:herbalist:seed-pod-reduce-vision:2": {
    archetypeId: "alchemist:herbalist",
    name: "Seed Pod (Reduce Vision)",
    level: 2,
    bucket: "subsystem",
    note: "same six-way Seed Pod text duplicate as seed-pod-blind:10 — see that entry",
  },
  "alchemist:herbalist:seed-pod-sicken:8": {
    archetypeId: "alchemist:herbalist",
    name: "Seed Pod (Sicken)",
    level: 8,
    bucket: "subsystem",
    note: "same six-way Seed Pod text duplicate as seed-pod-blind:10 — see that entry",
  },
  "alchemist:herbalist:seed-pod:1": {
    archetypeId: "alchemist:herbalist",
    name: "Seed Pod",
    level: 1,
    bucket: "subsystem",
    note: "same six-way Seed Pod text duplicate as seed-pod-blind:10 — see that entry",
  },

  // ── alchemist:homunculist ──
  "alchemist:homunculist:experimentation:4": {
    archetypeId: "alchemist:homunculist",
    name: "Experimentation",
    level: 4,
    bucket: "subsystem",
    note: "grants the familiar eidolon-shaped evolution points — familiar-only mechanic, unmodeled",
  },
  "alchemist:homunculist:homunculus-familiar:1": {
    archetypeId: "alchemist:homunculist",
    name: "Homunculus Familiar",
    level: 1,
    bucket: "subsystem",
    note: "familiar grant, replaces mutagen with an unrelated ability — class note 3",
  },

  // ── alchemist:horticulturist ──
  "alchemist:horticulturist:bomb:1": {
    archetypeId: "alchemist:horticulturist",
    name: "Bomb",
    level: 1,
    bucket: "blocked",
    note: '"Herbal Bombs" reduces the base bomb die from 1d6 to 1d4 per increment — a magnitude change with no applied target (class note 2)',
  },
  "alchemist:horticulturist:fury-of-nature:14": {
    archetypeId: "alchemist:horticulturist",
    name: "Fury of Nature",
    level: 14,
    bucket: "subsystem",
    note: "1/day SLA from a small spell list — no self-stat number",
  },
  "alchemist:horticulturist:plant-familiar:4": {
    archetypeId: "alchemist:horticulturist",
    name: "Plant Familiar",
    level: 4,
    bucket: "subsystem",
    note: "familiar grant — no self-stat number",
  },
  "alchemist:horticulturist:plant-voice:2": {
    archetypeId: "alchemist:horticulturist",
    name: "Plant Voice",
    level: 2,
    bucket: "numeric",
    note: "canonical id for the flat +2 Knowledge (nature)/Survival bonus this archetype's description text stamps on both plant-voice:2 and speak-with-plants:10 (byte-identical vendored duplicate); the 10th-level constant speak with plants SLA has no applied target",
  },
  "alchemist:horticulturist:speak-with-plants:10": {
    archetypeId: "alchemist:horticulturist",
    name: "Speak With Plants",
    level: 10,
    bucket: "subsystem",
    note: "reprint of plant-voice:2's description text (vendored duplicate) and grants no independent number; the 10th-level constant speak with plants SLA it actually names has no applied target",
  },

  // ── alchemist:ice-chemist ──
  "alchemist:ice-chemist:cold-sweat:2": {
    archetypeId: "alchemist:ice-chemist",
    name: "Cold Sweat",
    level: 2,
    bucket: "numeric",
    note: "flat cold resistance equal to alchemist level, unconditional; the cold-survival environmental clause is dropped (no engine target); replaces poison resistance and poison immunity",
  },
  "alchemist:ice-chemist:frost-bomb:2": {
    archetypeId: "alchemist:ice-chemist",
    name: "Frost Bomb",
    level: 2,
    bucket: "subsystem",
    note: "grants the frost bomb discovery in place of the normal 2nd-level discovery — discovery-list mechanic (class note 1)",
  },
  "alchemist:ice-chemist:icy-bombs:1": {
    archetypeId: "alchemist:ice-chemist",
    name: "Icy Bombs",
    level: 1,
    bucket: "subsystem",
    note: "retypes the base bomb to cold damage (with the same unstated, presumably unchanged progression) — a pure retype, nothing new to extract (class note 2)",
  },

  // ── alchemist:inspired-chemist ──
  "alchemist:inspired-chemist:inspiring-cognatogen:1": {
    archetypeId: "alchemist:inspired-chemist",
    name: "Inspiring Cognatogen",
    level: 1,
    bucket: "subsystem",
    note: "grants the inspiring cognatogen discovery in place of mutagen — discovery-list mechanic (class note 1)",
  },

  // ── alchemist:internal-alchemist ──
  "alchemist:internal-alchemist:breath-mastery:1": {
    archetypeId: "alchemist:internal-alchemist",
    name: "Breath Mastery",
    level: 1,
    bucket: "subsystem",
    note: "extended breath-holding and suspended animation — no applied target",
  },
  "alchemist:internal-alchemist:disease-immunity:10": {
    archetypeId: "alchemist:internal-alchemist",
    name: "Disease Immunity",
    level: 10,
    bucket: "blocked",
    note: "reprint of disease-resistance:3's description text (vendored duplicate) and carries no independent grant — see that id for the wired save bonus",
  },
  "alchemist:internal-alchemist:disease-resistance:3": {
    archetypeId: "alchemist:internal-alchemist",
    name: "Disease Resistance",
    level: 3,
    bucket: "numeric",
    note: "canonical id for the disease save bonus this archetype's description text stamps on both disease-resistance:3 and disease-immunity:10 (byte-identical vendored duplicate); mirrors the base alchemist's Poison Resistance progression, gated to start at 3rd level",
  },
  "alchemist:internal-alchemist:uncanny-dodge:6": {
    archetypeId: "alchemist:internal-alchemist",
    name: "Uncanny Dodge",
    level: 6,
    bucket: "subsystem",
    note: "binary ability grant (can't be flat-footed) — no applied target",
  },

  // ── alchemist:interrogator ──
  "alchemist:interrogator:injections:1": {
    archetypeId: "alchemist:interrogator",
    name: "Injections",
    level: 1,
    bucket: "subsystem",
    note: "inflicts a Will-save penalty on a TARGET the interrogator hits — not a bonus to the interrogator's own stats",
  },
  "alchemist:interrogator:serums:1": {
    archetypeId: "alchemist:interrogator",
    name: "Serums",
    level: 1,
    bucket: "subsystem",
    note: "a debuff list applied to targets, replaces mutagen with an unrelated ability — class note 3",
  },

  // ── alchemist:mad-scientist ──
  "alchemist:mad-scientist:mad-genius:2": {
    archetypeId: "alchemist:mad-scientist",
    name: "Mad Genius",
    level: 2,
    bucket: "subsystem",
    note: "self-damage-funded randomized extract — unmodeled resource mechanic",
  },
  "alchemist:mad-scientist:mad-mutagen:4": {
    archetypeId: "alchemist:mad-scientist",
    name: "Mad Mutagen",
    level: 4,
    bucket: "subsystem",
    note: "randomizes WHICH existing mutagen variant is brewed at a Wisdom-damage cost — no new magnitude added to any mutagen's numbers",
  },

  // ── alchemist:metamorph ──
  "alchemist:metamorph:adaptive-physiology:3": {
    archetypeId: "alchemist:metamorph",
    name: "Adaptive Physiology",
    level: 3,
    bucket: "subsystem",
    note: "halves crafting time, speeds up poison application — action-economy mechanic, no self-stat number",
  },
  "alchemist:metamorph:mutagen:1": {
    archetypeId: "alchemist:metamorph",
    name: "Mutagen",
    level: 1,
    bucket: "subsystem",
    note: "grants access to the standard mutagen ability itself (this archetype otherwise lacks alchemy) — no new number beyond the already-modeled vendored mutagen buff",
  },
  "alchemist:metamorph:shapechanger:1": {
    archetypeId: "alchemist:metamorph",
    name: "Shapechanger",
    level: 1,
    bucket: "subsystem",
    note: "alter-self/monstrous-physique-shaped limited-use ability, replaces alchemy and Throw Anything — no Change-shaped number",
  },

  // ── alchemist:mindchemist ──
  "alchemist:mindchemist:cognatogen:1": {
    archetypeId: "alchemist:mindchemist",
    name: "Cognatogen",
    level: 1,
    bucket: "subsystem",
    note: "grants the cognatogen discovery in place of mutagen — discovery-list mechanic (class note 1)",
  },
  "alchemist:mindchemist:perfect-recall:2": {
    archetypeId: "alchemist:mindchemist",
    name: "Perfect Recall",
    level: 2,
    bucket: "numeric",
    note: 'adds the Intelligence modifier a second time on every Knowledge check — expressible via the vendored `skill.knowledge` compound-skill target (the same alias Bardic Knowledge uses); the secondary "Intelligence check to remember something" use is dropped (no applied target for raw ability checks)',
  },

  // ── alchemist:mixologist ──
  "alchemist:mixologist:alcoholic-alchemy:1": {
    archetypeId: "alchemist:mixologist",
    name: "Alcoholic Alchemy",
    level: 1,
    bucket: "subsystem",
    note: "raises potion/extract caster level at a cost, replaces mutagen with an unrelated crafting mechanic — class note 3",
  },
  "alchemist:mixologist:alcoholic-bombs:2": {
    archetypeId: "alchemist:mixologist",
    name: "Alcoholic Bombs",
    level: 2,
    bucket: "subsystem",
    note: "adds a drunkenness status-effect rider to bomb hits — no damage-magnitude change (class note 2)",
  },
  "alchemist:mixologist:alcoholic-resistance:2": {
    archetypeId: "alchemist:mixologist",
    name: "Alcoholic Resistance",
    level: 2,
    bucket: "blocked",
    note: "extends the alchemist's poison-resistance bonus to drunkenness saves — no drunkenness SAVE_CATEGORIES entry exists, and the base bonus it piggybacks on isn't itself a Change (poison resistance carries `changes: []` upstream)",
  },
  "alchemist:mixologist:mixologist-master:14": {
    archetypeId: "alchemist:mixologist",
    name: "Mixologist Master",
    level: 14,
    bucket: "subsystem",
    note: "doubles the alcoholic-extract-per-level cap — no Change target for extract-slot counts",
  },

  // ── alchemist:mnemostiller ──
  "alchemist:mnemostiller:anguish-bomb:1": {
    archetypeId: "alchemist:mnemostiller",
    name: "Anguish Bomb",
    level: 1,
    bucket: "blocked",
    note: "swaps bomb damage's ability basis (Cha for Int) and adds a conditional bonus die when the mnemostiller has taken damage in the last 24 hours — a magnitude change with no applied target (class note 2)",
  },
  "alchemist:mnemostiller:brewed-memories:2": {
    archetypeId: "alchemist:mnemostiller",
    name: "Brewed Memories",
    level: 2,
    bucket: "subsystem",
    note: "adds spells to the formula book — no Change-shaped number",
  },
  "alchemist:mnemostiller:mind-delver:10": {
    archetypeId: "alchemist:mnemostiller",
    name: "Mind-Delver",
    level: 10,
    bucket: "subsystem",
    note: "limited-use SLA (mind probe) — no self-stat number",
  },
  "alchemist:mnemostiller:natural-empath:2": {
    archetypeId: "alchemist:mnemostiller",
    name: "Natural Empath",
    level: 2,
    bucket: "subsystem",
    note: "grants the infusion discovery as a bonus — discovery-list mechanic (class note 1)",
  },
  "alchemist:mnemostiller:persistent-rasugen:14": {
    archetypeId: "alchemist:mnemostiller",
    name: "Persistent rasugen",
    level: 14,
    bucket: "subsystem",
    note: "extends rasugen's duration only — no magnitude change (see rasugen:1)",
  },
  "alchemist:mnemostiller:rasugen:1": {
    archetypeId: "alchemist:mnemostiller",
    name: "Rasugen",
    level: 1,
    bucket: "blocked",
    note: 'a mutagen-family variant (brewed/imbibed "in all other ways like a mutagen") granting +2 alchemical on all saves and temp HP/level — replaces mutagen with real numbers of its own shape, needs buff-patch plumbing (class note 3)',
  },

  // ── alchemist:oenopion-researcher ──
  "alchemist:oenopion-researcher:acid-resistance:3": {
    archetypeId: "alchemist:oenopion-researcher",
    name: "Acid Resistance",
    level: 3,
    bucket: "numeric",
    note: "flat, unconditional acid resistance 5; replaces swift alchemy (changes: [] upstream)",
  },
  "alchemist:oenopion-researcher:experimental-mutagen:2": {
    archetypeId: "alchemist:oenopion-researcher",
    name: "Experimental Mutagen",
    level: 2,
    bucket: "subsystem",
    note: "an at-will player CHOICE to brew a half-strength, ally-shareable mutagen instead of the normal one — doesn't add to the alchemist's own always-on numbers",
  },

  // ── alchemist:oozemaster ──
  "alchemist:oozemaster:ooze-bomb:1": {
    archetypeId: "alchemist:oozemaster",
    name: "Ooze Bomb",
    level: 1,
    bucket: "blocked",
    note: "retypes bomb to acid, removes splash, and adds a new delayed acid-damage instance equal to Int modifier — a magnitude addition with no applied target (class note 2)",
  },
  "alchemist:oozemaster:ooze-resistance:2": {
    archetypeId: "alchemist:oozemaster",
    name: "Ooze resistance",
    level: 2,
    bucket: "blocked",
    note: "real, scaling save bonus, but scoped to \"the extraordinary and supernatural abilities of oozes\" — a creature-type-scoped bonus with no SAVE_CATEGORIES axis for the attacker's type (same gap as the community feat sweep's Vengeful Banisher/Witchbreaker precedent)",
  },
  "alchemist:oozemaster:ooze-toxin:1": {
    archetypeId: "alchemist:oozemaster",
    name: "Ooze Toxin",
    level: 1,
    bucket: "subsystem",
    note: "extracts and delivers toxin from a slain ooze onto a target — not a bonus to the oozemaster's own stats",
  },

  // ── alchemist:perfumer ──
  "alchemist:perfumer:atomized-extracts:1": {
    archetypeId: "alchemist:perfumer",
    name: "Atomized Extracts",
    level: 1,
    bucket: "subsystem",
    note: "changes extract delivery method (sprayed vs. drunk) — no Change-shaped number",
  },
  "alchemist:perfumer:effervescent-bomb:1": {
    archetypeId: "alchemist:perfumer",
    name: "Effervescent Bomb",
    level: 1,
    bucket: "blocked",
    note: "replaces the bomb's direct-hit/splash mechanic with a persistent-area puddle with its own separate damage progression — a magnitude change with no applied target (class note 2)",
  },
  "alchemist:perfumer:persistent-pheromones:14": {
    archetypeId: "alchemist:perfumer",
    name: "Persistent Pheromones",
    level: 14,
    bucket: "subsystem",
    note: "lets one atomizer affect up to four targets — targets others, not a self number",
  },
  "alchemist:perfumer:pheromones:1": {
    archetypeId: "alchemist:perfumer",
    name: "Pheromones",
    level: 1,
    bucket: "subsystem",
    note: "sprays a Cha/Con/skill-shifting mixture on a willing creature (self or ally, ambiguous) as an activated resource, replaces mutagen with an unrelated ability — class note 3",
  },

  // ── alchemist:plague-bringer ──
  "alchemist:plague-bringer:disease-immunity:10": {
    archetypeId: "alchemist:plague-bringer",
    name: "Disease immunity",
    level: 10,
    bucket: "blocked",
    note: "reprint of disease-resistance:2's description text (vendored duplicate) and carries no independent grant — see that id for the wired save bonus",
  },
  "alchemist:plague-bringer:disease-resistance:2": {
    archetypeId: "alchemist:plague-bringer",
    name: "Disease Resistance",
    level: 2,
    bucket: "numeric",
    note: "canonical id for the scaling disease save bonus this archetype's description text stamps on both disease-resistance:2 and disease-immunity:10 (byte-identical vendored duplicate); the 10th-level full disease immunity clause has no immunity display target and is dropped",
  },
  "alchemist:plague-bringer:plague-vial:1": {
    archetypeId: "alchemist:plague-bringer",
    name: "Plague Vial",
    level: 1,
    bucket: "subsystem",
    note: "inflicts a disease effect on attackers/weapon targets, replaces mutagen with an unrelated ability — class note 3",
  },

  // ── alchemist:preservationist ──
  "alchemist:preservationist:bottled-ally-i:2": {
    archetypeId: "alchemist:preservationist",
    name: "Bottled Ally I",
    level: 2,
    bucket: "subsystem",
    note: "adds summon nature's ally I to the formula book — no Change-shaped number",
  },
  "alchemist:preservationist:bottled-ally-ii:5": {
    archetypeId: "alchemist:preservationist",
    name: "Bottled Ally II",
    level: 5,
    bucket: "subsystem",
    note: "adds summon nature's ally II to the formula book — no Change-shaped number",
  },
  "alchemist:preservationist:bottled-ally-iii:8": {
    archetypeId: "alchemist:preservationist",
    name: "Bottled Ally III",
    level: 8,
    bucket: "subsystem",
    note: "adds summon nature's ally IV to the formula book — no Change-shaped number",
  },
  "alchemist:preservationist:bottled-ally-iv:10": {
    archetypeId: "alchemist:preservationist",
    name: "Bottled Ally IV",
    level: 10,
    bucket: "subsystem",
    note: "adds summon nature's ally V to the formula book — no Change-shaped number",
  },
  "alchemist:preservationist:bottled-ally-v:14": {
    archetypeId: "alchemist:preservationist",
    name: "Bottled Ally V",
    level: 14,
    bucket: "subsystem",
    note: "adds summon nature's ally VII to the formula book — no Change-shaped number",
  },
  "alchemist:preservationist:bottled-ally-vi:18": {
    archetypeId: "alchemist:preservationist",
    name: "Bottled Ally VI",
    level: 18,
    bucket: "subsystem",
    note: "adds summon nature's ally IX to the formula book — no Change-shaped number",
  },

  // ── alchemist:psychonaut ──
  "alchemist:psychonaut:bomb-psychonaut:1": {
    archetypeId: "alchemist:psychonaut",
    name: "Bomb (Psychonaut)",
    level: 1,
    bucket: "blocked",
    note: "reduces bomb damage dice one step (d6 to d4, etc.) — a magnitude change with no applied target (class note 2)",
  },
  "alchemist:psychonaut:greater-precognition:15": {
    archetypeId: "alchemist:psychonaut",
    name: "Greater Precognition",
    level: 15,
    bucket: "subsystem",
    note: "adds moment of prescience to the formula book in place of a bomb damage-increase step — no Change-shaped number",
  },
  "alchemist:psychonaut:master-precognition:17": {
    archetypeId: "alchemist:psychonaut",
    name: "Master Precognition",
    level: 17,
    bucket: "subsystem",
    note: "adds foresight to the formula book in place of a bomb damage-increase step — no Change-shaped number",
  },
  "alchemist:psychonaut:precognition:5": {
    archetypeId: "alchemist:psychonaut",
    name: "Precognition",
    level: 5,
    bucket: "subsystem",
    note: "adds augury to the formula book — no Change-shaped number",
  },
  "alchemist:psychonaut:psychic-senses:8": {
    archetypeId: "alchemist:psychonaut",
    name: "Psychic Senses",
    level: 8,
    bucket: "subsystem",
    note: "adds several divination spells to the formula book — no Change-shaped number",
  },
  "alchemist:psychonaut:remote-consciousness:10": {
    archetypeId: "alchemist:psychonaut",
    name: "Remote Consciousness",
    level: 10,
    bucket: "subsystem",
    note: "adds several travel/communication spells to the formula book — no Change-shaped number",
  },

  // ── alchemist:ragechemist ──
  "alchemist:ragechemist:lumbering-rage:10": {
    archetypeId: "alchemist:ragechemist",
    name: "Lumbering Rage",
    level: 10,
    bucket: "blocked",
    note: "adds a +2 morale Constitution bonus (and a Dex penalty) directly to the rage mutagen toggle — direct mutagen-number modification, class note 3",
  },
  "alchemist:ragechemist:rage-mutagen:2": {
    archetypeId: "alchemist:ragechemist",
    name: "Rage Mutagen",
    level: 2,
    bucket: "blocked",
    note: 'explicitly increases "that mutagen\'s bonus to Strength" by +2 — direct mutagen-number modification, class note 3',
  },
  "alchemist:ragechemist:sturdy-rage:6": {
    archetypeId: "alchemist:ragechemist",
    name: "Sturdy Rage",
    level: 6,
    bucket: "blocked",
    note: "adds a +4 natural armor bonus directly to the rage mutagen toggle — direct mutagen-number modification, class note 3",
  },

  // ── alchemist:reanimator ──
  "alchemist:reanimator:bomb:1": {
    archetypeId: "alchemist:reanimator",
    name: "Bomb",
    level: 1,
    bucket: "blocked",
    note: "SUSPECTED VENDORED-DATA DUPLICATE: description is byte-identical to simple-reanimation:7's (both describe the reduced-die-size bomb reflavor). Extracting under both ids would double it once a reanimator reaches both gates; also a magnitude change with no applied target regardless (class note 2)",
  },
  "alchemist:reanimator:create-greater-undead:15": {
    archetypeId: "alchemist:reanimator",
    name: "Create Greater Undead",
    level: 15,
    bucket: "subsystem",
    note: "adds create greater undead to the formula book — no Change-shaped number",
  },
  "alchemist:reanimator:create-undead:13": {
    archetypeId: "alchemist:reanimator",
    name: "Create Undead",
    level: 13,
    bucket: "subsystem",
    note: "adds create undead to the formula book — no Change-shaped number",
  },
  "alchemist:reanimator:simple-reanimation:7": {
    archetypeId: "alchemist:reanimator",
    name: "Simple Reanimation",
    level: 7,
    bucket: "blocked",
    note: "VENDORED-DATA BUG: this id's description is a verbatim, unedited copy of the generic base Bomb ability text (identical to bomb:1's) with NO reanimator-specific content describing an actual \"Simple Reanimation\" ability at all — see bomb:1's entry",
  },

  // ── alchemist:royal-alchemist ──
  "alchemist:royal-alchemist:alchemical-antidote:2": {
    archetypeId: "alchemist:royal-alchemist",
    name: "Alchemical Antidote",
    level: 2,
    bucket: "subsystem",
    note: "grants a save bonus to whoever DRINKS a crafted antidote, not the royal alchemist's own always-on stats — ally/consumable-targeted resource",
  },

  // ── alchemist:saboteur ──
  "alchemist:saboteur:chameleon-mutagen:1": {
    archetypeId: "alchemist:saboteur",
    name: "Chameleon Mutagen",
    level: 1,
    bucket: "blocked",
    note: 'a mutagen-family variant ("all limitations to mutagens apply") granting a scaling Stealth bonus and a climb speed while imbibed — replaces mutagen with real numbers of its own shape, needs buff-patch plumbing (class note 3)',
  },
  "alchemist:saboteur:persistent-chameleon-mutagen:14": {
    archetypeId: "alchemist:saboteur",
    name: "Persistent chameleon mutagen",
    level: 14,
    bucket: "subsystem",
    note: "extends chameleon mutagen's duration only — no magnitude change (see chameleon-mutagen:1)",
  },

  // ── alchemist:sacrament-alchemist ──
  "alchemist:sacrament-alchemist:divinely-inspired-alchemy:3": {
    archetypeId: "alchemist:sacrament-alchemist",
    name: "Divinely Inspired Alchemy",
    level: 3,
    bucket: "subsystem",
    note: "grants a temporary discovery once per day at reduced effective level — discovery-list mechanic (class note 1)",
  },
  "alchemist:sacrament-alchemist:sacramental-cognatogen:1": {
    archetypeId: "alchemist:sacrament-alchemist",
    name: "Sacramental Cognatogen",
    level: 1,
    bucket: "blocked",
    note: 'a mutagen-family variant ("brewed, imbibed, maintained... in the same way as a mutagen") granting cleric domain powers plus a flat -2 Dexterity penalty while active — replaces mutagen with real numbers, needs buff-patch plumbing (class note 3)',
  },

  // ── alchemist:tinkerer ──
  "alchemist:tinkerer:clockwork-bond:1": {
    archetypeId: "alchemist:tinkerer",
    name: "Clockwork Bond",
    level: 1,
    bucket: "subsystem",
    note: "familiar grant, replaces mutagen with an unrelated ability — class note 3",
  },
  "alchemist:tinkerer:clockwork-familiar:6": {
    archetypeId: "alchemist:tinkerer",
    name: "Clockwork Familiar",
    level: 6,
    bucket: "subsystem",
    note: "upgrades the familiar's type — familiar-only mechanic",
  },
  "alchemist:tinkerer:clockwork-mimicries:14": {
    archetypeId: "alchemist:tinkerer",
    name: "Clockwork Mimicries",
    level: 14,
    bucket: "subsystem",
    note: "crafts a temporary wondrous-item mimicry — item-crafting mechanic, no self number",
  },
  "alchemist:tinkerer:clockwork-upgrade:10": {
    archetypeId: "alchemist:tinkerer",
    name: "Clockwork Upgrade",
    level: 10,
    bucket: "subsystem",
    note: "swaps the familiar's carried item type — familiar-only mechanic",
  },
  "alchemist:tinkerer:greater-tinkering:8": {
    archetypeId: "alchemist:tinkerer",
    name: "Greater Tinkering",
    level: 8,
    bucket: "subsystem",
    note: "familiar enhancement pick-list (bite damage, DR, feat, Stealth) — all familiar-only bonuses, not the tinkerer's own",
  },
  "alchemist:tinkerer:tinkering:2": {
    archetypeId: "alchemist:tinkerer",
    name: "Tinkering",
    level: 2,
    bucket: "subsystem",
    note: "same familiar enhancement pick-list at an earlier tier — familiar-only bonuses",
  },

  // ── alchemist:toxicant ──
  "alchemist:toxicant:toxic-digestion:14": {
    archetypeId: "alchemist:toxicant",
    name: "Toxic Digestion",
    level: 14,
    bucket: "subsystem",
    note: "stores a swallowed poison to deliver to an attacker later — targets others, not a self number",
  },
  "alchemist:toxicant:toxic-secretion:1": {
    archetypeId: "alchemist:toxicant",
    name: "Toxic Secretion",
    level: 1,
    bucket: "subsystem",
    note: "damages/inflicts conditions on creatures that strike the toxicant with a natural/unarmed attack — targets attackers, not a self-stat bonus",
  },

  // ── alchemist:trap-breaker ──
  "alchemist:trap-breaker:explosive-disarm:5": {
    archetypeId: "alchemist:trap-breaker",
    name: "Explosive Disarm",
    level: 5,
    bucket: "subsystem",
    note: "spends a bomb to disable a trap via ranged attack — action-economy mechanic, no self-stat number",
  },
  "alchemist:trap-breaker:land-mine:6": {
    archetypeId: "alchemist:trap-breaker",
    name: "Land Mine",
    level: 6,
    bucket: "subsystem",
    note: "converts bombs into placed mines — resource/action mechanic, no self number",
  },
  "alchemist:trap-breaker:mine-engineering:10": {
    archetypeId: "alchemist:trap-breaker",
    name: "Mine Engineering",
    level: 10,
    bucket: "subsystem",
    note: "reduces the bomb-charge cost of land mines — resource-cost mechanic, no self-stat number",
  },
  "alchemist:trap-breaker:trapfinding:2": {
    archetypeId: "alchemist:trap-breaker",
    name: "Trapfinding",
    level: 2,
    bucket: "numeric",
    note: "grants the +1/2 level Trapfinding bonus — mirrors the vendored Trapfinding Change (class note 5)",
  },

  // ── alchemist:vaultbreaker ──
  "alchemist:vaultbreaker:breaking-and-entering:1": {
    archetypeId: "alchemist:vaultbreaker",
    name: "Breaking and Entering",
    level: 1,
    bucket: "numeric",
    note: 'grants Stealth as a class skill (not modeled here — class-skill lists aren\'t tracked per-archetype) plus the Trapfinding ability "as if a rogue" — mirrors the vendored Trapfinding Change (class note 5)',
  },
  "alchemist:vaultbreaker:enhanced-safecracking:3": {
    archetypeId: "alchemist:vaultbreaker",
    name: "Enhanced Safecracking",
    level: 3,
    bucket: "subsystem",
    note: "doubles a discovery's object-hardness-ignoring amount — no engine target for object-interaction numbers",
  },
  "alchemist:vaultbreaker:safecracking:1": {
    archetypeId: "alchemist:vaultbreaker",
    name: "Safecracking",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonus discovery (penetrating charge) and removes the Int-to-damage bonus on bombs — discovery-list mechanic plus a bomb-damage removal, both unmodeled (class notes 1/2)",
  },

  // ── alchemist:vivisectionist ──
  "alchemist:vivisectionist:sneak-attack:1": {
    archetypeId: "alchemist:vivisectionist",
    name: "Sneak Attack",
    level: 1,
    bucket: "subsystem",
    note: "grants rogue-shaped sneak attack dice (stacking with other sneak-attack sources) — no engine target for sneak attack dice on a non-rogue/ninja class feature grant",
  },
  "alchemist:vivisectionist:torturous-transformation:7": {
    archetypeId: "alchemist:vivisectionist",
    name: "Torturous Transformation",
    level: 7,
    bucket: "subsystem",
    note: "adds surgical-transformation spells to the formula book, applied to OTHER creatures — no self-stat number",
  },

  // ── alchemist:wasteland-blightbreaker ──
  "alchemist:wasteland-blightbreaker:healing-infusion-sp-su:2": {
    archetypeId: "alchemist:wasteland-blightbreaker",
    name: "Healing Infusion (Sp, Su)",
    level: 2,
    bucket: "subsystem",
    note: "extract-preparation mechanic for the healing subschool — no self-stat number",
  },
  "alchemist:wasteland-blightbreaker:swift-healing-infusions:6": {
    archetypeId: "alchemist:wasteland-blightbreaker",
    name: "Swift Healing Infusions",
    level: 6,
    bucket: "subsystem",
    note: "lets the healing-infusion trick be used more often, as a swift action — action-economy mechanic",
  },

  // ── alchemist:winged-marauder ──
  "alchemist:winged-marauder:flying-beast-tamer:1": {
    archetypeId: "alchemist:winged-marauder",
    name: "Flying Beast Tamer",
    level: 1,
    bucket: "subsystem",
    note: "flying animal-companion grant (alchemist level 1:1) — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's stat block; replaces mutagen with an unrelated ability, class note 3",
  },
};

/**
 * ── ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED ─────────────────────────────────
 *
 * Machine-extracted mechanical effects for alchemist archetype class
 * features (the prose→Change extraction pipeline, alchemist slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 13 of alchemist's 219
 * features cleared the `numeric` bar (see
 * `ALCHEMIST_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — alchemist's kit leans overwhelmingly on bombs,
 * mutagen, discoveries, and the formula book, all of which are either
 * vendored-formula pools this pipeline must not double-count against, or
 * deferred subsystems with no `Change` hook at all (see this file's header
 * doc comment).
 *
 * Confidence rubric (identical to fighter.ts's/magus.ts's):
 *  - "high": a literal or near-literal single sentence, no interpretation,
 *    or a direct mirror of an already-vendored formula for identical text
 *    (the four Trapfinding grants).
 *  - "medium": the extraction dropped part of a compound sentence (a second,
 *    unsupported save/skill scope; a secondary non-numeric use case), or
 *    rests on one reasonable default assumption the text itself flags as
 *    variable (Energist Resistance's "whichever would naturally harm him",
 *    assumed to mean "a living, non-undead character").
 *  - "low": not used in this pass.
 */
export const ALCHEMIST_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Aerochemist's "Aerodynamic Prowess" (Ultimate Wilderness) is a flat,
  // unconditional Fly-skill bonus scaling at 2nd/5th/8th level — replaces
  // poison resistance (changes: [] upstream, nothing suppressed).
  "alchemist:aerochemist:aerodynamic-prowess:2": {
    changes: [c("if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2))", "skill.fly")],
    detail: (level) => `+${level >= 8 ? 6 : level >= 5 ? 4 : 2} Fly`,
    confidence: "high",
    provenance:
      "At 2nd level, an aerochemist gains a +2 bonus on Fly checks. This bonus increases to " +
      "+4 at 5th level, and +6 at 8th level.",
  },

  // Alchemical Sapper's "Master Engineer" grants a flat +1/2 level bonus to
  // three explicitly-named skills: Knowledge (engineering) is a fixed skill
  // id (`ken`); Craft (stonemasonry)/(traps) are named parameterized
  // `crf.<slug>` instances, the same convention `archetype-effects.ts`
  // already uses for the vendored Pesh Expert's `skill.crf.alchemy`.
  "alchemist:alchemical-sapper:master-engineer:2": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.ken"),
      c("floor(@class.unlevel / 2)", "skill.crf.stonemasonry"),
      c("floor(@class.unlevel / 2)", "skill.crf.traps"),
    ],
    detail: (level) =>
      `+${Math.floor(level / 2)} Knowledge (engineering), Craft (stonemasonry), Craft (traps)`,
    confidence: "high",
    provenance:
      "At 2nd level, an alchemical sapper adds 1/2 his alchemist level to Knowledge " +
      "(engineering) checks, Craft (stonemasonry) checks, and Craft (traps) checks.",
  },

  // Alchemical Trapper's "Trapfinding" grant mirrors the vendored base
  // Trapfinding Change exactly (skill.dev only — see this file's class
  // note 5 for why the Perception half is dropped).
  "alchemist:alchemical-trapper:trapfinding:4": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dev")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Disable Device`,
    confidence: "high",
    provenance:
      "At 4th level, an alchemical trapper can find and disable traps, as the rogue class " +
      "feature of the same name.",
  },

  // Crypt Breaker's own "Trapfinding" grants the identical bonus one level
  // earlier (1st instead of 4th), replacing the Brew Potion bonus feat.
  "alchemist:crypt-breaker:trapfinding:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dev")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Disable Device`,
    confidence: "high",
    provenance:
      "A crypt breaker adds 1/2 his level on Perception checks made to locate traps and to " +
      "Disable Device checks (minimum +1).",
  },

  // Trap Breaker's own "Trapfinding" (2nd level) grants the same bonus,
  // replacing poison use and poison resistance +2.
  "alchemist:trap-breaker:trapfinding:2": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dev")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Disable Device`,
    confidence: "high",
    provenance:
      "Starting at 2nd level, a trap breaker adds 1/2 his alchemist level on Perception checks " +
      "made to locate traps and on Disable Device checks.",
  },

  // Vaultbreaker's "Breaking and Entering" grants Trapfinding by reference
  // ("as if he were a rogue with the trapfinding ability") rather than by
  // restating the formula — medium confidence since the number itself isn't
  // spelled out in this feature's own text, only mirrored from the
  // Trapfinding convention (class note 5). The Stealth class-skill grant is
  // dropped (class-skill lists aren't tracked per archetype in this engine).
  "alchemist:vaultbreaker:breaking-and-entering:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dev")],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Disable Device (Stealth class skill not tracked)`,
    confidence: "medium",
    provenance:
      "A vaultbreaker gains Stealth as a class skill and can disarm magical traps as if he " +
      "were a rogue with the trapfinding ability.",
  },

  // Ectochymist's "Cool-Headed" is a flat, scaling save bonus against death
  // and fear (both real SAVE_CATEGORIES entries); "negative energy effects"
  // has no category and is dropped (flagged in detail) — replaces poison
  // resistance.
  "alchemist:ectochymist:cool-headed:2": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["death", "fear"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 6 : level >= 5 ? 4 : 2} vs. death/fear (negative energy effects not modeled)`,
    confidence: "medium",
    provenance:
      "At 2nd level, an ectochymist gains a +2 bonus on saves against death, fear, and " +
      "negative energy effects. This bonus increases to +4 at 5th level, and to +6 at 8th level.",
  },

  // Energist (Negative)'s "Energist Resistance" grants energy resistance
  // equal to alchemist level "to positive or negative energy, whichever
  // would naturally harm him" — for the ordinary living, non-undead
  // alchemist this always resolves to negative energy, independent of which
  // bomb-energy path was chosen at 1st level. Replaces poison resistance.
  "alchemist:energist-negative:energist-resistance:2": {
    changes: [c("@class.unlevel", "eres.negative")],
    detail: (level) => `${level} negative energy resistance (assumes a living alchemist)`,
    confidence: "medium",
    provenance:
      "At 2nd level, an energist gains energy resistance equal to his alchemist level to " +
      "positive or negative energy, whichever would naturally harm him.",
  },

  // Energist (Positive) carries the identical "Energist Resistance" text —
  // same reasoning and same resolved resistance type.
  "alchemist:energist-positive:energist-resistance:2": {
    changes: [c("@class.unlevel", "eres.negative")],
    detail: (level) => `${level} negative energy resistance (assumes a living alchemist)`,
    confidence: "medium",
    provenance:
      "At 2nd level, an energist gains energy resistance equal to his alchemist level to " +
      "positive or negative energy, whichever would naturally harm him.",
  },

  // Ice Chemist's "Cold Sweat" is a flat, unconditional cold resistance
  // equal to alchemist level — replaces poison resistance and poison
  // immunity (both changes: [] upstream).
  "alchemist:ice-chemist:cold-sweat:2": {
    changes: [c("@class.unlevel", "eres.cold")],
    detail: (level) => `${level} cold resistance`,
    confidence: "high",
    provenance:
      "At 2nd level, an ice chemist channels her affinity for cold energy into her personal " +
      "space, keeping herself and her gear cool. She gains cold resistance equal to her " +
      "alchemist level",
  },

  // Mindchemist's "Perfect Recall" doubles the Intelligence bonus on every
  // Knowledge check — expressible via the vendored `skill.knowledge`
  // compound-skill alias (the same one Bardic Knowledge already uses,
  // confirmed in tables.ts's SKILL_GROUPS). The secondary "Intelligence
  // check to remember something" use has no applied target (raw ability
  // checks aren't modeled) and is dropped.
  "alchemist:mindchemist:perfect-recall:2": {
    changes: [c("@abilities.int.mod", "skill.knowledge")],
    detail: () => "+Int modifier (again) on Knowledge checks",
    confidence: "high",
    provenance:
      "When making a Knowledge check, he may add his Intelligence bonus on the check a second " +
      "time.",
  },

  // Oenopion Researcher's "Acid Resistance" is a flat acid resistance 5,
  // unconditional — replaces swift alchemy (changes: [] upstream).
  "alchemist:oenopion-researcher:acid-resistance:3": {
    changes: [c("5", "eres.acid")],
    detail: () => "5 acid resistance",
    confidence: "high",
    provenance: "At 3rd level, an Oenopion researcher gains acid resistance 5.",
  },

  // Plague Bringer's "Disease Resistance" and "Disease Immunity" share
  // byte-identical vendored description text (see the header's oddity
  // list); `disease-resistance:2` is the canonical id for the scaling save
  // bonus, matching the base alchemist's Poison Resistance progression
  // (+2/+4/+6 at 2nd/5th/8th, confirmed against
  // `POISON_RESISTANCE_ALCHEMIST_INVESTIGATOR` in `class-feature-effects.ts`).
  // The 10th-level "completely immune to disease" clause has no immunity
  // display target in this engine and is dropped.
  "alchemist:plague-bringer:disease-resistance:2": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["disease"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 6 : level >= 5 ? 4 : 2} vs. disease (10th-level disease immunity not modeled)`,
    confidence: "high",
    provenance:
      "a plague bringer gains a +2 bonus on all saving throws against disease. This bonus " +
      "increases to +4 at 5th level, and to +6 at 8th level.",
  },

  // Internal Alchemist's "Disease Resistance" and "Disease Immunity" share
  // byte-identical vendored description text (see the header's oddity
  // list); `disease-resistance:3` is the canonical id. The bonus is
  // defined as mirroring "his alchemist class bonus against poison" — the
  // same +2/+4/+6 at 2nd/5th/8th progression as Plague Bringer above
  // (confirmed against `POISON_RESISTANCE_ALCHEMIST_INVESTIGATOR` in
  // `class-feature-effects.ts`); this feature's own 3rd-level gate just
  // means the bonus is always +2 the first two levels it's held (3rd-4th).
  // The "becomes immune to disease" clause riding on the separate,
  // unmodeled 10th-level poison immunity ability is dropped.
  "alchemist:internal-alchemist:disease-resistance:3": {
    changes: [
      {
        formula: "if(gte(@class.unlevel, 8), 6, if(gte(@class.unlevel, 5), 4, 2))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["disease"],
      },
    ],
    detail: (level) =>
      `+${level >= 8 ? 6 : level >= 5 ? 4 : 2} vs. disease, mirroring the alchemist's poison bonus (disease immunity at poison immunity not modeled)`,
    confidence: "high",
    provenance:
      "an internal alchemist gains a bonus on all saving throws against disease equal to his " +
      "alchemist class bonus against poison.",
  },

  // Horticulturist's "Plant Voice" and "Speak With Plants" share
  // byte-identical vendored description text (see the header's oddity
  // list); `plant-voice:2` is the canonical id for the flat Knowledge
  // (nature)/Survival bonus. The 10th-level constant speak with plants
  // ability is explicitly supernatural in the vendored text, not
  // spell-like, so it's outside the spell-like-abilities table's charter
  // and has no applied target here either.
  "alchemist:horticulturist:plant-voice:2": {
    changes: [c("2", "skill.kna"), c("2", "skill.sur")],
    detail: () => "+2 Knowledge (nature), +2 Survival (10th-level speak with plants not modeled)",
    confidence: "high",
    provenance: "He gains a +2 bonus on Knowledge (nature) and Survival checks",
  },
};
