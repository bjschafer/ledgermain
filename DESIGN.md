# Pathfinder 1e In-Play Tracker — Design

> Status: **draft for review**. Architecture decisions captured below; staged build plan lives in `IMPLEMENTATION_PLAN.md`.

## 1. What this is (and isn't)

A **web-based, in-play character sheet and tracker for Pathfinder 1e** — plus a **full character builder**. The product's center of gravity is _play at the table_, not character construction. Every existing tool (PCGen, HeroLab, Pathbuilder, Foundry's sheet) is a builder that displays a character; the live-session experience is an afterthought. The differentiator here is a tracker that **knows the rules well enough to recompute correct numbers as session state changes**.

### Scope (decided)

| Dimension        | v1                            | Designed-for-later                |
| ---------------- | ----------------------------- | --------------------------------- |
| Who it tracks    | Solo (one character)          | Party + GM session (real-time)    |
| Character source | **Full builder from scratch** | Import (Pathbuilder/Foundry JSON) |
| Connectivity     | Online-first                  | Full offline (PWA)                |
| Frontend         | React + Vite SPA              | (PWA shell added later)           |
| Host             | Cloudflare Pages + Workers    | + Durable Objects for party sync  |

## 2. The one architectural rule that hedges every "later"

> **The client is authoritative for all game logic. The server is dumb persistence.**

Derived stats are **never** computed server-side and **never** stored. The server stores and (later) syncs an opaque JSON document. This single rule makes all three deferred features cheap:

- **Solo → Party:** a party is N self-contained documents + a session room. The document already serializes; nothing to refactor.
- **Online → Offline:** the document and engine already live in the browser. Offline = add a service worker + IndexedDB cache + sync reconciliation. No core changes.
- **Builder + Tracker:** both edit the same document through the same engine. One brain, two UIs.

The corner to avoid: ever requiring a server round-trip to toggle a buff, apply damage, or compute a modifier.

### 2.1 Cross-device sync — Level 1 for v1 (DECIDED)

The payoff of the rule above: because the document is an opaque blob and the client owns all logic, syncing across a user's devices (build on desktop → play on laptop) is a _persistence + identity_ problem, not a rules problem.

**v1 = Level 1:** account-scoped cloud document. Each device pulls the latest on open and pushes on change. Single-user multi-device, so concurrency is handled by **optimistic concurrency**, not a merge engine: every save carries the `version` it was based on; the server rejects a stale write and the client prompts _"a newer version exists on another device — reload?"_ The document therefore carries `ownerId` / `version` / `updatedAt` (see §3.1).

Deliberately deferred, and _cheap because of this model_ — they reuse the **same Durable Object sync infra**, so cross-device and party are one investment, not two:

- **Level 2 — live mirror:** changes appear on the other device in near-real-time (DO + WebSocket).
- **Level 3 — conflict-free concurrent editing:** CRDT (Yjs/Automerge); only if simultaneous editing becomes a real need.

Identity stays boring: Discord OAuth, sessions in KV/D1. (GitHub OAuth and email magic-link were the alternatives considered; Discord fits the actual TTRPG-player audience better than a dev-tool login, and needs no email-sending infra. Cloudflare Access is org-oriented overkill — it assumes an IdP the project owner administers, the opposite of "a stranger can sign up.")

## 3. The backbone data model

Two objects, one engine.

### 3.1 Character Document (the single source of truth)

A serializable JSON object holding **build choices** and **live state**, but never derived values:

```ts
interface CharacterDoc {
  schemaVersion: number;
  id: string;
  ownerId: string; // sync: whose document this is (added in Stage 5)
  version: number; // sync: optimistic-concurrency counter, bumped on each save
  updatedAt: string; // sync: ISO timestamp of last change
  identity: { name; race; classes: { tag; level }[]; alignment; deity };
  abilities: { str; dex; con; int; wis; cha }; // base scores only
  build: {
    feats: FeatRef[];
    skillRanks: Record<SkillId, number>;
    classFeatureChoices: ChoiceRef[]; // archetypes, bonus feats, etc.
    spells: { known: SpellRef[]; prepared: PreparedSpell[] };
    gear: ItemInstance[];
  };
  live: {
    // session state, mutated at the table
    hp: { current; temp; nonlethal };
    conditions: ConditionId[];
    activeBuffs: ActiveBuff[]; // { sourceId, remainingRounds, changes }
    resources: Record<ResourceId, { used; max }>; // spell slots, ki, rounds/day, charges
  };
}
```

