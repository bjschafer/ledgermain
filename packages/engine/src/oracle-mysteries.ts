/**
 * Clean-room PF1 oracle mystery table (APG, DESIGN §6): hand-authored, mirroring
 * `bloodlines.ts`'s posture for sorcerer bloodlines — a mystery's CLASS SKILLS
 * and BONUS SPELLS are the only parts of "Mystery" that are structured/tabular
 * upstream; REVELATIONS (the mystery's menu of choosable powers, gained at 1st,
 * 3rd, and every 4 levels thereafter) are prose-heavy, per-mystery, and
 * genuinely choice-bearing content — out of scope here, same as Arcanist
 * Exploits/Greater Exploits were deferred at that class's launch.
 *
 * Scope: the 10 Advanced Player's Guide "core" mysteries (Battle, Bones,
 * Flame, Heavens, Life, Lore, Nature, Stone, Waves, Wind). The vendored
 * Foundry pack actually ships dozens more (3rd-party mysteries from later
 * splatbooks — Ancestor, Apocalypse, Dragon, Lunar, ...) under
 * `packs/class-abilities/*-mystery.*.yaml`, but those are out of scope.
 *
 * Data provenance — an unusual case where the vendored Foundry pack DOES carry
 * real structured content for this, just not linked from the Oracle class def
 * (the class only links the generic "Mystery" stub feature, not each of the
 * 10+ actual mysteries — same "not linked via `links.supplements`" situation
 * as sorcerer bloodline powers, hence hand-authoring instead of a normal
 * `RefData.classFeatures` derivation):
 *   - `classSkills` below is copied VERBATIM from each mystery's vendored
 *     `system.classSkills` array (real Foundry skill ids, e.g. "han", "kna",
 *     "sur" for Life) — already the same vocabulary as this engine's
 *     `SKILL_ABILITY` table. Like `Domain.classSkills` (see refdata.ts), this
 *     is DISPLAY-ONLY: the engine's class-skill set is derived solely from
 *     `RefData.classes[].classSkills` (see `compute.ts`'s `classSkillSet` /
 *     `traits.ts`'s doc comment for why) — there is no per-mystery hook into
 *     it, so a mystery's class-skill grant surfaces as text only, exactly the
 *     posture `traits.ts` already documents for trait-granted class skills.
 *   - `bonusSpells` ids are copied VERBATIM from the `@UUID[Compendium.pf1.
 *     spells.<id>]` references embedded in each mystery's vendored prose
 *     (`system.description.value`) — these ARE real vendored Foundry spell
 *     ids (`Spell.id` = the Foundry `_id`), just not exposed as a queryable
 *     `learnedAt.mystery` tag the normalizer could invert the way
 *     `learnedAt.bloodline` is inverted into `RefData.bloodlineSpellLists`.
 *     Copying the ids directly (rather than resolving by spell NAME, as
 *     `supplements.ts` does for the one bloodline gap) sidesteps any
 *     name-formatting drift between the mystery's prose (e.g. "Restoration,
 *     Lesser") and the spell's actual `name` (e.g. "Lesser Restoration") —
 *     verified present in the vendored spell set for all 90 entries below.
 *     `level` is the ORACLE level at which the spell is gained as a bonus
 *     known spell (PF1 RAW: "at 2nd level, and every two levels thereafter"),
 *     NOT the spell's own level — a deliberately different unlock rule from
 *     `bloodlineSpellLists` (sorcerer level `2L+1` for a bloodline's
 *     level-`L` spell), so mysteries get their own small helper
 *     (`mysterySpellsKnown` in `apps/web/src/model/spellcasting.ts`) rather
 *     than reusing `bloodlineSpellsKnown`'s formula.
 */

export interface OracleMysteryBonusSpell {
  /** Oracle class level at which this spell is added to the known list (2, 4, ..., 18). */
  level: number;
  /** Vendored Foundry spell id (`RefData.spells` key). */
  id: string;
  /** Display name, for readability here and as a display fallback. */
  name: string;
}

export interface OracleMysteryDef {
  /** Matches `doc.build.oracleMystery` keys. */
  tag: string;
  name: string;
  /** Real Foundry skill ids this mystery adds to the oracle's class skills (display-only — see file doc comment). */
  classSkills: string[];
  /** One bonus spell known at oracle level 2, 4, 6, ..., 18 (ascending). */
  bonusSpells: OracleMysteryBonusSpell[];
}

