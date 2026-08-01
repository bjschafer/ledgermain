/**
 * Save bonuses the vendored catalogs ship only as `contextNotes` prose, keyed
 * by the EXACT note text they were transcribed from.
 *
 * Same gap and same fix as `race-save-notes.ts`, applied to the two big
 * vendored catalogs whose entries carry their own notes: the ~80-race
 * alternate racial trait catalog (`RefData.racialTraits`) and the character
 * trait catalog (`RefData.traits`). Neither can express "against poison", so a
 * trait whose whole benefit is a scoped save bonus arrives with `changes: []`
 * and a note, and moves no number.
 *
 * ## Why exact text rather than a per-entry table
 *
 * These notes repeat verbatim across many entries (a dozen traits all say
 * "+2 Trait bonus vs fear effects"), so keying on the note text itself makes
 * one line of table cover all of them, and makes the table impossible to
 * mis-apply to an entry it wasn't written for: the match is the entry's own
 * words. Exact rather than substring, so a longer note that merely CONTAINS a
 * shorter one never silently inherits its bonus.
 *
 * Entries are only promoted when the whole bonus fits the `SAVE_CATEGORIES`
 * vocabulary. Where a note reaches past it, the modelled part applies and the
 * note keeps carrying the rest.
 */

import type { Change, ContextNote } from "@pf1/schema";

/** `+N <type>` on every save, scoped to `categories`. */
export function scopedSave(formula: string, type: string, ...categories: string[]): Change {
  return { target: "allSavingThrows", type, formula, saveCategories: categories };
}

/**
 * Vendored ALTERNATE RACIAL TRAIT notes (`RefData.racialTraits`), keyed by the
 * note's exact text.
 *
 * The vendored slice's ~86 distinct `allSavingThrows` notes were read in
 * full; 32 promote here. The rest stay prose because the scope they name has
 * no vocabulary entry (nauseated/sickened, ability drain, sonic, gaze
 * attacks, entangled, negative levels, starvation, fatigue, sanity damage,
 * language-dependent, altitude sickness, the pain descriptor, the pattern/
 * fascination subschool, traps), because it scopes to a school rather than
 * the whole of `spell`/`sla` (divination, necromancy, transmutation,
 * psychic), because it is a property of the ATTACKER rather than the effect
 * (aboleths, dragons, fey, undead, "non-elven humanoid", divine casters and
 * their outsider allies), because it is energy resistance or spell
 * resistance rather than a save bonus, because it is a limited-use resource
 * or reroll rather than a passive bonus (Adaptable Luck, Pharaonic Will,
 * Piety, a once-per-fire-kindled bonus), or because a caveat makes it
 * unexpressible (Xenophobic's mind-affecting-except-fear carve-out; the
 * Gillman pair that is +2 vs. illusions from everyone but aboleths and -2
 * from aboleths, the same one-category-two-totals problem as the standard
 * Gillman entry in `race-save-notes.ts`).
 *
 * Where a note names one fitting scope alongside one that is not
 * expressible, only the fitting part is promoted and the note keeps carrying
 * the rest; each such entry below says what was left out and why.
 */
