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
    id: "2026-07-25-support-links",
    date: "2026-07-25",
    title: "A tip jar, if you're so inclined",
    note: "Settings has a new Support panel with a Ko-fi and a GitHub Sponsors link. Ledgermain stays free and unpaywalled — no feature, class, or character slot will ever sit behind a donation. It's a coffee fund, nothing more.",
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
    note: "The Domains picker now opens for inquisitors, who choose one and gain its granted powers scaled off inquisitor level. You don't get the domain's bonus spell slots — those stay a cleric thing, same as the book.",
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
    note: 'Enter a hit as "12 fire" or "9 slashing" and the sheet applies your damage reduction, energy resistance, and immunities before anything reaches your hit points — spending ablative pools like stoneskin or protection from energy first. The Play sidebar shows what\'s soaking and how much is left.',
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
