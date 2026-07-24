# Rules-correctness audit: occult/hybrid class subsystems (part 6)

Audited 2026-07-24 — Opus subagent extracted implemented claims (kineticist
wild talents/elements/build model, medium spirits, occultist implements,
mesmerist tricks/stares, arcanist exploits, psychic disciplines, phrenic
amplifications + catalog tests); Fable main loop verified against RAW with
targeted fetches (enveloping winds, medium spirit bonus schedule, occultist
resonant powers). Siblings: parts 1–5. **No implemented-but-wrong findings in
this domain** — the cleanest large domain audited.

## Verified-correct highlights (don't re-audit)
- Kineticist: burn pool 3+Con, per-round limit 1 + 1 per 3 levels from 6th
  (1/2/3/4/5/6 at 1/6/9/12/15/18), nonlethal = character level per burn,
  rest clears (part-audited earlier, folded here); wild-talent level gate
  `kineticist level ≥ 2× talent level` (L1 talents always); infusion picks at
  1/3/5/9/11/13/17/19, utility picks at every even level, Expanded Element at
  7/15; composite blasts auto-granted (never budgeted picks), burn 2, blue
  flame requires fire twice (primary + expanded re-pick) — all RAW-exact.
  Enveloping Winds defense summary verified verbatim vs aonprd (20%, +5% per
  5 levels beyond 2nd, +5%/burn) — sampling proxy for the 5 defense
  paraphrases. All 76 hand-authored wild talents display-only (no sheet
  numbers to mis-apply); catalog merge validated against 278 vendored
  entries.
- Medium: spirit bonus 1+floor(L/4) (+2@4 … +6@20) verified vs class table;
  power tiers lesser/intermediate/greater/supreme at 1/6/11/17; per-spirit
  bonus targets match RAW scope (with documented unmodeled halves: bare
  ability checks, concentration); the only two numeric seance boons
  (champion +2 damage, guardian +1 CMD) applied, others prose; influence
  penalties prose-only by design; taboos untracked by design.
- Occultist: implements 2@1 +1@2/6/10/14/18; focus powers 1@1 + every odd
  3–19; mental focus L+Int; ALL FOUR sheet-applied resonant formulas verified
  verbatim vs the PRD: Warding Talisman +1 resist per 2 focus cap 1+L/4;
  Third Eye +1 insight Perception per 2 cap L; Glorious Presence +1
  competence Cha-skills per 2 cap 1+L/4 (ability-check half documented
  unmodeled); Physical Enhancement +2 enhancement per 3 focus cap 2+2·(L/6).
  Non-applied ones (Casting Focus, Intense Focus, Distortion, Necromantic
  Focus) match RAW shape as display prose.
- Mesmerist: trick picks 1st + every 2 levels (10 by 19th), masterful gate
  12th within same budget; bold stares at 3/7/11/15/19 as riders on the
  hypnotic stare penalty; all display-only.
- Arcanist exploits: 24 base exploits display-only with RAW-matching prose
  numbers (blasts 1d6+Cha +1d6/2 levels max 10d6; force strike 1d4+1/level;
  arcane barrier temp HP L+Cha; SR exploit 6+L; arcane weapon +1@5 +1/4
  levels max +4); greater exploits vendored-only overlay.
- Psychic disciplines: phrenic pool ability mapping (6 Wis / 6 Cha) drives
  the resources.ts Cha→Wis alias over the vendored Cha-hardcoded formula —
  sound design; bonus spells at 1/4/6/…/18 (verified part 2); powers at
  1/5/13; 108 bonus-spell ids all resolve.
- Phrenic amplifications: picks at 1/3/7/11/15/19, major gate 11th; all 31
  matched 1:1 against vendored catalog; pool costs prose-only.

## Notes / minor
- Vendored burn values for Spark of Life and Celerity read 0 vs hand-table 1;
  hand table is authoritative by design — if ever revisited, check the
  printed OA text rather than the vendored parse.
- Kineticist elemental overflow (attack/damage scaling with accepted burn)
  and gather power (burn-cost reduction) are wholly unmodeled — known gaps,
  significant for real kineticist play; worth an issue if kineticists see
  table use.
- Element bonus class skills not wired into classSkillSet (documented gap
  shared with cavalier orders/oracle mysteries).