export const VENDORED_RACIAL_TRAIT_SAVE_NOTES: Readonly<Record<string, readonly Change[]>> = {
  "+1 Luck bonus against fear effects for yourself and all allies of the same size category within 60 ft (18 m).":
    [scopedSave("1", "luck", "fear")],
  // Alchemical weapons and drunk potions/elixirs have no vocabulary entry.
  "+1 Racial bonus vs poison, alchemical weapons, and harmful effects from drinking potions or elixirs.":
    [scopedSave("1", "racial", "poison")],
  // Hexes carry no descriptor uniformly, so they stay in the note. Typed
  // UNTYPED rather than racial despite the note's wording: both traits saying
  // this are halfling, halfling luck is itself a +1 racial on every save, and
  // a second racial bonus cannot stack with it. The published trait says
  // explicitly that it does, so the type has to encode the intent rather than
  // the label.
  "+2 Racial bonus against curse effects and hexes. This bonus stacks with the bonus granted by halfling luck.":
    [scopedSave("2", "untyped", "curse")],
  // Energy drain, negative energy, and necromancy-only spells/SLAs have no
  // fitting category (spell/sla are unscoped by school).
  "+2 Racial bonus against death effects, energy drain, negative energy, and spells or spell-like abilities of the necromancy school.":
    [scopedSave("2", "racial", "death")],
  // Ingested poisons are narrower than `poison`; nauseated/sickened have no entry.
  "+2 Racial bonus against disease, ingested poisons, and becoming nauseated or sickened.": [
    scopedSave("2", "racial", "disease"),
  ],
  "+2 Racial bonus against disease.": [scopedSave("2", "racial", "disease")],
  // Dominate has no vocabulary entry; only the possession half is promoted.
  // Untyped for the same reason as the curse entry above.
  "+2 Racial bonus against dominate and possession effects. This bonus stacks with the bonus granted by halfling luck.":
    [scopedSave("2", "untyped", "possession")],
  "+2 Racial bonus against emotion and fear effects.": [
    scopedSave("2", "racial", "emotion", "fear"),
  ],
  "+2 Racial bonus against fear and despair effects.": [
    scopedSave("2", "racial", "fear", "despair"),
  ],
  "+2 Racial bonus against fear effects.": [scopedSave("2", "racial", "fear")],
  // Paralysis has no vocabulary entry.
  "+2 Racial bonus against fear, sleep and paralysis effects.": [
    scopedSave("2", "racial", "fear", "sleep"),
  ],
  "+2 Racial bonus against illusion spells and effects.": [scopedSave("2", "racial", "illusion")],
  "+2 Racial bonus against mind-affecting effects and poisons.": [
    scopedSave("2", "racial", "mind", "poison"),
  ],
  "+2 Racial bonus against mind-affecting effects.": [scopedSave("2", "racial", "mind")],
  // Nauseated/sickened have no vocabulary entry.
  "+2 Racial bonus to resist becoming nauseated, sickened or diseased": [
    scopedSave("2", "racial", "disease"),
  ],
  "+2 Racial bonus vs mind-affecting effects.": [scopedSave("2", "racial", "mind")],
  "+2 Racial bonus vs. death effects.": [scopedSave("2", "racial", "death")],
  // The "1 less save to cure" rider has no expressible form.
  "+2 Racial bonus vs. diseases and poisons; Requires 1 less save to heal diseases and poisons (min. 1 save)":
    [scopedSave("2", "racial", "disease", "poison")],
  "+2 Racial bonus vs. fear effects": [scopedSave("2", "racial", "fear")],
  "+2 Racial bonus vs. illusion spells and effects": [scopedSave("2", "racial", "illusion")],
  "+2 Racial bonus vs. poisons": [scopedSave("2", "racial", "poison")],
  // Necromancy-only spells/SLAs are narrower than the unscoped spell/sla
  // categories; only the curse-descriptor half is promoted.
  "+2 Racial bonus vs. spells and spell-like abilities of necromancy school or with curse descriptor.":
    [scopedSave("2", "racial", "curse")],
  "+2 bonus against illusions.": [scopedSave("2", "untyped", "illusion")],
  // The electricity resistance rider is not a save bonus.
  "+2 bonus versus poison. You have Electricity resistance 5": [
    scopedSave("2", "untyped", "poison"),
  ],
  "+2 bonus vs death effects.": [scopedSave("2", "untyped", "death")],
  // The "count as two consecutive saves" rider has no expressible form.
  "+2 bonus vs diseases.  If you exceed the DC by 5 or more count as two consecutive saves": [
    scopedSave("2", "untyped", "disease"),
  ],
  // Divination has no vocabulary entry.
  "+2 racial vs. divination and enchantment spells and effects": [
    scopedSave("2", "racial", "enchantment"),
  ],
  "+2 racial vs. fear effects": [scopedSave("2", "racial", "fear")],
  "+2 racial vs. mind-affecting effects": [scopedSave("2", "racial", "mind")],
  "-2 penalty against fear effects.": [scopedSave("-2", "untyped", "fear")],
  // The "no benefit from morale bonuses on such saves" rider, and the speed/AC
  // rider, have no expressible form.
  "-2 penalty on saves against fear effects and gain no benefit from morale bonuses on such saves. When affected by a fear effect, their base speed increases by 10 feet and they gain a +1 dodge bonus to Armor Class.":
    [scopedSave("-2", "untyped", "fear")],
  // The 24-hour suppression toggle has no expressible form.
  "You don't usually gain morale bonuses, but instead gain a +2 Racial bonus against emotion and fear effects. You can choose suppress both of these effects but the suppression must be done for a full 24 hour period.":
    [scopedSave("2", "racial", "emotion", "fear")],
};

