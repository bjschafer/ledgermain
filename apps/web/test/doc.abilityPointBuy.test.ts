/**
 * Unit tests for issue #86's `setAbilityPointBuyBudget` (model/doc.ts).
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setAbilityPointBuyBudget } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setAbilityPointBuyBudget()", () => {
  it("a fresh document has no budget set (point buy off)", () => {
    expect(doc().build.abilityPointBuyBudget).toBeUndefined();
  });

  it("sets a standard budget", () => {
    expect(setAbilityPointBuyBudget(doc(), 15).build.abilityPointBuyBudget).toBe(15);
  });

  it("sets a custom (non-standard) budget", () => {
    expect(setAbilityPointBuyBudget(doc(), 32).build.abilityPointBuyBudget).toBe(32);
  });

  it("clears the budget when passed null", () => {
    const withBudget = setAbilityPointBuyBudget(doc(), 20);
    expect(setAbilityPointBuyBudget(withBudget, null).build.abilityPointBuyBudget).toBeUndefined();
  });
});
