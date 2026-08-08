import { describe, expect, test } from "bun:test";
import { findNakedElements } from "./unstyledClasses";

/**
 * Classes that match no CSS rule on purpose. Everything else that renders with
 * no styling at all is a bug: add the class to the selector group it belongs to
 * in `styles.css` rather than listing it here.
 */
const APPS = [
  {
    name: "web",
    src: `${import.meta.dir}/../src`,
    css: `${import.meta.dir}/../src/styles.css`,
    allowed: new Set([
      // Zero-size IntersectionObserver targets. Styling them would give them a box.
      "picker-load-more-sentinel",
      // Text spans whose styled flex parent sets both the typography and the
      // layout; the class names the slot next to its `-count` / `-select` sibling.
      "spell-level-label",
      "spell-pane-title",
      "cf-level-label",
      "cf-group-name",
      "sk-name",
      "mm-levels-label",
      "buff-element",
    ]),
  },
  {
    // The reference site shares the failure mode, not the stylesheet.
    name: "reference",
    src: `${import.meta.dir}/../../reference/src`,
    css: `${import.meta.dir}/../../reference/src/styles.css`,
    // Page wrapper inside the already-padded `.app-main`; every child spaces itself.
    allowed: new Set(["search-page"]),
  },
];

describe.each(APPS)("unstyled classnames ($name)", ({ src, css, allowed }) => {
  test("no element renders with zero CSS rules", () => {
    const naked = findNakedElements(src, css).filter((e) => !allowed.has(e.className));
    const report = naked
      .map((e) => `  <${e.tag} className="${e.className}">  ${e.file}:${e.line}`)
      .join("\n");
    expect(report).toBe("");
  });

  test("the allowlist has no stale entries", () => {
    const naked = new Set(findNakedElements(src, css).map((e) => e.className));
    expect([...allowed].filter((c) => !naked.has(c))).toEqual([]);
  });
});
