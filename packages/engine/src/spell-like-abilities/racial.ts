/**
 * Spell-like abilities granted by races and racial traits. Two tables:
 *
 * - `RACE_SLA_GRANTS`, keyed by `Race.name` — SLAs the race's own
 *   description grants (the vendored `races.json` records these only in the
 *   description HTML, never as changes/uses/actions, so every entry here is
 *   authored from the published racial-trait text and checked against that
 *   description). Subject to standard-trait suppression via
 *   `standardTraitName` — see `types.ts`.
 * - `RACIAL_TRAIT_SLA_GRANTS`, keyed by a racial-trait id — either a
 *   vendored `RefData.racialTraits` id or a hand-authored
 *   `RACIAL_TRAITS` id (`racial-traits.ts`; the two stores' ids never
 *   collide). The heritage "Spell-Like Ability (…)" traits carry a vendored
 *   `uses` block that already derives a pool row, so their defs attach to it
 *   (`attachToSourcePool`) rather than minting a second counter.
 */

import type { RaceSlaGrantDef, SlaGrantDef } from "./types.js";

export const RACE_SLA_GRANTS: Readonly<Record<string, readonly RaceSlaGrantDef[]>> = {
  // CRB p.23, Gnome Magic: "Gnomes with Charisma scores of 11 or higher also
  // gain the following spell-like abilities: 1/day — dancing lights, ghost
  // sound, prestidigitation, and speak with animals. The caster level for
  // these effects is equal to the gnome's level." (The +1 illusion save DC
  // half of Gnome Magic is a separate spellDC concern, not modeled here.)
  Gnome: [
    {
      slug: "dancing-lights",
      spell: "Dancing Lights",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Gnome Magic",
    },
    {
      slug: "ghost-sound",
      spell: "Ghost Sound",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Gnome Magic",
    },
    {
      slug: "prestidigitation",
      spell: "Prestidigitation",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Gnome Magic",
    },
    {
      slug: "speak-with-animals",
      spell: "Speak with Animals",
      uses: { formula: "1", per: "day" },
      minAbility: { ability: "cha", score: 11 },
      standardTraitName: "Gnome Magic",
    },
  ],
  // ARG p.168 / Bestiary tiefling: "Tieflings can use darkness once per day
  // as a spell-like ability. The caster level for this ability equals the
  // tiefling's class level." (Matches the vendored race description.)
  Tiefling: [
    {
      slug: "darkness",
      spell: "Darkness",
      uses: { formula: "1", per: "day" },
      standardTraitName: "Spell-Like Ability",
    },
  ],
};

export const RACIAL_TRAIT_SLA_GRANTS: Readonly<Record<string, readonly SlaGrantDef[]>> = {
  // The ten Blood of Fiends tiefling heritage variants — each vendored entry
  // reads "<Heritage> can use <Spell> once per day as a spell-like ability
  // (with a caster level equal to their character level)" and carries a
  // 1/day uses block, so each def attaches to that pool. Spell names below
  // are verbatim from the vendored descriptions.
  // Beastbrood: Detect Thoughts.
  ETapFH3D6SF1WwVn: [
    { slug: "detect-thoughts", spell: "Detect Thoughts", attachToSourcePool: true },
  ],
  // Faultspawn: Hideous Laughter.
  v6eFa2pTphzZzFDP: [
    { slug: "hideous-laughter", spell: "Hideous Laughter", attachToSourcePool: true },
  ],
  // Foulspawn: Bear's Endurance.
  fLfQPOGCnNhp6Q5A: [
    { slug: "bears-endurance", spell: "Bear's Endurance", attachToSourcePool: true },
  ],
  // Grimspawn: Death Knell.
  dagWgGQYv20usVZW: [{ slug: "death-knell", spell: "Death Knell", attachToSourcePool: true }],
  // Hellspawn: Pyrotechnics.
  OayRgLPHanjzhdK0: [{ slug: "pyrotechnics", spell: "Pyrotechnics", attachToSourcePool: true }],
  // Hungerseed: Alter Self.
  gDO7etqF3QCXKyWZ: [{ slug: "alter-self", spell: "Alter Self", attachToSourcePool: true }],
  // The Motherless: Blur.
  n98kLjKTeMEM5rdx: [{ slug: "blur", spell: "Blur", attachToSourcePool: true }],
  // Pitborn: Shatter.
  TNbX1iRPplCIvhdO: [{ slug: "shatter", spell: "Shatter", attachToSourcePool: true }],
  // Shackleborn: Web.
  "93KXq6n1wiX0ifEy": [{ slug: "web", spell: "Web", attachToSourcePool: true }],
  // Spitespawn: Misdirection.
  eNSivYdOXqQpPe52: [{ slug: "misdirection", spell: "Misdirection", attachToSourcePool: true }],
  // Dhampir Ancient-Born (Blood of the Night): "Ancient-Born gain Doom as a
  // spell-like ability" — vendored uses block meters it at 3/day.
  "09c76EsW9zGXAEZ0": [{ slug: "doom", spell: "Doom", attachToSourcePool: true }],
};
