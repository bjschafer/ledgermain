/**
 * `@pf1/engine` — the pure, framework-agnostic PF1 rules engine.
 *
 *  - {@link compute}: CharacterDoc + RefData → DerivedSheet (static sheet).
 *  - Formula DSL evaluator: {@link evaluateFormula}, {@link parseFormula}.
 *  - Typed bonus-stacking resolver: {@link resolveStack}.
 */

export { compute } from "./compute.js";
export { collectModifiers, forTarget, type CollectedModifier } from "./collect.js";
export {
  resolveStack,
  type TypedModifier,
  type ResolvedModifier,
  type StackResult,
} from "./stacking.js";
export {
  parseFormula,
  evaluateFormula,
  evaluateNode,
  tryEvaluateFormula,
  containsDice,
  DiceTermError,
  FormulaSyntaxError,
  type RollData,
  type FormulaNode,
} from "./formula.js";
export {
  buildRollData,
  abilityMod,
  totalLevel,
  type AbilityView,
} from "./rolldata.js";
export {
  babForLevels,
  saveForLevels,
  specialSizeMod,
  SIZE_AC_MOD,
  SAVE_ABILITY,
  SKILL_ABILITY,
  SKILL_IDS,
  skillUsesAcp,
} from "./tables.js";
