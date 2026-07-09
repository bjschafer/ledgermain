/**
 * Unit tests for the cavalier/samurai order addition to model/doc.ts:
 * `setCavalierOrder`. Mirrors `doc.oracleMysteryCurse.test.ts`'s pattern for
 * `setOracleMystery`.
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setCavalierOrder } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setCavalierOrder()", () => {
  it("sets an order tag", () => {
    expect(setCavalierOrder(doc(), "lion").build.cavalierOrder).toBe("lion");
  });

  it("accepts a samurai-only order tag too (shared field)", () => {
    expect(setCavalierOrder(doc(), "ronin").build.cavalierOrder).toBe("ronin");
  });

  it("clears the order when passed null", () => {
    const withOrder = setCavalierOrder(doc(), "lion");
    expect(setCavalierOrder(withOrder, null).build.cavalierOrder).toBeUndefined();
  });

  it("strips a blank/whitespace-only tag to undefined", () => {
    expect(setCavalierOrder(doc(), "").build.cavalierOrder).toBeUndefined();
    expect(setCavalierOrder(doc(), "   ").build.cavalierOrder).toBeUndefined();
  });

  it("trims surrounding whitespace from a valid tag", () => {
    expect(setCavalierOrder(doc(), "  lion  ").build.cavalierOrder).toBe("lion");
  });

  it("a fresh document has no order set", () => {
    expect(doc().build.cavalierOrder).toBeUndefined();
  });
});
