/**
 * Unit tests for `setAlignment()`'s label/code normalization (copy &
 * readability audit): a real bug where `IdentitySection`'s alignment
 * `<select>` only matches two-letter codes ("NG"), so a full-label value
 * (e.g. "Neutral Good" — what the Lyle fixture stores, and what an external
 * import may produce) stored verbatim showed as "—" in the dropdown even
 * though the sheet displayed the label fine. `setAlignment` now normalizes
 * either shape to the stored code; unrecognized strings still store as-is
 * (the sheet already falls back to raw text for those).
 */
import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setAlignment } from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

describe("setAlignment()", () => {
  it("stores a bare code unchanged", () => {
    expect(setAlignment(doc(), "NG").identity.alignment).toBe("NG");
  });

  it("normalizes a full label to its code", () => {
    expect(setAlignment(doc(), "Neutral Good").identity.alignment).toBe("NG");
  });

  it("normalizes a full label case-insensitively", () => {
    expect(setAlignment(doc(), "neutral good").identity.alignment).toBe("NG");
    expect(setAlignment(doc(), "CHAOTIC EVIL").identity.alignment).toBe("CE");
  });

  it("normalizes a lowercase code", () => {
    expect(setAlignment(doc(), "ng").identity.alignment).toBe("NG");
  });

  it("stores an unrecognized string as-is", () => {
    expect(setAlignment(doc(), "True Neutral-ish").identity.alignment).toBe("True Neutral-ish");
  });

  it("round-trips every alignment label to its code", () => {
    const labels: Record<string, string> = {
      "Lawful Good": "LG",
      "Neutral Good": "NG",
      "Chaotic Good": "CG",
      "Lawful Neutral": "LN",
      Neutral: "N",
      "Chaotic Neutral": "CN",
      "Lawful Evil": "LE",
      "Neutral Evil": "NE",
      "Chaotic Evil": "CE",
    };
    for (const [label, code] of Object.entries(labels)) {
      expect(setAlignment(doc(), label).identity.alignment).toBe(code);
    }
  });
});
