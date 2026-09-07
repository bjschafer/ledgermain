import { useMemo } from "react";

import { sanitizeHtml } from "../model/sanitizeHtml.js";

/**
 * The one element that turns a rules description into HTML. Every panel that
 * shows prose (spells, feats, class features, item abilities, combat styles)
 * goes through here so the allowlist in `model/sanitizeHtml.ts` is the single
 * place that decides what markup a description may contain — homebrew and
 * imported entries share the `RefData` collections the vendored data lives
 * in, so no call site can assume its input is vendored.
 */
export function RulesProse({ html, className }: { html: string; className: string }) {
  const clean = useMemo(() => sanitizeHtml(html), [html]);
  return (
    <div
      className={className}
      // Allowlisted by `sanitizeHtml` on the line above — the only sanctioned
      // `dangerouslySetInnerHTML` in the app.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
