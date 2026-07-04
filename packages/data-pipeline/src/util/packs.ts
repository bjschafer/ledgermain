import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { parse } from "yaml";

/** A raw Foundry source document parsed from a pack YAML file. */
export interface RawDoc {
  _id: string;
  name: string;
  type: string;
  system?: Record<string, unknown>;
  img?: string;
  folder?: string;
  _stats?: { coreVersion?: string };
  [key: string]: unknown;
}

/** A parsed pack file plus its location (folder is relative to the pack root). */
export interface PackFile {
  doc: RawDoc;
  /** File path relative to the pack directory, e.g. "core/elf.<id>.yaml". */
  relPath: string;
}

/**
 * Foundry compendium Folder documents are interleaved with real content in the
 * same pack directory (e.g. an "Adventuring Gear" folder doc alongside the
 * items filed under it). A folder doc's own `type` field mirrors the *content
 * type it organizes* (e.g. "Item"), not the literal string "folder" — so the
 * only reliable signal is its `_key`, which Foundry always prefixes
 * `!folders!` for folder documents (vs. e.g. `!items!` for real entries).
 */
export function isFolderDoc(doc: RawDoc): boolean {
  return typeof doc._key === "string" && doc._key.startsWith("!folders!");
}

/** Recursively list all `*.yaml` files under a directory. */
function listYamlFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listYamlFiles(full, base));
    } else if (entry.endsWith(".yaml")) {
      out.push(full.slice(base.length + 1));
    }
  }
  return out;
}

/**
 * Read and parse every YAML document in a pack directory (recursing into
 * subfolders). Files that fail to parse or lack an `_id` are skipped with a warn.
 */
export function readPack(packDir: string): PackFile[] {
  const files = listYamlFiles(packDir);
  const out: PackFile[] = [];
  for (const relPath of files) {
    const text = readFileSync(join(packDir, relPath), "utf8");
    let doc: RawDoc;
    try {
      doc = parse(text) as RawDoc;
    } catch (err) {
      console.warn(`[packs] failed to parse ${relPath}: ${String(err)}`);
      continue;
    }
    if (!doc || typeof doc._id !== "string") {
      console.warn(`[packs] skipping ${relPath}: no _id`);
      continue;
    }
    out.push({ doc, relPath });
  }
  return out;
}

/** Read a pack and key the docs by `_id`. */
export function readPackById(packDir: string): Map<string, PackFile> {
  const map = new Map<string, PackFile>();
  for (const pf of readPack(packDir)) {
    map.set(pf.doc._id, pf);
  }
  return map;
}
