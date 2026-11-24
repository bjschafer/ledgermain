/**
 * The published game rules as browsable pages: the PF1 Content module's
 * `pf-rules` journal pack (one journal per rules section, numbered like
 * "2.02.7.1. Take 5-Foot Step"), plus the system's per-skill journal pages,
 * which that pack links to instead of carrying skill text itself.
 *
 * The tree is rebuilt from the section numbers rather than the pack's folders
 * or its hand-written navigation headers: a section's parent is the nearest
 * numbered ancestor that has text. That keeps it correct across the pack's
 * many empty placeholder journals (most of the optional-rules chapter), which
 * are dropped, with their children re-parented upward.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { RuleEntry, RuleLink, RuleNode, RuleSection, SourceRef } from "@pf1/schema";
import { parse } from "yaml";

import { resolveFoundryMarkup, stripHtml } from "../util/html.js";
import { isFolderDoc, readPack } from "../util/packs.js";
import { slug } from "./common.js";

interface JournalPage {
  _id: string;
  name: string;
  sort?: number;
  category?: string;
  text?: { content?: string };
}

interface Draft {
  id: string;
  name: string;
  /** Parsed section number; `null` for the index (contents) journals. */
  section: number[] | null;
  isIndex: boolean;
  /** The index journal this page's navigation header names first, when it has one. */
  chapterHint?: string;
  /** Body with the navigation header removed; enrichers still unresolved. */
  body: string;
  /** Link targets in source order (only read for the root, to order its chapters). */
  linkOrder: string[];
}

export interface RulesResult {
  rules: RuleEntry[];
  /** Id of the top-level contents page. */
  rootId: string;
  sectionCount: number;
}

const SECTION_NAME_RE = /^(\d+(?:\.\d+)*)\.?\s+(.+)$/;
const LINK_RE = /@(UUID|Compendium|JournalEntry)\[([^\]]*)\](?:\{([^}]*)\})?/g;
const SOURCE_RE = /@Source\[([^\];]+)(?:;\s*pages?=([^\]]+))?\]/g;
/** A paragraph holding nothing but source citations (optionally labelled "Source"). */
const SOURCE_PARA_RE =
  /<p>\s*(?:<strong>\s*Source:?\s*<\/strong>\s*)?(?:@Source\[[^\]]*\][\s,;]*)+<\/p>/g;

/** "2.02.7.1. Take 5-Foot Step" -> "Take 5-Foot Step"; "(Index) Combat Rules" -> "Combat Rules". */
export function displayName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name === "(Index)") return "Rules";
  if (name.startsWith("(Index)")) {
    return name
      .slice("(Index)".length)
      .replace(/\s*-\s*Not Complete$/i, "")
      .trim();
  }
  return SECTION_NAME_RE.exec(name)?.[2]?.trim() ?? name;
}

function parseSection(raw: string): number[] | null {
  const m = SECTION_NAME_RE.exec(raw.trim());
  return m ? m[1]!.split(".").map(Number) : null;
}

function compareSections(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]!;
  }
  return a.length - b.length;
}

/**
 * Every pf-rules page opens with a navigation header (index link, parent link,
 * sibling list) closed by an `<hr />`. The tree replaces it, so it goes. A
 * header is links and nothing else, bar a stray `"content": "` fragment two
 * upstream pages carry ahead of it.
 */
