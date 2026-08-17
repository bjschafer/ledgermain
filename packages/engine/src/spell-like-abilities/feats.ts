/**
 * Spell-like abilities granted by feats, keyed by the feat's name slug
 * (`featNameSlug` in `feat-effects.ts` — the same keying as
 * `FEAT_CLASSIFICATION` / `FEAT_POOL_EFFECTS`, so system-pack and community
 * feats both resolve).
 *
 * Defaults for this shard (see `types.ts`): caster level is total character
 * level; uses formulas evaluate against character-level roll data (feats
 * have no granting class). Feats that only apply metamagic to an EXISTING
 * spell-like ability (the Empower/Quicken/… Spell-Like Ability family) stay
 * out — they grant nothing castable.
 */

import type { SlaGrantDef } from "./types.js";

export const FEAT_SLA_GRANTS: Readonly<Record<string, readonly SlaGrantDef[]>> = {
  // Blood of the Beast, Nosoi's Spiritsense (Duskwalker): "You can cast
  // detect undead as a spell-like ability at will. Your caster level for
  // the purpose of this effect is equal to your character level."
  "nosoi-s-spiritsense": [{ slug: "detect-undead", spell: "Detect Undead", frequency: "atWill" }],
  // ARG Drow Spirit (Half-Elf): "You gain the ability to cast dancing
  // lights, darkness, and faerie fire each once per day as a spell-like
  // ability. You use your character level as your caster level." (The
  // alternate benefit — trading for an elven-magic-exchange trait instead —
  // has no stored pick to key from and stays unwired.)
  "drow-spirit": [
    { slug: "dancing-lights", spell: "Dancing Lights", uses: { formula: "1", per: "day" } },
    { slug: "darkness", spell: "Darkness", uses: { formula: "1", per: "day" } },
    { slug: "faerie-fire", spell: "Faerie Fire", uses: { formula: "1", per: "day" } },
  ],
  // ARG Spider Climber (Drow): "You can cast spider climb once per day as a
  // spell-like ability, using your character level as the caster level."
  "spider-climber": [
    { slug: "spider-climb", spell: "Spider Climb", uses: { formula: "1", per: "day" } },
  ],
  // Dark Affinity: "You can cast darkness once per day as a spell-like
  // ability ... At 7th level, you can also cast deeper darkness once per
  // day as a spell-like ability."
  "dark-affinity": [
    { slug: "darkness", spell: "Darkness", uses: { formula: "1", per: "day" } },
    {
      slug: "deeper-darkness",
      spell: "Deeper Darkness",
      uses: { formula: "1", per: "day" },
      minLevel: 7,
    },
  ],
  // Unusual Heritage (Gillman): "once per day while fully immersed in
  // water, you can cast augury as a spell-like ability." (The +1 caster
  // level to divination spells/SLAs is a numeric bonus outside this
  // table's scope.)
  "unusual-heritage-gillman": [
    {
      slug: "augury",
      spell: "Augury",
      uses: { formula: "1", per: "day" },
      note: "while fully immersed in water only",
    },
  ],
  // Knight of the Twisted Word: "Once per day, you can cast glibness as a
  // spell-like ability with a caster level equal to your Hit Dice." (The
  // racial default caster level for feat grants already is total character
  // level, which equals Hit Dice here, so no override.)
  "knight-of-the-twisted-word": [
    { slug: "glibness", spell: "Glibness", uses: { formula: "1", per: "day" } },
  ],
  // Ghoran, Repast of Heroes: "Once per week, you can cast heroes' feast as
  // a spell-like ability with a caster level equal to your character
  // level. If you do so, you lose access to the spells normally granted by
  // the natural magic racial trait for the next 48 hours."
  "repast-of-heroes": [
    {
      slug: "heroes-feast",
      spell: "Heroes' Feast",
      uses: { formula: "1", per: "week" },
      note: "costs 48 hours of Natural Magic's spell-like abilities",
    },
  ],
  // Gathlain, Dryad's Attendant: "You can cast meld into stone as a
  // spell-like ability once per day with a caster level equal to your
  // character level, except that you instead meld with wood."
  "dryad-s-attendant": [
    {
      slug: "meld-into-stone",
      spell: "Meld into Stone",
      uses: { formula: "1", per: "day" },
      note: "melds with wood instead of stone",
    },
  ],
  // Gathlain, Treant's Call: "You can cast liveoak once per day as a
  // spell-like ability, but its duration is only 10 minutes."
  "treant-s-call": [
    {
      slug: "liveoak",
      spell: "Liveoak",
      uses: { formula: "1", per: "day" },
      note: "duration only 10 minutes",
    },
  ],
  // Gnome, Groundling: "You can use speak with animals as a spell-like
  // ability at will, but only to communicate with burrowing animals like
  // gophers, moles, and the like." (Additive to, not a replacement of, the
  // gnome's own once-per-day speak with animals grant.)
  groundling: [
    {
      slug: "speak-with-animals",
      spell: "Speak with Animals",
      frequency: "atWill",
      note: "burrowing animals only",
    },
  ],
  // Gathlain, Dryad's Apprentice: "You can cast wood shape as a spell-like
  // ability at will, but only on a piece of wood no larger than 1 pound."
  "dryad-s-apprentice": [
    {
      slug: "wood-shape",
      spell: "Wood Shape",
      frequency: "atWill",
      note: "wood no larger than 1 pound",
    },
  ],
  // Ghoran, Inner Light: "Once per day, you can cast daylight as a
  // spell-like ability with a caster level equal to your character level."
  "inner-light": [{ slug: "daylight", spell: "Daylight", uses: { formula: "1", per: "day" } }],
  // Unraveler of Secrets: "you can cast object reading once per day as a
  // spell-like ability, attempting a Knowledge (history) check in place of
  // an Appraise check."
  "unraveler-of-secrets": [
    { slug: "object-reading", spell: "Object Reading", uses: { formula: "1", per: "day" } },
  ],
  // Student of Sulunai: "You can also cast divine favor as a spell-like
  // ability once per day, using your character level as your caster
  // level." (The reroll-insight-bonus reaction alongside it is a separate,
  // unrelated benefit outside this table's scope.)
  "student-of-sulunai": [
    { slug: "divine-favor", spell: "Divine Favor", uses: { formula: "1", per: "day" } },
  ],
  // Gathlain, Advanced Gathlain Magic: "You gain the following spells as
  // spell-like abilities, each of which are usable 1/day: wood meld (as
  // meld with stone, but only with wood), wood shape." "Wood meld" is a
  // reflavored Meld into Stone variant with no vendored spell of its own,
  // so only Wood Shape wires.
  "advanced-gathlain-magic": [
    { slug: "wood-shape", spell: "Wood Shape", uses: { formula: "1", per: "day" } },
  ],
  // Gathlain, Greater Gathlain Magic: "You gain the following spells as
  // spell-like abilities, each of which are usable 1/day: command plants,
  // thorny entanglement."
  "greater-gathlain-magic": [
    { slug: "command-plants", spell: "Command Plants", uses: { formula: "1", per: "day" } },
    {
      slug: "thorny-entanglement",
      spell: "Thorny Entanglement",
      uses: { formula: "1", per: "day" },
    },
  ],
  // Gathlain, Superior Gathlain Magic: "You gain the following spells as
  // spell-like abilities, each usable 1/day: liveoak, tree stride."
  "superior-gathlain-magic": [
    { slug: "liveoak", spell: "Liveoak", uses: { formula: "1", per: "day" } },
    { slug: "tree-stride", spell: "Tree Stride", uses: { formula: "1", per: "day" } },
  ],
  // Drow, Drow Nobility: "You may use detect magic as a spell-like ability
  // at will, and add feather fall and levitate to the spell-like abilities
  // that you may use once each per day. Your caster level is equal to your
  // character level."
  "drow-nobility": [
    { slug: "detect-magic", spell: "Detect Magic", frequency: "atWill" },
    { slug: "feather-fall", spell: "Feather Fall", uses: { formula: "1", per: "day" } },
    { slug: "levitate", spell: "Levitate", uses: { formula: "1", per: "day" } },
  ],
  // Elemental Jaunt (ifrit, oread, sylph, or undine): "Once per day, you
  // can cast plane shift as a spell-like ability with a caster level equal
  // to your level to transport yourself and willing targets to an
  // elemental plane that is appropriate to your race."
  "elemental-jaunt": [
    {
      slug: "plane-shift",
      spell: "Plane Shift",
      uses: { formula: "1", per: "day" },
      note: "to the elemental plane matching your race",
    },
  ],
  // Gathlain, Green Tongue: "You can cast speak with plants once per day,
  // as a spell-like ability. At 10th level and every 5 levels thereafter,
  // you can cast speak with plants an additional time per day." (Levels
  // 10, 15, and 20 — the last tier under the 20th-level campaign cap.)
  "green-tongue": [
    {
      slug: "speak-with-plants",
      spell: "Speak with Plants",
      uses: {
        formula:
          "1 + gte(@attributes.hd.total, 10) + gte(@attributes.hd.total, 15) + gte(@attributes.hd.total, 20)",
        per: "day",
      },
    },
  ],
  // Favor of the Empress of Torrents: "Once per day while underwater, you
  // can use hydraulic torrent as a spell-like ability. At 10th level and
  // every 5 levels thereafter, you can use this ability an additional time
  // each day." (Levels 10, 15, and 20 — the last tier under the
  // 20th-level campaign cap.)
  "favor-of-the-empress-of-torrents": [
    {
      slug: "hydraulic-torrent",
      spell: "Hydraulic Torrent",
      uses: {
        formula:
          "1 + gte(@attributes.hd.total, 10) + gte(@attributes.hd.total, 15) + gte(@attributes.hd.total, 20)",
        per: "day",
      },
      note: "underwater only",
    },
  ],
  // Shabti, First General of the East: "Once per day, you can cast greater
  // magic weapon as a spell-like ability. You gain a second daily use at
  // 9th level, and a third at 15th level. Only you can benefit from this
  // spell-like ability."
  "first-general-of-the-east": [
    {
      slug: "magic-weapon-greater",
      spell: "Magic Weapon, Greater",
      uses: {
        formula: "1 + gte(@attributes.hd.total, 9) + gte(@attributes.hd.total, 15)",
        per: "day",
      },
      note: "only the shabti benefits from the enchantment",
    },
  ],
  // Nature Magic: "You gain know direction as a constant spell-like
  // ability, and can choose another druid orison you can cast as a
  // spell-like ability once per day." Only the fixed Know Direction grant
  // wires; the chosen orison has no stored pick to key from.
  "nature-magic": [{ slug: "know-direction", spell: "Know Direction", frequency: "constant" }],
};
