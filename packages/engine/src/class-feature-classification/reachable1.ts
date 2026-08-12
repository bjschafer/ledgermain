/**
 * Class-feature classification shard: wave assignment "reachable1" — features
 * granted through some `RefData.classes[*].features` list (base or prestige),
 * so a `CLASS_FEATURE_CHANGE_PATCHES` entry can reach them. Owner-assigned
 * worklist; `index.ts` documents the shard convention.
 */

import type { ClassFeatureClassificationEntry } from "./types.js";

const POOL_NOTE =
  "Grants a limited-use resource pool/points, not a flat sheet number; pools with a vendored uses.maxFormula already ride the generic resource-pool pipeline (resources.ts) for free, and this is not a Change-shaped effect for this table either way.";

const PERFORMANCE_NOTE =
  "A bardic-performance-shaped ability (activated, maintained, chosen from a list of effects): mirrors the archetype-wave rule that any performance modification is subsystem, whether or not it happens to carry a clean formula, since there is no Change mechanism for an activated maintained effect beyond the resource pool plus linked-buff toggle.";

const COMMAND_NOTE =
  "One of Battle Herald's mutually exclusive maintained-action commands, chosen from a list while Inspiring Command is active: same activated/maintained-choice shape as a bardic performance, so subsystem rather than a flat Change even though the bonus itself has a clean formula.";

const EIDOLON_NOTE =
  "Summoner/eidolon-bond mechanic: grants or modifies a summoned companion, a merge/transform action, or a resource-gated activated ability. The eidolon itself has no Change-shaped presence on the summoner's own sheet in this engine.";

export const CLASS_FEATURE_CLASSIFICATION_REACHABLE_1: Readonly<
  Record<string, ClassFeatureClassificationEntry>