const MYSTERY_LIST: OracleMysteryDef[] = [
  {
    tag: "battle",
    name: "Battle",
    classSkills: ["int", "ken", "per", "rid"],
    bonusSpells: [
      { level: 2, id: "jnlr9cuepka1l26e", name: "Enlarge Person" },
      { level: 4, id: "g33euis7yi9pwddy", name: "Fog Cloud" },
      { level: 6, id: "73han2zqxg59u18g", name: "Magic Vestment" },
      { level: 8, id: "92hth51cs9oi0nfe", name: "Wall of Fire" },
      { level: 10, id: "6ax0ythzw8n4bta8", name: "Righteous Might" },
      { level: 12, id: "8xjcrqg79ugxu5qu", name: "Mass Bull's Strength" },
      { level: 14, id: "578t0lra5ll3aifs", name: "Control Weather" },
      { level: 16, id: "a5gcbpwfhu4hh5ic", name: "Earthquake" },
      { level: 18, id: "n4e35m6qu9nmkhgm", name: "Storm of Vengeance" },
    ],
  },
  {
    tag: "bones",
    name: "Bones",
    classSkills: ["blf", "dis", "int", "ste"],
    bonusSpells: [
      { level: 2, id: "9tww9fc9049h6iqc", name: "Cause Fear" },
      { level: 4, id: "3ze0kso9hxff5u2f", name: "False Life" },
      { level: 6, id: "8uwmrygxgih1fb57", name: "Animate Dead" },
      { level: 8, id: "be88e90guqbi1q1z", name: "Fear" },
      { level: 10, id: "dg3mrasygkm83c3e", name: "Slay Living" },
      { level: 12, id: "3a162m66toj22fpa", name: "Circle of Death" },
      { level: 14, id: "wkp8u7xl1dgpk362", name: "Control Undead" },
      { level: 16, id: "e8zen5nzixnt7bde", name: "Horrid Wilting" },
      { level: 18, id: "wplgawb6aznjx7se", name: "Wail of the Banshee" },
    ],
  },
  {
    tag: "flame",
    name: "Flame",
    classSkills: ["acr", "clm", "int", "prf"],
    bonusSpells: [
      { level: 2, id: "lndeaqm2j2nvgm6p", name: "Burning Hands" },
      { level: 4, id: "tkjnm3lw7ni82tag", name: "Resist Energy" },
      { level: 6, id: "6oq1wcryviik9ice", name: "Fireball" },
      { level: 8, id: "92hth51cs9oi0nfe", name: "Wall of Fire" },
      { level: 10, id: "hd7ukybisvv7j5r6", name: "Summon Monster V (fire elementals only)" },
      { level: 12, id: "0hknfnoaljc75fj3", name: "Fire Seeds" },
      { level: 14, id: "9wl8ijy6argdvz5f", name: "Fire Storm" },
      { level: 16, id: "iq0as5470o8q9y39", name: "Incendiary Cloud" },
      { level: 18, id: "qk3oeq4awbc1smjw", name: "Fiery Body" },
    ],
  },
  {
    tag: "heavens",
    name: "Heavens",
    classSkills: ["fly", "kar", "per", "sur"],
    bonusSpells: [
      { level: 2, id: "qcjskol4ac3eemhy", name: "Color Spray" },
      { level: 4, id: "zyfm6dq35i4hip4u", name: "Hypnotic Pattern" },
      { level: 6, id: "7x2z0i8rcx7s81fk", name: "Daylight" },
      { level: 8, id: "6lebv7569xsypp8u", name: "Rainbow Pattern" },
      { level: 10, id: "wqvy12w1xgk6l9b0", name: "Overland Flight" },
      { level: 12, id: "6vfauefzzmwl4az7", name: "Chain Lightning" },
      { level: 14, id: "mb819hvwpk0zmw53", name: "Prismatic Spray" },
      { level: 16, id: "j2mwv9wfxhqch10g", name: "Sunburst" },
      { level: 18, id: "xhzme0v6tjq95fg6", name: "Meteor Swarm" },
    ],
  },
  {
    tag: "life",
    name: "Life",
    classSkills: ["han", "kna", "sur"],
    bonusSpells: [
      { level: 2, id: "aa0w7tk852iqn3ni", name: "Detect Undead" },
      { level: 4, id: "fxz69pwpqt9b6uss", name: "Lesser Restoration" },
      { level: 6, id: "6l904edkt8jv9jor", name: "Neutralize Poison" },
      { level: 8, id: "anya5qwdjhdfyk8u", name: "Restoration" },
      { level: 10, id: "qiiis9ekgy3syu7j", name: "Breath of Life" },
      { level: 12, id: "4re1j2w8wkvsvnsi", name: "Heal" },
      { level: 14, id: "igmb8lisqcnsxd2d", name: "Greater Restoration" },
      { level: 16, id: "klcvk9ct1l7mhjwp", name: "Mass Heal" },
      { level: 18, id: "mxqi375ya2rka7cp", name: "True Resurrection" },
    ],
  },
  {
    tag: "lore",
    name: "Lore",
    classSkills: ["apr", "kar", "kdu", "ken", "kge", "khi", "klo", "kna", "kno", "kpl", "kre"],
    bonusSpells: [
      { level: 2, id: "llxrra87kbofmyhl", name: "Identify" },
      { level: 4, id: "m1rmcpcaixcpz9ib", name: "Tongues" },
      { level: 6, id: "tcnirpnzjdaym1fd", name: "Locate Object" },
      { level: 8, id: "b5mz8voksps5g4yq", name: "Legend Lore" },
      { level: 10, id: "68ngvzmzvadhf6vs", name: "Contact Other Plane" },
      { level: 12, id: "14chms7xurvi85x9", name: "Mass Owl's Wisdom" },
      { level: 14, id: "aqeaxoaozlv9vg35", name: "Vision" },
      { level: 16, id: "2vb5orfcy57lrfmc", name: "Moment of Prescience" },
      { level: 18, id: "7mstq5c76h3e6zzx", name: "Time Stop" },
    ],
  },
  {
    tag: "nature",
    name: "Nature",
    classSkills: ["clm", "fly", "kna", "rid", "sur", "swm"],
    bonusSpells: [
      { level: 2, id: "pg7dbmuuaksxhp3v", name: "Charm Animal" },
      { level: 4, id: "la7kuehewu85ybnt", name: "Barkskin" },
      { level: 6, id: "rrsefzpm3nhztvld", name: "Speak with Plants" },
      { level: 8, id: "0sssdtv0tkbns2r3", name: "Grove of Respite" },
      { level: 10, id: "h9qiwo9kx8d1hqrn", name: "Awaken" },
      { level: 12, id: "wgm8mm1za909pwch", name: "Stone Tell" },
      { level: 14, id: "f828mjoo5afszqnk", name: "Creeping Doom" },
      { level: 16, id: "3ah9mmg0odateh8l", name: "Animal Shapes" },
      { level: 18, id: "refg1teqkrdtxllg", name: "World Wave" },
    ],
  },
  {
    tag: "stone",
    name: "Stone",
    classSkills: ["apr", "clm", "int", "sur"],
    bonusSpells: [
      { level: 2, id: "fv9mgob508qv99zz", name: "Magic Stone" },
      { level: 4, id: "gqtg9ruv8kkd0knf", name: "Stone Call" },
      { level: 6, id: "dkv9v4verb82fmpx", name: "Meld into Stone" },
      { level: 8, id: "l83djt5019ujasjh", name: "Wall of Stone" },
      { level: 10, id: "knyako6zopc1chrv", name: "Stoneskin" },
      { level: 12, id: "wgm8mm1za909pwch", name: "Stone Tell" },
      { level: 14, id: "g52zx1t1giteg5h1", name: "Statue" },
      { level: 16, id: "oeemcnfjod9zd7my", name: "Repel Metal or Stone" },
      { level: 18, id: "o8jhvddxgunzx94i", name: "Clashing Rocks" },
    ],
  },
  {
    tag: "waves",
    name: "Waves",
    classSkills: ["acr", "esc", "kna", "swm"],
    bonusSpells: [
      { level: 2, id: "ts50hpvkdgerfp1a", name: "Touch of the Sea" },
      { level: 4, id: "7fvsn0gbv6ynlp63", name: "Slipstream" },
      { level: 6, id: "7m5us8d4a9lwh1ap", name: "Water Breathing" },
      { level: 8, id: "ijui94bv4uzu8awb", name: "Wall of Ice" },
      { level: 10, id: "nll8ip8348eti0ff", name: "Geyser" },
      { level: 12, id: "h4nlrm44ubsyzuhz", name: "Fluid Form" },
      { level: 14, id: "tpid8izzs2rrfxv3", name: "Vortex" },
      { level: 16, id: "o4rwtizvdj7216qd", name: "Seamantle" },
      { level: 18, id: "ltda70etgwje43x6", name: "Tsunami" },
    ],
  },
  {
    tag: "wind",
    name: "Wind",
    classSkills: ["acr", "esc", "fly", "ste"],
    bonusSpells: [
      { level: 2, id: "nkd3xocluvt1rovu", name: "Alter Winds" },
      { level: 4, id: "cnuin981hdq7ryit", name: "Gust of Wind" },
      { level: 6, id: "fe8jy0h1l3su2322", name: "Cloak of Winds" },
      { level: 8, id: "4gxx3bodf76e63en", name: "River of Wind" },
      { level: 10, id: "g9koefk7x9szoheo", name: "Control Winds" },
      { level: 12, id: "nk37t5em8q4v1djs", name: "Sirocco" },
      { level: 14, id: "578t0lra5ll3aifs", name: "Control Weather" },
      { level: 16, id: "i9greyz3c0ap32vi", name: "Whirlwind" },
      { level: 18, id: "lun2gymejsmkjg4g", name: "Winds of Vengeance" },
    ],
  },
];

export const ORACLE_MYSTERIES: Record<string, OracleMysteryDef> = Object.fromEntries(
  MYSTERY_LIST.map((m) => [m.tag, m]),
);

export const ORACLE_MYSTERY_TAGS: readonly string[] = MYSTERY_LIST.map((m) => m.tag);
