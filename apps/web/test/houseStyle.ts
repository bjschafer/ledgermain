/**
 * Shared assertions for the two hand-maintained player-facing string tables,
 * `changelog.ts` and `coverageNotes.ts`.
 *
 * Both are prose nobody compiles against, so nothing but a test stops them
 * drifting. Two things have gone wrong in practice and are checked here: em
 * dashes creeping back into copy that renders in the app, and entries growing
 * without bound because it's always easier to append a clause than to rewrite
 * the sentence.
 */

/** Words in a string, for the per-entry length budgets. */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/**
 * House style bans em and en dashes outright. In strings that render in the
 * app the fix is to restructure the sentence, not to print the ` -- `
 * substitute the style guide uses for markdown.
 */
export function expectNoDashes(label: string, text: string): void {
  const found = text.match(/[—–]/g);
  if (found) {
    throw new Error(
      `${label}: contains ${found.length} em/en dash(es); house style bans them in ` +
        `player-facing copy. Restructure the sentence (a colon, a period, or parentheses) ` +
        `rather than printing " -- " on screen.\n  ${text}`,
    );
  }
}

/** Enforce a per-entry word budget, naming the entry that blew it. */
export function expectWithinBudget(label: string, text: string, budget: number): void {
  const words = wordCount(text);
  if (words > budget) {
    throw new Error(
      `${label}: ${words} words, budget ${budget}. Cut it back rather than raising the ` +
        `budget; these tables are meant to stay skimmable.\n  ${text}`,
    );
  }
}
