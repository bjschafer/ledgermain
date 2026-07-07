/**
 * Race rarity classification, for organizing the builder's race picker into
 * Core / Featured / Uncommon / Exotic sections rather than one flat 80-entry
 * alphabetical list (which drops Human right next to Android).
 *
 * The tiers are the published PF1 race-rarity categories (Core Rulebook + the
 * Advanced Race Guide's Featured/Uncommon lists); everything the ARG doesn't
 * name — the Bestiary/planar/AP-specific races vendored later (issue #26) —
 * falls through to `"exotic"`. This is a clean-room categorization of published
 * facts, the same posture as `model/race.ts` keying off race NAME: the vendored
 * Foundry entries carry no rarity field, so we map by name here. If a data-
 * pipeline bump ever renames a vendored race, it silently drops to `"exotic"`
 * (the `rarity.test.ts` "every core/featured/uncommon race resolves" guard
 * catches that regression).
 *
 * Rarity is purely presentational — it never touches `compute()` or any game
 * number. See `model/grouping.ts` for the reusable grouping mechanism.
 */

import type { Race } from "@pf1/schema";

import { type CategoryGroup, groupByCategory } from "./grouping.js";

export type Rarity = "core" | "featured" | "uncommon" | "exotic";

/** Display order, least → most exotic (drives the picker's section order). */
export const RARITY_ORDER: readonly Rarity[] = ["core", "featured", "uncommon", "exotic"];

export const RARITY_LABEL: Record<Rarity, string> = {
  core: "Core",
  featured: "Featured",
  uncommon: "Uncommon",
  exotic: "Exotic",
};

/**
 * Race NAME → rarity tier. Only Core/Featured/Uncommon are enumerated; any race
 * not listed here (including monstrous variants like Drow Noble / Reborn
 * Samsaran) defaults to `"exotic"` via `raceRarity`.
 */
const RACE_RARITY: Readonly<Record<string, Rarity>> = {
  // Core Rulebook (7).
  Dwarf: "core",
  Elf: "core",
  Gnome: "core",
  "Half-Elf": "core",
  "Half-Orc": "core",
  Halfling: "core",
  Human: "core",

  // Advanced Race Guide — Featured (16).
  Aasimar: "featured",
  Catfolk: "featured",
  Dhampir: "featured",
  Drow: "featured",
  Fetchling: "featured",
  Goblin: "featured",
  Hobgoblin: "featured",
  Ifrit: "featured",
  Kobold: "featured",
  Orc: "featured",
  Oread: "featured",
  Ratfolk: "featured",
  Sylph: "featured",
  Tengu: "featured",
  Tiefling: "featured",
  Undine: "featured",

  // Advanced Race Guide — Uncommon (14).
  Changeling: "uncommon",
  Duergar: "uncommon",
  Gillman: "uncommon",
  Grippli: "uncommon",
  Kitsune: "uncommon",
  Merfolk: "uncommon",
  Nagaji: "uncommon",
  Samsaran: "uncommon",
  Strix: "uncommon",
  Suli: "uncommon",
  Svirfneblin: "uncommon",
  Vanara: "uncommon",
  Vishkanya: "uncommon",
  Wayang: "uncommon",
};

/** Rarity tier for a race, defaulting to `"exotic"` for anything unlisted. */
export function raceRarity(race: Pick<Race, "name">): Rarity {
  return RACE_RARITY[race.name] ?? "exotic";
}

/**
 * Group race picker entries (`[id, race]` pairs, as `RaceSection` holds them)
 * into ordered rarity sections. Thin convenience over `groupByCategory` so the
 * component doesn't re-wire the label/order plumbing.
 */
export function groupRacesByRarity<T extends Pick<Race, "name">>(
  entries: readonly (readonly [string, T])[],
): CategoryGroup<readonly [string, T], Rarity>[] {
  return groupByCategory(
    entries,
    ([, race]) => raceRarity(race),
    RARITY_ORDER,
    (c) => RARITY_LABEL[c],
  );
}
