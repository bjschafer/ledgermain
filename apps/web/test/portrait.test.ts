import { describe, expect, it } from "bun:test";

import { createEmptyDoc, setPortrait } from "../src/model/doc.js";
import {
  isPortraitDataUrl,
  PORTRAIT_MAX_BYTES,
  portraitSrc,
  squareCrop,
} from "../src/model/portrait.js";

/** A stored-shaped portrait of `length` characters, for the size checks. */
function dataUrl(length: number): string {
  const prefix = "data:image/jpeg;base64,";
  return prefix + "A".repeat(Math.max(1, length - prefix.length));
}

const VALID = "data:image/jpeg;base64,AAAA";

describe("isPortraitDataUrl", () => {
  it("accepts the raster data URLs this app writes", () => {
    expect(isPortraitDataUrl(VALID)).toBe(true);
    expect(isPortraitDataUrl("data:image/png;base64,AAA=")).toBe(true);
    expect(isPortraitDataUrl("data:image/webp;base64,AA==")).toBe(true);
  });

  it("refuses SVG, which is a document rather than a picture", () => {
    expect(isPortraitDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(false);
  });

  it("refuses anything that isn't an inline image", () => {
    expect(isPortraitDataUrl("https://example.com/portrait.jpg")).toBe(false);
    expect(isPortraitDataUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isPortraitDataUrl("javascript:alert(1)")).toBe(false);
    expect(isPortraitDataUrl("data:image/jpeg,notbase64")).toBe(false);
    expect(isPortraitDataUrl("")).toBe(false);
  });

  it("refuses one larger than the cap, whatever it claims to be", () => {
    expect(isPortraitDataUrl(dataUrl(PORTRAIT_MAX_BYTES))).toBe(true);
    expect(isPortraitDataUrl(dataUrl(PORTRAIT_MAX_BYTES + 1))).toBe(false);
  });
});

describe("portraitSrc", () => {
  it("passes a stored portrait through and swallows everything else", () => {
    expect(portraitSrc(VALID)).toBe(VALID);
    expect(portraitSrc(undefined)).toBeUndefined();
    expect(portraitSrc("data:image/svg+xml;base64,PHN2Zz4=")).toBeUndefined();
  });
});

describe("squareCrop", () => {
  it("centers on the long axis", () => {
    expect(squareCrop(400, 300)).toEqual({ x: 50, y: 0, size: 300 });
    expect(squareCrop(300, 400)).toEqual({ x: 0, y: 50, size: 300 });
  });

  it("takes an already-square image whole", () => {
    expect(squareCrop(256, 256)).toEqual({ x: 0, y: 0, size: 256 });
  });
});

describe("setPortrait", () => {
  it("stores a valid portrait", () => {
    const doc = setPortrait(createEmptyDoc("char-1"), VALID);
    expect(doc.identity.portrait).toBe(VALID);
  });

  it("refuses one that didn't come from encodePortrait, leaving the document alone", () => {
    const before = setPortrait(createEmptyDoc("char-1"), VALID);
    const after = setPortrait(before, "https://example.com/portrait.jpg");
    expect(after.identity.portrait).toBe(VALID);
  });

  it("clears the field entirely rather than storing an empty one", () => {
    const doc = setPortrait(setPortrait(createEmptyDoc("char-1"), VALID), null);
    expect("portrait" in doc.identity).toBe(false);
  });

  it("is a no-op when clearing a document that never had one", () => {
    const doc = createEmptyDoc("char-1");
    expect(setPortrait(doc, null)).toBe(doc);
  });
});