### 3.2 The rules engine (pure functions)

```ts
function compute(doc: CharacterDoc, refData: RefData): DerivedSheet;
```

Pure, framework-agnostic, exhaustively unit-tested. Takes a document + reference data, returns every displayed number (AC, attack lines, saves, skill totals, CMB/CMD, etc.). Toggle a condition → document changes → recompute. This package is the crown jewel and ships as a standalone module shared by builder and tracker.

## 4. Data: what we mine, and in what shape (VERIFIED against the repo)

Source: `gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1` (cloned, **system v11.11**, content `coreVersion 13.351`).

**The packs are source YAML, one entity per file** — _not_ compiled LevelDB. This eliminates the hardest part of the original Stage 1 (no binary extraction). They live in `packs/<type>/<name>.<foundryId>.yaml`, sometimes nested in folders.

### Verified entity volumes

| Pack                 | Count | Notes                                          |
| -------------------- | ----: | ---------------------------------------------- |
| `spells`             |  3037 | foldered by school                             |
| `class-abilities`    |  4710 | class features, referenced by classes via UUID |
| `items`              |  1124 | magic items, gear                              |
| `weapons-and-ammo`   |   508 |                                                |
| `feats`              |   390 |                                                |
| `races`              |    82 |                                                |
| `armors-and-shields` |    75 |                                                |
| `classes`            |    49 | base + archetypes + NPC/prestige               |
| `buffs`              |   207 | **pre-authored typed-modifier buffs**          |

Total ~48 MB YAML. → Normalize to our JSON schema, **ship as static assets in R2**, lazy-load by category, build a client search index (Orama).

### How key things are actually encoded

**Buffs already ARE the typed-modifier model** (`packs/buffs/fighting-defensively.*.yaml`):

```yaml
system:
  changes:
    osyl628w: { formula: "-4", target: attack, type: untyped }
    zmpj4gpd: { formula: "if(gte(@skills.acr.rank, 3), 1) + 2", target: ac, type: dodge }
  duration: { end: turnStart, units: round, value: "1" }
```

Each change is `{ formula, target, type }` where `type` is the stacking category (dodge/untyped/morale/enhancement/…). Durations are structured (`units: round`). **This is exactly the engine's data layer, pre-built.**

**Classes encode progressions as named tiers + feature links** (`packs/classes/barbarian.*.yaml`):

```yaml
system:
  bab: high                                  # high/med/low → fixed standard tables
  savingThrows: { fort: {value: high}, ref: {value: low}, will: {value: low} }
  hd: 12, skillsPerLevel: 4, classSkills: [acr, ...]
  links:
    supplements:                             # class features granted BY LEVEL via UUID
      - { level: 1, uuid: Compendium.pf1.class-abilities.Item.WSqWT9ZIshtC5vlV }
```

**Correction to an earlier assumption:** feature-by-level grants _are_ data (UUID links), not code. Only the BAB/save _numbers_ per tier are fixed lookup tables we hardcode (trivial — three BAB tiers, two save tiers).

**Spells are richly structured**, including per-class spell level (`packs/spells/evocation/fireball.*.yaml`):

```yaml
system:
  learnedAt: { class: { arcanist: 3, bloodrager: 3, magus: 3 }, bloodline: { Efreeti: 3 } }
  actions:
    {
      ...:
        {
          damage: { parts: [{ formula: "(min(10, @cl))d6", types: [fire] }] },
          save: { type: ref },
        },
    }
```

Per-class spell lists are derivable by inverting `learnedAt.class`.

**Feat prerequisites are FREE TEXT** (`packs/feats/cleave.*.yaml`):

```
<p>Prerequisites: Str 13, @UUID[Compendium.pf1.feats.Item.FUW5...]{Power Attack}, base attack bonus +1.</p>
```

