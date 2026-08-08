/**
 * Undercasting (Occult Adventures): certain psychic attack spells come in a
 * numbered chain (Mind Thrust I-VI, Ego Whip I-V, ...) where each version
 * from II up explicitly reads "This spell can be undercast" in its
 * description. A caster who knows one of those higher versions can cast any
 * lower version in the same chain using that lower spell's own (cheaper)
 * slot, without learning it separately — RAW never requires adding the
 * lower versions to a spontaneous caster's known list at all.
 *
 * The vendored data carries no structured link between a chain's entries (no
 * shared `group`/family id) — only the free-text "can be undercast" sentence
 * on the higher members and the spell's own name, which always ends in a
 * roman numeral (I-VI across the vendored chains). So the chain is derived
 * here purely from name + description: find every spell whose description
 * contains the sentence, strip its trailing roman numeral to get the family
 * name, then collect every same-family spell (including the roman-numeral-I
 * root, which never carries the sentence itself) as one chain.
 */

import type { RefData } from "@pf1/schema";

const ROMAN_NUMERAL_VALUES: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
};
const ROMAN_NUMERALS_BY_VALUE = Object.keys(ROMAN_NUMERAL_VALUES);

/**
 * Matches a spell name ending in " <roman numeral>", capturing the family and
 * the numeral. The trailing `$` anchor makes the alternative order harmless:
 * only the alternative whose length exactly consumes the rest of the string
 * can match, so e.g. "Mind Thrust III" can never mis-split on the "I" or "II"
 * alternatives.
 */
const CHAIN_NAME_PATTERN = /^(.+) (I|II|III|IV|V|VI|VII|VIII|IX|X)$/;

const UNDERCAST_SENTENCE = /can be undercast/i;

function toRoman(value: number): string {
  return ROMAN_NUMERALS_BY_VALUE[value - 1] ?? String(value);
}

/** One spell within an undercast chain, ordered by its roman-numeral position. */
export interface UndercastChainSpell {
  id: string;
  name: string;
  level: number;
  /** Position in the chain: I = 1, II = 2, ... */
  numeral: number;
}

/** A full undercast chain (e.g. every "Mind Thrust" version), ordered ascending by numeral. */
export interface UndercastChain {
  family: string;
  spells: UndercastChainSpell[];
}

const chainCache = new WeakMap<RefData, Map<string, UndercastChain>>();

function buildUndercastChains(refData: RefData): Map<string, UndercastChain> {
  const families = new Set<string>();
  for (const sp of Object.values(refData.spells)) {
    if (!UNDERCAST_SENTENCE.test(sp.description ?? "")) continue;
    const m = CHAIN_NAME_PATTERN.exec(sp.name);
    if (m) families.add(m[1]!);
  }

  const chains = new Map<string, UndercastChain>();
  for (const [id, sp] of Object.entries(refData.spells)) {
    const m = CHAIN_NAME_PATTERN.exec(sp.name);
    if (!m) continue;
    const [, family, numeralToken] = m;
    if (!families.has(family!)) continue;
    const numeral = ROMAN_NUMERAL_VALUES[numeralToken!];
    if (numeral === undefined) continue;
    const chain = chains.get(family!) ?? { family: family!, spells: [] };
    chain.spells.push({ id, name: sp.name, level: sp.level, numeral });
    chains.set(family!, chain);
  }
  for (const chain of chains.values()) chain.spells.sort((a, b) => a.numeral - b.numeral);
  return chains;
}

/** Every undercast chain in `refData`, keyed by family name (e.g. "Mind Thrust"). */
function undercastChains(refData: RefData): Map<string, UndercastChain> {
  let cache = chainCache.get(refData);
  if (!cache) {
    cache = buildUndercastChains(refData);
    chainCache.set(refData, cache);
  }
  return cache;
}

const spellIndexCache = new WeakMap<
  RefData,
  Map<string, { chain: UndercastChain; index: number }>
>();

function spellChainIndex(refData: RefData) {
  let index = spellIndexCache.get(refData);
  if (!index) {
    index = new Map();
    for (const chain of undercastChains(refData).values()) {
      chain.spells.forEach((sp, i) => index!.set(sp.id, { chain, index: i }));
    }
    spellIndexCache.set(refData, index);
  }
  return index;
}

/** What a known chain member (`spellId`) grants via undercasting: every lower version in its chain. */
export interface UndercastGrant {
  family: string;
  /** Lower-numbered chain members, ascending — never includes `spellId` itself. */
  spells: UndercastChainSpell[];
}

/**
 * The lower chain versions `spellId` grants access to via undercasting, or
 * `undefined` when `spellId` isn't the higher member of an undercast chain
 * (either it's not on a chain at all, or it's the chain's own root — the
 * root has nothing lower to grant).
 */
export function undercastGrant(refData: RefData, spellId: string): UndercastGrant | undefined {
  const entry = spellChainIndex(refData).get(spellId);
  if (!entry || entry.index === 0) return undefined;
  return { family: entry.chain.family, spells: entry.chain.spells.slice(0, entry.index) };
}

/** Short player-facing summary of a grant, e.g. "Undercast: also grants Mind Thrust I-IV". */
export function undercastGrantLabel(grant: UndercastGrant): string {
  const from = grant.spells[0]!;
  const to = grant.spells[grant.spells.length - 1]!;
  const range =
    from.numeral === to.numeral
      ? toRoman(from.numeral)
      : `${toRoman(from.numeral)}-${toRoman(to.numeral)}`;
  return `Undercast: also grants ${grant.family} ${range}`;
}

/** One chain member implied by a known higher version, cast at its own (lower) level. */
export interface ImpliedUndercastSpell extends UndercastChainSpell {
  /** id of the known higher-version spell that grants this one. */
  grantedById: string;
  grantedByName: string;
}

/**
 * Every lower-chain spell implied by `knownIds` via undercasting — cast at
 * its own level, without being separately known or counting against a
 * spontaneous caster's known-spell cap. Deduplicated by id: when two known
 * spells in the same chain overlap (e.g. both Mind Thrust III and V are
 * known), each implied spell is only reported once.
 */
export function impliedUndercastSpells(
  refData: RefData,
  knownIds: Iterable<string>,
): ImpliedUndercastSpell[] {
  const out = new Map<string, ImpliedUndercastSpell>();
  for (const knownId of knownIds) {
    const grant = undercastGrant(refData, knownId);
    if (!grant) continue;
    const grantedByName = refData.spells[knownId]?.name ?? knownId;
    for (const sp of grant.spells) {
      if (out.has(sp.id)) continue;
      out.set(sp.id, { ...sp, grantedById: knownId, grantedByName });
    }
  }
  return [...out.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}
