/**
 * Spiritualist's slice of the pipeline (2026-08-08). Spiritualist is an
 * already-modeled class (`phantom.ts`'s tracked companion creature) — the 125
 * vendored archetype features across its 23 archetypes are read in full and
 * bucketed as `numeric` / `situational` / `subsystem` / `blocked`, the same
 * methodology the fighter/magus pilots validated.
 *
 * ── Spiritualist-specific mechanical facts this pass relies on ────────────
 *
 * 1. **The phantom is a companion creature** (`phantom.ts`), not the
 *    spiritualist herself. EVERY phantom-scoped number — its own AC, saves,
 *    slam damage, skill ranks, spell-like abilities, auras, ability-score
 *    adjustments, emotional-focus abilities — is `subsystem` (or
 *    `situational` if it's real but conditioned): the character sheet never
 *    gets a phantom's own stat block written onto it, same posture as
 *    `familiar.ts`/`companion.ts`-scoped bonuses elsewhere in this pipeline.
 *    This is by far the dominant bucket here: entire archetypes (Grim
 *    Apostle's 22 features, for instance) do nothing but reskin the
 *    phantom's stat block.
 * 2. **Etheric Tether, Bonded Manifestation, and their ectoplasmic/
 *    incorporeal sub-forms are activated state machines**, not passive
 *    traits — every one of their base vendored `changes` is `[]` (confirmed:
 *    `class-features.json`'s Etheric Tether, Phantom, Bonded Manifestation,
 *    Bonded Senses, Ectoplasmic/Incorporeal Bonded Manifestation all carry
 *    zero `changes`), so there is nothing to double-count against, but also
 *    nothing baseline to build on: any archetype feature that only fires
 *    "while using bonded manifestation" or "while the phantom is fully
 *    manifested" is `situational`.
 * 3. **Shared Consciousness / Spiritual Interference / Greater Spiritual
 *    Interference (and every archetype reflavor of them) are gated on
 *    "while the phantom is confined in your consciousness" (or, for Spiritual
 *    Interference, "while within reach of your ectoplasmic phantom")** —
 *    real save/AC bonuses, but toggled off the moment the phantom manifests,
 *    which is the entire point of playing the class in combat. Per this
 *    pipeline's rule for conditional shared-consciousness clauses: this is a
 *    genuine ON/OFF condition tied to a player action (not an
 *    always-on-by-default state the way, say, "while wearing light armor"
 *    reads for a character who simply never removes their armor), so these
 *    stay `situational` even where the archetype changes WHAT the bonus
 *    protects against rather than its size.
 * 4. **Channel Energy grants** (Necrologist, Priest of the Fallen, Usher of
 *    Lost Souls) have no Change-shaped target for the ability's dice count or
 *    daily uses — same posture as `archetype-extracted/paladin.ts`'s
 *    Hospitaler entry (`resources.ts`'s channel-energy dice/uses machinery is
 *    keyed to the granting mechanism, not retrofittable from this static
 *    table) — `subsystem`.
 * 5. **A handful of features grant the spiritualist herself (not the
 *    phantom) a bonus keyed to "the two skills determined by your phantom's
 *    emotional focus"** (Seeker of Enlightenment). `phantom.ts`'s
 *    `EMOTIONAL_FOCI` table records those two skills per focus, but there is
 *    no `@phantom.*` formula path exposing the player's chosen focus to the
 *    formula evaluator, and a `Change`'s `target` string is fixed at
 *    authoring time — there is no mechanism in this static table to express
 *    "add X to whichever two skills the player's focus choice implies."
 *    `situational`, same shape as the fighter/magus pilots' freeform-slug
 *    skill bonuses (e.g. Master Smith's Craft specializations).
 *
 * Only 2 of spiritualist's 125 archetype features cleared the `numeric` bar
 * — see `SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION` below for the full
 * per-feature audit, done by reading every one of the 125 descriptions
 * individually (small enough to do exhaustively, same as magus's 150).
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── spiritualist:drowned-channeler ──
  "spiritualist:drowned-channeler:class-skills:0": {
    archetypeId: "spiritualist:drowned-channeler",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: "swaps Fly for Swim as a class skill — class-skill-list membership isn't a Change-shaped number",
  },
  "spiritualist:drowned-channeler:drowned-phantom:0": {
    archetypeId: "spiritualist:drowned-channeler",
    name: "Drowned Phantom",
    level: 0,
    bucket: "subsystem",
    note: "phantom-scoped (swim speed, water subtype, underwater slam penalty removal — companion-only per class note 1); the etheric-tether range change is a distance rule with no engine target (class note 2)",
  },
  "spiritualist:drowned-channeler:drowned-powers:5": {
    archetypeId: "spiritualist:drowned-channeler",
    name: "Drowned Powers",
    level: 5,
    bucket: "subsystem",
    note: "spell-like-ability grants (hydraulic push, slipstream, ride the waves, fluid form) — no Change target for SLA daily uses",
  },
  "spiritualist:drowned-channeler:drowned-spells:2": {
    archetypeId: "spiritualist:drowned-channeler",
    name: "Drowned Spells",
    level: 2,
    bucket: "subsystem",
    note: "adds aquatic spells to the spiritualist spell list — no Change-shaped number",
  },

  // ── spiritualist:ectoplasmatist ──
  "spiritualist:ectoplasmatist:ectoplasmic-armor:4": {
    archetypeId: "spiritualist:ectoplasmatist",
    name: "Ectoplasmic Armor",
    level: 4,
    bucket: "situational",
    note: "real +4 (then +6) armor bonus to AC, but only while the ectoplasmatist has her spiritual lash manifested — an activated-ability condition (class note 2), not always-on",
  },
  "spiritualist:ectoplasmatist:ectoplasmic-lash:1": {
    archetypeId: "spiritualist:ectoplasmatist",
    name: "Ectoplasmic Lash",
    level: 1,
    bucket: "subsystem",
    note: "manifests one or two ectoplasmic melee weapons with a scaling enhancement bonus (+1 at 2nd to +5 at 18th) in place of phantom/shared consciousness/etc. — an activated, freely-reshaped (light/one-handed/two-handed) manifested weapon with no build-tracked weapon instance to attach a Change to, same posture as the magus pilot's Mindblade Psychic Pool",
  },
  "spiritualist:ectoplasmatist:spiritual-combat:3": {
    archetypeId: "spiritualist:ectoplasmatist",
    name: "Spiritual Combat",
    level: 3,
    bucket: "subsystem",
    note: "an activated full-round-action combat routine (attack + free spell, spell-combat-style) — no baseline number, replaces bonded manifestation/phantom recall/dual bond (all activated/no-Change themselves)",
  },

  // ── spiritualist:exciter ──
  "spiritualist:exciter:excitation:2": {
    archetypeId: "spiritualist:exciter",
    name: "Excitation",
    level: 2,
    bucket: "subsystem",
    note: "activated, rapture-resource-spent grant of one of the phantom's own emotional-focus abilities — resource-gated and ultimately phantom-ability-scoped",
  },
  "spiritualist:exciter:fast-movement:0": {
    archetypeId: "spiritualist:exciter",
    name: "Fast Movement",
    level: 0,
    bucket: "numeric",
    note: "+10 ft. land speed while wearing light/medium/no armor and not under a heavy load — a verbatim restatement of the vendored generic Fast Movement class feature's own condition and formula (class-features.json's Fast Movement carries `if(and(lte(@armor.type,2),lt(@attributes.encumbrance.level,2)),10)`), replacing etheric tether (zero vendored changes, no double-count risk)",
  },
  "spiritualist:exciter:greater-rapture:12": {
    archetypeId: "spiritualist:exciter",
    name: "Greater Rapture",
    level: 12,
    bucket: "subsystem",
    note: "increases the rapture (bloodrage-style) activated state's own morale bonuses and adds a self-buff option — the whole rapture mechanic is an unmodeled bloodrage-analog resource, not a Change",
  },
  "spiritualist:exciter:merged-phantom:0": {
    archetypeId: "spiritualist:exciter",
    name: "Merged Phantom",
    level: 7,
    bucket: "subsystem",
    note: "internalizes the phantom (never manifests) and reworks which emotional-focus abilities apply — phantom-scoped, no character number",
  },
  "spiritualist:exciter:overwhelming-excitment:10": {
    archetypeId: "spiritualist:exciter",
    name: "Overwhelming Excitment",
    level: 10,
    bucket: "subsystem",
    note: "lets the rapture (activated state) be shared with allies, and retains a phantom-confinement benefit even during rapture — resource/state mechanic, no flat number",
  },
  "spiritualist:exciter:perfect-passion:4": {
    archetypeId: "spiritualist:exciter",
    name: "Perfect Passion",
    level: 4,
    bucket: "subsystem",
    note: "lifts a casting restriction during rapture — a rules exception, not a Change",
  },
  "spiritualist:exciter:rapture:0": {
    archetypeId: "spiritualist:exciter",
    name: "Rapture",
    level: 0,
    bucket: "subsystem",
    note: "grants the bloodrage-analog activated state itself (an unmodeled resource mechanic, replacing phantom manifestation entirely) — no Change target for a bloodrager-style rage state",
  },
  "spiritualist:exciter:rapturous-rage:10": {
    archetypeId: "spiritualist:exciter",
    name: "Rapturous Rage",
    level: 10,
    bucket: "subsystem",
    note: "grants a player-chosen rage power — pick-list subsystem, replaces phantom recall/spiritual bond (both zero-Change themselves, no double-count risk)",
  },

  // ── spiritualist:fated-guide ──
  "spiritualist:fated-guide:divine-purpose:0": {
    archetypeId: "spiritualist:fated-guide",
    name: "Divine Purpose",
    level: 0,
    bucket: "subsystem",
    note: "grants the PHANTOM a bonus feat (Deific Obedience) — companion-only",
  },
  "spiritualist:fated-guide:iron-bond:0": {
    archetypeId: "spiritualist:fated-guide",
    name: "Iron Bond",
    level: 0,
    bucket: "subsystem",
    note: "+4 save bonus for the PHANTOM against banishment/dismissal — companion-only per class note 1",
  },
  "spiritualist:fated-guide:phantom:0": {
    archetypeId: "spiritualist:fated-guide",
    name: "Phantom",
    level: 0,
    bucket: "subsystem",
    note: "restricts the bonded phantom's emotional focus to remorse — a build-choice constraint, no Change",
  },
  "spiritualist:fated-guide:shepherd-to-the-dead:0": {
    archetypeId: "spiritualist:fated-guide",
    name: "Shepherd to the Dead",
    level: 0,
    bucket: "subsystem",
    note: "adds two spells to the spells-known list — no Change-shaped number",
  },
  "spiritualist:fated-guide:thanatopic-bonded-manifestation:0": {
    archetypeId: "spiritualist:fated-guide",
    name: "Thanatopic Bonded Manifestation",
    level: 0,
    bucket: "situational",
    note: "real numbers (acting below 0 hp, 1 extra damage/round, a 10d6 touch attack at 18th) but every one of them applies only while this specific bonded-manifestation variant is actively toggled on (class note 2) — an activated state, not always-on",
  },
  "spiritualist:fated-guide:undeniable-bond:0": {
    archetypeId: "spiritualist:fated-guide",
    name: "Undeniable Bond",
    level: 0,
    bucket: "subsystem",
    note: "additional +4 (to +8 total) save bonus for the PHANTOM against banishment/dismissal — companion-only",
  },

  // ── spiritualist:fractured-mind ──
  "spiritualist:fractured-mind:emotional-power:0": {
    archetypeId: "spiritualist:fractured-mind",
    name: "Emotional Power",
    level: 5,
    bucket: "subsystem",
    note: "grants a chain of spell-like abilities keyed to the phantom's emotional focus — no Change target for SLA daily uses",
  },
  "spiritualist:fractured-mind:emotional-spellcasting:0": {
    archetypeId: "spiritualist:fractured-mind",
    name: "Emotional Spellcasting",
    level: 0,
    bucket: "subsystem",
    note: "swaps the spellcasting ability score from Wisdom to Charisma — no Change target for a caster's key-ability swap (matches magus Eldritch Scion's Spells entry)",
  },

  // ── spiritualist:geist-channeler ──
  "spiritualist:geist-channeler:emotionless:0": {
    archetypeId: "spiritualist:geist-channeler",
    name: "Emotionless",
    level: 5,
    bucket: "subsystem",
    note: "replaces the phantom's emotional focus with a fixed kit of phantom-scoped abilities (Skill Focus grants, touch attack, telekinesis SLA, an aura, possession) — entirely companion-scoped",
  },
  "spiritualist:geist-channeler:geistform-phantom:0": {
    archetypeId: "spiritualist:geist-channeler",
    name: "Geistform Phantom",
    level: 5,
    bucket: "subsystem",
    note: "phantom-scoped stat rework (incorporeal-only manifestation, single slam, no Strength score) — companion-only",
  },
  "spiritualist:geist-channeler:spiritual-manifestation:0": {
    archetypeId: "spiritualist:geist-channeler",
    name: "Spiritual Manifestation",
    level: 0,
    bucket: "subsystem",
    note: "restricts bonded manifestation to incorporeal form — a build-choice constraint on an activated state, no Change",
  },

  // ── spiritualist:grim-apostle ──
  // Every Grim Apostle feature reskins the phantom into a "grim phantom" tied
  // to one of the Four Horsemen — every ability, save, feat, aura, and attack
  // bonus below belongs to the PHANTOM, never the spiritualist herself (class
  // note 1), so the whole archetype is `subsystem`.
  "spiritualist:grim-apostle:aura-of-flies:7": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Aura of Flies",
    level: 7,
    bucket: "subsystem",
    note: "phantom aura (piercing damage to adjacent creatures) — companion-only",
  },
  "spiritualist:grim-apostle:aura-of-fury:7": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Aura of Fury",
    level: 7,
    bucket: "subsystem",
    note: "phantom aura (attack/AC swing for creatures in it) — companion-only",
  },
  "spiritualist:grim-apostle:aura-of-starvation:7": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Aura of Starvation",
    level: 7,
    bucket: "subsystem",
    note: "phantom aura (enemy attack/damage penalty) — companion-only",
  },
  "spiritualist:grim-apostle:bloodlust:12": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Bloodlust",
    level: 12,
    bucket: "subsystem",
    note: "phantom self-heal on slam hit — companion-only",
  },
  "spiritualist:grim-apostle:contagious-touch:12": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Contagious Touch",
    level: 12,
    bucket: "subsystem",
    note: "phantom spell-like ability (contagion) — companion-only",
  },
  "spiritualist:grim-apostle:distended-gullet:17": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Distended Gullet",
    level: 17,
    bucket: "subsystem",
    note: "phantom swallow-whole ability — companion-only",
  },
  "spiritualist:grim-apostle:fatal-aura:7": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Fatal Aura",
    level: 7,
    bucket: "subsystem",
    note: "phantom aura (Heal DC increase, healing-spell disruption) — companion-only",
  },
  "spiritualist:grim-apostle:fleet:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Fleet",
    level: 0,
    bucket: "subsystem",
    note: "grants the PHANTOM a bonus feat (Fleet) — companion-only",
  },
  "spiritualist:grim-apostle:good-saves:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Good Saves",
    level: 0,
    bucket: "subsystem",
    note: "picks which two of the PHANTOM's saves are good, per chosen Horseman — companion-only build data, not a Change",
  },
  "spiritualist:grim-apostle:great-fortitude:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Great Fortitude",
    level: 0,
    bucket: "subsystem",
    note: "grants the PHANTOM a bonus feat (Great Fortitude) — companion-only",
  },
  "spiritualist:grim-apostle:juggernaut:17": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Juggernaut",
    level: 17,
    bucket: "subsystem",
    note: "phantom condition immunities — companion-only",
  },
  "spiritualist:grim-apostle:killing-word:17": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Killing Word",
    level: 17,
    bucket: "subsystem",
    note: "phantom spell-like ability (power word kill) — companion-only",
  },
  "spiritualist:grim-apostle:marked-for-death:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Marked for Death",
    level: 5,
    bucket: "subsystem",
    note: "phantom attack-roll/damage bonus vs. a marked target — companion-only",
  },
  "spiritualist:grim-apostle:no-escape:12": {
    archetypeId: "spiritualist:grim-apostle",
    name: "No Escape",
    level: 12,
    bucket: "subsystem",
    note: "grants the PHANTOM the benefits of three feats vs. its marked target — companion-only",
  },
  "spiritualist:grim-apostle:ravenous-bite:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Ravenous Bite",
    level: 0,
    bucket: "subsystem",
    note: "changes the phantom's natural attack type/size and grants it Power Attack — companion-only",
  },
  "spiritualist:grim-apostle:ruthless-combatant:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Ruthless Combatant",
    level: 11,
    bucket: "subsystem",
    note: "widens the PHANTOM's slam crit range/multiplier — companion-only; no `critConfirm`/crit-range Change target exists in this engine regardless (targets.ts unapplied list)",
  },
  "spiritualist:grim-apostle:skills:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Skills",
    level: 0,
    bucket: "subsystem",
    note: "grants the PHANTOM bonus skill ranks per its Horseman — companion-only",
  },
  "spiritualist:grim-apostle:strength-focus:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Strength Focus",
    level: 0,
    bucket: "subsystem",
    note: "adjusts the PHANTOM's ability-score progression (Str instead of Dex) — companion-only",
  },
  "spiritualist:grim-apostle:virulent-attack:17": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Virulent Attack",
    level: 17,
    bucket: "subsystem",
    note: "disease-spreading rider on the PHANTOM's weakening strike — companion-only",
  },
  "spiritualist:grim-apostle:wail-of-the-hungry:12": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Wail of the Hungry",
    level: 12,
    bucket: "subsystem",
    note: "phantom spell-like ability (waves of fatigue) — companion-only",
  },
  "spiritualist:grim-apostle:weakening-strike:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Weakening Strike",
    level: 0,
    bucket: "subsystem",
    note: "disease-effect rider on the PHANTOM's slam attack — companion-only",
  },
  "spiritualist:grim-apostle:weapon-finesse:0": {
    archetypeId: "spiritualist:grim-apostle",
    name: "Weapon Finesse",
    level: 0,
    bucket: "subsystem",
    note: "grants the PHANTOM a bonus feat (Weapon Finesse) — companion-only",
  },

  // ── spiritualist:hag-haunted ──
  "spiritualist:hag-haunted:death-curse:0": {
    archetypeId: "spiritualist:hag-haunted",
    name: "Death Curse",
    level: 4,
    bucket: "subsystem",
    note: "a phantom-death-triggered curse ability plus two added spells known — no Change-shaped number",
  },
  "spiritualist:hag-haunted:hag-phantom:0": {
    archetypeId: "spiritualist:hag-haunted",
    name: "Hag Phantom",
    level: 0,
    bucket: "subsystem",
    note: "phantom-scoped (alignment, ability-score adjustments, granted feats while confined/manifested) — companion-only",
  },
  "spiritualist:hag-haunted:hag-spellcasting:0": {
    archetypeId: "spiritualist:hag-haunted",
    name: "Hag Spellcasting",
    level: 0,
    bucket: "subsystem",
    note: "changes spell type (arcane vs. psychic) and component types — no Change target",
  },

  // ── spiritualist:haunted ──
  "spiritualist:haunted:usurp-manifestation:3": {
    archetypeId: "spiritualist:haunted",
    name: "Usurp Manifestation",
    level: 3,
    bucket: "subsystem",
    note: "an activated ability that inflicts nauseated on the spiritualist to buff the PHANTOM's size/AC (and, at higher levels, its own spell-leeching/DR/SR) — the spiritualist-side effect is a debuff (a condition, not a Change) and the buffed side is companion-only",
  },
  "spiritualist:haunted:usurped-bond:17": {
    archetypeId: "spiritualist:haunted",
    name: "Usurped Bond",
    level: 17,
    bucket: "subsystem",
    note: "extends usurp manifestation's daily rounds — extends an already-subsystem activated ability",
  },

  // ── spiritualist:involutionist ──
  "spiritualist:involutionist:involuate:11": {
    archetypeId: "spiritualist:involutionist",
    name: "Involuate",
    level: 11,
    bucket: "subsystem",
    note: "grants a spell-like ability (animate objects) — no Change target for SLA uses",
  },
  "spiritualist:involutionist:spirit-awareness:5": {
    archetypeId: "spiritualist:involutionist",
    name: "Spirit Awareness",
    level: 5,
    bucket: "subsystem",
    note: "grants spell-like abilities (detect psychic significance, analyze aura) — no Change target",
  },
  "spiritualist:involutionist:spirit-manifestation:3": {
    archetypeId: "spiritualist:involutionist",
    name: "Spirit Manifestation",
    level: 3,
    bucket: "subsystem",
    note: "swaps bonded manifestation's benefit for the phantom's spirit-animal ability and hexes — an activated-state substitution, no flat number",
  },

  // ── spiritualist:necrologist ──
  "spiritualist:necrologist:alignment:0": {
    archetypeId: "spiritualist:necrologist",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "an alignment restriction with a narrative penalty if broken — no Change",
  },
  "spiritualist:necrologist:bonded-manifestation:0": {
    archetypeId: "spiritualist:necrologist",
    name: "Bonded Manifestation",
    level: 0,
    bucket: "subsystem",
    note: "removes the ectoplasmic option from bonded manifestation — a build-choice restriction on an activated state, no Change",
  },
  "spiritualist:necrologist:channel-energy:4": {
    archetypeId: "spiritualist:necrologist",
    name: "Channel Energy",
    level: 4,
    bucket: "subsystem",
    note: "grants a channel-energy-analog ability at an effective level 3 lower — no Change target for channel-energy dice/uses (class note 4)",
  },
  "spiritualist:necrologist:channel-resistance:6": {
    archetypeId: "spiritualist:necrologist",
    name: "Channel Resistance",
    level: 6,
    bucket: "subsystem",
    note: "+4 save bonus for the PHANTOM against channel energy — companion-only",
  },
  "spiritualist:necrologist:cling-of-the-grave:0": {
    archetypeId: "spiritualist:necrologist",
    name: "Cling of the Grave",
    level: 0,
    bucket: "subsystem",
    note: "extends how long the phantom can hold a delivered touch spell — a duration rule, no Change target",
  },
  "spiritualist:necrologist:lifedrinker:13": {
    archetypeId: "spiritualist:necrologist",
    name: "Lifedrinker",
    level: 13,
    bucket: "subsystem",
    note: "a triggered (target dropped below 0 hp), channel-energy-resource-spent death knell cast — resource-gated and save-dependent, no flat number",
  },
  "spiritualist:necrologist:necropsychic-conduit:12": {
    archetypeId: "spiritualist:necrologist",
    name: "Necropsychic Conduit",
    level: 12,
    bucket: "subsystem",
    note: "casts spells as if under two metamagic feats vs. undead — no Change target for metamagic-as-if grants",
  },
  "spiritualist:necrologist:shared-conciousness:0": {
    archetypeId: "spiritualist:necrologist",
    name: "Shared Conciousness",
    level: 0,
    bucket: "situational",
    note: "swaps the shared-consciousness save bonus from mind-affecting to death effects/energy drain/negative energy, but the bonus is still gated on the phantom being confined (not manifested/banished) — an activated-state toggle, same as base Shared Consciousness (class note 3)",
  },
  "spiritualist:necrologist:spells:0": {
    archetypeId: "spiritualist:necrologist",
    name: "Spells",
    level: 0,
    bucket: "subsystem",
    note: "adds necromancy-themed spells to the class list — no Change-shaped number",
  },
  "spiritualist:necrologist:undead-phantom:0": {
    archetypeId: "spiritualist:necrologist",
    name: "Undead Phantom",
    level: 0,
    bucket: "subsystem",
    note: "phantom type change (undead instead of outsider, no Con score) — companion-only",
  },
  "spiritualist:necrologist:unnatural-aura:5": {
    archetypeId: "spiritualist:necrologist",
    name: "Unnatural Aura",
    level: 5,
    bucket: "subsystem",
    note: "raises a DC animals must beat to approach the manifested phantom — a DC threshold, not a Change the spiritualist's own sheet applies",
  },

  // ── spiritualist:onmyoji ──
  "spiritualist:onmyoji:divine-spellcasting:0": {
    archetypeId: "spiritualist:onmyoji",
    name: "Divine Spellcasting",
    level: 0,
    bucket: "subsystem",
    note: "changes spell type and component types (divine instead of psychic) — no Change target",
  },
  "spiritualist:onmyoji:divine-teachings:0": {
    archetypeId: "spiritualist:onmyoji",
    name: "Divine Teachings",
    level: 4,
    bucket: "subsystem",
    note: "lets the spiritualist add cleric spells to her spells known, but only while the phantom is confined — spell-list access, no Change-shaped number regardless",
  },
  "spiritualist:onmyoji:spiritual-resistance:0": {
    archetypeId: "spiritualist:onmyoji",
    name: "Spiritual Resistance",
    level: 6,
    bucket: "situational",
    note: "real, scaling save bonus (+2 at 6th to +5 at 18th) vs. fey/outsider/incorporeal-undead sp/su abilities, but gated on the phantom being confined in consciousness — an activated-state toggle (class note 3)",
  },

  // ── spiritualist:plague-eater ──
  "spiritualist:plague-eater:disfiguring-touch:7": {
    archetypeId: "spiritualist:plague-eater",
    name: "Disfiguring Touch",
    level: 7,
    bucket: "subsystem",
    note: "grants a spell-like ability (disfiguring touch) — no Change target for SLA uses",
  },
  "spiritualist:plague-eater:fused-well-being:10": {
    archetypeId: "spiritualist:plague-eater",
    name: "Fused Well-Being",
    level: 10,
    bucket: "subsystem",
    note: "makes bonded-senses/emotional-focus benefits persist through manifestation — an activated-state persistence tweak, no flat number",
  },
  "spiritualist:plague-eater:greater-spiritual-inoculation:12": {
    archetypeId: "spiritualist:plague-eater",
    name: "Greater Spiritual Inoculation",
    level: 12,
    bucket: "numeric",
    note: "the plague eater becomes flatly immune to disease (including supernatural/magical) — unconditional; the accompanying ally save bonus (conditioned on ectoplasmic manifestation + reach) is dropped, noted in detail",
  },
  "spiritualist:plague-eater:plague-ward:0": {
    archetypeId: "spiritualist:plague-eater",
    name: "Plague Ward",
    level: 12,
    bucket: "situational",
    note: "real disease save bonus (+4, +8 at 12th) and a Skill Focus grant, but gated on the phantom being confined (not manifested/banished), on top of a rotating daily-bonded-spirit mechanic that has no build representation",
  },
  "spiritualist:plague-eater:remove-disease:9": {
    archetypeId: "spiritualist:plague-eater",
    name: "Remove Disease",
    level: 9,
    bucket: "subsystem",
    note: "grants a spell-like ability (remove disease) — no Change target",
  },
  "spiritualist:plague-eater:remove-sickness:5": {
    archetypeId: "spiritualist:plague-eater",
    name: "Remove Sickness",
    level: 5,
    bucket: "subsystem",
    note: "grants an at-will spell-like ability (remove sickness) — no Change target",
  },
  "spiritualist:plague-eater:spiritual-inoculation:4": {
    archetypeId: "spiritualist:plague-eater",
    name: "Spiritual Inoculation",
    level: 4,
    bucket: "situational",
    note: "+4 circumstance bonus vs. disease, but only while within reach of the ectoplasmic manifested phantom — an activated-state + positioning condition",
  },
  "spiritualist:plague-eater:withdraw-affliction:16": {
    archetypeId: "spiritualist:plague-eater",
    name: "Withdraw Affliction",
    level: 16,
    bucket: "subsystem",
    note: "grants a spell-like ability (withdraw affliction) — no Change target",
  },

  // ── spiritualist:priest-of-the-fallen ──
  "spiritualist:priest-of-the-fallen:channel-energy:3": {
    archetypeId: "spiritualist:priest-of-the-fallen",
    name: "Channel Energy",
    level: 3,
    bucket: "subsystem",
    note: "grants a channel-energy-analog ability — no Change target for channel-energy dice/uses (class note 4)",
  },
  "spiritualist:priest-of-the-fallen:fused-consciousness:10": {
    archetypeId: "spiritualist:priest-of-the-fallen",
    name: "Fused Consciousness",
    level: 10,
    bucket: "subsystem",
    note: "changes where the phantom goes when dismissed — a rules/flavor swap, no number",
  },
  "spiritualist:priest-of-the-fallen:masterful-faith:17": {
    archetypeId: "spiritualist:priest-of-the-fallen",
    name: "Masterful Faith",
    level: 17,
    bucket: "subsystem",
    note: "grants two free cleric domains with full benefits — the engine's domain system is cleric-scoped build data, not a Change-shaped grant this pipeline can attach (matches the druid pilot's Nature Bond domain-choice precedent)",
  },
  "spiritualist:priest-of-the-fallen:mythmaker:0": {
    archetypeId: "spiritualist:priest-of-the-fallen",
    name: "Mythmaker",
    level: 12,
    bucket: "subsystem",
    note: "replaces the phantom with a hero-god phantom whose abilities (SLAs, bonus feats, natural armor, sneak attack) are entirely companion-scoped",
  },
  "spiritualist:priest-of-the-fallen:phantom-call:6": {
    archetypeId: "spiritualist:priest-of-the-fallen",
    name: "Phantom Call",
    level: 6,
    bucket: "subsystem",
    note: "a once-per-day summon-the-phantom action — activated ability, no flat number",
  },
  "spiritualist:priest-of-the-fallen:true-legend:20": {
    archetypeId: "spiritualist:priest-of-the-fallen",
    name: "True Legend",
    level: 20,
    bucket: "subsystem",
    note: "changes how quickly the phantom can be confined and for how many rounds/day — activated-state resource mechanic, no flat number",
  },

  // ── spiritualist:quintessentialist ──
  "spiritualist:quintessentialist:exemplar:0": {
    archetypeId: "spiritualist:quintessentialist",
    name: "Exemplar",
    level: 0,
    bucket: "subsystem",
    note: "replaces the phantom with an 'exemplar' that shares the spiritualist's own ability scores/gear/feats/spells while manifested — a whole activated-state subsystem, not a passive number (the -2 all-scores/1d6-per-round costs are conditioned on the exemplar being manifested)",
  },
  "spiritualist:quintessentialist:unfocused-spellcasting:0": {
    archetypeId: "spiritualist:quintessentialist",
    name: "Unfocused Spellcasting",
    level: 0,
    bucket: "subsystem",
    note: "imposes a minimum 1-round casting time — a rules restriction, not a Change-shaped number",
  },

  // ── spiritualist:scourge ──
  "spiritualist:scourge:ectoplasmic-swarm:12": {
    archetypeId: "spiritualist:scourge",
    name: "Ectoplasmic Swarm",
    level: 12,
    bucket: "subsystem",
    note: "phantom-scoped form change (swarm subtype) — companion-only",
  },
  "spiritualist:scourge:endure-torment:6": {
    archetypeId: "spiritualist:scourge",
    name: "Endure Torment",
    level: 6,
    bucket: "subsystem",
    note: "phantom pain immunity plus a save bonus vs. staggered/stunned — companion-only",
  },
  "spiritualist:scourge:inflict-pain:7": {
    archetypeId: "spiritualist:scourge",
    name: "Inflict Pain",
    level: 7,
    bucket: "subsystem",
    note: "grants a spell-like ability (inflict pain) — no Change target",
  },
  "spiritualist:scourge:spell-scourge:4": {
    archetypeId: "spiritualist:scourge",
    name: "Spell Scourge",
    level: 4,
    bucket: "subsystem",
    note: "concentration-check requirement/penalty imposed on enemies, plus a PHANTOM attack/damage bonus on attacks of opportunity — enemy-scoped and companion-scoped, no spiritualist number ('concentration' also isn't an applied target)",
  },

  // ── spiritualist:seeker-of-enlightenment ──
  "spiritualist:seeker-of-enlightenment:echoes-of-expertise:0": {
    archetypeId: "spiritualist:seeker-of-enlightenment",
    name: "Echoes of Expertise",
    level: 12,
    bucket: "situational",
    note: "an unconditional spiritualist-level bonus on the two skills the phantom's emotional focus determines, plus a mind-affecting save bonus while the phantom is confined and a 1/day Knowledge check bonus — the skill bonus's WHICH-skills is a per-character build choice with no dynamic-target mechanism this static table can express (class note 5), and the save clause is separately gated (class note 3)",
  },
  "spiritualist:seeker-of-enlightenment:echoes-of-mastery:10": {
    archetypeId: "spiritualist:seeker-of-enlightenment",
    name: "Echoes of Mastery",
    level: 10,
    bucket: "situational",
    note: "extends echoes of expertise's save bonus through manifestation and adds a 1/day take-20 — inherits its predecessor's per-focus targeting gap, plus a non-numeric utility use",
  },
  "spiritualist:seeker-of-enlightenment:karmic-insight:7": {
    archetypeId: "spiritualist:seeker-of-enlightenment",
    name: "Karmic Insight",
    level: 7,
    bucket: "subsystem",
    note: "grants a spell-like ability (augury) — no Change target",
  },
  "spiritualist:seeker-of-enlightenment:knowledge-of-the-ancestors:16": {
    archetypeId: "spiritualist:seeker-of-enlightenment",
    name: "Knowledge of the Ancestors",
    level: 16,
    bucket: "subsystem",
    note: "grants a spell-like ability (legend lore) — no Change target",
  },
  "spiritualist:seeker-of-enlightenment:pinpoint-influence:9": {
    archetypeId: "spiritualist:seeker-of-enlightenment",
    name: "Pinpoint Influence",
    level: 9,
    bucket: "subsystem",
    note: "grants a spell-like ability (locate object) — no Change target",
  },
  "spiritualist:seeker-of-enlightenment:words-of-the-past:5": {
    archetypeId: "spiritualist:seeker-of-enlightenment",
    name: "Words of the Past",
    level: 5,
    bucket: "subsystem",
    note: "grants an at-will spell-like ability (comprehend languages) — no Change target",
  },

  // ── spiritualist:shadow-caller ──
  "spiritualist:shadow-caller:emotionless:0": {
    archetypeId: "spiritualist:shadow-caller",
    name: "Emotionless",
    level: 0,
    bucket: "subsystem",
    note: "replaces the shade's emotional focus with a fixed kit of shade-scoped abilities — companion-only",
  },
  "spiritualist:shadow-caller:inhabit-shadow:0": {
    archetypeId: "spiritualist:shadow-caller",
    name: "Inhabit Shadow",
    level: 12,
    bucket: "situational",
    note: "real Stealth bonus (+4, +8 at 12th) and a real darkvision grant (60 ft., or +30 ft. if the caller already has it), but both are gated on the shade currently inhabiting the caller's shadow rather than being manifested elsewhere — an activated-state toggle, same posture as Shared Consciousness's confinement gate (class note 3)",
  },
  "spiritualist:shadow-caller:living-darkness:20": {
    archetypeId: "spiritualist:shadow-caller",
    name: "Living Darkness",
    level: 20,
    bucket: "situational",
    note: "real cold/mind-affecting immunity and a 20d6 touch attack, but only while actively using incorporeal bonded manifestation — an activated-state condition",
  },
  "spiritualist:shadow-caller:see-in-darkness:9": {
    archetypeId: "spiritualist:shadow-caller",
    name: "See in Darkness",
    level: 9,
    bucket: "subsystem",
    note: "a limited-rounds-per-day activated sense grant — resource-gated ability, not a passive Change",
  },
  "spiritualist:shadow-caller:shade:0": {
    archetypeId: "spiritualist:shadow-caller",
    name: "Shade",
    level: 0,
    bucket: "subsystem",
    note: "renames/reflavors the phantom (Shadow Plane origin, inhabits the caller's shadow) — companion-scoped",
  },
  "spiritualist:shadow-caller:shadow-bound:0": {
    archetypeId: "spiritualist:shadow-caller",
    name: "Shadow Bound",
    level: 0,
    bucket: "subsystem",
    note: "replaces etheric tether's range rules with a shadow-plane-specific tether — a distance/rules mechanic, no Change target",
  },
  "spiritualist:shadow-caller:shadow-jump:6": {
    archetypeId: "spiritualist:shadow-caller",
    name: "Shadow Jump",
    level: 6,
    bucket: "subsystem",
    note: "grants a shadowdancer-style teleport-between-shadows movement with a daily distance budget — a teleport subsystem, not a landSpeed-shaped number",
  },
  "spiritualist:shadow-caller:shadowcaster:0": {
    archetypeId: "spiritualist:shadow-caller",
    name: "Shadowcaster",
    level: 0,
    bucket: "situational",
    note: "adds two spells to the class list and a +1 effective caster level for shadow/darkness spells, but the caster-level bump is gated on the shade inhabiting the caller's shadow, and there's no 'cl' Change target regardless (targets.ts unapplied list)",
  },
  "spiritualist:shadow-caller:umbral-aura-su-sp:10": {
    archetypeId: "spiritualist:shadow-caller",
    name: "Umbral Aura (Su, Sp)",
    level: 10,
    bucket: "situational",
    note: "50% concealment, a local-darkness effect, and hide-in-plain-sight, all gated on the shade inhabiting the caller's shadow — concealment/miss-chance also has no Change target in this engine",
  },

  // ── spiritualist:soul-warden ──
  "spiritualist:soul-warden:algea-call:20": {
    archetypeId: "spiritualist:soul-warden",
    name: "Algea Call",
    level: 20,
    bucket: "subsystem",
    note: "a once-per-hour summon-effect activated ability for the familiar — no flat number",
  },
  "spiritualist:soul-warden:nosoi-scribe:1": {
    archetypeId: "spiritualist:soul-warden",
    name: "Nosoi Scribe",
    level: 1,
    bucket: "subsystem",
    note: "replaces the phantom entirely with a familiar (nosoi) — familiar/companion subsystem per class note 1",
  },
  "spiritualist:soul-warden:phantom-elegy:8": {
    archetypeId: "spiritualist:soul-warden",
    name: "Phantom Elegy",
    level: 8,
    bucket: "subsystem",
    note: "grants the familiar an activated aura ability (spending its haunting-melody resource) — familiar-scoped resource mechanic",
  },
  "spiritualist:soul-warden:psychopomp-s-bond:0": {
    archetypeId: "spiritualist:soul-warden",
    name: "Psychopomp’s Bond",
    level: 2,
    bucket: "subsystem",
    note: "grants bonded-senses/phantom-recall analogs for the familiar — familiar-scoped, no flat number",
  },
  "spiritualist:soul-warden:warding-vessel:3": {
    archetypeId: "spiritualist:soul-warden",
    name: "Warding Vessel",
    level: 3,
    bucket: "subsystem",
    note: "lets a spirit hide inside the soul warden in place of bonded manifestation — an activated-state substitution, no number",
  },

  // ── spiritualist:totem-spiritualist ──
  "spiritualist:totem-spiritualist:animal-senses:9": {
    archetypeId: "spiritualist:totem-spiritualist",
    name: "Animal Senses",
    level: 9,
    bucket: "situational",
    note: "shares the phantom animal's own blindsense/darkvision/low-light/scent while harbored — the granted senses vary entirely with the player's built phantom animal, and there's no `@phantom.*` formula path to read its current abilities from",
  },
  "spiritualist:totem-spiritualist:phantom-animal:0": {
    archetypeId: "spiritualist:totem-spiritualist",
    name: "Phantom Animal",
    level: 0,
    bucket: "subsystem",
    note: "replaces the phantom with an animal-companion-style creature — companion subsystem",
  },
  "spiritualist:totem-spiritualist:shared-instincts:0": {
    archetypeId: "spiritualist:totem-spiritualist",
    name: "Shared Instincts",
    level: 0,
    bucket: "situational",
    note: "swaps Shared Consciousness's Skill Focus grants for bonus Knowledge (nature) ranks equal to the phantom animal's Hit Dice, but the bonus is gated on the phantom animal being confined (class note 3) and there's no `@phantom.*` formula path to read its Hit Dice from either",
  },
  "spiritualist:totem-spiritualist:twin-phantoms:17": {
    archetypeId: "spiritualist:totem-spiritualist",
    name: "Twin Phantoms",
    level: 17,
    bucket: "subsystem",
    note: "activated grant of a second phantom animal for a limited rounds/day — resource-gated companion mechanic",
  },

  // ── spiritualist:usher-of-lost-souls ──
  "spiritualist:usher-of-lost-souls:disrupting-phantom:0": {
    archetypeId: "spiritualist:usher-of-lost-souls",
    name: "Disrupting Phantom",
    level: 0,
    bucket: "subsystem",
    note: "lets the PHANTOM attack haunts directly — companion-only",
  },
  "spiritualist:usher-of-lost-souls:disruptive-influence:14": {
    archetypeId: "spiritualist:usher-of-lost-souls",
    name: "Disruptive Influence",
    level: 14,
    bucket: "subsystem",
    note: "swaps an SLA use for a different SLA — no Change target",
  },
  "spiritualist:usher-of-lost-souls:etheric-channel:0": {
    archetypeId: "spiritualist:usher-of-lost-souls",
    name: "Etheric Channel",
    level: 0,
    bucket: "subsystem",
    note: "grants a channel-energy-analog ability restricted to undead/haunts — no Change target for channel-energy dice/uses (class note 4)",
  },
  "spiritualist:usher-of-lost-souls:locate-haunts:9": {
    archetypeId: "spiritualist:usher-of-lost-souls",
    name: "Locate Haunts",
    level: 9,
    bucket: "subsystem",
    note: "a limited-minutes-per-day activated detection ability — resource-gated, not a passive Change",
  },
  "spiritualist:usher-of-lost-souls:spirit-senses:2": {
    archetypeId: "spiritualist:usher-of-lost-souls",
    name: "Spirit Senses",
    level: 2,
    bucket: "situational",
    note: "real bonus (half spiritualist level) on Perception/Sense Motive, but scoped to specific check purposes (detecting haunts/incorporeal creatures; determining possession/enchantment/curse) rather than the whole skill — a narrow task-conditioned bonus, same posture as the magus pilot's Nameless Mask entry",
  },

  // ── spiritualist:ward-spiritualist ──
  "spiritualist:ward-spiritualist:kami-phantom:0": {
    archetypeId: "spiritualist:ward-spiritualist",
    name: "Kami Phantom",
    level: 0,
    bucket: "subsystem",
    note: "phantom-scoped stat rework (3/4 BAB, d8 HD, ectoplasmic-only) — companion-only",
  },
  "spiritualist:ward-spiritualist:merged-manifestation:3": {
    archetypeId: "spiritualist:ward-spiritualist",
    name: "Merged Manifestation",
    level: 3,
    bucket: "subsystem",
    note: "an activated bonded-manifestation variant granting weapon/unarmed-strike progression — an activated state, not a passive number",
  },
  "spiritualist:ward-spiritualist:ward-implement:0": {
    archetypeId: "spiritualist:ward-spiritualist",
    name: "Ward Implement",
    level: 0,
    bucket: "subsystem",
    note: "grants an occultist implement school with focus powers — the occultist implement subsystem has no archetype-grant hook this pipeline can attach to",
  },

  // ── spiritualist:zeitgeist-binder ──
  "spiritualist:zeitgeist-binder:settlement-aspect:0": {
    archetypeId: "spiritualist:zeitgeist-binder",
    name: "Settlement Aspect",
    level: 0,
    bucket: "subsystem",
    note: "grants a chain of spell-like abilities keyed to a chosen settlement aspect — no Change target for SLA daily uses",
  },
  "spiritualist:zeitgeist-binder:settlement-avatar:0": {
    archetypeId: "spiritualist:zeitgeist-binder",
    name: "Settlement Avatar",
    level: 0,
    bucket: "subsystem",
    note: "an activated remote-sensing ability plus a location-conditioned bonus teamwork feat — resource-gated and geography-conditioned, no flat number",
  },
  "spiritualist:zeitgeist-binder:zeitgeist:0": {
    archetypeId: "spiritualist:zeitgeist-binder",
    name: "Zeitgeist",
    level: 0,
    bucket: "subsystem",
    note: "reflavors the phantom as a settlement-tied zeitgeist — companion-scoped",
  },
};

/**
 * ── SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED ──────────────────────────────
 *
 * Machine-extracted mechanical effects for spiritualist archetype class
 * features (the prose→Change extraction pipeline, spiritualist slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 2 of spiritualist's 125
 * features cleared the `numeric` bar (see
 * `SPIRITUALIST_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — spiritualist's kit is almost entirely phantom
 * (companion)-scoped abilities, activated bonded-manifestation states, and
 * spell-like-ability grants, none of which are Change-shaped numbers this
 * pipeline extracts (see this file's header doc comment).
 *
 * Confidence rubric (identical to fighter.ts's/magus.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose, or a real-but-partial condition is dropped and flagged.
 *  - "low": not used in this pass.
 */
