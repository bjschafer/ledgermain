/**
 * The registry in `model/panelOwnedBuffs.ts` only helps if it stays complete.
 * A new toggle-buff namespace that nobody classifies would quietly take the
 * `BuffsPanel` default, which is right for most namespaces and wrong for one
 * whose own panel already renders it, so this scans the engine's toggle tables
 * and fails on any namespace the registry has not heard of.
 *
 * Two literal shapes carry a namespace: a `ToggleBuffOption`'s
 * `id: "<namespace>:<option>"`, and a bare `"<namespace>:"` prefix constant for
 * the tags built at runtime (combat styles, one per owned feat). Only files
 * that mention `ToggleBuffOption` are read, because a colon-namespaced `id` is
 * a common shape in this engine (class-feature classification keys, choice
 * ids) and none of those become an `ActiveBuff.effectTag`.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  COMBAT_STANCES,
  COMBAT_STANCE_REFERENCE_BUFF_IDS,
  combatStyleEffectTag,
} from "@pf1/engine";

import { TOGGLE_BUFF_NAMESPACES, isPanelOwnedBuff } from "../src/model/panelOwnedBuffs.js";

const ENGINE_SRC = join(import.meta.dir, "..", "..", "..", "packages", "engine", "src");

const OPTION_ID = /\bid:\s*"([a-z][a-zA-Z]*):[a-zA-Z]/g;
const TAG_PREFIX = /"([a-z][a-zA-Z]*):"/g;

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(full);
    else if (entry.name.endsWith(".ts")) yield full;
  }
}

function engineNamespaces(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(ENGINE_SRC)) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("ToggleBuffOption")) continue;
    for (const re of [OPTION_ID, TAG_PREFIX]) {
      re.lastIndex = 0;
      for (const match of text.matchAll(re)) {
        if (!found.has(match[1]!)) found.set(match[1]!, file);
      }
    }
  }
  return found;
}

describe("toggle-buff namespace registry", () => {
  it("classifies every namespace the engine declares", () => {
    const found = engineNamespaces();
    expect(found.size).toBeGreaterThan(0);
    const unclassified = [...found].filter(([ns]) => !(ns in TOGGLE_BUFF_NAMESPACES));
    expect(
      unclassified.map(([ns, file]) => `${ns} (${file})`),
      "a new toggle-buff namespace has to say whether its own panel renders it " +
        "or BuffsPanel does; add it to TOGGLE_BUFF_NAMESPACES",
    ).toEqual([]);
  });

  it("hides panel-owned namespaces from the buff list and keeps the rest", () => {
    for (const [namespace, entry] of Object.entries(TOGGLE_BUFF_NAMESPACES)) {
      const buff = { effectTag: `${namespace}:sample` };
      expect(isPanelOwnedBuff(buff), namespace).toBe(entry.owner === "panel");
    }
  });

  it("claims the stance tags and the vendored buffs they stand in for", () => {
    for (const stance of COMBAT_STANCES) {
      expect(isPanelOwnedBuff({ effectTag: stance.id }), stance.id).toBe(true);
    }
    for (const buffId of Object.values(COMBAT_STANCE_REFERENCE_BUFF_IDS)) {
      expect(isPanelOwnedBuff({ buffId }), buffId).toBe(true);
    }
    expect(isPanelOwnedBuff({ effectTag: combatStyleEffectTag("crane-style") })).toBe(true);
  });

  it("leaves an ordinary vendored or user-authored buff to the buff list", () => {
    expect(isPanelOwnedBuff({ buffId: "someVendoredBuffId" })).toBe(false);
    expect(isPanelOwnedBuff({})).toBe(false);
  });
});
