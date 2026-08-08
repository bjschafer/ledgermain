/**
 * Clean-room PF1 psychic discipline table (Occult Adventures, DESIGN §6):
 * hand-authored, mirroring `oracle-mysteries.ts`'s posture exactly — a
 * discipline's BONUS SPELLS and PHRENIC POOL ABILITY are the only parts of
 * "Psychic Discipline" that are structured/tabular upstream; DISCIPLINE
 * POWERS (each discipline's 1st/5th/13th-level abilities) and PHRENIC
 * AMPLIFICATIONS (the psychic's own menu of choosable spell-modifying
 * powers, picked at 1st, 3rd, and every 4 levels thereafter) are
 * prose-heavy, genuinely choice-bearing content — out of scope, same as
 * Oracle Revelations / Arcanist Exploits were at those classes' launches.
 *
 * Scope: all 23 published psychic disciplines, both the 12 core Occult
 * Adventures ones (Abomination, Dream, Enlightenment, Faith, Ferocity,
 * Haunted, Lore, Pageantry, Pain, Rebirth, Self-Perfection, Tranquility) and
 * the 11 later-splatbook ones the vendored Foundry pack also carries
 * (Bleaching, Hag-Called, Mindtech, Psychedelia, Rapport, Rivethun, Shadow,
 * Sorrow, Superiority, Symbiosis, Warp) — unlike `oracle-mysteries.ts`, whose
 * later-splatbook mysteries stay out of scope, every discipline needed its
 * own hand-authored row regardless of book, since none of the 23 are linked
 * from the class def (see provenance note below).
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
 *     the ability is discipline-determined (10 of these 23 use Wisdom). The
 *     engine corrects this in `resources.ts` by aliasing `@abilities.cha` to
 *     Wisdom's values when evaluating the phrenic-pool formula for a
 *     Wisdom-based discipline (same aliasing mechanism as the cleric Wisdom
 *     house-rule). Every discipline across all 23 uses Wisdom or Charisma —
 *     no splatbook entry needed a third ability aliased in.
 *   - `bonusSpells` ids are copied VERBATIM from the `@UUID[Compendium.pf1.
 *     spells.<id>]` references embedded in each discipline's vendored prose —
 *     real vendored spell ids, verified present in `RefData.spells` for all
 *     207 entries below (names below are the vendored `Spell.name`, e.g.
 *     "Arcane Sight, Greater", not the prose's own "Greater Arcane Sight"
 *     ordering — resolving by id sidesteps that drift, same as mysteries).
 *     `level` is the PSYCHIC level at which the spell is gained as a bonus
 *     known spell (PF1 RAW, "Psychic Discipline": "At 1st level, a psychic
 *     learns an additional spell determined by her discipline. She learns
 *     another additional spell at 4th level and every 2 levels thereafter,
 *     until learning the final one at 18th level" — i.e. levels 1, 4, 6, 8,
 *     10, 12, 14, 16, 18; matches the "(1st)", "(4th)",... markers in the
 *     vendored prose), NOT the spell's own level — a different unlock cadence
 *     from oracle mysteries' flat every-2-levels-from-2nd, so disciplines get
 *     their own helper (`disciplineSpellsKnown` in `apps/web/src/model/
 *     spellcasting.ts`) rather than reusing `mysterySpellsKnown`'s. Unlike
 *     mysteries, disciplines grant no class skills.
 *
 * `powers` (previously deferred): each discipline's "Discipline Powers"
 * sub-feature, hand-authored from aonprd.com's individual discipline pages
 * (`PsychicDisciplinesDisplay.aspx?ItemName=<Name>`, verified 2026-07-08 for
 * the 12 core disciplines and 2026-08-07 for the 11 splatbook ones) — NOT
 * vendored anywhere (the cached `*-discipline.*.yaml` carries only the
 * Phrenic Pool Ability/Bonus Spells prose already mined above, confirmed by
 * direct inspection: no Discipline Powers text at all). PF1 RAW grants these
 * automatically at 1st, 5th, and 13th psychic level to whichever discipline is
 * chosen (not a budgeted pick — same "automatic once you qualify" shape as a
 * sorcerer bloodline power); some disciplines name two powers at 1st level
 * (both un-numbered on the same page, e.g. Dream's Dream Leech + Oneiromancy).
 * Modelling posture mirrors `ORACLE_REVELATIONS`'/`WITCH_HEXES`' honesty bar:
 * almost every power here is a swift-action/limited-use/passive-substitution
 * ability with no flat always-on number this engine's `Change` pipeline could
 * safely apply unconditionally — those stay note-tier `GrantedFeature`s
 * (`archetypes.ts`'s `collectGrantedFeatures`, `origin.kind: "discipline"`)
 * with a summary only, same posture as a shaman's spirit ability. A handful
 * (promotion audit, verified 2026-07-29 for the core 12 and 2026-08-07 for
 * the 11 splatbook disciplines) genuinely are unconditional and always-on
 * once gained, so they additionally carry a real `changes` array collected
 * the same way `bloodline.powers`/`bloodragerBloodline.powers` are (see
 * `collect.ts`'s psychic discipline power loop): Faith's Resilience of the
 * Faithful (resistance bonus on all saves), Rebirth's Past-Life Memories
 * (flat Knowledge bonus), Ferocity's Enhanced Senses (scent — its
 * phrenic-pool-activated blindsense upgrade is NOT modeled), Abomination's
 * Psychic Safeguard (the constant base SR only — its dark-half-manifested
 * increase is conditional and NOT modeled), Self-Perfection's AC Bonus
 * (Wis-to-AC/CMD, gated on armor/shield/encumbrance the same way the vendored
 * Monk "AC Bonus (MNK)" class feature's own `changes[]` does — its "loses this
 * while immobilized or helpless" clause is likewise not modeled there, so
 * leaving it unmodeled here matches existing engine precedent rather than a
 * new gap) and Pure Body (immunity to disease and poison, the same
 * `immEffect.disease`/`immEffect.poison` shape the data-pipeline's
 * `SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY` already uses for the Monk's
 * Purity of Body / Diamond Body), Hag-Called's Curse Mastery (immunity to the
 * curse subschool, `immEffect.curse`), and Symbiosis's One with Nature (flat
 * insight bonus on Knowledge (nature)).
 */