> = {
  "5laSZSUC4OPGpZfC": {
    id: "5laSZSUC4OPGpZfC",
    name: "Blackfire Pact",
    bucket: "blocked",
    note: "The profane bonus is scoped to a player-chosen evil outsider subtype (asura, daemon, demon, ...): outsider-subtype scope has no SAVE_CATEGORIES entry, and the subtype set and its per-subtype bonus both grow at 6th/9th level, so a static table entry cannot express the choice. The planar ally/binding boosts are a separate, unmodeled mechanic entirely.",
  },
  IaCFDKoeuoyRIkTB: {
    id: "IaCFDKoeuoyRIkTB",
    name: "Scarecrow",
    bucket: "situational",
    note: "Attack/damage bonus is conditioned on the target threatening an attack of opportunity against a member of the tiller's crop, a live tactical state the static sheet cannot detect without over-applying to every attack.",
  },
  UnxelcS7AFXnD9M9: {
    id: "UnxelcS7AFXnD9M9",
    name: "Blackfire Taint",
    bucket: "situational",
    note: "Standard-action activated attack against a chosen target within 30 feet, lasting a number of rounds; both the bonus and the target's penalty require live targeting and duration tracking, not an always-on number.",
  },
  jpBI7of5g4YbY5zV: {
    id: "jpBI7of5g4YbY5zV",
    name: "Favored Barn",
    bucket: "situational",
    note: "The skill/initiative bonuses only apply while inside the limits of a chosen community, a location-gated condition the static sheet has no way to detect; the ally share and safe-haven benefits are further conditioned on presence and non-emergency state.",
  },
  sTlu3zgAEDdJnER5: {
    id: "sTlu3zgAEDdJnER5",
    name: "Danger Sense",
    bucket: "blocked",
    note: "The Reflex-vs-traps clause is now expressible (saveCategories: [\"traps\"]), but 'Danger Sense' also names a wholly unrelated shieldmarshal initiative bonus (QsDvIB5mfC5c9DKG) reachable through the same name-keyed table, so it can't be safely wired without misapplying to that bearer. The AC-dodge and Perception-vs-surprise clauses stay unexpressible regardless (no AC conditional mechanism; Perception is scoped narrower than the whole skill).",
  },
  "15va0QO7X8dk5YTR": {
    id: "15va0QO7X8dk5YTR",
    name: "Blood Pool",
    bucket: "subsystem",
    note:
      POOL_NOTE +
      " Blood Pool carries no vendored uses field either, so it does not even ride that pipeline automatically; the pool size, spend/recover rules, and overload risk (sickened, then a homicidal rage) are all player-tracked mechanics with no flat Change target.",
  },
  "9H0XqVPPLL8evAIc": {
    id: "9H0XqVPPLL8evAIc",
    name: "Channel Past Incarnation",
    bucket: "subsystem",
    note: "Once-per-day activated ability granting a chosen special quality (bite/claws, blindsense, darkvision, ...) from a fixed list for the rest of the day: a choice-from-a-list grant, not a flat number.",
  },
  "0j7haa7K5O1CJ3ot": {
    id: "0j7haa7K5O1CJ3ot",
    name: "Resist Nature's Lure",
    bucket: "blocked",
    note: "Save bonus is scoped to a named creature type (fey) and to spells/effects that target plants — a property of the effect's source, not a SAVE_CATEGORIES entry. Matches the standing precedent for creature-type-scoped save bonuses in class-feature-effects.ts's header.",
  },
  "0nv33ONVpRz7g41J": {
    id: "0nv33ONVpRz7g41J",
    name: "Thunderous Charge",
    bucket: "situational",
    note: "Full-round-action mounted charge, uses-per-day gated, imposing a Reflex save on nearby enemies; both the activation and the enemy-facing save DC are live-combat state the static sheet cannot carry as an unconditional number.",
  },
  "2M56kfIOws5yYtxq": {
    id: "2M56kfIOws5yYtxq",
    name: "Inspire Competence",
    bucket: "subsystem",
    note:
      PERFORMANCE_NOTE +
      " Also purely ally-targeted (the bard explicitly cannot use it on himself), reinforcing there is no self-facing number to carry.",
  },
  "6Ouq3IotfDzfos5z": {
    id: "6Ouq3IotfDzfos5z",
    name: "Shaitan's Blessing",
    bucket: "blocked",
    note: "The save bonus belongs entirely to the asavir's mount, not the asavir — matches the standing precedent named for this exact feature in class-feature-effects.ts's header. Mounts/animal companions have no modeled sheet in this engine, so there is no PC-facing target at all.",
  },
  B1a8xXoo2CkuI2oF: {
    id: "B1a8xXoo2CkuI2oF",
    name: "Performance: Song of Silver",
    bucket: "subsystem",
    note:
      PERFORMANCE_NOTE +
      " Also grants a breath of life effect and area silver-weapon treatment on activation, further reinforcing the activated-ability shape.",
  },
  BoEkMviJrW0PKmhj: {
    id: "BoEkMviJrW0PKmhj",
    name: "Trap Sense",
    bucket: "blocked",
    note: "The Reflex clause is now expressible (saveCategories: [\"traps\"]), but this exact name is also granted by Aspis Agent's prestige copy (KpZwiUnU0VKymgmL, +1 at 4th and every 3 levels thereafter) and Pathfinder Delver's (HoV8PmENaujyGx7T, +1 at 2nd), both offset from this entry's Rogue/Barbarian/Investigator +1-at-3rd progression; CLASS_FEATURE_CHANGE_PATCHES keys purely by name with no per-class scoping, so one formula can't serve all three without misapplying to the other two. The AC-dodge half also has no engine mechanism regardless.",
  },
  IIlla2YtHAgM5P9U: {
    id: "IIlla2YtHAgM5P9U",
    name: "Eloquent Bargainer",
    bucket: "situational",
    note: "The Diplomacy/Gather Information bonus requires the balanced scale to be actively offering a bribe in the interaction, and the Charisma-check bonus applies only when casting lesser/greater planar binding — both are action-conditioned, not always-on.",
  },
  LIFTbzT5WDcsDn0O: {
    id: "LIFTbzT5WDcsDn0O",
    name: "Inspire Heroics",
    bucket: "subsystem",
    note: PERFORMANCE_NOTE,
  },
  NxKDrK81s0pokh0U: {
    id: "NxKDrK81s0pokh0U",
    name: "Third Eye",
    bucket: "subsystem",
    note: "Grants extra daily uses of the Eye of the Arclord feat activation, plus an aid-another ally buff usable only while the eye is open — additional activation uses and an ally-only conditional grant, no self-facing flat number.",
  },
  TtUzLh8gJY7t6yde: {
    id: "TtUzLh8gJY7t6yde",
    name: "Deft Strike",
    bucket: "subsystem",
    note: "A rules exception substituting Dexterity for Strength on damage with an Aldori dueling sword, not a flat bonus — this engine already exposes a per-weapon `damageAbility` override the player can set directly for exactly this shape, so no Change patch is needed to represent it.",
  },
  UEq1FHsuN6zIKXYW: {
    id: "UEq1FHsuN6zIKXYW",
    name: "Tranquility Aura",
    bucket: "blocked",
    note: "Named in class-feature-effects.ts's header as deliberately not promoted: redundant with the same class's own Tranquility ability once read as covering the Brightness Seeker herself, and ambiguous enough about self-inclusion not to risk a wrong number.",
  },
  X7gqbGkXTox6Ojhy: {
    id: "X7gqbGkXTox6Ojhy",
    name: "Inspire Greatness",
    bucket: "subsystem",
    note:
      PERFORMANCE_NOTE +
      " Also grants bonus Hit Dice and temporary hit points, a shape with no single flat Change target anyway.",
  },
  ZBLJDlr8YK8zuo9I: {
    id: "ZBLJDlr8YK8zuo9I",
    name: "Agency Secrets",
    bucket: "subsystem",
    note: "A meta-feature granting a choice from a fixed list of agency secrets (bonus feat, rogue talent, vigilante talent, caster level bump, ...) every 2 levels — a choice-from-a-list grant, not itself a number.",
  },
  h56K6HEBOItImPPL: {
    id: "h56K6HEBOItImPPL",
    name: "Inspire Courage",
    bucket: "subsystem",
    note:
      PERFORMANCE_NOTE +
      " Already rides a real vendored buff via `grantsBuffs`, toggled through the linked-buff mechanism on the Bardic Performance pool — that toggle does not change this table's bucket, matching the archetype-wave precedent that established this exact rule for this exact feature.",
  },
  qXqveaxXmdvqE8e8: {
    id: "qXqveaxXmdvqE8e8",
    name: "Display Weapon Prowess",
    bucket: "blocked",
    note: "The Intimidate bonus applies only while using Dazzling Display, not to Intimidate generally, and the other two bonuses apply to performance combat checks and dueling parry/resolve rolls (Ultimate Combat mechanics this engine does not model at all) — no expressible target for any of the three clauses.",
  },
  wew6ophJrcab24m6: {
    id: "wew6ophJrcab24m6",
    name: "Well-Versed",
    bucket: "numeric",
    note: 'The +4 bonus on saving throws against sonic and language-dependent effects is wired via CLASS_FEATURE_CHANGE_PATCHES, scoped with saveCategories: ["sonic", "languageDependent"]. The bardic-performance clause stays unpromoted: it names no SAVE_CATEGORIES entry of its own.',
  },
  zg6ReTqyzGwVgS4k: {
    id: "zg6ReTqyzGwVgS4k",
    name: "Inspiring Command",
    bucket: "subsystem",
    note:
      PERFORMANCE_NOTE +
      " Structurally the battle herald's own version of bardic performance (bard/battle herald levels stack for the shared inspire courage effect), and the specific command in effect is a choice from the Command: * list below.",
  },
  "67k0UvzGY3bvWOIM": {
    id: "67k0UvzGY3bvWOIM",
    name: "Corpulence",
    bucket: "numeric",
    note: "Unconditional, always-on natural armor bonus tiered by class level (+1 at 3rd, +2 at 7th); proposed as a CLASS_FEATURE_CHANGE_PATCHES entry (natural-armor half only — see proposals file for why the speed penalty stays unmodeled).",
  },
  "6pjr8jMFSKqXkBKk": {
    id: "6pjr8jMFSKqXkBKk",
    name: "Sneak Attack",
    bucket: "situational",
    note: "Extra precision damage only applies when the target is denied its Dex bonus or is flanked — an enemy-state condition the static sheet cannot apply to every attack without over-dealing damage; the dice-count progression itself (tables.ts's sneakAttackDice) is not wired to the base Rogue/Ninja grant on the derived sheet.",
  },
  DPMae8JEDhWn4tNh: {
    id: "DPMae8JEDhWn4tNh",
    name: "Command: Sound the Charge",
    bucket: "subsystem",
    note: COMMAND_NOTE,
  },
  KpZwiUnU0VKymgmL: {
    id: "KpZwiUnU0VKymgmL",
    name: "Trap Sense",
    bucket: "blocked",
    note: "The Reflex clause is now expressible (saveCategories: [\"traps\"]), but this Aspis Agent prestige copy's own progression (+1 at 4th level and every 3 levels thereafter) diverges from the base Rogue/Barbarian/Investigator copy's (+1 at 3rd) and Pathfinder Delver's (+1 at 2nd); since the name-keyed patch table has no per-class scoping, none of the three can be wired without misapplying to the others. The AC-dodge half also has no engine mechanism regardless.",
  },
  QOgv8IpxnWix0Vbv: {
    id: "QOgv8IpxnWix0Vbv",
    name: "All Eyes on Me",
    bucket: "situational",
    note: "Three-per-day swift-action activated challenge forcing a Will save on nearby enemies, whose failure applies flat-footed and an AC penalty to the target against allies' attacks — an activation- and enemy-state-scoped effect, not self-facing besides.",
  },
  nL9Ds9nflmID84vo: {
    id: "nL9Ds9nflmID84vo",
    name: "Debilitating Injury",
    bucket: "situational",
    note: "Applies a chosen penalty to a foe only when the rogue lands sneak attack damage, itself already a conditional trigger — an enemy-state-scoped debuff with a player choice of which penalty, not a self-facing always-on number.",
  },
  rg0FL5INDBUt2oSK: {
    id: "rg0FL5INDBUt2oSK",
    name: "Sneak Attack (UC)",
    bucket: "situational",
    note: "Same flanked/denied-Dex-bonus condition as base Sneak Attack; extra precision damage the static sheet cannot apply unconditionally.",
  },
  "2ktGOjprQvFwgAup": {
    id: "2ktGOjprQvFwgAup",
    name: "Controlled Charge",
    bucket: "situational",
    note: "The +4 (instead of +2) charge attack bonus and the waived post-charge AC penalty both apply only while making a mounted charge action, a specific combat action the static sheet cannot detect.",
  },
  "4wdsdOkgv4uEkS9K": {
    id: "4wdsdOkgv4uEkS9K",
    name: "Spellbooks (WIZ)",
    bucket: "subsystem",
    note: "Describes the spellbook mechanic itself (starting spells, spells known per level via Intelligence modifier, adding spells found elsewhere) — a rules mechanic handled by the spell-preparation model, not a Change-shaped bonus.",
  },
  "5fTHyPmis1IyBmNF": {
    id: "5fTHyPmis1IyBmNF",
    name: "Greater Aspect (UC)",
    bucket: "subsystem",
    note: "Modifies how many evolution points the summoner may divert to himself and at what evolution-pool cost — an evolution-point bookkeeping rule, not a flat sheet number.",
  },
  "7BfYNNkYjjBevun8": {
    id: "7BfYNNkYjjBevun8",
    name: "Ki Pool (UC)",
    bucket: "subsystem",
    note:
      POOL_NOTE +
      " Ki Pool (UC) carries a vendored `uses.maxFormula` (floor(@class.unlevel/2) + Wis mod) and already rides resources.ts's generic pool derivation.",
  },
  "7WaQxnVaaoL4AGr8": {
    id: "7WaQxnVaaoL4AGr8",
    name: "Uncanny Dodge",
    bucket: "subsystem",
    note: "A binary rules exception (can't be caught flat-footed, keeps Dex bonus vs invisible attackers) with no flat Change-shaped number; also auto-upgrades to improved uncanny dodge if already possessed from another class, itself a rules-interaction note.",
  },
  "81XUmdEI8Yr0UXeG": {
    id: "81XUmdEI8Yr0UXeG",
    name: "Greater Shield Ally",
    bucket: "situational",
    note: "Shield/save bonus applies only while an ally is within the eidolon's reach and the eidolon is not grappled/helpless/paralyzed/stunned/unconscious — live positional and companion-state conditions this engine cannot track since the eidolon has no modeled presence on the sheet.",
  },
  ASgFIcLE6KazWqbr: {
    id: "ASgFIcLE6KazWqbr",
    name: "Command: Inspired Tactics",
    bucket: "subsystem",
    note: COMMAND_NOTE,
  },
  AaZ3OdpKFsMC6dFg: {
    id: "AaZ3OdpKFsMC6dFg",
    name: "Shield Ally",
    bucket: "situational",
    note: "Same eidolon-proximity and eidolon-condition gating as Greater Shield Ally, applied to the summoner himself; the sheet has no way to know whether the eidolon is currently nearby and unimpaired.",
  },
  Aj7SwIo94HfcpR9R: {
    id: "Aj7SwIo94HfcpR9R",
    name: "Bond Senses",
    bucket: "subsystem",
    note:
      POOL_NOTE +
      " Bond Senses carries a vendored `uses.maxFormula` (@class.unlevel rounds/day) and already rides the resource-pool pipeline; the ability itself (sharing the eidolon's senses) is a rules grant, not a number.",
  },
  B095D28j36I9vkPT: {
    id: "B095D28j36I9vkPT",
    name: "Command: Teamwork",
    bucket: "subsystem",
    note: COMMAND_NOTE,
  },
  CW99G919xJkrIWAu: {
    id: "CW99G919xJkrIWAu",
    name: "Merge Forms",
    bucket: "subsystem",
    note:
      EIDOLON_NOTE +
      " Carries a vendored `uses.maxFormula` (@class.unlevel rounds/day) so it already rides the resource-pool pipeline.",
  },
  Cw4EdI7dpnXHVJ16: {
    id: "Cw4EdI7dpnXHVJ16",
    name: "Performance: True Spark's Guidance",
    bucket: "subsystem",
    note:
      PERFORMANCE_NOTE +
      " Targets an enemy undead creature with a Will save and level-scaled damage, entirely enemy-facing besides.",
  },
  DMlr95khD8K18jE1: {
    id: "DMlr95khD8K18jE1",
    name: "Mystic Pedagogue",
    bucket: "situational",
    note: "The Spellcraft bonus applies only to checks to learn a wizard spell or craft a magic item, not to Spellcraft generally (e.g. identifying items/spells) — a narrower task scope than the flat skill target would express, so a flat skill.spl Change would over-apply.",
  },
  GAoEM0kSfR4klZUz: {
    id: "GAoEM0kSfR4klZUz",
    name: "Command: Battle Magic",
    bucket: "subsystem",
    note: COMMAND_NOTE,
  },
  Got8x5eMbGLgR2lc: {
    id: "Got8x5eMbGLgR2lc",
    name: "Janni's Blessing",
    bucket: "numeric",
    note: "At 10th level grants an unconditional +1 luck bonus on all saving throws to the asavir herself; proposed as a CLASS_FEATURE_CHANGE_PATCHES entry (the roll-twice-and-choose-better half and the mount's own copy of the bonus are left unmodeled — see proposals file).",
  },
  IqXnJQyvUwxe95hT: {
    id: "IqXnJQyvUwxe95hT",
    name: "Persistent Commands",
    bucket: "subsystem",
    note: "A rules exception letting an already-active inspiring command keep running for a limited time while the battle herald is incapacitated — modifies how the Inspiring Command mechanic behaves, not a number of its own.",
  },
  J2xNgt1EMKsxPYiO: {
    id: "J2xNgt1EMKsxPYiO",
    name: "Crucial Taunt",
    bucket: "situational",
    note: "The bonus applies only to feint/demoralize/dirty-trick checks (not checks generally), can be banked and triggered later via an immediate action, and is language-dependent — an activation-and-scope-conditioned effect, not an always-on number.",
  },
  Jbiv5xT0ip0BtJNN: {
    id: "Jbiv5xT0ip0BtJNN",
    name: "Defensive Parry",
    bucket: "situational",
    note: "The dodge bonus to AC applies only while making a full attack with an Aldori dueling sword, a specific combat-action condition the static sheet cannot detect.",
  },
  Nw89fY2Kr7yQN4pE: {
    id: "Nw89fY2Kr7yQN4pE",
    name: "Undeath Initiate",
    bucket: "blocked",
    note: "The +5 bonus applies only to an ability/skill/save check tied to the specific, GM-adjudicated process of transforming into an undead creature (e.g. becoming a lich) — far narrower than any target this engine's vocabulary can express, and the rest of the feature is a rare narrative-only rule about retaining Intelligence/free will if slain by a create-spawn undead.",
  },
  OKLoUwr4M48ZxMZh: {
    id: "OKLoUwr4M48ZxMZh",
    name: "Command: Pincer Maneuver",
    bucket: "subsystem",
    note: COMMAND_NOTE,
  },
  QqJRCv71Efzu25Jg: {
    id: "QqJRCv71Efzu25Jg",
    name: "Appraising Eye",
    bucket: "numeric",
    note: "Unconditional +2 sacred bonus to all Appraise checks; proposed as a CLASS_FEATURE_CHANGE_PATCHES entry on skill.apr (the faster-appraisal-at-a-penalty alternate use stays unmodeled prose).",
  },
  U6LZteLyMA4gLAFF: {
    id: "U6LZteLyMA4gLAFF",
    name: "Greater Shield Ally (UC)",
    bucket: "situational",
    note: "Same eidolon-reach and eidolon-condition gating as the chained Greater Shield Ally; the sheet cannot track live eidolon position/state.",
  },
  UbYjMsQ8DDXRaX84: {
    id: "UbYjMsQ8DDXRaX84",
    name: "Marid's Blessing",
    bucket: "subsystem",
    note: "Grants a rules exception (no concentration check required for the mount's movement) plus a save bonus that belongs to the mount, not the asavir; the PC-facing content is the rules exception, which has no Change-shaped number, and the mount stat has no modeled sheet to land on.",
  },
  X0tGpISvrvBwb180: {
    id: "X0tGpISvrvBwb180",
    name: "Equine Bond",
    bucket: "subsystem",
    note: "Grants an animal companion (a horse) whose statistics scale with an effective druid level derived from asavir level — a companion grant, mirroring Nature Bond's animal-companion half, with no flat number of its own.",
  },
  XkVXOND8Q1nta92s: {
    id: "XkVXOND8Q1nta92s",
    name: "Scholiast",
    bucket: "situational",
    note: "Grants access to an additional arcane school power usable by spending uses of hand of the apprentice, itself a resource-gated activated ability — no unconditional number.",
  },
  YmWKyC6bPUqHf9iQ: {
    id: "YmWKyC6bPUqHf9iQ",
    name: "Eidolon",
    bucket: "subsystem",
    note: EIDOLON_NOTE,
  },
  Yr1ZNxgxDVsRwxtj: {
    id: "Yr1ZNxgxDVsRwxtj",
    name: "Eidolon (UC)",
    bucket: "subsystem",
    note: EIDOLON_NOTE,
  },
  Yr8dfM2d8JEWoYkr: {
    id: "Yr8dfM2d8JEWoYkr",
    name: "Wild Empathy",
    bucket: "subsystem",
    note: "Its own d20 + class level + Cha modifier check used to influence an animal's attitude — a self-contained check formula, not a modifier to an existing sheet stat, so there is no Change-shaped target to carry it on.",
  },
  ep8ylJydreztnRWD: {
    id: "ep8ylJydreztnRWD",
    name: "Command: Stand Firm",
    bucket: "subsystem",
    note: COMMAND_NOTE,
  },
  fJuxnPlNDncuHuT5: {
    id: "fJuxnPlNDncuHuT5",
    name: "Bond Senses (UC)",
    bucket: "subsystem",
    note:
      POOL_NOTE +
      " Carries a vendored `uses.maxFormula` (@class.unlevel rounds/day) and already rides the resource-pool pipeline.",
  },
  hPgtTh79AeIocmpt: {
    id: "hPgtTh79AeIocmpt",
    name: "Shield Ally (UC)",
    bucket: "situational",
    note: "Same eidolon-reach and eidolon-condition gating as chained Shield Ally; live companion state the static sheet cannot track.",
  },
  jXEgYhQCj2o1fAVZ: {
    id: "jXEgYhQCj2o1fAVZ",
    name: "Twin Eidolon",
    bucket: "subsystem",
    note:
      EIDOLON_NOTE +
      " Carries a vendored `uses.maxFormula` (@class.unlevel minutes/day) and already rides the resource-pool pipeline.",
  },
  k9ZGUwUB9yJiz4Ea: {
    id: "k9ZGUwUB9yJiz4Ea",
    name: "Merge Forms (UC)",
    bucket: "subsystem",
    note:
      EIDOLON_NOTE +
      " Carries a vendored `uses.maxFormula` (@class.unlevel rounds/day) and already rides the resource-pool pipeline.",
  },
  o2rdmt2ZK2lrJFSH: {
    id: "o2rdmt2ZK2lrJFSH",
    name: "Crop Guardian",
    bucket: "blocked",
    note: "Raises the aid-another bonus from +2 to +3, but only for crop members and only when using the aid another action — the aid-another combat maneuver has no Change target in this engine at all, and the boost is ally-scoped besides.",
  },
  oOtQDt83fZKEIvQs: {
    id: "oOtQDt83fZKEIvQs",
    name: "Secrets of Death",
    bucket: "subsystem",
    note: "Adds a chosen number of necromancy spells (equal to Intelligence modifier) to the character's spell list — a spell-list mechanic, not a Change-shaped number.",
  },
  "prestige:arcane-archer:enhance-arrows": {
    id: "prestige:arcane-archer:enhance-arrows",
    name: "Enhance Arrows",
    bucket: "blocked",
    note: "A real, growing enhancement bonus, but scoped only to arrows the arcane archer personally looses (never to other attacks she makes) — this engine's attack/damage Change targets have no way to restrict a bonus to one ammunition type, so applying it flatly would over-apply to melee or non-bow ranged attacks.",
  },
  "prestige:arcane-trickster:impromptu-sneak-attack": {
    id: "prestige:arcane-trickster:impromptu-sneak-attack",
    name: "Impromptu Sneak Attack",
    bucket: "situational",
    note: "Once (twice at 7th) per day, declares a single attack to ignore the target's Dex bonus to AC — a per-day activated, single-attack effect, not an always-on number.",
  },
  "prestige:assassin:uncanny-dodge": {
    id: "prestige:assassin:uncanny-dodge",
    name: "Uncanny Dodge (Assassin)",
    bucket: "subsystem",
    note: "Same binary rules-exception shape as base Uncanny Dodge (can't be flat-footed, upgrades to improved uncanny dodge if already possessed) — no flat Change-shaped number.",
  },
  qjpLIatoQIzmcehq: {
    id: "qjpLIatoQIzmcehq",
    name: "Wild Shape (SHI)",
    bucket: "subsystem",
    note: "A polymorph-style transformation into a chosen aspect's major form, gated by hours-per-day of wild shape — a transformation/choice grant, matching the posture of other polymorph-subschool abilities in this engine, with no flat sheet number.",
  },
  rCSJaGsJ5e8IBr2g: {
    id: "rCSJaGsJ5e8IBr2g",
    name: "Voice of Authority",
    bucket: "situational",
    note: "The self Diplomacy/Intimidate bonus is conditioned on sharing a language with the target, and the feature also bundles an ally-only Perception/Sense Motive bonus and a cavalier-tactician stacking rule — a mixed bundle that doesn't reduce to one clean unconditional self number, matching the precedent that identity/condition-scoped social-skill bonuses stay off the sheet as manual reminders rather than risk over-applying.",
  },
  rupiddOu3aueETSl: {
    id: "rupiddOu3aueETSl",
    name: "Faithful Drinker",
    bucket: "situational",
    note: "The Will save bonus only triggers immediately after drinking a potion/elixir/mutagen/draught and lasts 1 round — an activation-triggered, short-duration effect the static sheet cannot carry as an always-on number.",
  },
  tFy3rxyljSq56HSg: {
    id: "tFy3rxyljSq56HSg",
    name: "Phrenic Pool",
    bucket: "subsystem",
    note:
      POOL_NOTE +
      " Phrenic Pool carries a vendored `uses.maxFormula` and already rides the resource-pool pipeline, with a discipline-dependent ability score correction handled separately in resources.ts.",
  },
  tWE66WvFjS1o0S4y: {
    id: "tWE66WvFjS1o0S4y",
    name: "Fascinate",
    bucket: "subsystem",
    note:
      PERFORMANCE_NOTE +
      " Also purely enemy-facing (fascinates a target, applying a skill penalty to the target, not a bonus to the bard).",
  },
  tWvzTJUsT2FaBOZd: {
    id: "tWvzTJUsT2FaBOZd",
    name: "Agency Secret: Bluster",
    bucket: "subsystem",
    note: "A rules exception (removes the size-based Intimidate penalty/bonus interaction against larger creatures in both directions) with no flat number of its own.",
  },
  uURWe8xOp8w7YBQY: {
    id: "uURWe8xOp8w7YBQY",
    name: "Twin Eidolon (UC)",
    bucket: "subsystem",
    note:
      EIDOLON_NOTE +
      " Carries a vendored `uses.maxFormula` (@class.unlevel minutes/day) and already rides the resource-pool pipeline.",
  },
  wZ40bxNVn95BbLBV: {
    id: "wZ40bxNVn95BbLBV",
    name: "Nature Bond",
    bucket: "subsystem",
    note: "A choice between a cleric domain (granting its own powers/spells) or an animal companion — a choice-from-a-list grant, not a flat number, the same shape as the summoner's Eidolon.",
  },
  zr8k7IoQaIXGtmY8: {
    id: "zr8k7IoQaIXGtmY8",
    name: "Agency Secret: Hidden Stash (Ex or Sp)",
    bucket: "situational",
    note: "The Sleight of Hand bonus is scoped only to hiding small objects on her person, not Sleight of Hand generally, so a flat skill.slt Change would over-apply; the magic-aura use is a separate once-per-day activated ability besides.",
  },
};
