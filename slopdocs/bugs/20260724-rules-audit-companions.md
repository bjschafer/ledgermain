# Rules-correctness audit: companions (part 7 — final domain)

Audited 2026-07-24 inline (companion.ts, eidolon.ts, eidolon-unchained.ts,
familiar.ts, phantom.ts pattern-level). Unchained eidolon pool verified vs
legacy PRD fetch. Siblings: parts 1–6. **No implemented-but-wrong findings.**

## IMPORTANT near-miss — do NOT "fix" this
The unchained eidolon's evolution pool LOOKS like a bug next to the chained
table (3,4,5,7,…,26) but `EIDOLON_UNCHAINED_POOL` = 1,2,3,3,4,5,6,6,7,8,9,9,
10,11,12,12,13,14,15,15 is EXACTLY the published Unchained table (the pool
column equals the HD column; free subtype grants are the compensation). Both
this audit and the code's own comment verified it against the PRD. An agent
diffing the two tables will be tempted to "correct" the unchained pool upward
— that would be wrong.

## Verified-correct (don't re-audit)
- Animal companion: all 20 rows of Table: Animal Companion Base Statistics
  exact (HD/NA/Str-Dex/tricks/feats/specials incl. Evasion@3, Devotion@6,
  Multiattack@9, Improved Evasion@15); ASI slots at 4/9/14/20; BAB = 3/4 HD,
  good Fort/Ref; HP = average-per-HD with 1 hp/HD floor; effective-druid-level
  sources: druid 1:1, ranger −3 (nothing before 4th), hunter 1:1, cavalier/
  samurai mount 1:1, multi-source stacking per the hunter's own RAW text.
- Eidolon (chained): all 20 rows exact (HD 1..15 pattern, armor 0..16,
  Str/Dex 0..8, pool 3..26, max attacks 3..7); BAB = HD (full); good saves by
  base form — biped 2×claw 1d4 Fort/Will, quadruped bite 1d6 Fort/Ref,
  serpentine bite+tail slap Ref/Will (tail slap correctly resolves secondary);
  skills 4×HD; no automatic ASI (every increase is a pool spend) — correct
  chained behavior; natural-armor-vs-armor split simplification documented.
- Eidolon (unchained): chained chassis + own pool column (above) + ASI at
  5/10/15 + 12 subtypes with milestone grants at 1/4/8/12/16/20.
- Familiar: half master HP, master's BAB, better-of saves, NA adj =
  ceil(ML/2), Int = 5 + ceil(ML/2), ability schedule Alertness/Imp.Evasion/
  Share Spells/Empathic Link @1, Deliver Touch @3, Speak with Master @5,
  Speak with Animals of its Kind @7, SR = ML+5 @11, Scry @13 — all exact.
- Phantom: pattern-level check only (same authored-from-table structure,
  emotional-focus-keyed good saves, 2 slams — safely primary-type). Row-by-row
  verification not done; lowest-risk remaining surface.

## Interaction note
The natural-attack classification bug (part 4 finding 2: single-KIND
multi-count → wrongly primary) does not bite the shipped base forms (claws/
bite/slam are primary types anyway) but would bite a hoofed/winged custom or
polymorph form. Fix lives in natural-attacks.ts, not here.
