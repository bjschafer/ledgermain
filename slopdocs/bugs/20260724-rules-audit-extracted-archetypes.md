# Rules-correctness audit: extracted archetype effects + model-layer misc (part 9)

Audited 2026-07-24 (second wave). Opus subagent transcribed all 137 numeric
entries of `archetype-extracted/*`; Fable verified spot-set against RAW
(including web checks on the two structurally-oddest entries). Plus inline:
gear stats, rest/consumables/classPrereqs, phantom rows, UI copy sweep.
**No new implemented-but-wrong findings in any of these surfaces.**

## Extracted archetype effects — clean, with residual-risk notes
- 137 entries, all numeric, 89 high / 48 medium confidence; zero collisions
  with the hand table (hand-wins precedence never fires on real data).
- Deep-verified against RAW and all exact: kensai iaijutsu (+Int init at 7th),
  tactician tactical awareness (+1 init @2 +1/4, max +5), savage barbarian
  naked courage (+1 dodge @3 +1/6, unarmored), brawler close combatant
  (+1 atk/+3 dmg close group, +1/4, caps 5/7), dragoon spear training
  (+1/+2 doubling damage steps), aquatic druid natural swimmer (half land
  speed → full at 9th), the seven paladin capstone DR 10/evil entries,
  faithful wanderer/tortured crusader 4+Int skill ranks.
- The two structurally-oddest entries are BOTH RAW-correct (verified via
  fetch): deepwater rager really adds CON to Intimidate (in addition to
  Cha — "as long as she is able to speak"), fearsome defender really adds
  CHA to initiative at 5th. Do not "fix" either.
- Known approximations are already test-documented (unarmed fighter's
  natural-weapon half, spear-fighter partial tiers, cryptic whisper's
  secret-message half, worldseeker's endure elements, ranger swashbuckler
  deeds, and the three deliberately-unbackfilled partial-tier swaps that
  keep the base grant applying — RAW-imperfect, documented, not
  double-counts).
- Residual risk: the ~48 medium-confidence entries were shape-checked, not
  individually source-checked. When touching one, verify against the printed
  archetype first (aonprd), same as the two above.

## Gear stats (weapons.json / armors.json) — clean
Every core/common armor row matches the CRB table (incl. tower shield
+4/maxDex 2/−10/50%, quickdraw and madu ACP −2 quirks, haramaki's unlimited
maxDex/0 ACP/0 ASF); eastern and splatbook armors match UC/UE on all
spot-checks. Weapons: every CRB simple/martial/exotic classic exact
(longsword 1d8/19-20, rapier 1d6/18-20, scythe 2d4/×4, falchion 2d4/18-20,
picks ×4, katana 1d8/18-20, estoc 2d4/18-20, firearms ×4 family, etc.).
Data quirks only: duplicate "Aldori Dueling Sword"/"Aldori dueling sword"
entries; slaver's/launching crossbows carry crit "×1" (Foundry's no-crit
marker — harmless but renders oddly if ever displayed as "×1").

## Model-layer misc — clean
- rest.ts: natural-mode 1 HP/level, ability damage −1/day per ability, drain
  and permanent neg levels untouched, temp neg levels surfaced as a
  Fort-save reminder instead of auto-cleared — all RAW-faithful; full-heal
  default is a labeled house mode.
- consumables.ts: potion 50/scroll 25/wand 750 × SL × min-CL, 0-level as ½ —
  CRB pricing exact.
- classPrereqs.ts: hybrid hard-block-on-structured-only policy implemented
  as documented; casting requirements checked kind-aware and
  advancement-aware; alignment deliberately prose-only.
- Phantom: all 20 progression rows verified against OA (HD/AC/ability
  columns, DR 5/10/15 magic → 15/— at 20, deliver-touch 30→50 ft,
  incorporeal flight @9, magic attacks @4).
- UI copy: sweep found essentially no free-floating rules claims in
  components beyond audited model strings; the one prose hit
  (OppositionPicker's one-element rule) is correct.
