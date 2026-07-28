/**
 * Clean-room PF1 oracle mystery table (APG, DESIGN §6): hand-authored, mirroring
 * `bloodlines.ts`'s posture for sorcerer bloodlines — a mystery's CLASS SKILLS
 * and BONUS SPELLS are the only parts of "Mystery" that are structured/tabular
 * upstream; REVELATIONS (the mystery's menu of choosable powers, gained at 1st,
 * 3rd, and every 4 levels thereafter) are prose-heavy, per-mystery, and
 * genuinely choice-bearing content — out of scope here, same as Arcanist
 * Exploits/Greater Exploits were deferred at that class's launch.
 *
 * Scope: ALL 34 vendored mysteries — the 10 Advanced Player's Guide "core"
 * ones (Battle, Bones, Flame, Heavens, Life, Lore, Nature, Stone, Waves,
 * Wind), Solar, and the 23 splatbook mysteries authored in issue #74's
 * content pass (Ancestor through Wood; see the banner in `MYSTERY_LIST`).
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
 *     `SKILL_ABILITY` table. Unlike `Domain.classSkills` (see refdata.ts,
 *     still display-only — no per-domain hook exists) or trait-granted class
 *     skills (`traits.ts`), a mystery's class-skill grant IS wired into
 *     `compute.ts`'s `classSkillSet`, gated on the character having oracle
 *     levels, alongside `cavalierOrder`'s and `kineticistElement`'s own
 *     bonus class skills.
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

import type { OracleMystery, RefData, SourceRef } from "@pf1/schema";

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
  /** Real Foundry skill ids this mystery adds to the oracle's class skills, wired into `compute.ts`'s `classSkillSet` (see file doc comment). */
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
  // Solar is the one entry here NOT sourced from the Foundry pack: it comes
  // from the `pfdata` catalog, whose mystery docs carry no `system.classSkills`
  // array and embed no `@UUID` spell links — the bonus-spell list is plain
  // prose. So unlike every mystery above, `classSkills` is transcribed from
  // that prose and `bonusSpells` ids are resolved by NAME (each of the nine
  // matches exactly one vendored spell — the ambiguity the file doc comment
  // warns about doesn't arise for this list, and a test pins that).
  {
    tag: "solar",
    name: "Solar",
    classSkills: ["fly", "kge", "lin", "sur"],
    bonusSpells: [
      { level: 2, id: "bl71og1gklwncmt7", name: "Faerie Fire" },
      { level: 4, id: "lzos34s87qsc620l", name: "Flaming Sphere" },
      { level: 6, id: "7x2z0i8rcx7s81fk", name: "Daylight" },
      { level: 8, id: "ojwg1ki98tq8xyh9", name: "Dimension Door" },
      { level: 10, id: "evoz9r9n186nsjf0", name: "Planar Adaptation" },
      { level: 12, id: "nk37t5em8q4v1djs", name: "Sirocco" },
      { level: 14, id: "vax8ojz8g3oovwzu", name: "Sunbeam" },
      { level: 16, id: "j2mwv9wfxhqch10g", name: "Sunburst" },
      { level: 18, id: "lxxliyxfw9uvbxmt", name: "Prismatic Sphere" },
    ],
  },
  // ------------------------------------------------------------------
  // Splatbook mysteries (issue #74): same clean-room posture and data
  // provenance as the APG ten, except these are pfdata-sourced like
  // solar — no @UUID spell links in the vendored prose, so bonus-spell
  // ids are resolved by NAME against the vendored spell set (several
  // carry comma-inverted vendored names, e.g. "Scrying, Greater").
  // Alphabetical.
  {
    tag: "ancestor",
    name: "Ancestor",
    classSkills: ["kar", "kdu", "ken", "kge", "khi", "klo", "kna", "kno", "kpl", "kre", "lin"],
    bonusSpells: [
      { level: 2, id: "jhyb2ana8jrk2lut", name: "Unseen Servant" },
      { level: 4, id: "avofn5q2v0f0qxjy", name: "Spiritual Weapon" },
      { level: 6, id: "vqfrp8t0c1lw1jna", name: "Heroism" },
      { level: 8, id: "0lrux8tmaml5fkw6", name: "Spiritual Ally" },
      { level: 10, id: "3lfx1ccxo2hdqrf3", name: "Telekinesis" },
      { level: 12, id: "z0duc2v2n3ioynta", name: "Greater Heroism" },
      { level: 14, id: "btccs4sjo2nog1a0", name: "Ethereal Jaunt" },
      { level: 16, id: "aqeaxoaozlv9vg35", name: "Vision" },
      { level: 18, id: "lnahlmp5mih2ongh", name: "Astral Projection" },
    ],
  },
  {
    tag: "apocalypse",
    name: "Apocalypse",
    classSkills: ["blf", "dis", "ste", "sur"],
    bonusSpells: [
      { level: 2, id: "1hjxxr3k62rcpb5c", name: "Deathwatch" },
      { level: 4, id: "vxi9c3xwa83xthka", name: "Summon Swarm" },
      { level: 6, id: "o4ywdvsm1oty8blq", name: "Explosive Runes" },
      { level: 8, id: "t1uhggjfimtabp4v", name: "Ice Storm" },
      { level: 10, id: "jdp0mts5razk0qms", name: "Insect Plague" },
      { level: 12, id: "3a162m66toj22fpa", name: "Circle of Death" },
      { level: 14, id: "aqeaxoaozlv9vg35", name: "Vision" },
      { level: 16, id: "iq0as5470o8q9y39", name: "Incendiary Cloud" },
      { level: 18, id: "xhzme0v6tjq95fg6", name: "Meteor Swarm" },
    ],
  },
  {
    tag: "ascetic",
    name: "Ascetic",
    classSkills: ["acr", "clm", "esc", "swm"],
    bonusSpells: [
      { level: 2, id: "879sdozw7ca7ci9k", name: "Stone Fist" },
      { level: 4, id: "d8yy4njnr25hacek", name: "Glide" },
      { level: 6, id: "lmst00dtapf4xhya", name: "Force Punch" },
      { level: 8, id: "h16l4lq9bzyeeosf", name: "Ethereal Fists" },
      { level: 10, id: "68ngvzmzvadhf6vs", name: "Contact Other Plane" },
      { level: 12, id: "b5mz8voksps5g4yq", name: "Legend Lore" },
      { level: 14, id: "aqeaxoaozlv9vg35", name: "Vision" },
      { level: 16, id: "ukacuu0cvdjkqxwu", name: "Frightful Aspect" },
      { level: 18, id: "mkrjbrp57yfdqrx0", name: "Iron Body" },
    ],
  },
  {
    tag: "dark_tapestry",
    name: "Dark Tapestry",
    classSkills: ["dis", "int", "kar", "ste"],
    bonusSpells: [
      { level: 2, id: "ja005kj1gh7g0dnk", name: "Entropic Shield" },
      { level: 4, id: "ech2cibcsmsms9s7", name: "Dust of Twilight" },
      { level: 6, id: "m1rmcpcaixcpz9ib", name: "Tongues" },
      { level: 8, id: "wralcmyi4tdcai24", name: "Black Tentacles" },
      { level: 10, id: "66vvhyiy5q8yzbq2", name: "Feeblemind" },
      { level: 12, id: "qf4bqjgeff1q4hjt", name: "Planar Binding" },
      { level: 14, id: "s6q72tw2zra9sycu", name: "Insanity" },
      { level: 16, id: "3bdfw5f15hwcxlth", name: "Reverse Gravity" },
      { level: 18, id: "4qriqew7d2ot7wr5", name: "Interplanetary Teleport" },
    ],
  },
  {
    tag: "dragon",
    name: "Dragon",
    classSkills: ["fly", "int", "per", "kar"],
    bonusSpells: [
      { level: 2, id: "9tww9fc9049h6iqc", name: "Cause Fear" },
      { level: 4, id: "tkjnm3lw7ni82tag", name: "Resist Energy" },
      { level: 6, id: "7d6sv5ecvi7kho3m", name: "Fly" },
      { level: 8, id: "be88e90guqbi1q1z", name: "Fear" },
      { level: 10, id: "4k9bh8ny1il2oner", name: "Spell Resistance" },
      { level: 12, id: "niqxt53lhxrjfaty", name: "Antimagic Field" },
      { level: 14, id: "jbqo4o2b2tmdz7wv", name: "True Seeing" },
      { level: 16, id: "6qpg42rj70oi4css", name: "Form of the Dragon III" },
      { level: 18, id: "xuuzj9lr2xbwaim4", name: "Overwhelming Presence" },
    ],
  },
  {
    tag: "elemental",
    name: "Elemental",
    classSkills: ["acr", "clm", "ste", "swm"],
    bonusSpells: [
      { level: 2, id: "pau0ejk30fs1eebl", name: "Endure Elements" },
      { level: 4, id: "tkjnm3lw7ni82tag", name: "Resist Energy" },
      { level: 6, id: "q35l6m4pggb4y98v", name: "Elemental Aura" },
      { level: 8, id: "pawbnw1nm4f0b98e", name: "Elemental Body I" },
      { level: 10, id: "yldjnorgbx4jsldz", name: "Elemental Body II" },
      { level: 12, id: "hd32fuc6e7j4isbn", name: "Elemental Body III" },
      { level: 14, id: "v42t5kpxc8mvd615", name: "Elemental Body IV" },
      { level: 16, id: "wniqskqkk0cubu9u", name: "Create Demiplane" },
      { level: 18, id: "pfy97qyneoa391ek", name: "Elemental Swarm" },
    ],
  },
  {
    tag: "godclaw",
    name: "Godclaw",
    classSkills: ["blf", "int", "klo", "per"],
    bonusSpells: [
      { level: 2, id: "9tww9fc9049h6iqc", name: "Cause Fear" },
      { level: 4, id: "y69de8y5ddrhuue5", name: "Daze Monster" },
      { level: 6, id: "78kwl5t99j9e8tzh", name: "Hold Person" },
      { level: 8, id: "8zeulunjetwrdgwj", name: "Order's Wrath" },
      { level: 10, id: "myg2b9ww43nnlbr2", name: "Break Enchantment" },
      { level: 12, id: "aoov6nqfm195txdb", name: "Forceful Hand" },
      { level: 14, id: "7e22urxux6i2mua5", name: "Dictum" },
      { level: 16, id: "lzj5umxjvogvpg6b", name: "Shield of Law" },
      { level: 18, id: "esia6azb5g68tfs7", name: "Imprisonment" },
    ],
  },
  {
    tag: "intrigue",
    name: "Intrigue",
    classSkills: ["blf", "dis", "slt", "ste"],
    bonusSpells: [
      { level: 2, id: "tjog6bufg5b08lvq", name: "Charm Person" },
      { level: 4, id: "swkw2yoee6d9ldcd", name: "False Belief" },
      { level: 6, id: "zqj5qzyl46af27v0", name: "Suggestion" },
      { level: 8, id: "d0d86z521shpman1", name: "Sending" },
      { level: 10, id: "jbqo4o2b2tmdz7wv", name: "True Seeing" },
      { level: 12, id: "1m5rpvirt48brv71", name: "Symbol of Persuasion" },
      // Vendored spell name is "Scrying, Greater" (the AoN/Foundry inversion),
      // not the prose's "greater scrying" — name here matches ref.spells[id].name.
      { level: 14, id: "glt6uk3n6g6l2p6l", name: "Scrying, Greater" },
      { level: 16, id: "blvetbc929cfx4m8", name: "Mind Blank" },
      { level: 18, id: "xuuzj9lr2xbwaim4", name: "Overwhelming Presence" },
    ],
  },
  {
    tag: "juju",
    name: "Juju",
    classSkills: ["blf", "int", "kna", "prf", "sur"],
    bonusSpells: [
      { level: 2, id: "ct9fhh8uawn8e4md", name: "Speak with Animals" },
      { level: 4, id: "5nr9o7o0it6ewf17", name: "Hideous Laughter" },
      { level: 6, id: "be88e90guqbi1q1z", name: "Fear" },
      { level: 8, id: "smbkd2yobhshbpqf", name: "Charm Monster" },
      { level: 10, id: "52v3fogun1n9jzum", name: "Mass Suggestion" },
      { level: 12, id: "68ngvzmzvadhf6vs", name: "Contact Other Plane (as a 6th-level spell)" },
      { level: 14, id: "jjmoi5qbwkbguzbn", name: "Summon Nature's Ally VII" },
      { level: 16, id: "q2r6jrgsbwjgssdg", name: "Mass Charm Monster" },
      { level: 18, id: "n3lp01euzcdmtbw5", name: "Shapechange" },
    ],
  },
  {
    tag: "lunar",
    name: "Lunar",
    classSkills: ["acr", "kna", "per", "sur"],
    bonusSpells: [
      { level: 2, id: "dol5wzpsk7m6gxsc", name: "Fumbletongue" },
      { level: 4, id: "ech2cibcsmsms9s7", name: "Dust of Twilight" },
      { level: 6, id: "8u1xa5javcxc6szk", name: "Rage" },
      { level: 8, id: "2mh7g81k30bv7b5m", name: "Moonstruck" },
      { level: 10, id: "knjoprwzcm3jygwk", name: "Aspect of the Wolf" },
      { level: 12, id: "cxp0vodhvuwnfmye", name: "Litany of Madness" },
      { level: 14, id: "8rf2ucrtzmxooyw6", name: "Lunar Veil" },
      { level: 16, id: "1btrja5u0cz66cy8", name: "Blood Mist" },
      { level: 18, id: "0mt9mso6wdhfafpo", name: "Polar Midnight" },
    ],
  },
  {
    tag: "metal",
    name: "Metal",
    classSkills: ["apr", "blf", "dev", "int"],
    bonusSpells: [
      { level: 2, id: "d0rd4z2kcln69xif", name: "Lead Blades" },
      { level: 4, id: "3b1x69kfhnsa2d54", name: "Heat Metal" },
      { level: 6, id: "bbrkkjmgo5kof6gn", name: "Keen Edge" },
      { level: 8, id: "vjnynvz1omleni8a", name: "Versatile Weapon" },
      { level: 10, id: "b8lt1275mz4ez4d8", name: "Major Creation (metal items only)" },
      { level: 12, id: "fnxgq54y02f6ri82", name: "Wall of Iron" },
      { level: 14, id: "g52zx1t1giteg5h1", name: "Statue (metal statue instead of iron)" },
      { level: 16, id: "oeemcnfjod9zd7my", name: "Repel Metal or Stone" },
      { level: 18, id: "mkrjbrp57yfdqrx0", name: "Iron Body" },
    ],
  },
  {
    tag: "occult",
    name: "Occult",
    classSkills: ["blf", "dis", "kar", "umd"],
    bonusSpells: [
      { level: 2, id: "jhyb2ana8jrk2lut", name: "Unseen Servant" },
      { level: 4, id: "oplskt3tgws8ujv8", name: "Spectral Hand" },
      { level: 6, id: "6kmkxepwgsbta6ui", name: "Clairaudience/Clairvoyance" },
      { level: 8, id: "g66w32kdup1f43bp", name: "Scrying" },
      { level: 10, id: "68ngvzmzvadhf6vs", name: "Contact Other Plane" },
      { level: 12, id: "0w3hvcp3gb2bhtv5", name: "Project Image" },
      { level: 14, id: "aqeaxoaozlv9vg35", name: "Vision" },
      { level: 16, id: "2vb5orfcy57lrfmc", name: "Moment of Prescience" },
      { level: 18, id: "lnahlmp5mih2ongh", name: "Astral Projection" },
    ],
  },
  {
    tag: "outer_rifts",
    name: "Outer Rifts",
    classSkills: ["fly", "int", "kar", "sur"],
    bonusSpells: [
      { level: 2, id: "pau0ejk30fs1eebl", name: "Endure Elements" },
      { level: 4, id: "tkjnm3lw7ni82tag", name: "Resist Energy" },
      { level: 6, id: "uus00fo4fn7yro0w", name: "Vermin Shape I" },
      { level: 8, id: "n0bsyxchnigkkuqo", name: "Confusion" },
      { level: 10, id: "y4b1zmhmsa0gvf06", name: "Planar Binding, Lesser" },
      { level: 12, id: "qf4bqjgeff1q4hjt", name: "Planar Binding" },
      { level: 14, id: "s6q72tw2zra9sycu", name: "Insanity" },
      { level: 16, id: "bbmd0fj17jsf5300", name: "Planar Binding, Greater" },
      { level: 18, id: "esia6azb5g68tfs7", name: "Imprisonment" },
    ],
  },
  {
    tag: "reaper",
    name: "Reaper",
    classSkills: ["int", "per", "ste", "sur"],
    bonusSpells: [
      { level: 2, id: "to1cdmyh5rtfyg2s", name: "Chill Touch" },
      { level: 4, id: "y4ztvvswf2uuwuqo", name: "Calm Spirit" },
      { level: 6, id: "l7tmsbg37zr1q382", name: "Sands of Time" },
      { level: 8, id: "l8xwrepcmkdgb2wf", name: "Purge Spirit" },
      { level: 10, id: "dg3mrasygkm83c3e", name: "Slay Living" },
      { level: 12, id: "lllhr9py6w44cxjm", name: "Undeath to Death" },
      { level: 14, id: "rlfd7f64wgjfvg6e", name: "Destruction" },
      { level: 16, id: "e8zen5nzixnt7bde", name: "Horrid Wilting" },
      { level: 18, id: "wplgawb6aznjx7se", name: "Wail of the Banshee" },
    ],
  },
  {
    tag: "shadow",
    name: "Shadow",
    classSkills: ["blf", "dis", "kdu", "ste"],
    bonusSpells: [
      { level: 2, id: "h4hrop7rq2c9phyi", name: "Blurred Movement" },
      { level: 4, id: "oylikodnyku2zewu", name: "Invisibility" },
      { level: 6, id: "jdsvncnna6oy189a", name: "Deeper Darkness" },
      { level: 8, id: "cmwcavfyc1vbehy8", name: "Shadow Step" },
      { level: 10, id: "3idp5fjp62wpn4a4", name: "Vampiric Shadow Shield" },
      { level: 12, id: "btoow6tyv39443gh", name: "Shadow Walk" },
      { level: 14, id: "j2y1uga5fwg8deqq", name: "Invisibility, Mass" },
      { level: 16, id: "967ur7a9xepd704y", name: "Shadow Evocation, Greater" },
      { level: 18, id: "xxaycxbdsmalf5ov", name: "Shades" },
    ],
  },
  {
    tag: "spellscar",
    name: "Spellscar",
    classSkills: ["kar", "kna", "sur", "umd"],
    bonusSpells: [
      { level: 2, id: "mczdgwo3xl8c6e26", name: "Ray of Enfeeblement" },
      { level: 4, id: "x5hunybxpzhd3gcm", name: "Obscure Object" },
      { level: 6, id: "gmgwyjfpeuuc4t4o", name: "Dispel Magic" },
      { level: 8, id: "exwa9xra4u82j0sx", name: "Globe of Invulnerability, Lesser" },
      { level: 10, id: "myg2b9ww43nnlbr2", name: "Break Enchantment" },
      { level: 12, id: "niqxt53lhxrjfaty", name: "Antimagic Field" },
      { level: 14, id: "uyn64zazmaydnk7o", name: "Spell Turning" },
      { level: 16, id: "4pryfl3cihbio5ph", name: "Spellscar" },
      { level: 18, id: "19p4nr8rsvt42lmn", name: "Mage's Disjunction" },
    ],
  },
  {
    tag: "streets",
    name: "Streets",
    classSkills: ["blf", "klo", "per", "ste"],
    bonusSpells: [
      { level: 2, id: "oj36nfak6jc2s5ky", name: "Disguise Self" },
      { level: 4, id: "xllxylvvqr82o2d5", name: "Detect Thoughts" },
      { level: 6, id: "53dyu81yaw4y0nz4", name: "Glyph of Warding" },
      { level: 8, id: "7c0l64pfdkgl7j5y", name: "Illusory Wall" },
      { level: 10, id: "gk8fqfvj99d46p2h", name: "False Vision" },
      { level: 12, id: "q5432hyeds4pncxn", name: "Getaway" },
      { level: 14, id: "dsondqy4ngf1yzf3", name: "Screen" },
      { level: 16, id: "kqftgm3bi2dqj92l", name: "Mage's Magnificent Mansion" },
      { level: 18, id: "9968j68bl9x9iq7u", name: "Clone" },
    ],
  },
  {
    tag: "succor",
    name: "Succor",
    classSkills: ["han", "kna", "sur"],
    bonusSpells: [
      { level: 2, id: "mczdgwo3xl8c6e26", name: "Ray of Enfeeblement" },
      { level: 4, id: "qc7vnye0x975gxdf", name: "Shield of Fortification" },
      { level: 6, id: "lisojmynoblunlex", name: "Coordinated Effort" },
      { level: 8, id: "rxenoze8iyh9iyng", name: "Greater Shield of Fortification" },
      { level: 10, id: "knyako6zopc1chrv", name: "Stoneskin" },
      { level: 12, id: "z0duc2v2n3ioynta", name: "Greater Heroism" },
      { level: 14, id: "uuzeynxotp9dzu15", name: "Expend" },
      { level: 16, id: "cc0or00vpiky87n7", name: "Greater Spellcrash" },
      { level: 18, id: "77bihy40diufd6p1", name: "Wall of Suppression" },
    ],
  },
  {
    tag: "time",
    name: "Time",
    classSkills: ["fly", "kar", "per", "umd"],
    bonusSpells: [
      { level: 2, id: "5eg2f7nek9cjmv0n", name: "Memory Lapse" },
      { level: 4, id: "vdmsaodgnbo8wjfx", name: "Gentle Repose" },
      { level: 6, id: "l7tmsbg37zr1q382", name: "Sands of Time" },
      { level: 8, id: "w2yf0ksu14e91uae", name: "Threefold Aspect" },
      { level: 10, id: "nsxngq65mbrzgwnm", name: "Permanency" },
      { level: 12, id: "4br9puuneexco5hx", name: "Contingency" },
      { level: 14, id: "sxyiwj0z95piv96i", name: "Disintegrate" },
      { level: 16, id: "qptzjtg2m9cqnuwh", name: "Temporal Stasis" },
      { level: 18, id: "7mstq5c76h3e6zzx", name: "Time Stop" },
    ],
  },
  {
    tag: "volcano",
    name: "Volcano",
    classSkills: ["clm", "int", "kge", "sur"],
    bonusSpells: [
      { level: 2, id: "lndeaqm2j2nvgm6p", name: "Burning Hands" },
      { level: 4, id: "3b1x69kfhnsa2d54", name: "Heat Metal" },
      { level: 6, id: "1vh2ewwvzvxunoxk", name: "Protection from Energy" },
      { level: 8, id: "8qligfr61kotnlwx", name: "Volcanic Storm" },
      { level: 10, id: "nll8ip8348eti0ff", name: "Geyser" },
      { level: 12, id: "0cbreqkr1vp7meyi", name: "Contagious Flame" },
      { level: 14, id: "9wl8ijy6argdvz5f", name: "Fire Storm" },
      { level: 16, id: "h17ad4lpmphnospf", name: "Wall of Lava" },
      { level: 18, id: "xhzme0v6tjq95fg6", name: "Meteor Swarm" },
    ],
  },
  {
    tag: "whimsy",
    name: "Whimsy",
    classSkills: ["blf", "dis", "prf", "slt", "ste"],
    bonusSpells: [
      { level: 2, id: "bl71og1gklwncmt7", name: "Faerie Fire" },
      { level: 4, id: "5nr9o7o0it6ewf17", name: "Hideous Laughter" },
      { level: 6, id: "3ofgzglphaotmwnw", name: "Shamefully Overdressed" },
      { level: 8, id: "7rx66m98dwo18fy8", name: "Major Image" },
      { level: 10, id: "fv17a5jsmapb0wcz", name: "Lesser Entice Fey" },
      { level: 12, id: "446vcsetq4ny904e", name: "Mislead" },
      { level: 14, id: "b9klr16gssc2x0ab", name: "Entice Fey" },
      { level: 16, id: "oq3mqv5vovjkoa2p", name: "Irresistible Dance" },
      { level: 18, id: "6isran0p5phoru7x", name: "Greater Entice Fey" },
    ],
  },
  {
    tag: "winter",
    name: "Winter",
    classSkills: ["int", "kna", "ste", "sur"],
    bonusSpells: [
      { level: 2, id: "pau0ejk30fs1eebl", name: "Endure Elements" },
      { level: 4, id: "ue0h9b1fl21m8lzy", name: "Frost Fall" },
      { level: 6, id: "qnp4eosajai8s3sf", name: "Sleet Storm" },
      { level: 8, id: "t1uhggjfimtabp4v", name: "Ice Storm" },
      { level: 10, id: "jjjy56tcyfq8wa9g", name: "Icy Prison" },
      { level: 12, id: "pkm8um5t1cxsn6jh", name: "Cone of Cold" },
      { level: 14, id: "qubzqiz5mqs8tbqr", name: "Ice Body" },
      { level: 16, id: "8jq1atxonnerix55", name: "Polar Ray" },
      { level: 18, id: "ezpm33cvtlq8aswa", name: "Mass Icy Prison" },
    ],
  },
  {
    tag: "wood",
    name: "Wood",
    classSkills: ["clm", "kna", "ste", "sur"],
    bonusSpells: [
      { level: 2, id: "v05u8sl116ab2n9c", name: "Shillelagh" },
      { level: 4, id: "la7kuehewu85ybnt", name: "Barkskin" },
      { level: 6, id: "jsvjsax2eabrlx8g", name: "Minor Creation (wood items only)" },
      { level: 8, id: "818uuekrao87o57u", name: "Thorn Body" },
      { level: 10, id: "6x6epf4g5wgzl1gh", name: "Tree Stride" },
      { level: 12, id: "xmacjpo6tgm1xhnv", name: "Ironwood" },
      { level: 14, id: "3fravqa4vrm4ygkr", name: "Transmute Metal to Wood" },
      { level: 16, id: "cp5m19me647dojha", name: "Changestaff" },
      { level: 18, id: "9fd7mcoint902oyb", name: "Wooden Phalanx" },
    ],
  },
];

