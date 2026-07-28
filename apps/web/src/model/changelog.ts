/**
 * Player-facing "What's new" — a hand-curated list of notable changes, newest
 * first, rendered in Settings as the counterpart to `coverageNotes.ts` ("what
 * we added" next to "what we still don't do").
 *
 * Deliberately hand-written rather than generated from commits: the audience
 * is a player, not a contributor, and one player-visible change routinely
 * spans half a dozen commits while a data regen spans none. An entry is
 * earned when a player would see or do something different at the table;
 * refactors and internal fixes don't get one. Because the list promises
 * "notable" and not "complete", a missing entry reads as quiet rather than
 * wrong — which is the only reason a hand-maintained list like this is safe.
 *
 * Dated, not versioned: the app ships continuously and has no release number
 * to hang entries off.
 */

export interface ChangelogEntry {
  /**
   * Stable identity and, via its position in the array, the high-water mark
   * the "new" cue compares against. Never rewrite an id once shipped — every
   * reader who has already seen that entry has the old string stored, and a
   * rewrite makes their mark unresolvable (which re-announces the list).
   */
  id: string;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  title: string;
  note: string;
}

/** Newest first — `CHANGELOG[0]` is the entry the unseen cue keys off. */
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    id: "2026-07-28-more-picks-move-real-numbers",
    date: "2026-07-28",
    title: "More of your picks move real numbers",
    note: "A sweep through the pick lists promoted everything that honestly could be automatic. Eleven oracle revelations now compute live — Iron Constitution's Fortitude bonus, the elemental- and spellscar-resistance lines, the energy-skin revelations up through their 17th-level immunity, Face in the Crowd's Stealth bonus, Pierce the Veil's darkvision. The ninja's Wall Climber and the vigilante's Rooftop Infiltrator grant their climb speeds for real — and that fix ran deeper: rogue, ninja, investigator, and vigilante talent picks weren't feeding the sheet's numbers at all, so the vigilante's Shadow's Speed and Monkey's Paws now actually do what their badge claimed. The sweep also corrected four rage-power write-ups that didn't match the printed rules, and removed one — \"Sixth Sense\" — that turns out not to exist in any book. If your barbarian had it picked, that slot is free again.",
  },
  {
    id: "2026-07-28-every-eidolon-subtype",
    date: "2026-07-28",
    title: "Eidolons of every stripe",
    note: "Thirteen more eidolon subtypes join the builder — Aberrant, Aeon, Ancestor, Astral, Deepwater, Genie, Kami, Kyton, Radiant, Shadow, Storykin, Twinned, and Void — each with its forms, attacks, and level-by-level grants spelled out, and the free evolutions and pool bonuses applied for real. The Aberrant base form is here too (bite, tentacle, and a swim speed), and you can finally make your eidolon Small: its dice step down, its size modifiers land on AC and attacks, and its Fly and Stealth pick up the bonuses, all computed.",
  },
  {
    id: "2026-07-28-every-oracle-mystery",
    date: "2026-07-28",
    title: "Every oracle mystery, revelations and all",
    note: "Oracles were the class with the biggest hole: only the eleven core mysteries knew their class skills, bonus spells, and revelations. All thirty-four published mysteries are in now — pick Dark Tapestry or Reaper or Whimsy and your class skills appear, your bonus spells arrive on schedule, and the full revelation list is right there to choose from, level requirements and all. That's two hundred twenty-six newly written-up revelations. What each revelation does when you use it is still applied at the table, same as before.",
  },
  {
    id: "2026-07-28-class-immunities-and-talent-catalogs",
    date: "2026-07-28",
    title: "Your class's immunities show up on their own",
    note: "A paladin who hits 3rd level now sees disease and fear immunity on the sheet without typing anything, and trying to mark her shaken gets flagged. Same for the monk's Purity of Body and Diamond Body, the druid's Venom Immunity and Timeless Body, the alchemist's and investigator's Poison Immunity, the antipaladin's Plague Bringer, and the paladin's charm and compulsion auras when they arrive. Alongside that, the shaman's general hexes and the slayer's full talent list got real write-ups in their pickers — every entry summarized with its level gate and table notes, and a slayer in full plate with Armored Marauder watches the armor check penalty actually shrink.",
  },
  {
    id: "2026-07-27-the-app-keeps-your-place",
    date: "2026-07-27",
    title: "Reload and you're still where you were",
    note: "Refreshing used to drop you back at the top of the Build tab no matter what you had open. The tab and the section you were reading are now part of the address, so a reload, a browser that crashed, or a tablet that went to sleep puts you back where you left off. It also means any spot is linkable: copy the address while you're looking at your spells and it opens there. The What's New panel has a copy-link button of its own, for pointing your table at what changed.",
  },
  {
    id: "2026-07-27-reference-site-link",
    date: "2026-07-27",
    title: "The reference library is one click away",
    note: "A Reference link now sits in the top bar and opens the companion lookup site in a new tab, for reading a spell, feat, weapon, armor, item, or condition you don't have on your sheet. Your sheet stays exactly as you left it, buffs and all.",
  },
  {
    id: "2026-07-27-odd-weapon-dice-scale",
    date: "2026-07-27",
    title: "Greataxes and scythes grow when you do",
    note: "Enlarge Person, Reduce Person, and polymorph forms already resized most weapons' damage dice, but a handful of shapes sat out: the greataxe, musket, and lucerne hammer at 1d12, the scythe, estoc, and guisarme at 2d4. Those aren't printed on the size chart, so they now convert to the die the rules say they count as before stepping. An enlarged greataxe reads 3d6. Drop the buff and it reads 1d12 again.",
  },
  {
    id: "2026-07-27-faster-spell-browsing",
    date: "2026-07-27",
    title: "The spell list opens without the wait",
    note: "Opening your spellbook to browse a full class list meant building every spell's stat table and rules text up front, hundreds of them, before the list would show. Searching was even worse! Each spell's write-up is now put together when you open that spell's details, so the list appears straight away and searching keeps up with your typing.",
  },
  {
    id: "2026-07-26-racial-immunities",
    date: "2026-07-26",
    title: "Your race's immunities are on the sheet",
    note: "Elves, half-elves, and drow against magic sleep; duergar against paralysis, phantasms, and poison; androids against disease, sleep, fear, and the rest; a being of Ib against critical hits. These were buried in your race's rules text and now sit with your DR and resistances, and the matching condition chip is marked so you notice before you toggle it. Nothing rolls against them. They're there so you and your GM can see them at a glance.",
  },
  {
    id: "2026-07-26-rage-fatigue-counts-down",
    date: "2026-07-26",
    title: "Rage's hangover counts itself down",
    note: "When a rage ends, the fatigue it leaves now comes with a duration and the round clock clears it: twice the rounds you raged for a barbarian or bloodrager, a flat minute for the unchained barbarian, whose fatigue the sheet previously didn't apply at all. The Conditions panel shows the rounds left on the chip. Ending a rage without ever advancing the clock still leaves the fatigue untimed for you to clear, since the sheet won't guess how long you were raging.",
  },
  {
    id: "2026-07-26-formulas-read-as-numbers",
    date: "2026-07-26",
    title: "Reminders quote your number, not a formula",
    note: 'The last few hundred trait and racial-trait reminders showed a formula where a number belongs, like "You have SR [[5 + @attributes.hd.total]]". They now read as the number for your character, and follow it as you level. Where the formula counted uses per day, which this sheet tracks in its own resource pools instead, the count is left off rather than printed as a wrong zero; the rule still says how often you get it.',
  },
  {
    id: "2026-07-26-armor-bonuses-compete",
    date: "2026-07-26",
    title: "Armor bonuses stop double-counting",
    note: "Mage armor, bracers of armor, a robe of the archmagi, and the armor on your back all grant an armor bonus, and the rules say only the best one counts. The sheet was adding them together. Now they compete, the loser is struck through in the AC breakdown next to whatever beat it, and a magic armor's enhancement bonus steps aside with it. The shield spell and a worn shield settle the same way. If your AC just dropped, this is why: it was too high before.",
  },
  {
    id: "2026-07-26-readable-rules-text",
    date: "2026-07-26",
    title: "Rules text reads like rules text",
    note: 'Traits, racial traits, gear, and buffs were showing their reminders with the raw markup they were authored in, like "+[[1]] Trait bonus to disable traps", "@Distance[20 ft;dual] below you", "@Condition[dazzled]". Around 2,800 of those now read as plain numbers and words. A couple hundred that depend on your caster level or an ability modifier still show their formula.',
  },
  {
    id: "2026-07-25-combat-math-sweep",
    date: "2026-07-25",
    title: "Combat math fills in its corners",
    note: "CMD now shows a flat-footed value next to the regular one, tower shields apply their −2 attack penalty, the Agile Maneuvers feat swaps Dex into your CMB, and growing or shrinking (enlarge person, polymorph forms) steps your weapon's damage dice up or down the official chart. Kineticist elements, cavalier orders, and oracle mysteries now grant their bonus class skills for real, and Elemental Overflow's bonus cap is fixed.",
  },
  {
    id: "2026-07-25-casting-table-rules",
    date: "2026-07-25",
    title: "Spellcasting knows its table rules",
    note: "Clerics and druids can cast a prepared spell as a cure, inflict, or summon nature's ally on the fly, with the slot bookkeeping handled. Shamans get their spirit-magic casts tracked as their own pool, oracles' free cure or inflict spells land on the known list automatically, and occultists see a warning when they know more spells than their implements allow. Every spell also shows the full concentration-DC reference (damage, grapples, motion, weather) next to the defensive-casting DC.",
  },
  {
    id: "2026-07-25-rage-items-hero-points",
    date: "2026-07-25",
    title: "Rage hangovers, working bracers, hero points",
    note: "Ending a barbarian's rage or a bloodrager's bloodrage now applies the fatigue the rules demand (and knows who's exempt). Bracers of Armor actually grant their armor bonus, casting false life offers a one-click buff, and hero points gain automatically on level-up with a spend-options reference on the panel.",
  },
  {
    id: "2026-07-25-support-links",
    date: "2026-07-25",
    title: "A tip jar, if you're so inclined",
    note: "Settings has a new Support panel with a Ko-fi and a GitHub Sponsors link. Ledgermain stays free and unpaywalled: no feature, class, or character slot will ever sit behind a donation. It's a coffee fund, nothing more.",
  },
  {
    id: "2026-07-25-settings-nav",
    date: "2026-07-25",
    title: "Settings has a jump menu",
    note: "Settings now carries the same section rail as Build and Play, with its panels sorted into Display, Rules, Overrides, Data, About, and Danger Zone. Finding the encumbrance toggle or the export button no longer means scrolling the whole page looking for it.",
  },
  {
    id: "2026-07-25-solar-mystery",
    date: "2026-07-25",
    title: "The Solar mystery is fully in",
    note: "Solar oracles now get their bonus spells at the right levels and their ten revelations in the revelation picker, alongside the Advanced Player's Guide mysteries. Sun Stride and Sungazer show as available from 5th level, the way the book gates them.",
  },
  {
    id: "2026-07-25-inquisitor-domains",
    date: "2026-07-25",
    title: "Inquisitors can pick a domain",
    note: "The Domains picker now opens for inquisitors, who choose one and gain its granted powers scaled off inquisitor level. You don't get the domain's bonus spell slots; those stay a cleric thing, same as the book.",
  },
  {
    id: "2026-07-25-soul-warden-casting",
    date: "2026-07-25",
    title: "Soul Warden advances your spellcasting",
    note: "Levels in Soul Warden now carry your existing spellcasting class forward, so a cleric who takes the prestige class keeps gaining spell levels instead of stalling. Pick which class each level feeds in the Casting Advancement panel.",
  },
  {
    id: "2026-07-24-damage-types",
    date: "2026-07-24",
    title: "Damage knows its type",
    note: 'Enter a hit as "12 fire" or "9 slashing" and the sheet applies your damage reduction, energy resistance, and immunities before anything reaches your hit points, spending ablative pools like stoneskin or protection from energy first. The Play sidebar shows what\'s soaking and how much is left.',
  },
  {
    id: "2026-07-24-race-senses",
    date: "2026-07-24",
    title: "Racial senses on the sheet",
    note: "Darkvision, low-light vision, scent, and the rest now come through from your race as real entries on the sheet instead of sitting in the race's rules text.",
  },
  {
    id: "2026-07-24-rules-corrections",
    date: "2026-07-24",
    title: "A pass of rules corrections",
    note: "A sweep through the rules engine turned up and fixed a batch of math that was off: caster level in some multiclass cases, the flurry of blows attack line, which natural attacks count as primary, spell resistance, carrying capacity, and a skill-rank budget that moved when Intelligence was temporarily buffed.",
  },
  {
    id: "2026-07-23-heritage-traits",
    date: "2026-07-23",
    title: "Alternate racial traits and heritages",
    note: "The published alternate racial traits are in the race picker, including the ones that ask you to choose an option, and they swap out the trait they replace rather than stacking on top of it.",
  },
  {
    id: "2026-07-23-wizard-schools",
    date: "2026-07-23",
    title: "Elemental wizard schools",
    note: "Air, Earth, Fire, and Water schools bring their own spell lists, and opposition schools are tracked against them properly.",
  },
  {
    id: "2026-07-22-druid-nature-bond",
    date: "2026-07-22",
    title: "Druid nature bond domains",
    note: "Take a domain instead of an animal companion and its bonus spell slots show up in your spellbook.",
  },
  {
    id: "2026-07-22-class-catalogs",
    date: "2026-07-22",
    title: "Every published class option is browsable",
    note: 'Rage powers, hexes, magus arcana, rogue/ninja/slayer/vigilante talents, arcanist exploits, investigator talents, discoveries, kineticist wild talents, and the full prestige-class list are all searchable in their pickers. Entries marked "M" move numbers on your sheet; the rest are there for reference.',
  },
  {
    id: "2026-07-22-drawback-trait",
    date: "2026-07-22",
    title: "Third trait from a drawback",
    note: "Take a drawback and the builder opens the extra trait slot it buys you.",
  },
  {
    id: "2026-07-22-two-weapon-fighting",
    date: "2026-07-22",
    title: "Two-weapon fighting is a roll mode",
    note: "Rather than attaching it to a feat, flip two-weapon fighting on for a saved roll and both hands' attack lines come out with the right penalties.",
  },
  {
    id: "2026-07-21-trait-catalog",
    date: "2026-07-21",
    title: "The full character-trait catalog",
    note: "Every published character trait is searchable in the trait picker, with the core set wired up to move numbers.",
  },
  {
    id: "2026-07-20-vtt-roll-copy",
    date: "2026-07-20",
    title: "Copy a roll to your VTT",
    note: "Any saved roll copies to the clipboard as a formula you can paste into a virtual tabletop, with Power Attack and two-weapon penalties already folded in.",
  },
];

