/**
 * Unit tests for the Divine Bond addition to model/doc.ts: `setPaladinBond`.
 * Mirrors `doc.antipaladinBoon.test.ts`'s pattern for `setAntipaladinBoon`
 * (a closed two-value union, `null` the only "clear" input).
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setPaladinBond } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setPaladinBond()", () => {
  it("sets the weapon bond", () => {
    expect(setPaladinBond(doc(), "weapon").build.paladinBond).toBe("weapon");
  });

  it("sets the mount bond", () => {
    expect(setPaladinBond(doc(), "mount").build.paladinBond).toBe("mount");
  });

  it("clears the bond when passed null", () => {
    const withBond = setPaladinBond(doc(), "mount");
    expect(setPaladinBond(withBond, null).build.paladinBond).toBeUndefined();
  });

  it("a fresh document has no bond set", () => {
    expect(doc().build.paladinBond).toBeUndefined();
  });
});
