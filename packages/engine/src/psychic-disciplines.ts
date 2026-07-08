/**
 * Clean-room PF1 psychic discipline table (Occult Adventures, DESIGN §6):
 * hand-authored, mirroring `oracle-mysteries.ts`'s posture exactly — a
 * discipline's BONUS SPELLS and PHRENIC POOL ABILITY are the only parts of
 * "Psychic Discipline" that are structured/tabular upstream; DISCIPLINE
 * POWERS (each discipline's 1st/5th/13th-level abilities) and PHRENIC
 * AMPLIFICATIONS (the psychic's own menu of choosable spell-modifying
 * powers, picked at 1st, 3rd, and every 4 levels thereafter) are
 * prose-heavy, genuinely choice-bearing content — out of scope, same as
 * Oracle Revelations / Arcanist Exploits were at those classes' launches
 * (see IMPLEMENTATION_PLAN.md).
 *
 * Scope: the 12 core Occult Adventures disciplines (Abomination, Dream,
 * Enlightenment, Faith, Ferocity, Haunted, Lore, Pageantry, Pain, Rebirth,
 * Self-Perfection, Tranquility). The vendored Foundry pack ships a dozen
 * more `packs/class-abilities/*-discipline.*.yaml` entries from later
 * splatbooks (Mindtech, Bleaching, Hag-Called, Rivethun, Psychedelia, ...)
 * — those are out of scope, matching `oracle-mysteries.ts`'s own scope note.
 *
 * Data provenance — the same unusual case as oracle mysteries: the vendored
 * pack DOES carry real structured content for this, just not linked from the
 * Psychic class def (the class only links the generic "Psychic Discipline"
 * stub feature, id `BOUqxGDega0y1JOX` — the 26 per-discipline YAMLs came
 * through the transform as standalone entries not referenced by any
 * `ClassFeatureGrant`, hence hand-authoring here instead of a normal
 * `RefData.classFeatures` derivation):
 *   - `phrenicPoolAbility` is read VERBATIM from each discipline's vendored
 *     "<b>Phrenic Pool Ability:</b> Wisdom|Charisma" prose line. NOTE: the
 *     vendored Phrenic Pool class feature's `uses.maxFormula`
 *     (`floor(@class.unlevel / 2) + @abilities.cha.mod`) hardcodes Charisma
 *     regardless of discipline — an upstream data simplification, since RAW
 *     the ability is discipline-determined (6 of these 12 use Wisdom). The
 *     engine corrects this in `resources.ts` by aliasing `@abilities.cha` to
 *     Wisdom's values when evaluating the phrenic-pool formula for a
 *     Wisdom-based discipline (same aliasing mechanism as the cleric Wisdom
 *     house-rule).
 *   - `bonusSpells` ids are copied VERBATIM from the `@UUID[Compendium.pf1.
 *     spells.<id>]` references embedded in each discipline's vendored prose
 *     — real vendored spell ids, verified present in `RefData.spells` for
 *     all 108 entries below (names below are the vendored `Spell.name`, e.g.
 *     "Arcane Sight, Greater", not the prose's own "Greater Arcane Sight"
 *     ordering — resolving by id sidesteps that drift, same as mysteries).
 *     `level` is the PSYCHIC level at which the spell is gained as a bonus
 *     known spell (PF1 RAW, "Psychic Discipline": "At 1st level, a psychic
 *     learns an additional spell determined by her discipline. She learns
 *     another additional spell at 4th level and every 2 levels thereafter,
 *     until learning the final one at 18th level" — i.e. levels 1, 4, 6, 8,
 *     10, 12, 14, 16, 18; matches the "(1st)", "(4th)", ... markers in the
 *     vendored prose), NOT the spell's own level — a different unlock cadence
 *     from oracle mysteries' flat every-2-levels-from-2nd, so disciplines get
 *     their own helper (`disciplineSpellsKnown` in `apps/web/src/model/
 *     spellcasting.ts`) rather than reusing `mysterySpellsKnown`'s. Unlike
 *     mysteries, disciplines grant no class skills.
 */