const LAST_SEEN_KEY = "pf1-tracker:changelogLastSeen";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * `2026-07-24` -> `24 Jul 2026`. Formatted from the string parts rather than
 * through `Date`, which would shift the day backwards for anyone west of UTC
 * (an ISO date parses as midnight UTC).
 */
export function formatEntryDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const name = MONTH_NAMES[Number(month) - 1];
  if (!name) return iso;
  return `${Number(day)} ${name} ${year}`;
}

/** The id of the newest entry, or `null` when the list is empty. */
export function latestEntryId(entries: readonly ChangelogEntry[] = CHANGELOG): string | null {
  return entries[0]?.id ?? null;
}

/**
 * Whether anything has landed since the reader's high-water mark.
 *
 * A `null` mark means "never recorded" — a first-ever visit — and gets no cue:
 * nothing is *new* to someone who has never seen the app. An unrecognizable
 * mark (an entry that was pruned) counts as unseen, so the cue errs toward
 * showing once and then settling rather than going permanently dark.
 */
export function hasUnseenEntries(
  entries: readonly ChangelogEntry[],
  lastSeen: string | null,
): boolean {
  if (entries.length === 0 || lastSeen == null) return false;
  return entries.findIndex((e) => e.id === lastSeen) !== 0;
}

/** The stored high-water mark, or `null` if none has been written. */
export function readLastSeen(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(id: string): void {
  try {
    localStorage.setItem(LAST_SEEN_KEY, id);
  } catch {
    // Storage unavailable — the cue just won't persist across reloads.
  }
}

/**
 * Read the high-water mark, seeding it to the newest entry on a first-ever
 * visit. Seeding is what keeps a brand-new player from being greeted by a
 * "new" cue over a list they've never not seen; the cost is that the deploy
 * introducing this panel is silent for existing readers too.
 */
export function initChangelogSeen(entries: readonly ChangelogEntry[] = CHANGELOG): string | null {
  const stored = readLastSeen();
  if (stored != null) return stored;
  const latest = latestEntryId(entries);
  if (latest != null) writeLastSeen(latest);
  return latest;
}

/** Record that the reader has been shown the current list. */
export function markChangelogSeen(entries: readonly ChangelogEntry[] = CHANGELOG): void {
  const latest = latestEntryId(entries);
  if (latest != null) writeLastSeen(latest);
}
