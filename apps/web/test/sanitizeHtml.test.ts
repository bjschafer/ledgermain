import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { sanitizeHtml } from "../src/model/sanitizeHtml.js";

describe("sanitizeHtml() keeps the markup the vendored prose actually uses", () => {
  it("passes through the common formatting tags", () => {
    const html = "<p>A <strong>bold</strong> <em>claim</em>,<br>and a <i>quiet</i> one.</p>";
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("keeps tables with their column widths and spans", () => {
    const html =
      '<table><thead><tr><th colspan="2">Level</th></tr></thead>' +
      '<tbody><tr><td style="width: 40%">1st</td><td>+1</td></tr></tbody></table>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("keeps an Archives of Nethys link, and forces rel on a new-tab one", () => {
    expect(sanitizeHtml('<a href="https://www.aonprd.com/Feats.aspx">Feats</a>')).toBe(
      '<a href="https://www.aonprd.com/Feats.aspx">Feats</a>',
    );
    expect(sanitizeHtml('<a href="https://aonprd.com/x" target="_blank">x</a>')).toBe(
      '<a href="https://aonprd.com/x" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });

  it("leaves existing character entities alone but escapes a bare ampersand", () => {
    expect(sanitizeHtml("<p>Bull&rsquo;s Strength &amp; Cat&#39;s Grace</p>")).toBe(
      "<p>Bull&rsquo;s Strength &amp; Cat&#39;s Grace</p>",
    );
    expect(sanitizeHtml("<p>Sword & board</p>")).toBe("<p>Sword &amp; board</p>");
  });

  it("escapes prose that only looks like a tag", () => {
    // The vendored data really does contain lines like this.
    expect(sanitizeHtml("<p>Weapon Focus (<chosen weapon>)</p>")).toBe("<p>Weapon Focus ()</p>");
    expect(sanitizeHtml("<p>a bonus of < 5</p>")).toBe("<p>a bonus of &lt; 5</p>");
  });
});

describe("sanitizeHtml() renders a homebrew injection inert", () => {
  it("drops a script tag and its body", () => {
    const out = sanitizeHtml('<p>Hi</p><script>alert("xss")</script><p>Bye</p>');
    expect(out).toBe("<p>Hi</p><p>Bye</p>");
    expect(out).not.toContain("alert");
    expect(out).not.toContain("script");
  });

  it("drops an inline event handler but keeps the element", () => {
    expect(sanitizeHtml('<p onclick="steal()">Text</p>')).toBe("<p>Text</p>");
    expect(sanitizeHtml('<div onmouseover=steal() title="t">Text</div>')).toBe(
      '<div title="t">Text</div>',
    );
  });

  it("drops an img, so nothing in a description can fetch a URL", () => {
    expect(sanitizeHtml('<p>a<img src="https://evil.test/ping.gif">b</p>')).toBe("<p>ab</p>");
    expect(sanitizeHtml("<p><img src=x onerror=alert(1)></p>")).toBe("<p></p>");
  });

  it("rejects a javascript: href, including an entity-encoded one", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).toBe("<a>click</a>");
    expect(sanitizeHtml('<a href="java&#115;cript:alert(1)">click</a>')).toBe("<a>click</a>");
    expect(sanitizeHtml('<a href="java\tscript:alert(1)">click</a>')).toBe("<a>click</a>");
    expect(sanitizeHtml('<a href="DATA:text/html,<script>x</script>">click</a>')).toBe(
      "<a>click</a>",
    );
  });

  it("keeps only allowlisted style properties, and no url()", () => {
    expect(sanitizeHtml('<p style="width: 50%; position: fixed; top: 0">x</p>')).toBe(
      '<p style="width: 50%">x</p>',
    );
    expect(sanitizeHtml('<p style="background-color: url(https://evil.test/p)">x</p>')).toBe(
      "<p>x</p>",
    );
  });

  it("drops elements that act on their own, content included", () => {
    expect(sanitizeHtml('<iframe src="https://evil.test"><p>fallback</p></iframe>')).toBe("");
    expect(sanitizeHtml("<style>body{display:none}</style><p>ok</p>")).toBe("<p>ok</p>");
    expect(sanitizeHtml('<form action="https://evil.test"><input name="a"></form><p>ok</p>')).toBe(
      "<p>ok</p>",
    );
  });

  it("is not fooled by a nested or unclosed dropped element", () => {
    expect(sanitizeHtml("<script><script>alert(1)</script></script><p>ok</p>")).toBe("<p>ok</p>");
    expect(sanitizeHtml("<p>ok</p><script>alert(1)")).toBe("<p>ok</p>");
  });

  it("strips a comment, which is where a conditional-comment payload hides", () => {
    expect(sanitizeHtml("<p>a</p><!--[if IE]><script>x</script><![endif]--><p>b</p>")).toBe(
      "<p>a</p><p>b</p>",
    );
  });

  it("balances the output no matter how mismatched the input is", () => {
    expect(sanitizeHtml("<p><strong>unclosed")).toBe("<p><strong>unclosed</strong></p>");
    expect(sanitizeHtml("</p></strong><p>stray closers</p>")).toBe("<p>stray closers</p>");
    expect(sanitizeHtml('<p title="a>b">x</p>')).toBe('<p title="a&gt;b">x</p>');
  });

  it("unwraps an unknown element instead of trusting it", () => {
    expect(sanitizeHtml('<custom-thing data-x="1">text</custom-thing>')).toBe("text");
    expect(sanitizeHtml("<P>Case</P><SCRIPT>alert(1)</SCRIPT>")).toBe("<p>Case</p>");
  });
});

describe("sanitizeHtml() over the description a homebrew author can type", () => {
  it("leaves the escaped output of the homebrew editor untouched", () => {
    // `homebrewEditor.textToDescriptionHtml` already escapes; sanitizing it
    // again must not double-escape what it produced.
    const authored = "<p>Deals 2d6 &lt;fire&gt; damage &amp; staggers.<br>Once per day.</p>";
    expect(sanitizeHtml(authored)).toBe(authored);
  });
});

/**
 * The sanitizer only helps if nothing routes around it, and the four panels
 * that predate it each carried a comment asserting their input was vendored.
 * That assertion is what went stale when homebrew started overlaying the same
 * collections, so it is enforced here rather than left to review.
 */
describe("RulesProse is the only path to dangerouslySetInnerHTML", () => {
  it("no other file under src/ sets inner HTML", () => {
    const dir = join(import.meta.dir, "..", "src");
    const offenders: string[] = [];
    const walk = (at: string) => {
      for (const entry of readdirSync(at, { withFileTypes: true })) {
        const full = join(at, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && entry.name !== "RulesProse.tsx") {
          // The `=` keeps this to the JSX prop, so a doc comment naming it
          // (as `model/sanitizeHtml.ts` does) doesn't count.
          if (/dangerouslySetInnerHTML=/.test(readFileSync(full, "utf8"))) {
            offenders.push(relative(dir, full));
          }
        }
      }
    };
    walk(dir);
    expect(offenders).toEqual([]);
  });
});