function stripNavHeader(content: string): string {
  const hr = /<hr\s*\/?>/.exec(content);
  if (!hr) return content;
  const header = content.slice(0, hr.index);
  const residue = header.replace(LINK_RE, "").replace(/<[^>]+>/g, "");
  const isNav =
    header.includes("@Compendium[pf-content.pf-rules.") &&
    /^[\s"]*(?:content[\s"]*:[\s"]*)?$/.test(residue);
  return isNav ? content.slice(hr.index + hr[0].length) : content;
}

/** The rules-page id a link enricher points at, if it points at one. */
function linkTarget(kind: string, args: string): string | undefined {
  if (kind === "JournalEntry") return args.trim();
  const parts = args.trim().split(".");
  const pack = parts.findIndex((p) => p === "pf-rules" || p === "gm-quick-reference");
  if (pack >= 0) {
    const next = parts[pack + 1];
    return next === "JournalEntry" ? parts[pack + 2] : next;
  }
  // The system's own rules journals: only per-page links (the skills) are pages here.
  const page = parts.indexOf("JournalEntryPage");
  if (parts.includes("pf1e-rules") && page >= 0) return parts[page + 1];
  return undefined;
}

function collectSources(html: string): SourceRef[] | undefined {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const m of html.matchAll(SOURCE_RE)) {
    const id = m[1]!.trim();
    const pages = m[2]?.trim();
    const key = `${id};${pages ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pages ? { id, pages } : { id });
  }
  return out.length > 0 ? out : undefined;
}

/** Drop markup the site can't use: images (their paths are Foundry-local) and presentational attributes. */
function cleanMarkup(html: string): string {
  return html
    .replace(/<img[^>]*>/g, "")
    .replace(/\s(?:style|class|id|border|data-colwidth)="[^"]*"/g, "")
    .replace(/<(\/?)h1>/g, "<$1h2>")
    .replace(/<a href="(https?:[^"]*)">/g, '<a href="$1" target="_blank" rel="noreferrer">')
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/^\s*(?:<hr\s*\/?>\s*)+/, "")
    .trim();
}

function sectionTitle(html: string): string {
  return stripHtml(html)
    .replace(/\s*:\s*$/, "")
    .trim();
}

/**
 * Stamp `data-section` on every heading and run-in head ("<p><strong>Use a
 * Scroll:</strong> …") so a page can be deep-linked to the paragraph a
 * player is after, and list them in order.
 */
function stampSections(html: string): { html: string; sections: RuleSection[] } {
  const sections: RuleSection[] = [];
  const used = new Set<string>();
  const claim = (title: string): string | undefined => {
    const base = slug(title);
    if (!base) return undefined;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    sections.push({ id, title });
    return id;
  };

  const stamped = html.replace(
    /<h([2-4])>([\s\S]*?)<\/h\1>|<p>(\s*<strong>([^<]{1,80}?)\s*(:?)\s*<\/strong>\s*(:?))/g,
    (
      match,
      level?: string,
      heading?: string,
      runIn?: string,
      head?: string,
      c1?: string,
      c2?: string,
    ) => {
      if (level !== undefined) {
        const title = sectionTitle(heading!);
        const id = title ? claim(title) : undefined;
        return id ? `<h${level} data-section="${id}">${heading}</h${level}>` : match;
      }
      if (!c1 && !c2) return match;
      const title = sectionTitle(head!);
      const id = title ? claim(title) : undefined;
      return id ? `<p data-section="${id}">${runIn}` : match;
    },
  );
  return { html: stamped, sections };
}

function readPfRules(dir: string): Draft[] {
  const drafts: Draft[] = [];
  for (const { doc } of readPack(dir)) {
    if (isFolderDoc(doc)) continue;
    const pages = ((doc.pages as JournalPage[] | undefined) ?? []).filter(
      (p) => (p.text?.content ?? "").trim() !== "",
    );
    // Placeholder journals (the pack lists the section but never wrote it) stay
    // as empty drafts: pruned unless something files under them.
    const first = pages[0]?.text?.content ?? "";
    const hr = first.search(/<hr\s*\/?>/);
    const header = hr >= 0 ? first.slice(0, hr) : "";
    const hint = /@Compendium\[pf-content\.pf-rules\.(\w+)\]/.exec(header)?.[1];

    const body = pages
      .map((page, i) => {
        const text = stripNavHeader(page.text!.content!);
        return i === 0 ? text : `<h2>${displayName(page.name)}</h2>${text}`;
      })
      .join("");

    drafts.push({
      id: doc._id,
      name: displayName(doc.name),
      section: parseSection(doc.name),
      isIndex: doc.name.startsWith("(Index)"),
      chapterHint: hint,
      body,
      linkOrder: [...first.matchAll(LINK_RE)]
        .map((m) => linkTarget(m[1]!, m[2]!))
        .filter((id): id is string => id !== undefined),
    });
  }
  return drafts;
}

/**
 * The system's skills journal: one page per skill. Only its core category is
 * read; the Unchained consolidated skills belong to the optional-rules chapter,
 * which the pf-rules pack never filled in. The pages are filed under the
 * pf-rules "Skill Descriptions" section, numbered past the pack's own
 * placeholder sub-sections so the two can never collide.
 */
function readSkillPages(rulesPackDir: string, drafts: readonly Draft[]): Draft[] {
  const file = readdirSync(rulesPackDir).find(
    (f) => f.startsWith("skills.") && f.endsWith(".yaml"),
  );
  if (!file) throw new Error(`[rules] no skills journal in ${rulesPackDir}`);
  const journal = parse(readFileSync(join(rulesPackDir, file), "utf8")) as {
    categories?: { _id: string; name: string }[];
    pages?: JournalPage[];
  };

  const core = journal.categories?.find((c) => c.name === "Normal");
  if (!core) throw new Error(`[rules] skills journal has no "Normal" category`);
  const parent = drafts.find((d) => d.name === "Skill Descriptions" && d.section && d.body);
  if (!parent?.section) throw new Error(`[rules] no pf-rules "Skill Descriptions" section`);

  return (journal.pages ?? [])
    .filter((p) => p.category === core._id && (p.text?.content ?? "").trim() !== "")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((page, i) => ({
      id: page._id,
      name: page.name.trim(),
      section: [...parent.section!, 1000 + i],
      isIndex: false,
      body: page.text!.content!,
      linkOrder: [],
    }));
}

/** Synthetic chapter id for the quick-reference tables; never a Foundry id, which has no hyphens. */
const QUICK_REFERENCE_ID = "quick-reference";

/** Pages about Foundry itself, off-site links, or a third-party image with no text. */
const QUICK_REFERENCE_SKIP = new Set([
  "- Change Formulas",
  "- Tips and Tricks",
  "Pathfinder Wiki",
  "d20 PFSRD",
  "Grapple Flow Chart",
]);

/** The module's GM quick-reference journals (action/AoO table, concentration DCs, ...), as one chapter. */
function readQuickReference(dir: string): Draft[] {
  const chapter: Draft = {
    id: QUICK_REFERENCE_ID,
    name: "Quick Reference",
    section: null,
    isIndex: true,
    body: "",
    linkOrder: [],
  };
  const pages = readPack(dir)
    .map(({ doc }) => doc)
    .filter((doc) => !isFolderDoc(doc) && !QUICK_REFERENCE_SKIP.has(doc.name))
    .map((doc) => ({
      id: doc._id,
      name: doc.name.trim(),
      section: null,
      isIndex: false,
      chapterHint: QUICK_REFERENCE_ID,
      body: ((doc.pages as JournalPage[] | undefined) ?? [])
        .map((page) => page.text?.content ?? "")
        .join(""),
      linkOrder: [],
    }));
  return [chapter, ...pages];
}

export function transformRules(
  pfRulesDir: string,
  quickReferenceDir: string,
  rulesPackDir: string,
): RulesResult {
  const pfRules = readPfRules(pfRulesDir);
  const drafts = [
    ...pfRules,
    ...readSkillPages(rulesPackDir, pfRules),
    ...readQuickReference(quickReferenceDir),
  ];
  const byId = new Map(drafts.map((d) => [d.id, d]));

  const roots = drafts.filter((d) => d.isIndex && d.name === "Rules");
  if (roots.length !== 1) throw new Error(`[rules] expected one root index, found ${roots.length}`);
  const root = roots[0]!;

  const bySection = new Map<string, Draft>();
  for (const d of drafts) {
    if (!d.section) continue;
    const key = d.section.join(".");
    if (bySection.has(key)) console.warn(`[rules] duplicate section ${key}: ${d.name}`);
    else bySection.set(key, d);
  }

  // A chapter for each major section number, voted from the pages that name one.
  const votes = new Map<number, Map<string, number>>();
  for (const d of drafts) {
    const hint = d.chapterHint && byId.get(d.chapterHint);
    if (!d.section || !hint || !hint.isIndex || hint === root) continue;
    const tally = votes.get(d.section[0]!) ?? new Map<string, number>();
    tally.set(hint.id, (tally.get(hint.id) ?? 0) + 1);
    votes.set(d.section[0]!, tally);
  }
  const chapterByMajor = new Map(
    [...votes].map(([major, tally]) => [major, [...tally].sort((a, b) => b[1] - a[1])[0]![0]]),
  );

  const isEmpty = (d: Draft) =>
    !d.isIndex &&
    stripHtml(resolveFoundryMarkup(d.body.replace(SOURCE_PARA_RE, ""), () => undefined)) === "";

  // Parent assignment, re-run as empty leaves are pruned until nothing changes.
  const included = new Set(drafts.map((d) => d.id));
  const parentOf = new Map<string, string>();
  const assignParents = () => {
    parentOf.clear();
    for (const d of drafts) {
      if (!included.has(d.id) || d === root) continue;
      if (d.isIndex) {
        parentOf.set(d.id, root.id);
        continue;
      }
      let parent: string | undefined;
      for (let len = (d.section?.length ?? 0) - 1; len >= 1 && !parent; len--) {
        const hit = bySection.get(d.section!.slice(0, len).join("."));
        if (hit && included.has(hit.id)) parent = hit.id;
      }
      if (!parent) {
        const hint = d.chapterHint && byId.get(d.chapterHint);
        parent =
          hint && hint.isIndex && hint !== root
            ? hint.id
            : chapterByMajor.get(d.section?.[0] ?? -1);
      }
      parentOf.set(d.id, parent && included.has(parent) ? parent : root.id);
    }
  };
  for (;;) {
    assignParents();
    const parents = new Set(parentOf.values());
    const prune = drafts.filter(
      (d) => included.has(d.id) && d !== root && (d.isIndex || isEmpty(d)) && !parents.has(d.id),
    );
    if (prune.length === 0) break;
    for (const d of prune) included.delete(d.id);
  }

  const childrenOf = new Map<string, Draft[]>();
  for (const [child, parent] of parentOf) {
    const list = childrenOf.get(parent) ?? [];
    list.push(byId.get(child)!);
    childrenOf.set(parent, list);
  }
  // The quick-reference tables are the most-used pages at the table, so they lead.
  const rootOrder = new Map([
    [QUICK_REFERENCE_ID, -1],
    ...root.linkOrder.map((id, i) => [id, i] as const),
  ]);
  for (const [parent, list] of childrenOf) {
    list.sort((a, b) => {
      if (parent === root.id) {
        return (
          (rootOrder.get(a.id) ?? Infinity) - (rootOrder.get(b.id) ?? Infinity) ||
          a.name.localeCompare(b.name)
        );
      }
      if (a.section && b.section) return compareSections(a.section, b.section);
      return a.section ? 1 : b.section ? -1 : a.name.localeCompare(b.name);
    });
  }

  // URL ids: the page name's slug, prefixed with its parent's when names clash.
  // Every page in a clash is prefixed, so no URL depends on which one sorts first.
  const kept = drafts.filter((d) => included.has(d.id));
  const nameCount = new Map<string, number>();
  for (const d of kept) nameCount.set(slug(d.name), (nameCount.get(slug(d.name)) ?? 0) + 1);
  const urlIds = new Map<string, string>();
  const taken = new Set<string>();
  for (const d of kept) {
    const base = slug(d.name);
    const parent = parentOf.get(d.id);
    const id =
      nameCount.get(base)! > 1 && parent ? `${slug(byId.get(parent)!.name)}-${base}` : base;
    if (!base || taken.has(id)) {
      throw new Error(`[rules] no unique URL id for "${d.name}" (got "${id}")`);
    }
    taken.add(id);
    urlIds.set(d.id, id);
  }
  const urlId = (id: string) => urlIds.get(id)!;

  const link = (d: Draft): RuleLink => ({ id: urlId(d.id), name: d.name });
  const nameOf = (id: string) => (included.has(id) ? byId.get(id)?.name : undefined);

  const resolveLinks = (html: string): string =>
    html.replace(LINK_RE, (match, kind: string, args: string, display?: string) => {
      const target = linkTarget(kind, args);
      const text = display !== undefined ? displayName(display) : target && nameOf(target);
      if (target && included.has(target)) {
        return `<a data-rule="${urlId(target)}">${text ?? ""}</a>`;
      }
      // Not a page here: leave it for the generic resolver, which keeps the display text.
      return display !== undefined ? display : match;
    });

  const rules: RuleEntry[] = [];
  let sectionCount = 0;
  for (const d of drafts) {
    if (!included.has(d.id)) continue;

    const path: RuleLink[] = [];
    for (let up = parentOf.get(d.id); up && up !== root.id; up = parentOf.get(up)) {
      path.unshift(link(byId.get(up)!));
    }
    const children: RuleNode[] = (childrenOf.get(d.id) ?? []).map((child) => {
      const grand = childrenOf.get(child.id);
      return grand ? { ...link(child), children: grand.map(link) } : link(child);
    });

    let html = "";
    let sections: RuleSection[] = [];
    let sources: SourceRef[] | undefined;
    if (!d.isIndex) {
      sources = collectSources(d.body);
      let body = cleanMarkup(
        resolveFoundryMarkup(resolveLinks(d.body.replace(SOURCE_PARA_RE, "")), (uuid) => {
          const target = linkTarget("UUID", uuid);
          return target ? nameOf(target) : undefined;
        }),
      );
      // A leading heading that repeats the page's own name.
      const lead = /^<h2>([\s\S]*?)<\/h2>/.exec(body);
      if (lead && sectionTitle(lead[1]!).toLowerCase() === d.name.toLowerCase()) {
        body = body.slice(lead[0].length).trim();
      }
      ({ html, sections } = stampSections(body));
      sectionCount += sections.length;
    }

    rules.push({
      id: urlId(d.id),
      name: d.name,
      path,
      children,
      html,
      sections,
      ...(sources ? { sources } : {}),
    });
  }

  return { rules, rootId: urlId(root.id), sectionCount };
}