export const ORACLE_MYSTERIES: Record<string, OracleMysteryDef> = Object.fromEntries(
  MYSTERY_LIST.map((m) => [m.tag, m]),
);

export const ORACLE_MYSTERY_TAGS: readonly string[] = MYSTERY_LIST.map((m) => m.tag);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74: `RefData.oracleMysteries` (see that type's doc
 * comment) is the FULL published catalog (34 entries after junk filtering),
 * prose only. The hand-verified table above stays authoritative for
 * MECHANICS (class skills + bonus spells) — this section only merges the two
 * for BROWSING (the picker: the vendored side contributes each mystery's
 * DISPLAY prose) and for resolving a picked tag back to a definition,
 * mirroring `rage-powers.ts`'s `mergedRagePowerCatalog`/`resolveRagePower`.
 * Since the #74 content pass authored all 34, the vendored-only fallback
 * path only fires for a future data bump that vendors a mystery this table
 * hasn't caught up with.
 *
 * Matching is by NORMALIZED NAME. Collision audit (all hand-authored
 * mysteries against the pinned Pf Data 1e slice): every one matched a
 * vendored entry by normalized name (the vendored dictionary keys ARE this
 * table's own `tag`s, verified — e.g. `battle`, `dark_tapestry`, ...) — no
 * aliasing needed.
 */

const ORACLE_MYSTERY_NAME_ALIASES: Record<string, string> = {};

function normalizeMysteryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A catalog entry the picker can browse — either the hand-authored def with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedOracleMysteryEntry extends OracleMysteryDef {
  /** Full vendored HTML prose (includes the mystery's Revelations/Final Revelation section), when a vendored entry backs this tag. */
  description?: string;
  sources?: SourceRef[];
  /** True for a vendored-only mystery with no hand-authored class-skill/bonus-spell data — the picker's "M" (modeled) badge convention. */
  displayOnly: boolean;
}

function vendoredMysteryToDef(entry: OracleMystery): MergedOracleMysteryEntry {
  return {
    tag: entry.id,
    name: entry.name,
    classSkills: [],
    bonusSpells: [],
    description: entry.description,
    sources: entry.sources,
    displayOnly: true,
  };
}

/** Resolve a picked mystery tag (`doc.build.oracleMystery`) to its definition — hand-authored table first, falling back to the vendored catalog for a tag that only exists there. */
export function resolveOracleMystery(
  tag: string,
  refData: RefData,
): MergedOracleMysteryEntry | undefined {
  const hand = ORACLE_MYSTERIES[tag];
  if (hand) return { ...hand, displayOnly: false };
  const vendored = refData.oracleMysteries?.[tag];
  return vendored ? vendoredMysteryToDef(vendored) : undefined;
}

/** The full picker-browsable catalog: every vendored mystery, with any that collides (by normalized name) against a hand-authored entry replaced by that def (keeping its `tag`, but carrying the vendored prose along for display), plus any hand-authored entry with no vendored counterpart appended. */
export function mergedOracleMysteryCatalog(refData: RefData): MergedOracleMysteryEntry[] {
  const handByNormName = new Map<string, OracleMysteryDef>();
  for (const m of MYSTERY_LIST) {
    handByNormName.set(normalizeMysteryName(ORACLE_MYSTERY_NAME_ALIASES[m.tag] ?? m.name), m);
  }

  const usedHandTags = new Set<string>();
  const merged: MergedOracleMysteryEntry[] = [];
  for (const v of Object.values(refData.oracleMysteries ?? {})) {
    const handMatch = handByNormName.get(normalizeMysteryName(v.name));
    if (handMatch) {
      usedHandTags.add(handMatch.tag);
      merged.push({
        ...handMatch,
        description: v.description,
        sources: v.sources,
        displayOnly: false,
      });
    } else {
      merged.push(vendoredMysteryToDef(v));
    }
  }
  for (const m of MYSTERY_LIST) {
    if (!usedHandTags.has(m.tag)) merged.push({ ...m, displayOnly: false });
  }
  return merged;
}
