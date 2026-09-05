/**
 * Skill-rank purchase feasibility (pure). `skillBudget` only checks the
 * lifetime total (spent vs. budget) and `doc.setSkillRank` only checks the
 * per-skill cap (ranks <= current total character level) — neither confirms
 * a legal LEVEL-BY-LEVEL purchase history actually exists. `CharacterDoc`
 * doesn't record which character level each rank was bought at, so this is
 * the sharpest check possible from the stored totals alone.
 *
 * The math: rank m of any skill can only be bought once the character has
 * reached level m (a skill's ranks after level i can never exceed i), so
 * rank m's "domain" is levels [m, L]. Level i grants capacity b_i. Because
 * every rank's domain is a suffix of [1, L], Hall's marriage theorem reduces
 * to one inequality per threshold j:
 *
 *   for every j in 1..L:
 *     sum over skills s of max(0, ranks[s] - (j - 1))  <=  sum of b_i for i in j..L
 *
 * (the left side counts every rank numbered >= j across every skill — the
 * ranks that MUST land at level j or later — and the right side is the
 * total capacity still available from level j onward).
 *
 * Two lenient assumptions, both because the doc has no order:
 *  - `doc.identity.classes` doesn't say which class levels came first, so
 *    the per-level class budgets are sorted ASCENDING before summing —
 *    that's the one assignment that maximizes every tail sum at once
 *    (each tail is the sum of its largest possible entries), so this
 *    flags a distribution only when it's infeasible under EVERY ordering.
 *  - Non-class budget (racial `bonusSkillRanks`, archetype bonuses,
 *    favored-class picks, `gmGrants`) can't be tied to a level at all, so
 *    all of it is credited to the LAST level — the level every tail sum
 *    includes, so it helps as much as leniency allows.
 *
 * The Background Skills variant's 2 ranks per level DO have a level, so they
 * join each level's capacity directly. Which half of the skill list a rank
 * belongs to is deliberately ignored here: this check is about purchase
 * ORDER, and the pool-vs-pool accounting is `skillBudget`'s job.
 *
 * The thresholds run past L, up to the highest stored rank total: rank m
 * of a skill with m > L has NO level that could host it (its domain
 * [m, L] is empty), so those thresholds fail against zero capacity. That
 * tail matters because, given the two leniencies, a shortfall can only
 * appear when some skill's stored rank total exceeds the CURRENT total
 * character level (within the cap, passing `skillBudget`'s lifetime total
 * provably implies a legal order exists). `setSkillRank` prevents over-cap
 * ranks going forward, but `setClassLevel`/`removeClass` lower a class's
 * level (or drop it) without trimming `build.skillRanks` — ranks bought
 * while the character was higher level legitimately outlive the level that
 * funded them. That's also why this is a warning, not a block: PF1
 * retraining (and just un-doing a level in the builder) can produce a rank
 * total no fresh purchase order could reproduce, without the build being
 * "wrong."
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

import { totalLevel } from "./doc.js";
import { BACKGROUND_RANKS_PER_LEVEL, skillBudget } from "./skills.js";

export interface SkillRankShortfall {
  /** The earliest threshold j (a character level, 1-indexed) that fails. */
  level: number;
  /** Ranks that must be bought at level `level` or later, given current totals. */
  required: number;
  /** Total budget available from level `level` onward, most leniently assigned. */
  available: number;
}

/**
 * @param intMod Feed {@link permanentIntMod} — same posture as `skillBudget`.
 * @returns The earliest violated threshold, or `null` when some legal
 *   purchase order exists (or the character has no levels yet).
 */
export function skillRankShortfall(
  doc: CharacterDoc,
  refData: RefData,
  intMod: number,
): SkillRankShortfall | null {
  const level = totalLevel(doc);
  if (level === 0) return null;

  const budget = skillBudget(doc, refData, intMod);
  const backgroundPerLevel = budget.background ? BACKGROUND_RANKS_PER_LEVEL : 0;

  // Per-character-level budgets: one entry per level actually taken, regardless
  // of which class it belongs to (order is unknown — see file doc).
  let classTotal = 0;
  const perLevel: number[] = [];
  for (const c of doc.identity.classes) {
    const def = Object.values(refData.classes).find((cl) => cl.tag === c.tag);
    const grant = Math.max(1, (def ? def.skillsPerLevel : 2) + intMod);
    classTotal += grant * c.level;
    for (let i = 0; i < c.level; i++) perLevel.push(grant + backgroundPerLevel);
  }
  perLevel.sort((a, b) => a - b);

  // Everything skillBudget adds beyond raw class grants (racial/archetype/
  // favored-class/gmGrants) — reusing skillBudget keeps this in sync with
  // that logic instead of re-deriving it. Credited entirely to the last
  // (already-largest) level.
  const addend = Math.max(0, budget.total - classTotal);
  const lastIndex = perLevel.length - 1;
  perLevel[lastIndex] = (perLevel[lastIndex] ?? 0) + addend;

  const ranks = Object.values(doc.build.skillRanks).map((r) => Math.max(0, r));

  // Suffix sums of `perLevel`, one per threshold. Thresholds past `level`
  // (possible only for a stale over-cap rank total) check against zero
  // remaining capacity — see the file doc comment.
  const maxJ = Math.max(level, ...ranks);
  let available = perLevel.reduce((s, b) => s + b, 0);
  for (let j = 1; j <= maxJ; j++) {
    const required = ranks.reduce((s, r) => s + Math.max(0, r - (j - 1)), 0);
    if (required > available) return { level: j, required, available };
    available -= perLevel[j - 1] ?? 0;
  }
  return null;
}
