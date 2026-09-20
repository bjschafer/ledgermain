import { describe, expect, test } from "bun:test";

import {
  findCascadeConflicts,
  findConflicts,
  formatConflict,
  parseClassAttr,
} from "./cascadeOrder";

/**
 * A modifier rule placed above the base it refines loses on source order and
 * does nothing. The fix is to qualify the selector with its base
 * (`.base.modifier`) so it outranks the later rule without being moved away
 * from the rules it belongs with.
 *
 * `allowed` takes `<modifier>|<base>|<property>` for a pair that is genuinely
 * meant to lose. Nothing qualifies today; prefer qualifying the selector.
 */
const APPS = [
  {
    name: "web",
    src: `${import.meta.dir}/../src`,
    css: `${import.meta.dir}/../src/styles.css`,
    allowed: new Set<string>(),
  },
  {
    // The reference site shares the failure mode, not the stylesheet.
    name: "reference",
    src: `${import.meta.dir}/../../reference/src`,
    css: `${import.meta.dir}/../../reference/src/styles.css`,
    allowed: new Set<string>(),
  },
];

describe.each(APPS)("cascade order ($name)", ({ src, css, allowed }) => {
  const key = (c: ReturnType<typeof findConflicts>[number]) =>
    `${c.loser.selector}|${c.winner.selector}|${c.property}`;

  test("no rule is silently overridden by one defined later", () => {
    const conflicts = findConflicts(src, css).filter((c) => !allowed.has(key(c)));
    expect(conflicts.map(formatConflict).join("\n\n")).toBe("");
  });

  test("the allowlist has no stale entries", () => {
    const live = new Set(findConflicts(src, css).map(key));
    expect([...allowed].filter((k) => !live.has(k))).toEqual([]);
  });
});

/**
 * The detector is guarded too. Both earlier versions of this check returned a
 * clean sweep while blind to the bug that prompted it, and a passing run is
 * worthless if nothing proves the check can still fail.
 */
describe("the detector itself", () => {
  const el = (raw: string, where = "Fixture.tsx:1") => parseClassAttr(raw, where);

  // The deeds defect: `.deed-row` dropped the caret gutter, but sat ~4500
  // lines above the class it was overriding.
  const deedsElements = [el(`"cf-archetype-feature deed-row"`), el(`"cf-archetype-feature"`)];

  test("catches a modifier defined before its base", () => {
    const found = findCascadeConflicts(
      `.deed-row { grid-template-columns: 1fr; }
       .cf-archetype-feature { grid-template-columns: 1fr 20px; }`,
      deedsElements,
    );
    expect(found).toHaveLength(1);
    expect(found[0]!.property).toBe("grid-template-columns");
    expect(found[0]!.loser.selector).toBe(".deed-row");
    expect(found[0]!.winner.selector).toBe(".cf-archetype-feature");
  });

  test("allows a modifier defined after its base", () => {
    const found = findCascadeConflicts(
      `.cf-archetype-feature { grid-template-columns: 1fr 20px; }
       .deed-row { grid-template-columns: 1fr; }`,
      deedsElements,
    );
    expect(found).toEqual([]);
  });

  test("accepts the qualified selector that fixes it", () => {
    const found = findCascadeConflicts(
      `.cf-archetype-feature.deed-row { grid-template-columns: 1fr; }
       .cf-archetype-feature { grid-template-columns: 1fr 20px; }`,
      deedsElements,
    );
    expect(found).toEqual([]);
  });

  test("ignores classes from opposite branches of one ternary", () => {
    // `filled` and `empty` never land on the same element, so `.filled` losing
    // to `.empty` is not a conflict even though both would otherwise match.
    const found = findCascadeConflicts(`.filled { color: gold; } .empty { color: grey; }`, [
      el(`{on ? "pip filled" : "pip empty"}`),
      el(`"empty"`),
    ]);
    expect(found).toEqual([]);
  });

  test("a conditional class does not make its static sibling a modifier", () => {
    // The trap that hid the original bug: treating `cf-block` as always-present
    // meant `cf-archetype-feature` never looked like a base.
    const use = el('{`cf-archetype-feature${block ? " cf-block" : ""}`}');
    expect([...use.required]).toEqual(["cf-archetype-feature"]);
    expect(use.all.has("cf-block")).toBe(true);
  });

  test("reads a plain class list as all-required", () => {
    const use = el(`"prof-chip immunity-chip"`);
    expect([...use.required].sort()).toEqual(["immunity-chip", "prof-chip"]);
  });
});