export const SPIRITUALIST_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Exciter's own "Fast Movement" (Occult Origins) grants +10 ft. land speed
  // under the EXACT same condition and formula as the vendored generic Fast
  // Movement class feature (class-features.json:
  // `if(and(lte(@armor.type,2),lt(@attributes.encumbrance.level,2)),10)`,
  // type "base") — a verbatim reflavor, replacing etheric tether (zero
  // vendored changes, no double-count risk). Using the same "base" stacking
  // type also reproduces the prose's own "doesn't stack with the barbarian
  // ability of the same name" clause for free, via typed-bonus stacking's
  // highest-within-type rule.
  "spiritualist:exciter:fast-movement:0": {
    changes: [
      c(
        "if(and(lte(@armor.type, 2), lt(@attributes.encumbrance.level, 2)), 10, 0)",
        "landSpeed",
        "base",
      ),
    ],
    detail: () => "+10 ft. land speed (light/medium/no armor, no heavy load)",
    confidence: "high",
    provenance:
      "An exciter’s land speed is faster than normal for his race by 10 feet. This benefit " +
      "applies only when he is wearing light armor, medium armor, or no armor and is not " +
      "carrying a heavy load.",
  },

  // Plague Eater's "Greater Spiritual Inoculation" (replacing greater
  // spiritual interference) grants the plague eater herself flat, permanent
  // immunity to disease at 12th level — unconditional, using the engine's
  // existing `immEffect.disease` convention (see bloodlines.ts/
  // psychic-disciplines.ts/shaman-spirits.ts for the established target
  // name). The second sentence's ally save bonus is scoped to allies within
  // an ectoplasmically-manifested phantom's reach — dropped (not the
  // plague eater's own number), flagged in `detail`.
  "spiritualist:plague-eater:greater-spiritual-inoculation:12": {
    changes: [c("1", "immEffect.disease", "untyped")],
    detail: () => "Immune to disease (ally save bonus near manifested phantom not modeled)",
    confidence: "high",
    provenance:
      "At 12th level, the plague eater becomes immune to disease, including supernatural and magical diseases.",
  },
};
