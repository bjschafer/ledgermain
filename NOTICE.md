# NOTICE

This repository ships under a **mixed license**. The thing distributed decides
which license applies, not the file location.

## 1. Source code -- GNU AGPL v3.0-or-later

All `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.json` configuration files, build
scripts, and the React application source are licensed under the **GNU Affero
General Public License, version 3 or (at your option) any later version**
(`AGPL-3.0-or-later`) -- see [`LICENSE`](./LICENSE). Copyright (c) 2026 Braxton
Schafer.

This covers, in particular:

| Path                                                                       | What                                                                    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/engine/**`                                                       | Pure rules engine: bonus-stacking, formula DSL, `compute()`             |
| `packages/schema/**`                                                       | TypeScript type definitions (`CharacterDoc`, `DerivedSheet`, `RefData`) |
| `packages/data-pipeline/src/**`                                            | The fetch / normalize / generate pipeline _scripts_                     |
| `apps/web/src/**`                                                          | React + Vite character builder & live tracker                           |
| root + per-package `package.json`, `tsconfig.json`, `vite.config.ts`, etc. | Build/config                                                            |

### Clean-room discipline

The Pathfinder 1e rules engine (`packages/engine`) is a **clean-room
reimplementation** written from the published Pathfinder 1e rules text, rather
than by transcribing or porting any third-party GPL source.

The Foundry VTT Pathfinder 1e system
(`https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1`) ships
under **GPL-3.0** for its _code_ (`module/**`, `packs/**` YAML loaders, etc.).
We **never** copy, transcribe, or port that GPL-3.0 code into this repository.
The system is fetched on demand by `packages/data-pipeline/src/cli/fetch.ts`
into `packages/data-pipeline/.cache/` -- that directory is `.gitignore`d and is
**never committed** -- and is used **only** as:

1. the source of the OGL compendium _data_ (see Sec.2), and
2. a _behavioral correctness oracle_ for the engine unit tests (we compare
   _outputs_ -- given input X, both produce Y -- never code structure).

We do not knowingly incorporate any GPL-3.0 code. Even so, this project is
deliberately licensed under the **AGPL-3.0-or-later** (Sec.1) rather than a
permissive license. Two reasons:

1. **Conservative compatibility with the upstream we validate against.** The
   AGPL-3.0 is fully compatible with Foundry's GPL-3.0 -- GPL-3.0 Sec.13
   expressly permits combining GPL-3.0 code with AGPL-3.0 code. Copyleft
   copies through to us either way, so our licensing is correct whether or not
   any protected expression is ever found to have carried over. We chose the
   license that is valid in both cases instead of the one that is valid only
   if the clean-room held perfectly.
2. **Network copyleft is the version that has teeth for a hosted web app.**
   Plain GPL's copyleft triggers on distribution, which a SaaS deployment
   never does; the AGPL's Sec.13 ensures that anyone who hosts a modified fork
   of this app must offer their users the modified source in turn.

Algorithms and rules themselves are not copyrightable; only their specific
expression is.

## 2. Vendored reference data -- Open Game License v1.0a

The normalized JSON under `packages/data-pipeline/data/*.json` (and the copies
mirrored into `apps/web/public/data/` and the production `dist/` bundle) is
**Open Game Content** licensed under the **Open Game License v1.0a** -- see
[`OGL.txt`](./OGL.txt). That license, not the AGPL, governs those files.

This is derivative Open Game Content drawn from four pinned, upstream sources:

### a. Foundry VTT Pathfinder 1e system

- Repo: `https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1`
- Pinned commit: `10b87c070c86d4782e7bcc35ed8c49c7e7e3cec4` (system v11.11)
- The upstream ships an `OGL.txt` whose Section 15 covers Wizards of the Coast
  (System Reference Document) and Foundry Gaming LLC. The compendium packs
  (`packs/**/*.yaml`) are themselves derivative OGC from Paizo's PRD/Open
  Game Content.

### b. pf1e-archetypes dataset

- Repo: `https://gitlab.com/Tryss_Farron/pf1e-archetypes`
- Pinned commit: `92ddcb60027e3088e5afd0645183c031ec3e9bb4`
- Formerly vendored from `bjschafer/pf1e-archetypes` on GitHub, a personal
  fork of the (by then abandoned) `baileymh/pf1e-archetypes` with upstream
  merge-conflict corruption fixed. This GitLab repo is that module's
  maintained successor -- same maintainer as the pinned `pf1-content` repo
  (Sec.2c), registered on foundryvtt.com as "Pathfinder 1e Archetypes and
  Abilities" -- and ships as per-entity YAML packs rather than the old fork's
  per-class CSVs, so the fork-history/corruption note above no longer
  applies. Content and attribution are otherwise a continuation of the same
  module: the upstream ships an extended `OGL.txt` Section 15 citing the
  relevant Paizo books (CRB, APG, ACG, ARG, BotD, UC, UM, UE, Horror
  Adventures, Occult Adventures, etc.), byte-identical (module content aside)
  to the fork's own -- we carry it forward verbatim and add our own
  derivative-work entry per OGL Sec.6, unchanged by the repoint. Beyond its
  `pf-archetypes`/`pf-arch-features` packs, we also vendor this module's
  `pf-prestige-classes`/`pf-prestige-features` packs (the non-hand-authored
  prestige-class catalog, `packages/data-pipeline/src/transform/prestigeClasses.ts`)
  -- same module, same pinned commit, no separate attribution needed.