/**
 * Vendored CHARACTER TRAIT notes (`RefData.traits`), keyed by the note's exact
 * text.
 *
 * The vendored slice's 208 distinct `allSavingThrows` notes were read in
 * full; 76 promote here (covering 99 distinct traits, since many notes repeat
 * verbatim across several traits). The rest stay prose because the scope they
 * name has no vocabulary entry (cold/fire/electricity/acid descriptors, pain,
 * confusion/insanity/madness, dazzled/sickened/nauseated, the divination/
 * necromancy/transmutation schools, arcane/divine as a caster tradition,
 * language-dependent, the sonic descriptor, polymorph, the lawful/chaotic/
 * evil descriptors, movement-hampering effects, traps, negative energy/
 * negative levels, ability drain or memory loss, extraordinary abilities,
 * spells named for a rune/word, the shadow descriptor), because the scope is
 * narrower than any category (inhaled/ingested/contact poison delivery, the
 * phantasm subschool), because it is a property of the ATTACKER rather than
 * the effect (dragons, undead, fey, aberrations, devils, elves, humans,
 * lamias, mummies, the plant or vermin type, evil creatures or outsiders,
 * worshippers of your own god, creatures with the cold subtype, demons,
 * linnorms), because it is a limited-use resource or reroll rather than a
 * passive bonus, because a caveat makes it unexpressible (a bonus that only
 * applies while adjacent to an ally/eidolon/open flame, while wielding a
 * firearm, while imbibing alcohol, while serving a leader you deem
 * legitimate, while fighting demons, while on a plane or in a region, or
 * "except when you can see, hear, smell, or taste" the source), or because
 * the bonus is scoped to a descriptor chosen freely at character creation
 * from a mix of fitting and non-fitting options (a chosen energy type, a
 * chosen poison, a chosen alignment descriptor) that a fixed table entry
 * cannot follow.
 *
 * Where a note names one or more fitting scopes alongside content that is
 * not expressible, only the fitting part is promoted and the note keeps
 * carrying the rest; each such entry below says what was left out and why.
 * A source restriction to "spells and spell-like abilities" (excluding Su)
 * on an otherwise-fitting descriptor is promoted anyway, same as the
 * necromancy-or-curse racial entry above: the plain category is close enough
 * and the alternative is a table that can never express the distinction.
 */