import type { Change, PsychicDiscipline, RefData, SourceRef } from "@pf1/schema";

const c = (formula: string, target: string, type: string, operator?: "add" | "set"): Change => ({
  formula,
  target,
  type,
  ...(operator ? { operator } : {}),
});

export interface PsychicDisciplinePower {
  /** Psychic level this power is gained — 1, 5, or 13 (PF1 RAW: "Discipline Powers" gained at 1st, 5th, and 13th level). */
  level: 1 | 5 | 13;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Unconditional numeric modifiers (rare — see file doc comment). */
  changes?: Change[];
}

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
  /** Discipline Powers gained automatically at 1st, 5th, and 13th psychic level (see file doc comment). */
  powers: PsychicDisciplinePower[];
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
    powers: [
      {
        level: 1,
        name: "Dark Half",
        summary:
          "Swift action: manifest a darker persona for 3 + 1/2 level + Cha mod rounds/day, gaining +1 DC on psychic spells, +2 morale bonus on Will saves, and immunity to fear; your damaging spells inflict 1 point of bleed (2 at 5th, 1d6 at 13th).",
      },
      {
        level: 5,
        name: "Morphic Form",
        summary: "While manifesting your dark half, gain DR 5/— of a randomly determined type.",
      },
      {
        level: 13,
        name: "Psychic Safeguard",
        summary:
          "Constant spell resistance 8 + caster level, increasing to 16 + caster level while manifesting your dark half.",
        // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Abomination): "You
        // project constant mental defenses, gaining spell resistance equal
        // to 8 + your caster level." Only the constant base is modeled —
        // the dark-half-manifested increase to 16 + caster level is
        // conditional on the (activated, limited-use) Dark Half power.
        changes: [c("8 + @classes.psychic.level", "spellResist", "untyped", "set")],
      },
    ],
  },
  {
    tag: "bleaching",
    name: "Bleaching",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "7u45op4znvtkvgv3", name: "Decrepit Disguise" },
      { level: 4, id: "5j7llv2nys5makeq", name: "Steal Voice" },
      { level: 6, id: "ds011sdiv3d8c86w", name: "Cup of Dust" },
      { level: 8, id: "bc3nc0ri47egssht", name: "Enervation" },
      { level: 10, id: "c7j4fxzlxyvll2t4", name: "Pessimism" },
      { level: 12, id: "sxyiwj0z95piv96i", name: "Disintegrate" },
      { level: 14, id: "9f3hf9h3j8q8062b", name: "Waves of Exhaustion" },
      { level: 16, id: "jg3p4t3dv1a7nqvo", name: "Spell Immunity, Greater" },
      { level: 18, id: "khfprkujokr9uigq", name: "Energy Drain" },
    ],
    powers: [
      {
        level: 1,
        name: "Draining Touch",
        summary:
          "Melee touch attack, uses/day = Wis mod: the target takes 1d2 Charisma damage unless it succeeds at a Fortitude save. A creature cannot be the target of this power again for 24 hours; regain 1 phrenic pool point whenever the drain succeeds.",
      },
      {
        level: 5,
        name: "Emotionally Distant",
        summary: "+4 bonus on saving throws to resist charm, emotion, and fear effects.",
      },
      {
        level: 13,
        name: "Drain Vibrancy",
        summary:
          "Standard action, 3/day: creatures in a 30 foot radius take 1 temporary negative level (2 at 17th level) unless they succeed at a Fortitude save.",
      },
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
    powers: [
      {
        level: 1,
        name: "Dream Leech",
        summary:
          "Swift action while adjacent to a sleeping/unconscious creature: siphon its dreams for a +4 bonus on Bluff/Diplomacy/Intimidate against it within 24 hours and regain 1 phrenic pool point; uses/day = Cha mod (max once/hour, once per creature/day).",
      },
      {
        level: 1,
        name: "Oneiromancy",
        summary:
          "Standard action, uses/day = 3 + Cha mod: plant subconscious suggestions in a sleeping creature via a Diplomacy/Intimidate check, or enhance a dream/minor dream/nightmare spell.",
      },
      {
        level: 5,
        name: "Mind Heist",
        summary:
          "Spell-like ability, uses/day = Cha mod: cast detect thoughts on an adjacent sleeping creature (Will negates); also grants detect thoughts benefits when casting dream/minor dream/nightmare.",
      },
      {
        level: 13,
        name: "Waking Dream",
        summary:
          "Standard action, uses/day = Cha bonus: take control of a sleeping creature within 30 ft. for 1 hour/level, as magic jar without a receptacle.",
      },
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
    powers: [
      {
        level: 1,
        name: "Expanded Awareness",
        summary:
          "Move action: gain blindsense 10 ft., darkvision 30 ft., low-light vision, or scent (your choice) until you switch to a different sense.",
      },
      {
        level: 1,
        name: "Patient Insight",
        summary:
          "Spend 1 phrenic pool point to roll a Heal, Knowledge, Sense Motive, or Survival check twice and take the higher result.",
      },
      {
        level: 5,
        name: "Focused Trance",
        summary:
          "Enter a 1d6-round trance (move actions only) granting a bonus equal to your psychic level on saves vs. sonic effects and gaze attacks; on exit, make one Appraise/Knowledge/Spellcraft check at +20 circumstance.",
      },
      {
        level: 13,
        name: "Empty Mind",
        summary:
          "Free action, spend 1 phrenic pool point on your turn: remove blinded, confused, dazed, deafened, staggered, or stunned from yourself.",
      },
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
    powers: [
      {
        level: 1,
        name: "Deity",
        summary:
          "Choose a deity to worship at 1st level; your alignment must stay within one step of your deity's or you lose access to this discipline's bonus spells and powers.",
      },
      {
        level: 1,
        name: "Divine Energy",
        summary:
          "Convert a prepared spell into a cure or inflict spell (as a cleric's spontaneous casting); regain 1 phrenic pool point per conversion, up to your Wisdom modifier per day.",
      },
      {
        level: 5,
        name: "Resilience of the Faithful",
        summary: "+2 resistance bonus on all saving throws, +1 more per 5 levels beyond 5th.",
        // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Faith): "At 5th
        // level, you gain a +2 resistance bonus on all saving throws. This
        // bonus increases by 1 for every 5 levels you possess beyond 5th."
        // Unconditional and always-on once gained (the collect.ts loop
        // already gates this power on psychic level >= 5, so the formula
        // itself doesn't need to).
        changes: [
          c("2 + floor((@classes.psychic.level - 5) / 5)", "allSavingThrows", "resistance"),
        ],
      },
      {
        level: 13,
        name: "Prayer Aura",
        summary:
          "Free action, rounds/day = psychic level: grant allies +1 luck bonus on attacks/damage/saves/skills and impose -1 on enemy rolls (-2 vs. your opposed alignment).",
      },
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
    powers: [
      {
        level: 1,
        name: "Enhanced Senses",
        summary: "Gain scent, as the universal monster rule.",
        // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Ferocity): "You gain
        // scent as per the universal monster rule." Only the constant scent
        // grant is modeled — the same power also lets you spend a phrenic
        // pool point (permanent from 11th level on) to activate blindsense,
        // an activated/limited-use effect this table doesn't carry.
        changes: [c("1", "sensesc", "untyped")],
      },
      {
        level: 1,
        name: "Survival Instinct",
        summary:
          "Add your Wisdom bonus (minimum +1) to Constitution for the purpose of your negative-hp death threshold and stabilization checks.",
      },
      {
        level: 5,
        name: "Ferocity",
        summary:
          "Gain the ferocity monster ability (continue fighting below 0 hp); while at 0 or negative hp, gain +4 morale to Str/Dex and +2 morale on Fortitude saves.",
      },
      {
        level: 13,
        name: "Primal Fury",
        summary:
          "Free action, rounds/day = psychic level: enter a transformed state; afterward, fatigued for twice the number of rounds spent.",
      },
    ],
  },
  {
    tag: "hag_called",
    name: "Hag-Called",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "wjdhmfdgwrevax3w", name: "Ill Omen" },
      { level: 4, id: "v3d3lnjj7ks0ztii", name: "Enthrall" },
      { level: 6, id: "lsboosfk26m0ycqv", name: "Bestow Curse" },
      { level: 8, id: "smbkd2yobhshbpqf", name: "Charm Monster" },
      { level: 10, id: "w2yf0ksu14e91uae", name: "Threefold Aspect" },
      { level: 12, id: "fxwycv6d7xwzua4t", name: "Veil" },
      { level: 14, id: "578t0lra5ll3aifs", name: "Control Weather" },
      { level: 16, id: "xmkvpl56appk20cl", name: "Trap the Soul" },
      { level: 18, id: "66s5qm8kwycgobce", name: "Dominate Monster" },
    ],
    powers: [
      {
        level: 1,
        name: "Threefold Casting",
        summary:
          "+2 insight bonus on skill checks for ritual magic with at least two secondary casters; within 30 feet of another hag, psychic, or witch, use aid another to grant that spellcaster a +1 bonus to caster level for 1 round.",
      },
      {
        level: 1,
        name: "Mother's Embrace",
        summary:
          "Uses/day = Cha mod: add 1d4 to a failed Will save, taking 2 Wisdom damage regardless of the outcome. Regain 1 phrenic pool point after performing an act of cruelty.",
      },
      {
        level: 5,
        name: "Deceptive Shapes",
        summary:
          "At will, change into any Small or Medium humanoid as alter self, without gaining any of the spell's special abilities or ability score adjustments and without mimicking a specific person.",
      },
      {
        level: 13,
        name: "Curse Mastery",
        summary:
          "Immunity to spells of the curse subschool and curse effects; the DC of your own curse descriptor spells increases by 1.",
        // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Hag-Called): "You
        // become immune to spells of the curse subschool and curse
        // effects." Same `immEffect.curse` slug (defenses.ts's closed
        // EFFECT_IMMUNITY_LABELS vocabulary) Self-Perfection's Pure Body
        // uses for disease/poison. The DC increase and the phrenic
        // amplification unlock aren't modeled.
        changes: [c("1", "immEffect.curse", "untyped")],
      },
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
    powers: [
      {
        level: 1,
        name: "Lingering Spirits",
        summary:
          "Swift action: manifest mage hand, ghost sound, grave words, or telekinetic projectile as a spell-like ability.",
      },
      {
        level: 5,
        name: "Spiritual Bulwark",
        summary:
          "Bonus equal to your Charisma modifier on saves against haunts, incorporeal undead, incorporeal outsiders, and possession.",
      },
      {
        level: 13,
        name: "Phantasmal Assault",
        summary:
          "Your damaging mind-affecting spells can affect haunts and undead (including mindless undead) normally immune to them, treated as positive energy damage.",
      },
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
    powers: [
      {
        level: 1,
        name: "Illuminating Answers",
        summary:
          "When a divination spell/ability that answers questions succeeds, regain 1 phrenic pool point (max/day = Wis mod).",
      },
      {
        level: 1,
        name: "Mnemonic Cache",
        summary:
          "Store roughly 10 pages of text or 30 minutes of speech/music (capacity +5/+5 per level beyond 1st); can sequester and disable written magical traps via Disable Device.",
      },
      {
        level: 5,
        name: "Superior Automatic Writing",
        summary:
          "Treat psychic level + Wis bonus as Linguistics ranks for automatic writing; at 8th level, DC 35 to gain commune-quality answers instead of augury-quality.",
      },
      {
        level: 13,
        name: "Memory Palace",
        summary:
          "Create an extradimensional library (as mage's magnificent mansion, 10-ft. cubes = psychic level) granting +4 circumstance on one chosen Knowledge skill (more at 14th+).",
      },
    ],
  },
  {
    tag: "mindtech",
    name: "Mindtech",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "iag7mp0kgnmql2mz", name: "Technomancy" },
      { level: 4, id: "lygujduijp64f0wj", name: "Protection from Technology" },
      { level: 6, id: "vhnguobyolslgepm", name: "Irradiate" },
      { level: 8, id: "1yt3bidqyhkdf6a1", name: "Malfunction" },
      { level: 10, id: "wp6qm9gnjxoqww4h", name: "Lightning Arc" },
      { level: 12, id: "wph6xwqvqekl7ph9", name: "Destroy Robot" },
      { level: 14, id: "snrnhiwqet5dmas0", name: "Memory of Function" },
      { level: 16, id: "ijwcwnt3oatnfghq", name: "Prismatic Wall" },
      { level: 18, id: "7mstq5c76h3e6zzx", name: "Time Stop" },
    ],
    powers: [
      {
        level: 1,
        name: "Synergized Energy",
        summary:
          "Regain 1 phrenic pool point (max/day = Wis mod) whenever you use a battery, a generator, or the psychic battery discovery to restore charges to a piece of technological equipment.",
      },
      {
        level: 5,
        name: "Attune Implants",
        summary:
          "Once per day as a full round action, channel a cybernetic implant to increase your psychic spells' save DCs by 1 for a number of minutes equal to your psychic level. Requires at least one implanted piece of cybertech.",
      },
      {
        level: 13,
        name: "Dominate Technology",
        summary:
          "Once per day, meld your mind with and control a construct you had no hand in creating, as control construct, opposing its creator's Spellcraft checks at a -5 penalty while concentrating.",
      },
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
    powers: [
      {
        level: 1,
        name: "Ritual Unity",
        summary:
          "+2 bonus on skill checks made as part of an occult ritual (+4 on aid another); regain 1 phrenic pool point when an aid-another check succeeds.",
      },
      {
        level: 1,
        name: "Power from Pageantry",
        summary:
          "Spend 1 phrenic pool point to extend a standard-action spell's casting time to 1 full round, raising its effective caster level and save DC by 2.",
      },
      {
        level: 5,
        name: "Force of Habit",
        summary:
          "Spend 1 phrenic pool point when casting a concentration psychic spell to maintain its concentration as a swift action while casting other psychic spells.",
      },
      {
        level: 13,
        name: "Unrivaled Focus",
        summary:
          "Spend 1 phrenic pool point before rolling a concentration check to treat the die result as a 20.",
      },
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
    powers: [
      {
        level: 1,
        name: "Painful Reminder",
        summary:
          "Swift action, uses/day = 3 + Cha mod: an enemy you've damaged with a spell since your last turn takes 1d6 nonlethal damage (2d6 at 8th, 3d6 at 15th).",
      },
      {
        level: 1,
        name: "Power from Pain",
        summary:
          "When Painful Reminder deals at least 5 damage, regain 1 phrenic pool point (max/day = Wis mod).",
      },
      {
        level: 5,
        name: "Live On",
        summary:
          "Use lay on hands and mercies as a paladin 3 levels lower than your psychic level, usable only on yourself.",
      },
      {
        level: 13,
        name: "Agonizing Wound",
        summary:
          "Uses/day = 3 + Cha mod: a creature damaged by your spell becomes frightened or sickened for Cha-mod rounds (or, at 2 uses, dazed/nauseated/panicked for 1 round); Will negates.",
      },
    ],
  },
  {
    tag: "psychedelia",
    name: "Psychedelia",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "azyo7xhfwdtjchtm", name: "Polypurpose Panacea" },
      { level: 4, id: "d4mp0m5xfnu9hbhn", name: "Mad Hallucination" },
      { level: 6, id: "zk334ykycwiwb0gn", name: "Synesthesia" },
      { level: 8, id: "n0bsyxchnigkkuqo", name: "Confusion" },
      { level: 10, id: "82vi1xife3nlu8a0", name: "Mirage Arcana" },
      { level: 12, id: "2ip53auf03bqxkl1", name: "Joyful Rapture" },
      { level: 14, id: "ni0okhagwuk0jbe9", name: "Waves of Ecstasy" },
      { level: 16, id: "xlzqpkl8fpm3sn4u", name: "Euphoric Tranquility" },
      { level: 18, id: "lnahlmp5mih2ongh", name: "Astral Projection" },
    ],
    powers: [
      {
        level: 1,
        name: "Drug Resistance",
        summary:
          "Take half as much ability damage (minimum 1) from ingested drugs; +4 bonus on saving throws to resist becoming addicted to a drug or to overcome an existing addiction.",
      },
      {
        level: 1,
        name: "Cognatogen",
        summary:
          "Once per day, imbibe a cognatogen granting a +2 natural armor bonus and a +4 alchemical bonus to a chosen mental ability score for 1 minute per psychic level, at the cost of a -2 penalty to a linked physical ability score for the duration.",
      },
      {
        level: 5,
        name: "Warped Brain",
        summary:
          "When a creature uses a mind affecting spell or ability against you, it must succeed at a Will save or become nauseated for 1 round, even if the effect itself fails or doesn't affect you.",
      },
      {
        level: 13,
        name: "Hallucinogenic Aura",
        summary:
          "Creatures within 30 feet must succeed at a Will save or become confused for 1d4 rounds; you are immune to your own aura, and an antidote can be brewed to protect others from it.",
      },
    ],
  },
  {
    tag: "rapport",
    name: "Rapport",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "tjog6bufg5b08lvq", name: "Charm Person" },
      { level: 4, id: "v3d3lnjj7ks0ztii", name: "Enthrall" },
      { level: 6, id: "lisojmynoblunlex", name: "Coordinated Effort" },
      { level: 8, id: "ofw6gnp6r7t2wcba", name: "Geas, Lesser" },
      { level: 10, id: "lovx4kiq18gbvg4e", name: "Telepathy" },
      { level: 12, id: "eg3i21asvo69mbma", name: "Battlemind Link" },
      { level: 14, id: "uddlhatt6uq4e5yf", name: "Hold Person, Mass" },
      { level: 16, id: "q2r6jrgsbwjgssdg", name: "Charm Monster, Mass" },
      { level: 18, id: "xuuzj9lr2xbwaim4", name: "Overwhelming Presence" },
    ],
    powers: [
      {
        level: 1,
        name: "Emotional Bond",
        summary:
          "After 10 minutes of mutual concentration, form an empathic link with allies (up to your Cha mod) that monitors their emotional state and unconsciousness until you next regain spells; from 4th level it also grants the benefits of status with those allies.",
      },
      {
        level: 1,
        name: "Emotional Push",
        summary:
          "Uses/day = 1 + 1 per 4 psychic levels: as an immediate action, you or a bonded ally add your Charisma bonus to a saving throw. Regain 1 phrenic pool point if the save succeeds.",
      },
      {
        level: 5,
        name: "Share Memory",
        summary: "Use share memory at will, but only on a willing target.",
      },
      {
        level: 5,
        name: "Team Player",
        summary: "Gain a bonus teamwork feat (another at 13th level).",
      },
      {
        level: 13,
        name: "Shared Skill",
        summary:
          "Each time you set up an emotional bond, choose one Intelligence or Charisma based class skill; any subject of that bond can use your bonus instead of their own on checks with that skill for as long as the bond lasts.",
      },
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
    powers: [
      {
        level: 1,
        name: "Past-Life Memories",
        summary:
          "Add half your psychic level (min 1) to all Knowledge checks, and make every Knowledge check untrained.",
        // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Rebirth): "You add a
        // bonus equal to half your psychic level (minimum 1) to all
        // Knowledge checks and can attempt all Knowledge skill checks
        // untrained." Same target/shape as Cloistered Cleric's Breadth of
        // Knowledge (`archetype-effects.ts`) — `skill.knowledge` fans out to
        // every Knowledge subskill (`tables.ts`'s `SKILL_GROUPS`). Only the
        // flat bonus is modeled; the untrained-usability half isn't
        // mechanized anywhere in this engine (same as Breadth of Knowledge).
        changes: [c("max(1, floor(@classes.psychic.level / 2))", "skill.knowledge", "untyped")],
      },
      {
        level: 1,
        name: "Mnemonic Esoterica",
        summary:
          "Select an additional spellcasting class; once per day when preparing spells, add one of that class's spells to your spells known/class list for 24 hours.",
      },
      {
        level: 5,
        name: "Resurgence",
        summary:
          "Immediate action, spend 2 phrenic pool points: regain 1d8 + psychic level hp (3d8 + psychic level at 10th, with stabilization/group-healing benefits on excess).",
      },
      {
        level: 13,
        name: "Physical Regression",
        summary:
          "Once per day as a standard action, spend 2 phrenic pool points to take on the form of a previous incarnation.",
      },
    ],
  },
  {
    tag: "rivethun",
    name: "Rivethun",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "r8bhei88g6h26fp0", name: "Heightened Awareness" },
      { level: 4, id: "usdv1eqvibmxun6x", name: "Bear's Endurance" },
      { level: 6, id: "isrnyw9biluqoo80", name: "Aura Sight" },
      { level: 8, id: "ev845glbl54em94v", name: "Persistent Vigor" },
      { level: 10, id: "jbqo4o2b2tmdz7wv", name: "True Seeing" },
      { level: 12, id: "37ubwx82nqaog3ib", name: "Thought Shield V" },
      { level: 14, id: "blvetbc929cfx4m8", name: "Mind Blank" },
      { level: 16, id: "mkrjbrp57yfdqrx0", name: "Iron Body" },
      { level: 18, id: "au6p72aztjhtokwr", name: "Akashic Form" },
    ],
    powers: [
      {
        level: 1,
        name: "Agitating Cognizance",
        summary:
          "Whenever you are not maintaining an altered form from metamorphosis (including the 24 hours it takes to complete), your phrenic pool maximum increases by 1.",
        // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Rivethun): the +1 is
        // real and unconditional in its default (non-metamorphosed) state,
        // but there's no `changes[]` target for a flat bonus to a resource
        // pool's maximum in this engine (`resources.ts` computes Phrenic
        // Pool max straight from the vendored feature's own formula, not
        // through the generic stat-modifier pipeline `collect.ts` applies
        // discipline power changes through) — display text only.
      },
      {
        level: 1,
        name: "Metamorphosis",
        summary:
          "Meditate for 1 hour to trigger a 24 hour physical metamorphosis granting a +1 enhancement bonus (+1 more per 5 psychic levels) to a chosen physical ability score until you assume a new form. Spending 1 phrenic pool point during the meditation instead grants a 1 hour per level alter self style transformation.",
      },
      {
        level: 5,
        name: "Spirit Channeling",
        summary: "While metamorphosed, host a shaman wandering spirit and gain its spirit ability.",
      },
      {
        level: 13,
        name: "Greater Spirit Channeling",
        summary:
          "While metamorphosed, also gain your hosted wandering spirit's greater spirit ability.",
      },
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
    powers: [
      {
        level: 1,
        name: "AC Bonus",
        summary:
          "When unarmored, unencumbered, and not immobilized/helpless, add your Wisdom bonus to AC and CMD, even against touch attacks or while flat-footed.",
        // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Self-Perfection):
        // "When unarmored and unencumbered, you add your Wisdom bonus (if
        // any) to your AC and CMD." Same armor/shield/encumbrance gate and
        // "untyped" bonus type (so it applies to touch AC and while
        // flat-footed, matching the RAW clause) as the vendored Monk "AC
        // Bonus (MNK)" class feature's own `changes[]` — see
        // `compute.test.ts`'s "compute: monk AC Bonus" suite for the
        // identical gate shape. The "loses this while immobilized or
        // helpless" clause isn't modeled, matching that same vendored
        // feature (which doesn't model it either).
        changes: [
          c(
            "if(and(and(lt(@shield.type, 1), lt(@armor.type, 1)), lt(@attributes.encumbrance.level, 1)), 1) * @abilities.wis.mod",
            "ac",
            "untyped",
          ),
          c(
            "if(and(and(lt(@shield.type, 1), lt(@armor.type, 1)), lt(@attributes.encumbrance.level, 1)), 1) * @abilities.wis.mod",
            "cmd",
            "untyped",
          ),
        ],
      },
      {
        level: 1,
        name: "Physical Push",
        summary:
          "Uses/day = Wis mod: gain a bonus equal to your Wisdom bonus on a Str/Dex/Con-based check; regain 1 phrenic pool point if the check succeeds.",
      },
      {
        level: 5,
        name: "Bodily Purge",
        summary:
          "A pool of 3d8 healing dice/day, spent as a standard action to heal hit points or as lesser restoration.",
      },
      {
        level: 13,
        name: "Pure Body",
        summary: "Immunity to diseases and poisons.",
        // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Self-Perfection): "At
        // 13th level, you gain immunity to diseases and poisons." Same
        // `immEffect.<slug>` shape the data-pipeline's
        // `SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY` uses for the Monk's
        // Purity of Body / Diamond Body (disease/poison immunity granted the
        // same way, at different levels).
        changes: [c("1", "immEffect.disease", "untyped"), c("1", "immEffect.poison", "untyped")],
      },
    ],
  },
  {
    tag: "shadow",
    name: "Shadow",
    phrenicPoolAbility: "wis",
    bonusSpells: [
      { level: 1, id: "h4hrop7rq2c9phyi", name: "Blurred Movement" },
      { level: 4, id: "advqdmonj6ro62u7", name: "Fear the Sun" },
      { level: 6, id: "jdsvncnna6oy189a", name: "Deeper Darkness" },
      { level: 8, id: "cmwcavfyc1vbehy8", name: "Shadow Step" },
      { level: 10, id: "2q48ogrz3840xwi7", name: "Shadow Evocation" },
      { level: 12, id: "btoow6tyv39443gh", name: "Shadow Walk" },
      { level: 14, id: "8rf2ucrtzmxooyw6", name: "Lunar Veil" },
      { level: 16, id: "h9dzj2fr5lksdjcp", name: "Umbral Strike" },
      { level: 18, id: "0mt9mso6wdhfafpo", name: "Polar Midnight" },
    ],
    powers: [
      {
        level: 1,
        name: "Twilight Influence",
        summary:
          "Spontaneously convert a prepared spell into a Darkness domain spell, once per spell level per day. Regain 1 phrenic pool point per conversion, up to your Wisdom modifier per day.",
      },
      {
        level: 5,
        name: "Dark Defense",
        summary:
          "+2 deflection bonus to AC against an attack you have concealment against, or +4 if you have total concealment against it.",
      },
      {
        level: 13,
        name: "Adumbration",
        summary:
          "Bonus on Stealth checks equal to half your level; can use Stealth even while observed and without cover or concealment as long as you're within 10 feet of a shadow other than your own. No benefit in areas of bright light.",
      },
    ],
  },
  {
    tag: "sorrow",
    name: "Sorrow",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "yk5bgi6j9kbtigof", name: "Sanctuary" },
      { level: 4, id: "ow4t1zox6dtybgji", name: "Silence" },
      { level: 6, id: "awia42zci8nufpfl", name: "Nondetection" },
      { level: 8, id: "zt7cje76dck9hwp9", name: "Crushing Despair" },
      { level: 10, id: "dlmeq0hpxfbjtibb", name: "Mind Fog" },
      { level: 12, id: "z8xnkfpufuqapseq", name: "Eyebite" },
      { level: 14, id: "c3qqu6l3vdcfaoh7", name: "Sequester" },
      { level: 16, id: "hi72gh3dlf7a1qyt", name: "Maze" },
      { level: 18, id: "esia6azb5g68tfs7", name: "Imprisonment" },
    ],
    powers: [
      {
        level: 1,
        name: "Numb to the Pain",
        summary:
          "Morale bonus equal to your Charisma bonus (capped at your psychic level) on saving throws against mind affecting spells and effects.",
      },
      {
        level: 1,
        name: "Despair",
        summary:
          "Immediate action before a creature within 30 feet rolls an attack, a save against a fear effect, or a skill check: impose a penalty on the roll (-1, increasing by 1 per 6 psychic levels beyond 1st, to a maximum of -4 at 19th level). Uses/day = 3 + Cha mod; regain 1 phrenic pool point if the roll fails.",
      },
      {
        level: 5,
        name: "Wave of Gloom",
        summary:
          "Standard action, expending 1 use of despair: creatures within 30 feet take the same penalty on attack rolls, fear saves, and skill checks for 1d4 minutes unless they succeed at a Will save. You're immune to your own wave of gloom.",
      },
      {
        level: 13,
        name: "Fortress of Sorrow",
        summary:
          "Mentally construct a permanent demiplane retreat on the Astral Plane, as lesser create demiplane; travel there and back once per day each, as plane shift.",
      },
    ],
  },
  {
    tag: "superiority",
    name: "Superiority",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "6ux76jy9wbi88br0", name: "Moment of Greatness" },
      { level: 4, id: "wrh3m8ad4l8sbisc", name: "Deflect Blame" },
      { level: 6, id: "8AMmUGAADKjE3lKU", name: "Unflappable Mien" },
      { level: 8, id: "qy6sn5a4wrsa36yb", name: "Majestic Image" },
      { level: 10, id: "9v2s3xjlakjm1eq1", name: "Mage's Private Sanctum" },
      { level: 12, id: "9pbl3ktd5oqejl19", name: "Transformation" },
      { level: 14, id: "0w3hvcp3gb2bhtv5", name: "Project Image" },
      { level: 16, id: "9968j68bl9x9iq7u", name: "Clone" },
      { level: 18, id: "xuuzj9lr2xbwaim4", name: "Overwhelming Presence" },
    ],
    powers: [
      {
        level: 1,
        name: "Self-Assurance",
        summary:
          "Uses/day = Cha mod: as an immediate action declared before the roll, gain a morale bonus equal to half your psychic level (minimum 1) on an ability check, attack roll, saving throw, or skill check. Regain 1 phrenic pool point if it succeeds.",
      },
      {
        level: 5,
        name: "At Arm's Length",
        summary:
          "Gain Reach Spell as a bonus feat; spend phrenic pool points equal to the range increase instead of using a higher level spell slot when applying it.",
      },
      {
        level: 13,
        name: "Magical Hoarder",
        summary:
          "As an immediate action, spend 1 phrenic pool point to include yourself as a target of a beneficial spell another creature casts within 30 feet, identifying it with a Spellcraft check first if it's not an ally's spell.",
      },
    ],
  },
  {
    tag: "symbiosis",
    name: "Symbiosis",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "zkvylzsupqboef0z", name: "Hide from Animals" },
      { level: 4, id: "yyzf346hiq8ixt0u", name: "Hold Animal" },
      { level: 6, id: "io2yjhr42chvcfb4", name: "Dominate Animal" },
      { level: 8, id: "wi9uvm8p12qvq616", name: "Command Plants" },
      { level: 10, id: "h9qiwo9kx8d1hqrn", name: "Awaken" },
      { level: 12, id: "ed0epy1pofukpgm6", name: "Liveoak" },
      { level: 14, id: "glt6uk3n6g6l2p6l", name: "Scrying, Greater" },
      { level: 16, id: "szzwom7utm3sm15z", name: "Control Plants" },
      { level: 18, id: "66s5qm8kwycgobce", name: "Dominate Monster" },
    ],
    powers: [
      {
        level: 1,
        name: "Animal Mastery",
        summary:
          "Standard action, uses/day = 3 + Cha mod: share the senses of an animal you can see (HD up to your psychic level) for up to 1 hour per level, unless it succeeds at a Will save. From 7th level, you can instead control it, as dominate animal.",
      },
      {
        level: 1,
        name: "One with Nature",
        summary:
          "Cast detect animals or plants at will as a spell-like ability; +2 insight bonus on Knowledge (nature) checks (+4 to identify a matching creature while using detect animals or plants). From 7th level, speak with any animal you successfully identify.",
        // AoN (PsychicDisciplinesDisplay.aspx?ItemName=Symbiosis): "You gain
        // a +2 insight bonus on Knowledge (nature) checks." Unconditional
        // and always on. `skill.kna` (Foundry's Knowledge (nature) skill
        // id, same as `tables.ts`'s `SKILL_GROUPS`) is the single-subskill
        // target; the +4 while using detect animals or plants and the 7th
        // level speak-with-animal upgrade aren't modeled.
        changes: [c("2", "skill.kna", "insight")],
      },
      {
        level: 5,
        name: "Bionetwork",
        summary:
          "Once per day, spend 10 minutes connecting to nearby plant life to remotely view a familiar location or scry on a creature within the network's range. Doesn't function in areas without vegetation.",
      },
      {
        level: 13,
        name: "Animate Trees",
        summary:
          "Standard action, animate up to 3 + Cha mod trees within 180 feet per day (controlling one at a time, more at higher level), as a treant's animate trees, for 10 minutes per level.",
      },
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
    powers: [
      {
        level: 1,
        name: "Mental Placidity",
        summary:
          "Immediate action: +2 bonus on a Will save you're about to attempt (+4 instead against an enchantment spell or effect).",
      },
      {
        level: 5,
        name: "Calming Presence",
        summary: "Use calm emotions as a spell-like ability, uses/day = Wisdom modifier.",
      },
      {
        level: 13,
        name: "Purge Disquiet",
        summary: "Immunity to fear spells/effects and to the confused condition.",
      },
    ],
  },
  {
    tag: "warp",
    name: "Warp",
    phrenicPoolAbility: "cha",
    bonusSpells: [
      { level: 1, id: "ja005kj1gh7g0dnk", name: "Entropic Shield" },
      { level: 4, id: "kdnkszyxk0a7n62w", name: "Apport Object" },
      { level: 6, id: "r190q9zxmei82lmv", name: "Displacement" },
      { level: 8, id: "ojwg1ki98tq8xyh9", name: "Dimension Door" },
      { level: 10, id: "k3zn13pbr5tr9zac", name: "Dismissal" },
      { level: 12, id: "btccs4sjo2nog1a0", name: "Ethereal Jaunt" },
      { level: 14, id: "5cdmojmydhwowzy1", name: "Teleport, Greater" },
      { level: 16, id: "ef75tkrzjuotgra2", name: "Dimensional Lock" },
      { level: 18, id: "4qriqew7d2ot7wr5", name: "Interplanetary Teleport" },
    ],
    powers: [
      {
        level: 1,
        name: "Planar Scent",
        summary:
          "Constant detect magic limited to conjuration (calling), conjuration (summoning), conjuration (teleport), and illusion (shadow) effects; +2 insight bonus on Spellcraft checks to identify them.",
      },
      {
        level: 1,
        name: "Rift Reach",
        summary:
          "Move action, uses/day = 3 + Cha mod: tear open a rift within 10 feet lasting 1 round per level, letting you manipulate objects, make a single melee attack, or cast a spell through it. Range increases to 20 feet at 11th level and 30 feet at 15th.",
      },
      {
        level: 5,
        name: "Turn Aside",
        summary:
          "Gain Deflect Arrows as a bonus feat; spend 1 phrenic pool point as an immediate action for a +4 deflection bonus against a single ranged attack.",
      },
      {
        level: 13,
        name: "Sidestep",
        summary:
          "Move action: teleport up to 10 feet per psychic level per day in 5 foot increments with line of sight, without provoking attacks of opportunity. Can bring willing creatures along at an equal distance cost each.",
      },
    ],
  },
];