There is no structured prereq field. Feat→feat dependencies are extractable from embedded `@UUID` refs, but ability/BAB/skill prereqs are prose. **→ Hybrid validation: parse what we can, soft-warn the rest. Do not promise perfect prereq enforcement in v1.**

## 5. The two genuinely hard components

1. **Bonus-stacking engine** — typed modifiers, "highest within type," dodge+untyped stack, penalties always stack. The data is pre-typed (§4); the algorithm is the work. Reference: their `module/utils/apply-changes.mjs` (808 lines).
2. **Formula DSL evaluator** — changes/spells use a Foundry roll-formula dialect with `@data.paths` and functions (`if`, `gte`, `min`, dice). The engine must evaluate these against a character data context. Reference: `module/utils/formulas.mjs` (422), `module/dice/roll.mjs` (145), `module/utils/roll-functions.mjs` (288).
3. _(builder)_ **Prerequisite validation graph** — hybrid structured/soft per §4.

Everything else (sheets, search, CRUD, level-up wizard UI) is conventional app work.

## 6. Licensing — DECIDED: clean-room, license-free (Option B/C)

> **Decision:** We reimplement the stacking + formula engine ourselves from the published PF1 rules. Their GPL-3.0 code (`apply-changes.mjs`, `formulas.mjs`, etc.) may be used **only as a behavioral test oracle — never copied or pasted**. This keeps our codebase free of GPL-3.0 obligations (license TBD by owner). Compendium _data_ remains usable under OGL/Paizo Community Use with attribution intact.
>
> **Clean-room discipline:** implement from the rules text and observed behavior; do not transcribe their source. When validating, compare _outputs_ (given input X, both produce Y), not code structure.

### Background (why this was the choice)

- **Game content (the compendium data): OGL / Paizo Community Use.** Usable. We keep attribution and OGL section 15 intact, and respect Paizo's Community Use Policy (no Product Identity, proper notices). This part is fine.
- **The system _code_ is GPL-3.0** (`LICENSE.txt`). Copyleft. If we **port or copy** their `apply-changes.mjs`/`formulas.mjs`, our entire app inherits GPL-3.0 obligations (must be open-sourced under GPL-3.0).

Three options:

| Option                                                                                                                                    | License outcome                                                                         | Effort |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| **A. Port their engine code**                                                                                                             | Whole app must be GPL-3.0                                                               | Lowest |
| **B. Clean-room reimplement** the engine from the published PF1 rules; use their code only as a _correctness oracle_ in tests, not copied | License-free (algorithms/rules aren't copyrightable; only their specific expression is) | Medium |
| **C. Reimplement + only use OGL data**                                                                                                    | License-free                                                                            | Medium |

**Recommendation: B/C.** The stacking and formula _algorithms_ are simple and rules-derived; reimplementing them keeps licensing freedom while still letting us validate against their behavior. **Open question for the owner: are you fine releasing under GPL-3.0 (then A is fastest), or do you want license freedom (then B/C)?**

## 7. Stack (decided)

- **Frontend:** React + Vite, structured to become a PWA later.
- **Rules engine:** standalone pure-TS package (`@app/engine`), no framework deps, heavy unit tests.
- **Reference data:** build-time pipeline (YAML → normalized JSON → R2), client-side Orama search index, lazy-loaded by category.
- **Local state:** IndexedDB (Dexie) for the character document, even in the online-first phase (sets up offline).
- **Server (v1):** thin Worker storing character-doc blobs (D1 or KV).
- **Server (later):** Durable Object per session for party/GM real-time sync.
- **Host:** Cloudflare Pages + Workers.

## 8. Repo shape (proposed monorepo)

```
/packages
  /engine        # pure rules engine + formula evaluator (the crown jewel)
  /data-pipeline # YAML -> normalized JSON -> R2; schema definitions
  /schema        # shared TS types: CharacterDoc, RefData, DerivedSheet
/apps
  /web           # React + Vite SPA (builder + tracker)
  /api           # Cloudflare Worker (persistence; later: DO sync)
```