export const VENDORED_CHARACTER_TRAIT_SAVE_NOTES: Readonly<Record<string, readonly Change[]>> = {
  "+2 Trait bonus against fear effects.": [scopedSave("2", "trait", "fear")],
  "+1 Trait bonus against fear effects.": [scopedSave("1", "trait", "fear")],
  "+2 Trait bonus against charm and compulsion effects.": [
    scopedSave("2", "trait", "charm", "compulsion"),
  ],
  "+1 Trait bonus against illusion effects.": [scopedSave("1", "trait", "illusion")],
  "+2 Trait bonus to disbelieve illusions.": [scopedSave("2", "trait", "illusion")],
  "+1 Trait bonus against enchantment effects.": [scopedSave("1", "trait", "enchantment")],
  "+1 Trait bonus against curses.": [scopedSave("1", "trait", "curse")],
  "+1 Trait bonus against charm and compulsion effects.": [
    scopedSave("1", "trait", "charm", "compulsion"),
  ],
  "+1 Trait bonus against mind-affecting effects.": [scopedSave("1", "trait", "mind")],
  "+1 Trait bonus against illusions.": [scopedSave("1", "trait", "illusion")],
  // No type named, so untyped. The immunity-loss rider (losing fear immunity
  //  entirely if you'd normally have it) has no expressible form.
  "-1 penalty against fear effects. If you would normally be immune to fear, you do not take this penalty, but instead lose your immunity to fear (regardless of its source).":
    [scopedSave("-1", "untyped", "fear")],
  "+2 Trait bonus against poison.": [scopedSave("2", "trait", "poison")],
  // Divinations have no vocabulary entry. Domination effects and compelled
  //  truth-telling (zone-of-truth-style) are both enchantment (compulsion) in
  //  PF1, so both fold into compulsion.
  "+1 trait bonus vs divinations, domination effects, effects that compel to speak the truth": [
    scopedSave("1", "trait", "compulsion"),
  ],
  "+1 Trait bonus against curses and fear effects.": [scopedSave("1", "trait", "curse", "fear")],
  "+2 Trait bonus to resist poison effects.": [scopedSave("2", "trait", "poison")],
  // Effects created by dragons is an attacker property; only the fear half promotes.
  "+1 Trait bonus against fear and against any effect created by a creature of the dragon type.": [
    scopedSave("1", "trait", "fear"),
  ],
  "Aura of courage grants an additional +1 trait bonus against fear effects.": [
    scopedSave("1", "trait", "fear"),
  ],
  "+1 Trait bonus to resist curses and spells with the curse\u00a0descriptor.": [
    scopedSave("1", "trait", "curse"),
  ],
  "+1 trait bonus vs enchantments": [scopedSave("1", "trait", "enchantment")],
  // The conditional reroll (with a bumped +2) when directed to act against the
  //  law has no expressible form; only the flat +1 promotes.
  "+1 Trait bonus vs. charm and compulsion spells and you may make a new save (with a total of +2 Trait bonus) if directed to act against the law.":
    [scopedSave("1", "trait", "charm", "compulsion")],
  "-2 Penalty against disease, illusions, and poisons": [
    scopedSave("-2", "untyped", "disease", "illusion", "poison"),
  ],
  "+2 Trait bonus charm and compulsion effects.": [scopedSave("2", "trait", "charm", "compulsion")],
  // The immunity-to-one-chosen-poison rider has no expressible form.
  "+2 Trait bonus against poison.  In addition, you are immune to <chosen poison>.": [
    scopedSave("2", "trait", "poison"),
  ],
  "+1 Trait bonus against illusions and charm effects.": [
    scopedSave("1", "trait", "illusion", "charm"),
  ],
  "+1 Trait bonus vs fear effects.": [scopedSave("1", "trait", "fear")],
  "-2 penalty vs sleep effects.": [scopedSave("-2", "untyped", "sleep")],
  "+2 Trait bonus against mind-affecting effects.": [scopedSave("2", "trait", "mind")],
  // Pain has no vocabulary entry. The once-per-day upgrade to +4 for a single
  //  save has no expressible form; only the flat +2 promotes.
  "+2 Trait bonus against spells with the emotion, fear, or pain descriptor. Once per day, you can increase this bonus to +4 for a single save, but you must make this decision before you attempt the saving throw.":
    [scopedSave("2", "trait", "fear", "emotion")],
  // Pain has no vocabulary entry.
  "+2 Trait bonus against emotion and pain spells and effects.": [
    scopedSave("2", "trait", "emotion"),
  ],
  "+1 Trait bonus against charm effects": [scopedSave("1", "trait", "charm")],
  "+2 Trait bonus against spells or effects with the fear or emotion descriptors.": [
    scopedSave("2", "trait", "fear", "emotion"),
  ],
  "+2 Trait vs fear effects": [scopedSave("2", "trait", "fear")],
  "+2 Trait bonus against illusions.": [scopedSave("2", "trait", "illusion")],
  "+1 Trait bonus on saving throws against poison.": [scopedSave("1", "trait", "poison")],
  // Scrying is divination and has no vocabulary entry.
  "+1 Trait bonus against scrying and mind-reading effects that allow saving throws.": [
    scopedSave("1", "trait", "mindReading"),
  ],
  // Divinations have no vocabulary entry; only the enchantment half promotes.
  "+2 Trait bonus \n against divinations or enchantments that would compel you to reveal a secret or allow anyone to read your mind.":
    [scopedSave("2", "trait", "enchantment")],
  "+2 Trait bonus versus diseases and curses.": [scopedSave("2", "trait", "disease", "curse")],
  "+2 Trait bonus against curses and magical effects that produce curses.": [
    scopedSave("2", "trait", "curse"),
  ],
  // No type named, so untyped. The rider penalizing nearby allies is a
  //  different target than this character's own saves and has no expressible form.
  "+2 bonus against death effects; allies within 10 feet (3 meters) take a -1 Penalty against death effects.":
    [scopedSave("2", "untyped", "death")],
  "+2 Trait bonus against charms and compulsions.": [
    scopedSave("2", "trait", "charm", "compulsion"),
  ],
  "+1 Trait bonus on saves against curses, including the hex class ability of shamans and witches.":
    [scopedSave("1", "trait", "curse")],
  "+2 Trait bonus against illusion magic.": [scopedSave("2", "trait", "illusion")],
  // The Intimidate-DC rider is a different mechanic, not a save bonus.
  "+1 Trait bonus against charms and compulsions, and the DC of any attempts to use the Intimidate skill on you increases by +1.":
    [scopedSave("1", "trait", "charm", "compulsion")],
  "+2 Trait bonus against charm, compulsion, and emotion effects.": [
    scopedSave("2", "trait", "charm", "compulsion", "emotion"),
  ],
  "+2 Trait bonus vs fear effects.": [scopedSave("2", "trait", "fear")],
  "+2 Trait bonus vs. emotion spells and effects.": [scopedSave("2", "trait", "emotion")],
  "+2 Trait bonus against disease effects.": [scopedSave("2", "trait", "disease")],
  // The immunity-to-two-named-diseases rider has no expressible form.
  "+1 Trait bonus to resist diseases. Additionally, you are immune to the diseases Vorel\u2019s phage and blood veil":
    [scopedSave("1", "trait", "disease")],
  "+2 Trait bonus against fear.": [scopedSave("2", "trait", "fear")],
  "+2 Trait bonus against fear affects.": [scopedSave("2", "trait", "fear")],
  "+2 Trait bonus on saving throws against death effects.": [scopedSave("2", "trait", "death")],
  // Negative energy (energy drain, inflict spells) has no vocabulary entry.
  "+1 Trait bonus against death effects and effects that use negative energy, such as energy drain and inflict spells.":
    [scopedSave("1", "trait", "death")],
  "+1 Trait bonus against poison.": [scopedSave("1", "trait", "poison")],
  "+2 Trait bonus against charm or compulsion effects.": [
    scopedSave("2", "trait", "charm", "compulsion"),
  ],
  "+2 Trait bonus versus poison.": [scopedSave("2", "trait", "poison")],
  "-2 Penalty against mind-affecting effects": [scopedSave("-2", "untyped", "mind")],
  "+1 Trait bonus vs enchantment spells and spell-like abilities.": [
    scopedSave("1", "trait", "enchantment"),
  ],
  "+1 Trait bonus against disease.": [scopedSave("1", "trait", "disease")],
  "-2 penalty vs illusions.": [scopedSave("-2", "untyped", "illusion")],
  // The conditional bump to +3 against an evil outsider's fear effect has no
  //  expressible form; only the flat +1 promotes.
  "+1 Trait bonus against fear effects; this increases to +3 if an evil outsider caused the effect.":
    [scopedSave("1", "trait", "fear")],
  // The alternate +4-vs-emotion-if-immune-to-fear branch has no expressible
  //  form; only the flat +2 against both promotes.
  "+2 Trait bonus against emotion and fear effects or a +4 trait bonus against emotion effects if you are immune to fear effects.":
    [scopedSave("2", "trait", "fear", "emotion")],
  "+2 trait bonus vs curses and curse effects (including mummy rot and spells with the curse descriptor).":
    [scopedSave("2", "trait", "curse")],
  "+2 Trait bonus against fear and death effects.": [scopedSave("2", "trait", "fear", "death")],
  // The swift-action, limited-use ability to share this bonus with a nearby ally
  //  has no expressible form; only the character's own flat +1 promotes.
  "+1 Trait bonus against mind-affecting effects.  As a swift action, [[max(1, @abilities.cha.mod)]] times per day, you can grant this bonus to an ally within 10 feet. This bonus lasts for 1 minute. ([[@resources.theOptimistTyrantsGrasp.value]] remaining uses)":
    [scopedSave("1", "trait", "mind")],
  "+2 Trait bonus vs death effects.": [scopedSave("2", "trait", "death")],
  "+1 Trait bonus against curses and diseases, including magical diseases.": [
    scopedSave("1", "trait", "curse", "disease"),
  ],
  "+2 Trait bonus against spells and effects with the emotion descriptor.": [
    scopedSave("2", "trait", "emotion"),
  ],
  "+1 Trait bonus vs fear.": [scopedSave("1", "trait", "fear")],
  "+1 Trait bonus on all saving throws to resist death effects.": [
    scopedSave("1", "trait", "death"),
  ],
  // Confusion and insanity have no vocabulary entry.
  "+2 Trait bonus against confusion, insanity, and fear effects.": [
    scopedSave("2", "trait", "fear"),
  ],
  "+1 Trait bonus against diseases and poisons.": [scopedSave("1", "trait", "disease", "poison")],
  "+1 Trait bonus against charm and compulsion effects": [
    scopedSave("1", "trait", "charm", "compulsion"),
  ],
  // The already-suffering and consciousness caveats change nothing observable
  //  here, and the ally morale rider is a different target than this
  //  character's own saves; neither has an expressible form beyond the flat +1.
  "As long as you are conscious, +1 Trait bonus against mind-affecting effects you are not already suffering from.   All allies within 10 feet gain a +1 Morale bonus against these same effects.":
    [scopedSave("1", "trait", "mind")],
  "+1 Trait bonus against spells, spell-like abilities, and poison.": [
    scopedSave("1", "trait", "spell", "sla", "poison"),
  ],
  "-2 vs charm spells and spell-like abilities": [scopedSave("-2", "untyped", "charm")],
  // The conditional bump to +2 when 30+ feet from the nearest ally has no
  //  expressible form; only the flat +1 promotes.
  "+1 Trait bonus against fear; this bonus increases to +2 whenever you are 30 feet or farther from your nearest ally.":
    [scopedSave("1", "trait", "fear")],
};

/**
 * The scoped `Change`s an entry's own save notes imply.
 *
 * Only `allSavingThrows` notes are considered, so a table key can never pull a
 * save bonus out of a skill or AC reminder.
 */
export function saveChangesFromNotes(
  notes: readonly ContextNote[] | undefined,
  table: Readonly<Record<string, readonly Change[]>>,
): readonly Change[] {
  if (!notes || notes.length === 0) return [];
  const out: Change[] = [];
  for (const note of notes) {
    if (note.target !== "allSavingThrows") continue;
    const hit = table[note.text.trim()];
    if (hit) out.push(...hit);
  }
  return out;
}