export const PSYCHIC_DISCIPLINES: Record<string, PsychicDisciplineDef> = Object.fromEntries(
  DISCIPLINE_LIST.map((d) => [d.tag, d]),
);

export const PSYCHIC_DISCIPLINE_TAGS: readonly string[] = DISCIPLINE_LIST.map((d) => d.tag);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.psychicDisciplines` (see that type's doc comment) is the FULL
 * published catalog (23 entries after junk filtering), prose only. UNLIKE
 * `RagePower`/`MesmeristTrick`/etc., a discipline is a CHASSIS — the
 * hand-authored table above is the ONLY source of bonus spells/Discipline
 * Powers/phrenic pool ability, and a vendored-only entry can never derive
 * those (this catalog has no structured data for them at all). So the merge
 * here produces two shapes instead of one:
 *
 *   - a hand-authored discipline, with the vendored prose/sources attached
 *     for extra flavor text (`vendoredOnly: false`) — bonus spells/powers/
 *     pool ability still come from the hand-authored table;
 *   - a vendored-only discipline (`vendoredOnly: true`) — name + prose only,
 *     no bonus spells/powers/pool ability at all. The picker must render
 *     this branch honestly (no fabricated pool ability, no empty bonus-spell
 *     list presented as if it were complete).
 *
 * Collision audit: all 23 hand-authored tags matched a vendored entry by
 * normalized name — zero misses, zero aliases needed, so no discipline is
 * `vendoredOnly: true` today. The branch stays in place for the (currently
 * hypothetical) case where the vendored pack ever adds a 24th discipline
 * this table hasn't caught up to yet.
 */

const PSYCHIC_DISCIPLINE_NAME_ALIASES: Record<string, string> = {};

function normalizeDisciplineName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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

/** A hand-authored discipline, browsable with its vendored prose/sources attached (when a vendored counterpart matched). */
export interface MergedPsychicDisciplineHandEntry extends PsychicDisciplineDef {
  vendoredOnly: false;
  summary: string;
  description?: string;
  sources?: SourceRef[];
}

/** A discipline that exists ONLY in the vendored catalog — no bonus spells/Discipline Powers/pool ability (see file doc comment). */
export interface MergedPsychicDisciplineVendoredEntry {
  vendoredOnly: true;
  tag: string;
  name: string;
  summary: string;
  description?: string;
  sources?: SourceRef[];
}

export type MergedPsychicDisciplineEntry =
  | MergedPsychicDisciplineHandEntry
  | MergedPsychicDisciplineVendoredEntry;

function vendoredOnlyEntry(entry: PsychicDiscipline): MergedPsychicDisciplineVendoredEntry {
  return {
    vendoredOnly: true,
    tag: entry.id,
    name: entry.name,
    summary: plainTextPreview(entry.description ?? ""),
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked discipline tag (`doc.build.psychicDiscipline`) to its
 * merged entry — hand-authored table first (bonus spells/powers/pool
 * ability authoritative), falling back to a vendored-only stub. Used by the
 * picker; `PSYCHIC_DISCIPLINES[tag]` direct lookups elsewhere (`resources.ts`,
 * `archetypes.ts`, `apps/web` spellcasting) intentionally keep resolving
 * `undefined` for a vendored-only tag — there is no pool ability/bonus spell
 * to alias in that case, same "gracefully no-op" posture as any other unset
 * discipline.
 */
export function resolvePsychicDiscipline(
  tag: string,
  refData: RefData,
): MergedPsychicDisciplineEntry | undefined {
  const hand = PSYCHIC_DISCIPLINES[tag];
  if (hand) {
    const vendored = refData.psychicDisciplines?.[tag];
    return {
      ...hand,
      vendoredOnly: false,
      summary: plainTextPreview(vendored?.description ?? ""),
      description: vendored?.description,
      sources: vendored?.sources,
    };
  }
  const vendored = refData.psychicDisciplines?.[tag];
  return vendored ? vendoredOnlyEntry(vendored) : undefined;
}

/** The full picker-browsable catalog: every hand-authored discipline (vendored prose attached on a name match) plus every vendored-only discipline appended, sorted by name. */
export function mergedPsychicDisciplineCatalog(refData: RefData): MergedPsychicDisciplineEntry[] {
  const handByNormName = new Map<string, PsychicDisciplineDef>();
  for (const d of DISCIPLINE_LIST) {
    handByNormName.set(
      normalizeDisciplineName(PSYCHIC_DISCIPLINE_NAME_ALIASES[d.tag] ?? d.name),
      d,
    );
  }

  const vendored = Object.values(refData.psychicDisciplines ?? {});
  const usedHandTags = new Set<string>();
  const merged: MergedPsychicDisciplineEntry[] = [];
  for (const v of vendored) {
    const norm = normalizeDisciplineName(v.name);
    const handMatch = handByNormName.get(norm);
    if (handMatch) {
      usedHandTags.add(handMatch.tag);
      merged.push({
        ...handMatch,
        vendoredOnly: false,
        summary: plainTextPreview(v.description ?? ""),
        description: v.description,
        sources: v.sources,
      });
    } else {
      merged.push(vendoredOnlyEntry(v));
    }
  }
  for (const d of DISCIPLINE_LIST) {
    if (!usedHandTags.has(d.tag)) {
      merged.push({ ...d, vendoredOnly: false, summary: "", description: undefined });
    }
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name));
}
