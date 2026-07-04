# NOTICE

This repository ships under a **mixed license**. The thing distributed decides
which license applies, not the file location.

## 1. Source code -- MIT

All `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.json` configuration files, build
scripts, and the React application source are licensed under the **MIT
License** -- see [`LICENSE`](./LICENSE). Copyright (c) 2026 Braxton Schafer.

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
reimplementation** written from the published Pathfinder 1e rules text. It is
not derived from, transcribed, or ported from any third-party GPL source.

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

Because no GPL-3.0 code is incorporated into this repository, the GPL's
copyleft obligations do not attach. Algorithms and rules themselves are not
copyrightable; only their specific expression is.

## 2. Vendored reference data -- Open Game License v1.0a

The normalized JSON under `packages/data-pipeline/data/*.json` (and the copies
mirrored into `apps/web/public/data/` and the production `dist/` bundle) is
**Open Game Content** licensed under the **Open Game License v1.0a** -- see
[`OGL.txt`](./OGL.txt). That license, not MIT, governs those files.

This is derivative Open Game Content drawn from two pinned, upstream sources:

### a. Foundry VTT Pathfinder 1e system

- Repo: `https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1`
- Pinned commit: `10b87c070c86d4782e7bcc35ed8c49c7e7e3cec4` (system v11.11)
- The upstream ships an `OGL.txt` whose Section 15 covers Wizards of the Coast
  (System Reference Document) and Foundry Gaming LLC. The compendium packs
  (`packs/**/*.yaml`) are themselves derivative OGC from Paizo's PRD/Open
  Game Content.

### b. pf1e-archetypes dataset

- Repo: `https://github.com/bjschafer/pf1e-archetypes`
- Pinned commit: `815ef073685faf215be442cc5035c8198a89432b` (a fork of
  `baileymh/pf1e-archetypes` with upstream merge-conflict corruption fixed
  -- see `IMPLEMENTATION_PLAN.md` Stage 11)
- The upstream ships an extended `OGL.txt` Section 15 citing the relevant
  Paizo books (CRB, APG, ACG, ARG, BotD, UC, UM, UE, Horror Adventures,
  Occult Adventures, etc.). We carry forward that extended Section 15
  verbatim and add our own derivative-work entry per OGL Sec.6.

Our `OGL.txt` is therefore the upstream Archetypes `OGL.txt` with the
following appended to its COPYRIGHT NOTICE:

> Ledgermain normalized Pathfinder 1e reference data (vendored under
> `packages/data-pipeline/data/`) Copyright 2026, Braxton Schafer. Derivative
> compilation of Open Game Content from the sources above, distributed
> under this License.

Per OGL Sec.8 ("Identification"), the Open Game Content distributed by this
project is **all game-mechanical data** in the vendored JSON: feat names,
spell names, item names, class abilities, descriptions, prerequisites (as
prose), numeric statistics, and any other content that is Open Game Content
under the upstream licenses. Field names, JSON shape, and code that processes
the data are **not** Open Game Content and remain under MIT (Sec.1).

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