### c. PF1 Content module (community feats + traits + racial traits packs)

- Repo: `https://gitlab.com/foundryvtt_pathfinder1e/pf1-content`
- Pinned commit: `c66bf333cafc451d817ead660473dd01d9846fb3`
- Same GitLab org as the pinned system repo (Sec.2a). Ships under GPL-3.0 for
  its module _code_ (never copied in, per Sec.1's clean-room discipline) and
  OGL-covered compendium _data_ under `src/pf-feats/`, `src/pf-traits/`, and
  `src/pf-racial-traits/`, from which we vendor: every feat not already
  present in the system pack (name collisions keep the system pack's richer
  record), the full character-trait catalog (the Foundry system pack ships no
  traits at all), and the alternate racial traits -- entries carrying a
  structured "Replaced Trait(s)" description header (the pack's standard-trait
  entries are skipped, since the system pack's own race docs already carry
  them).

### d. Pf Data 1e dataset (rage-power / hex / magus-arcana / rogue-family talent / arcanist-exploit / investigator-talent / kineticist-wild-talent / occult-class subsystem catalogs)

- Repo: `https://github.com/jasontankapps/pathfinder-data-1-e`
- Pinned commit: `33f1b75b8f62b43c59b96eab6bebb45e37c29229`
- Single-maintainer repo (Jason Tamez); pinned to an exact commit like the
  other three sources, never a branch. A flat-JSON dictionary dataset (one
  file per subsystem under `json/`); we vendor:
  - `json/class_ability_rage_powers.json` (the full published rage-power
    catalog, issue #74 Phase 3a) into `RefData.ragePowers`;
  - `json/class_ability_hexes.json` (the full published witch-hex catalog,
    issue #74 Phase 3b) into `RefData.hexes`,
    `json/class_ability_shaman_hexes.json` (the Advanced Class Guide's
    spirit-agnostic general shaman-hex table, issue #74 Phase 3b) into
    `RefData.shamanHexes`, and `json/class_ability_magus_arcana.json` (the
    full published magus-arcana catalog, issue #74 Phase 3b) into
    `RefData.magusArcana`;
  - `json/class_ability_rogue_talents.json` into `RefData.rogueTalents`,
    `json/class_ability_ninja_tricks.json` into `RefData.ninjaTricks`,
    `json/class_ability_slayer_talents.json` into `RefData.slayerTalents`,
    and `json/class_ability_vigilante_talents.json` +
    `json/class_ability_social_talents.json` into `RefData.vigilanteTalents`/
    `RefData.vigilanteSocialTalents` (the full published rogue-family talent
    catalogs, issue #74 Phase 3b);
  - `json/class_ability_exploits.json`, `json/class_ability_investigator_talents.json`,
    and `json/class_ability_kinetic_talents.json` (issue #74 Phase 3b) into
    `RefData.arcanistExploits`/`investigatorTalents`/`kineticWildTalents`;
  - `json/class_ability_tricks.json` into `RefData.mesmeristTricks`,
    `json/class_ability_stares.json` into `RefData.mesmeristBoldStares`,
    `json/class_ability_phrenic_amplifications.json` into
    `RefData.phrenicAmplifications`, `json/class_ability_disciplines.json`
    into `RefData.psychicDisciplines`, `json/class_ability_implements.json`
    into `RefData.occultistImplements`, and `json/class_ability_spirits.json`
    (the Medium's legendary-spirit catalog — distinct from the sibling
    `json/class_ability_shaman_spirits.json`, not vendored under this
    collection) into `RefData.mediumSpirits` (issue #74 Phase 3c) —

  see each type's doc comment (`@pf1/schema`). Code is GPL-3.0-or-later
  (never copied in, same clean-room posture as Sec.2a/2c); its
  `OPENGAMECONTENT.md` carries an OGL 1.0a Section 15 (with its own Paizo
  Community Use notice, folded into Sec.3 below) that we carry forward into
  our `OGL.txt` in full rather than hand-trimming to only the sourcebooks our
  vendored slices actually cite — the source dataset spans far more
  subsystems than what's vendored so far, but carrying its complete
  attribution list is the simpler and strictly safer call (over-inclusive
  credit has no downside; under-inclusive credit is a real one), and it
  directly sets up any remaining subsystem imports this same pinned source
  may eventually supply, at which point their citations are already present.

Our `OGL.txt` is therefore the upstream Archetypes `OGL.txt`, with Pf Data
1e's full Section 15 copyright-notice list appended (deduplicated against
lines already present) and the following appended last, to its COPYRIGHT
NOTICE:

> Ledgermain normalized Pathfinder 1e reference data (vendored under
> `packages/data-pipeline/data/`) Copyright 2026, Braxton Schafer. Derivative
> compilation of Open Game Content from the sources above, distributed
> under this License.

Per OGL Sec.8 ("Identification"), the Open Game Content distributed by this
project is **all game-mechanical data** in the vendored JSON: feat names,
spell names, item names, class abilities, descriptions, prerequisites (as
prose), numeric statistics, and any other content that is Open Game Content
under the upstream licenses. Field names, JSON shape, and code that processes
the data are **not** Open Game Content and remain under the AGPL (Sec.1).

## 3. Product Identity & Paizo Community Use

Some entries in the vendored data reference Paizo **Product Identity** within
the meaning of OGL Sec.1(e) and Sec.7 -- for example: deity names (Asmodeus, Cayden
Cailean, Desna, Gozreh, Irori, Pharasma, Sarenrae, Torag, Urgathoa, Zon-Kuthon,
...), Golarion ethnonyms and place names referenced by certain archetypes
(_Shoanti_, _Varisian_, Korvosa, ...), and AP/character references in archetype
descriptions. Product Identity is **not** Open Game Content and is not
licensed by the OGL itself.

We rely on **Paizo Inc.'s Community Use Policy**
(`https://paizo.com/community/communityuse`) -- which expressly permits the
use of Paizo's trademarks and copyrighted Product Identity in fan
(non-commercial, properly-attributed) works -- as the "independent Agreement
with the owner of each element of Product Identity" that OGL Sec.7 requires.
We do not challenge Paizo's ownership of any Product Identity; all rights,
title, and interest in and to Paizo's Product Identity remain with Paizo.

> **Paizo Community Use Notice:** This product uses trademarks and/or
> copyrights owned by Paizo Inc., which are used under Paizo's Community
> Use Policy. We are expressly prohibited from charging you to use or
> access this product. You are responsible for complying with the
> Community Use Policy and any portion of it that might apply to you.
> Paizo, the Paizo logo, the Pathfinder logo, and the Pathfinder
> Roleplaying Game logo are trademarks of Paizo Inc.

If your redistribution introduces new OGL content, or removes Product
Identity references you'd rather not surface, you must keep `OGL.txt` Section
15 current (OGL Sec.6) and continue to comply with both the OGL and Paizo's
Community Use Policy.

## 4. Application runtime notice

The deployed web app at `apps/web` ships a copy of `OGL.txt` and a short
NOTICE at `/OGL.txt` and `/NOTICE.txt` (copied by
`apps/web/scripts/copy-refdata.ts`), and surfaces both via an "About &
Legal" panel inside Settings. Nothing in the app's UI -- declarative text,
character exports, derived numbers -- is itself Product Identity.

## 5. Not affiliated

This project is **not affiliated with, endorsed by, or sponsored by Paizo
Inc., Foundry Gaming LLC, or Wizards of the Coast**. "Pathfinder" is a
trademark of Paizo Inc. "Foundry Virtual Tabletop" is a trademark of
Foundry Gaming LLC. All other trademarks are the property of their
respective owners.