export interface PsychicDisciplineBonusSpell {
  /** Psychic class level at which this spell is added to the known list (1, 4, 6, ..., 18). */
  level: number;
  /** Vendored Foundry spell id (`RefData.spells` key). */
  id: string;
  /** Display name, for readability here and as a display fallback. */
  name: string;
}

export interface PsychicDisciplineDef {
  /** Matches `doc.build.psychicDiscipline` keys. */
  tag: string;
  name: string;
  /**
   * Which ability's modifier feeds the phrenic pool (and phrenic
   * amplification effects) for this discipline — always "wis" or "cha" (PF1
   * RAW; the psychic's CASTING ability is Int regardless, and discipline
   * ability DCs use Int too).
   */
  phrenicPoolAbility: "wis" | "cha";
  /** One bonus spell known at psychic level 1, 4, 6, ..., 18 (ascending). */
  bonusSpells: PsychicDisciplineBonusSpell[];
}

const DISCIPLINE_LIST: PsychicDisciplineDef[] = [
  {
    tag: "abomination",
    name: "Abomination",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "mczdgwo3xl8c6e26", name: "Ray of Enfeeblement" },
      { level: 4, id: "kouqz0pm1xl8xilm", name: "Alter Self" },
      { level: 6, id: "nnocwsre2mckj58a", name: "Excruciating Deformation" },
      { level: 8, id: "wralcmyi4tdcai24", name: "Black Tentacles" },
      { level: 10, id: "yi0rf7b0v4lev9fl", name: "Explode Head" },
      { level: 12, id: "5w1zrztwbvd6xkgj", name: "Repulsion" },
      { level: 14, id: "s6q72tw2zra9sycu", name: "Insanity" },
      { level: 16, id: "003tu19dpyoaj0se", name: "Orb of the Void" },
      { level: 18, id: "egbw0mba2cpe3xe5", name: "Telekinetic Storm" },
    ],
  },
  {
    tag: "dream",
    name: "Dream",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "3plb67e51webutdz", name: "Sleep" },
      { level: 4, id: "j7mhkhixnvd0amye", name: "Oneiric Horror" },
      { level: 6, id: "qgmlu83z2l84kjde", name: "Deep Slumber" },
      { level: 8, id: "ntcb8hjlxps8v212", name: "Sleepwalk" },
      { level: 10, id: "siv3ub7hbmcklf8c", name: "Nightmare" },
      { level: 12, id: "pzwe3gxjz8gthyaj", name: "Cloak of Dreams" },
      { level: 14, id: "btccs4sjo2nog1a0", name: "Ethereal Jaunt" },
      { level: 16, id: "759y8xzdg3unvt6s", name: "Dream Voyage" },
      { level: 18, id: "esugpfcs3zwbujt1", name: "Microcosm" },
    ],
  },
  {
    tag: "enlightenment",
    name: "Enlightenment",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "f9adpo6szijchpva", name: "Acute Senses" },
      { level: 4, id: "llxrra87kbofmyhl", name: "Identify" },
      { level: 6, id: "6kmkxepwgsbta6ui", name: "Clairaudience/Clairvoyance" },
      { level: 8, id: "5wmn4airvkprv3gp", name: "Thoughtsense" },
      { level: 10, id: "qr6qcx8zqum6jhc4", name: "Atonement" },
      { level: 12, id: "ln4jpuurxbrfxw5j", name: "Arcane Sight, Greater" },
      { level: 14, id: "y4881ol4t79wj7sf", name: "Circle of Clarity" },
      { level: 16, id: "0kppkhsencd6tzvh", name: "Protection from Spells" },
      { level: 18, id: "xuuzj9lr2xbwaim4", name: "Overwhelming Presence" },
    ],
  },
  {
    tag: "faith",
    name: "Faith",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "wa0zb2pncesmm9lz", name: "Bless" },
      { level: 4, id: "avofn5q2v0f0qxjy", name: "Spiritual Weapon" },
      { level: 6, id: "73han2zqxg59u18g", name: "Magic Vestment" },
      { level: 8, id: "io8sg720zjd0tdj2", name: "Guardian of Faith" },
      { level: 10, id: "p2kosvizylhy8vfa", name: "Commune" },
      { level: 12, id: "21yha04trfhj0ehd", name: "Psychic Surgery" },
      { level: 14, id: "glt6uk3n6g6l2p6l", name: "Scrying, Greater" },
      { level: 16, id: "0wamdkl9gp19l55w", name: "Planar Ally, Greater" },
      { level: 18, id: "suel7sgnztenv551", name: "Miracle" },
    ],
  },
  {
    tag: "ferocity",
    name: "Ferocity",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "ja1p1uuf8fp6fiox", name: "Anticipate Peril" },
      { level: 4, id: "05i5rxwim12hwktu", name: "Bull's Strength" },
      { level: 6, id: "vqfrp8t0c1lw1jna", name: "Heroism" },
      { level: 8, id: "lvzq2mwkqmozolpl", name: "Freedom of Movement" },
      { level: 10, id: "knyako6zopc1chrv", name: "Stoneskin" },
      { level: 12, id: "9pbl3ktd5oqejl19", name: "Transformation" },
      { level: 14, id: "ln4jpuurxbrfxw5j", name: "Arcane Sight, Greater" },
      { level: 16, id: "blvetbc929cfx4m8", name: "Mind Blank" },
      { level: 18, id: "vl7yer8k1leyuxld", name: "Foresight" },
    ],
  },
  {
    tag: "haunted",
    name: "Haunted",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "aa0w7tk852iqn3ni", name: "Detect Undead" },
      { level: 4, id: "y4ztvvswf2uuwuqo", name: "Calm Spirit" },
      { level: 6, id: "f98kluovmjf6w7d5", name: "Halt Undead" },
      { level: 8, id: "ykb7nby9eovw8jyo", name: "Speak with Haunt" },
      { level: 10, id: "wr96kbh0sqxecx63", name: "Disrupting Weapon" },
      { level: 12, id: "lllhr9py6w44cxjm", name: "Undeath to Death" },
      { level: 14, id: "btccs4sjo2nog1a0", name: "Ethereal Jaunt" },
      { level: 16, id: "0j2cb0iv0695a45i", name: "Possession, Greater" },
      { level: 18, id: "gw9bes9othfqm7mi", name: "Etherealness" },
    ],
  },
  {
    tag: "lore",
    name: "Lore",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "jcs7ba5depdyitey", name: "Comprehend Languages" },
      { level: 4, id: "pyr472hvqn8c8es2", name: "Hypercognition" },
      { level: 6, id: "gmgwyjfpeuuc4t4o", name: "Dispel Magic" },
      { level: 8, id: "vrzgrnmiz8kmz6di", name: "Mind Probe" },
      { level: 10, id: "nv20ki8uteao1vqv", name: "Retrocognition" },
      { level: 12, id: "b5mz8voksps5g4yq", name: "Legend Lore" },
      { level: 14, id: "ln4jpuurxbrfxw5j", name: "Arcane Sight, Greater" },
      { level: 16, id: "2vb5orfcy57lrfmc", name: "Moment of Prescience" },
      { level: 18, id: "q8nety5obvbbd5xs", name: "Divide Mind" },
    ],
  },
  {
    tag: "pageantry",
    name: "Pageantry",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "wa0zb2pncesmm9lz", name: "Bless" },
      { level: 4, id: "6orhthk4g27rncuu", name: "Calm Emotions" },
      { level: 6, id: "jcr72piqo6g549e1", name: "Slow" },
      { level: 8, id: "xuuzj9lr2xbwaim4", name: "Overwhelming Presence" },
      { level: 10, id: "weyfn0mg2oifasq1", name: "Seeming" },
      { level: 12, id: "op40qjf9oohlx5nu", name: "Heroes' Feast" },
      { level: 14, id: "kqftgm3bi2dqj92l", name: "Mage's Magnificent Mansion" },
      { level: 16, id: "zi1fpl4essgw5bbc", name: "Divine Vessel" },
      { level: 18, id: "ueuz3ymuz8pxpzr6", name: "Heroic Invocation" },
    ],
  },
  {
    tag: "pain",
    name: "Pain",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "ijtqp1h3hka5kive", name: "Persuasive Goad" },
      { level: 4, id: "jy64xofud29j5ju6", name: "Pain Strike" },
      { level: 6, id: "3efy1ico48ccrzni", name: "Vampiric Touch" },
      { level: 8, id: "1dkzhi78je32sbrr", name: "Pain Strike, Mass" },
      { level: 10, id: "4jddpsd5pkky0qjg", name: "Synapse Overload" },
      { level: 12, id: "nqrpfidjuzllqa9z", name: "Inflict Pain, Mass" },
      { level: 14, id: "9f3hf9h3j8q8062b", name: "Waves of Exhaustion" },
      { level: 16, id: "e8zen5nzixnt7bde", name: "Horrid Wilting" },
      { level: 18, id: "6yeorbvt5ysym3nh", name: "Suffocation, Mass" },
    ],
  },
  {
    tag: "rebirth",
    name: "Rebirth",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "ndvks6ztnxhj6oxh", name: "Burst of Insight" },
      { level: 4, id: "3ze0kso9hxff5u2f", name: "False Life" },
      { level: 6, id: "68ngvzmzvadhf6vs", name: "Contact Other Plane" },
      { level: 8, id: "0dcr75sqs8wpdrhg", name: "Ancestral Memory" },
      { level: 10, id: "3w1ozzzf8hk0gdzm", name: "Reincarnate" },
      { level: 12, id: "9pbl3ktd5oqejl19", name: "Transformation" },
      { level: 14, id: "btccs4sjo2nog1a0", name: "Ethereal Jaunt" },
      { level: 16, id: "v39qnirlhgje2c0e", name: "Bilocation" },
      { level: 18, id: "au6p72aztjhtokwr", name: "Akashic Form" },
    ],
  },
  {
    tag: "self-perfection",
    name: "Self-Perfection",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "pysrx5kxfjvsjjsi", name: "Expeditious Retreat" },
      { level: 4, id: "usdv1eqvibmxun6x", name: "Bear's Endurance" },
      { level: 6, id: "s9amdo5398alb5p0", name: "Haste" },
      { level: 8, id: "lvzq2mwkqmozolpl", name: "Freedom of Movement" },
      { level: 10, id: "wuispaydz8jvw3io", name: "Echolocation" },
      { level: 12, id: "9pbl3ktd5oqejl19", name: "Transformation" },
      { level: 14, id: "btccs4sjo2nog1a0", name: "Ethereal Jaunt" },
      { level: 16, id: "mkrjbrp57yfdqrx0", name: "Iron Body" },
      { level: 18, id: "au6p72aztjhtokwr", name: "Akashic Form" },
    ],
  },
  {
    tag: "tranquility",
    name: "Tranquility",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "2s198jpks0pvimjf", name: "Telempathic Projection" },
      { level: 4, id: "ow4t1zox6dtybgji", name: "Silence" },
      { level: 6, id: "7no45vnykqt1azc8", name: "Mantle of Calm" },
      { level: 8, id: "f0o357a1halsvm4p", name: "Daze, Mass" },
      { level: 10, id: "z8hhy7qitegvb7a4", name: "Serenity" },
      { level: 12, id: "21yha04trfhj0ehd", name: "Psychic Surgery" },
      { level: 14, id: "blvetbc929cfx4m8", name: "Mind Blank" },
      { level: 16, id: "xlzqpkl8fpm3sn4u", name: "Euphoric Tranquility" },
      { level: 18, id: "7mstq5c76h3e6zzx", name: "Time Stop" },
    ],
  },
];

export const PSYCHIC_DISCIPLINES: Record<string, PsychicDisciplineDef> = Object.fromEntries(
  DISCIPLINE_LIST.map((d) => [d.tag, d]),
);

export const PSYCHIC_DISCIPLINE_TAGS: readonly string[] = DISCIPLINE_LIST.map((d) => d.tag);
