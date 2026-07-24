# Rules-correctness audit: core class features (part 5)

Audited 2026-07-24 — Opus subagent extracted implemented claims (bloodrage.ts,
raging-song.ts, deeds.ts, judgments.ts, ranger.ts, resources.ts, vendored
class-features.json/buffs.json pool formulas + tests); Fable main loop verified
each against RAW (unchained rage text verified by fetch). Siblings: parts 1–4.
**Both findings resolved 2026-07-24** (commit 8d57fe2). Finding 1 was already
fixed before the audit: `buff-effects.ts` `BUFF_CHANGE_PATCHES["Rage
(Unchained)"]` (committed 2026-07-08) patches the temp HP engine-side with the
exact 2/3/4-per-HD tiers — the audit only inspected buffs.json and missed it.
Now pinned by tests (barbarian-unchained.test.ts: L6→12, L13→39, L20→80); do
NOT add a duplicate data-pipeline supplement (would render a spurious
struck-through component). Finding 2 fixed via supplements override to
`@class.unlevel`; the sweep found Stunning Fist as the only other HD-keyed
uses formula and it is RAW-correct as-is (monk level + non-monk HD/4).

## Findings

### 1. Unchained rage buff grants no temporary hit points

- Vendored "Rage (Unchained)" buff (`buffs.json` id `ciAO4KwMonUzAGY0`)
  carries only ac −2 / mattack / mwdamage / twdamage / will changes.
- RAW (Pathfinder Unchained): raging grants **temporary hit points equal to
  2 per Hit Die** (3/HD at 11th greater rage, 4/HD at 20th mighty rage),
  "lost first" and not replenished if she re-enters rage within 1 minute.
  This is unchained's REPLACEMENT for chained rage's +4 Con (which the
  chained buff models correctly via the Con morale change) — omitting it
  means a raging unchained barbarian's HP doesn't change at all. L13: missing
  26 temp HP.
- The engine already has granted-temp-HP infrastructure
  (`computeGrantedTempHp`, compute.ts:176) — fix shape: supplement the buff
  with a tempHP-granting change `2 × HD` scaling 3/4 at 11/20 (formula
  `(2 + floor((@classes.barbarianUnchained.level - 2) / 9)) *
@attributes.hd.total`-ish), plus the 1-minute non-replenish caveat as a
  context note.
- The pinning test `barbarian-unchained.test.ts:161-164` checks Str/Con
  unchanged (correct) but never asserts HP behavior, so the omission is
  invisible to the suite.

### 2. Smite Evil uses/day keyed to character HD, not paladin level (multiclass)

- Vendored Smite Evil `uses.maxFormula` = `floor((@attributes.hd.total - 1)/3)
  - 1`— RAW schedule (1/day, +1 at 4th/7th/…/19th) but keyed to TOTAL character
HD. Single-class paladins are exact; a paladin 4 / fighter 3 gets 3/day
instead of 2. Upstream Foundry data quirk. Fix: supplements override to`@class.unlevel`. (Same audit-pass should grep other `uses.maxFormula`s for
`@attributes.hd.total` where RAW says class level.)

## Verified corrections to my own initial suspicions (do NOT "fix" these)

- **Unchained rage bonuses being `untyped` is RAW-correct** — the unchained
  text deliberately drops chained rage's "morale" typing (this is why
  unchained rage works while fatigued-adjacent effects/morale-immunity apply
  differently). Do not retype to morale.
- **No thrown-weapon ATTACK bonus is RAW-correct** — unchained rage covers
  melee attack, melee damage, thrown DAMAGE, Will; thrown attack rolls are
  genuinely absent from the published text. The vendored change list matches
  exactly.

## Checked and found CORRECT (don't re-audit)

- Chained rage: rounds/day 4+Con+2(L−1); buff +4 Str/+4 Con/+2 Will morale,
  −2 AC untyped, greater/mighty tiers via floor((L−2)/9) at 11/20 — exact.
- Rage powers: Raging Climber/Swimmer = +level enhancement Climb/Swim, Swift
  Foot +5 ft enhancement, gated on BOTH chained+unchained rage buff ids;
  skald's Inspired Rage correctly does NOT unlock rage powers (matches the
  RAW "rage powers require actual rage" reading… skald master's caveat is a
  known table-variation; engine posture is defensible), enhancement-type
  stacking pinned.
- Bloodrage: same numbers as chained rage keyed to bloodrager level ✔.
- Skald raging song: 3+Cha+2(L−1) rounds; Inspired Rage +2/+2 Str/Con morale
  (+2 per 8 levels, cap +6), Will 1+floor(L/4), AC −1 — all exact.
- Bardic performance: 4+Cha+2(L−1) rounds; Inspire Courage +1 competence
  attack/weapon damage stepping +1 at 5/11/17 via 1+floor((L+1)/6) ✔ (the
  save-vs-charm/fear morale half is a display gap, not wrong).
- Grit = max(1, Wis), Panache = max(1, Cha); both deed lists complete and
  level-gated exactly per RAW (19 each; True Grit at 20); Precise Strike =
  +level damage, ×2 spend; deeds auto-granted by level (correct — deeds
  aren't picks).
- Judgments: 1+floor((L−1)/3)/day; Destruction 1+L/3 damage; Justice/
  Protection/Purity/Resiliency 1+L/5 (attack/AC/saves/DR-magic), sacred typing
  with evil-profane noted; Resistance 2+2·L/3 energy (14 cap) note-only;
  Smiting note-only; simultaneous 1/2/3 at 1/8/16 ✔.
- Ranger: favored enemies 1+L/5 (1,5,10,15,20), terrains 1+(L−3)/5 from 3rd
  (3,8,13,18), distributable budget 4·slots−2 (+2-increment model — clever
  and exact), 11 terrains, 31 enemy types, 9 combat styles as feat-tree
  prereq-waivers ✔.
- Smite evil numbers: +Cha attack (min 0), +level damage, +Cha deflection AC
  (min 0); ×2-vs-outsiders/dragons/undead as documented display gap ✔.
- Lay on hands: floor(L/2)+Cha uses, floor(L/2)d6 (1d6 at L2-3 ✔); paladin
  channel merges into LoH pool (2-use cost is player-managed, noted).
- Channel energy: 3+Cha/day ✔ (dice/DC verified part 1); optional cleric-Wis
  house rule clearly gated OFF by default ✔.
- Pools: chained ki ½L+Wis; cavalier challenge 1+(L−1)/3; bane = L rounds;
  arcane pool max(1,½L)+Int; mental focus L+Int; inspiration max(1,½L+Int)
  with free-d6 gating on ranks in Knowledge/Linguistics/Spellcraft ✔; arcane
  reservoir daily refill 3+½L below a 3+L cap ✔ (subtle rule, done right);
  Combat Reflexes 1+Dex AoOs; feat pool bonuses (Extra Rage etc.) per RAW.
- Bomb: 1+floor((L−1)/2) d6 +Int, DC 10+½L+Int ✔. Sneak attack floor((L+1)/2)
  d6 ✔.

## Gaps (absent, not wrong)

Rage/bloodrage fatigue aftermath untracked (chained: fatigued 2×rounds spent;
unchained: fatigued 1 min — no "fatigued" auto-apply on buff drop); inspire
courage save-bonus half display-only; judgment 10th-level upgrades (Justice
crit-double, Purity condition-double, Resiliency alignment DR, Smiting
adamantine/alignment) unmodeled; favored enemy/terrain +2s never fold into
sheet numbers (by design, SavedRoll surface); hero points absent from vendored
slice (not modeled anywhere).
