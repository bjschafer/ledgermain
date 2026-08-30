/**
 * PC natural attacks granted by feats — see `types.ts`'s header for the
 * table family's charter and `index.ts` for the resolver. Keyed by
 * `featNameSlug`, the same slug-keying convention `FEAT_SLA_GRANTS`/
 * `FEAT_POOL_EFFECTS` use, so a duplicate copy of a feat still grants once.
 *
 * The razortusk/tail-terror entries below override `kind` explicitly rather
 * than trust the name-based classifier (`classifyNaturalAttacks`): each
 * grants a bite/tail that would otherwise be the character's ONLY natural
 * attack, and the classifier's "creature's sole natural attack is always
 * primary, ×1.5 Str" rule (Universal Monster Rules) would misfire — both
 * feats' own text is explicit that the granted attack is secondary
 * regardless.
 */

import type { PcNaturalAttackDef } from "./types.js";

export const FEAT_NATURAL_ATTACKS: Readonly<Record<string, readonly PcNaturalAttackDef[]>> = {
  // aonprd.com Razortusk: "If used as part of a full attack action, the bite
  // is considered a secondary attack and is made at your full base attack
  // bonus -5, and adds half your Strength modifier to damage."
  razortusk: [
    {
      slug: "razortusk",
      attacks: [{ name: "Bite", mediumDice: "1d4", kind: "secondary" }],
    },
  ],
  // aonprd.com Tail Terror: "You can make a tail slap attack with your tail.
  // This is a secondary natural attack that deals 1d4 points of bludgeoning
  // damage."
  "tail-terror": [
    {
      slug: "tail-terror",
      attacks: [{ name: "Tail Slap", mediumDice: "1d4", kind: "secondary" }],
    },
  ],
  // PF1 APG p. 151, Claws of the Beast manifestation: "You grow a pair of
  // claws. These claws are primary attacks that deal 1d4 points of damage
  // (1d3 if you are Small)." "Claw" already classifies primary by name
  // (`classifyNaturalAttacks`), so no `kind` override is needed here; the
  // 1d4-at-Medium/1d3-at-Small scaling is the resolver's ordinary
  // size-scaling, not anything special-cased. Gated on the player's stored
  // manifestation pick — see `requiredChoiceId`'s doc comment in `types.ts`
  // and `feat-effects.ts`'s `aspect-of-the-beast` entry for the other three
  // (unwired) manifestations.
  "aspect-of-the-beast": [
    {
      slug: "aspect-of-the-beast-claws",
      requiredChoiceId: "claws-of-the-beast",
      attacks: [{ name: "Claw", count: 2, mediumDice: "1d4" }],
    },
  ],
};
