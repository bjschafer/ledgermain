import type { RuleEntry, RuleLink } from "@pf1/schema";
import { useEffect, useMemo, useRef } from "react";

import { detailHref } from "../hooks/useHashRoute.js";
import { Sources } from "./parts.js";

/** Pages with fewer headings than this are short enough to scan without a jump list. */
const MIN_JUMP_LIST = 3;

/**
 * One rules page: its own text, a jump list of its headings, and the pages
 * filed under it two levels deep, so a chapter or section page doubles as its
 * own table of contents. `section` (from `?s=`) scrolls to and marks the
 * heading or paragraph a search hit named.
 */
export function RuleView({ rule, section }: { rule: RuleEntry; section?: string }) {
  const body = useRef<HTMLDivElement>(null);
  // The pipeline marks cross-page links as `data-rule`; only this site knows its routes.
  const html = useMemo(
    () =>
      rule.html.replace(
        /<a data-rule="([^"]+)">/g,
        (_, id: string) => `<a href="${detailHref("rules", id)}">`,
      ),
    [rule],
  );

  useEffect(() => {
    if (!section) return;
    const target = body.current?.querySelector(`[data-section="${CSS.escape(section)}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    target.classList.add("is-target");
    return () => target.classList.remove("is-target");
  }, [section, html]);

  return (
    <>
      {rule.sections.length >= MIN_JUMP_LIST && (
        <nav className="rule-jump" aria-label="On this page">
          {rule.sections.map((s) => (
            <a key={s.id} href={detailHref("rules", rule.id, s.id)}>
              {s.title}
            </a>
          ))}
        </nav>
      )}

      {html && (
        <div ref={body} className="prose rule-prose" dangerouslySetInnerHTML={{ __html: html }} />
      )}

      {rule.children.length > 0 && (
        <nav className="rule-children" aria-label={rule.html ? "In this section" : "Contents"}>
          {rule.html && <h2 className="rule-children-title">In this section</h2>}
          <ul>
            {rule.children.map((child) => (
              <li key={child.id}>
                <a className="rule-child" href={detailHref("rules", child.id)}>
                  {child.name}
                </a>
                {child.children && (
                  <ul className="rule-grandchildren">
                    {child.children.map((grand) => (
                      <li key={grand.id}>
                        <a href={detailHref("rules", grand.id)}>{grand.name}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}

      <Sources sources={rule.sources} />
    </>
  );
}

/** "Rules › Combat Rules › Special Attacks", standing in for the back link on a rules page. */
export function RuleTrail({ path }: { path: RuleLink[] }) {
  return (
    <nav className="back-link rule-trail" aria-label="Breadcrumb">
      <a href="#/rules">Rules</a>
      {path.map((link) => (
        <span key={link.id}>
          {" › "}
          <a href={detailHref("rules", link.id)}>{link.name}</a>
        </span>
      ))}
    </nav>
  );
}
