import type { Change, ContextNote, SourceRef } from "@pf1/schema";

import { resolveUuidLinks } from "../util/html.js";

/** Looks up a compendium doc's name from its `Compendium.pf1.<pack>.Item.<id>` uuid. */
export type UuidResolver = (uuid: string) => string | undefined;

/**
 * Foundry stores collections (changes, contextNotes, actions) as objects keyed by
 * random ids rather than arrays. These helpers normalize them to arrays while
 * dropping the internal keys we don't need, and tolerate missing/legacy shapes.
 */

type Dict = Record<string, unknown>;

function asRecordArray(value: unknown): Dict[] {
  if (Array.isArray(value)) return value.filter(isDict);
  if (isDict(value)) return Object.values(value).filter(isDict);
  return [];
}

function isDict(v: unknown): v is Dict {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function normalizeChanges(value: unknown): Change[] {
  return asRecordArray(value)
    .map((c) => ({
      formula: String(c.formula ?? ""),
      target: String(c.target ?? ""),
      type: String(c.type ?? "untyped"),
      // Only "set" is a meaningful departure from the default additive
      // behavior, so omit the field entirely otherwise (keeps the vendored
      // JSON minimal — see Change's doc comment for semantics).
      ...(c.operator === "set" ? { operator: "set" as const } : {}),
    }))
    .filter((c) => c.target !== "");
}

export function normalizeContextNotes(
  value: unknown,
  resolveUuid: UuidResolver,
): ContextNote[] {
  return asRecordArray(value)
    .map((n) => ({
      target: String(n.target ?? ""),
      text: resolveUuidLinks(String(n.text ?? ""), resolveUuid),
    }))
    .filter((n) => n.text !== "");
}

export function normalizeSources(value: unknown): SourceRef[] | undefined {
  const arr = asRecordArray(value)
    .map((s) => {
      const id = str(s.id);
      if (!id) return null;
      const pages = s.pages == null ? undefined : String(s.pages);
      return pages === undefined ? { id } : { id, pages };
    })
    .filter((s): s is SourceRef => s !== null);
  return arr.length > 0 ? arr : undefined;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * Extracts `system.description.value` and resolves Foundry `@UUID[...]`
 * enrichers to plain names, e.g. "@UUID[...]{Rage}" -> "Rage" (and bare
 * `@UUID[...]` links to whatever `resolveUuid` finds), so raw enricher syntax
 * never leaks into the rendered sheet.
 */
export function descriptionValue(
  sys: Record<string, unknown>,
  resolveUuid: UuidResolver,
): string | undefined {
  const d = sys.description as Record<string, unknown> | undefined;
  return typeof d?.value === "string" ? resolveUuidLinks(d.value, resolveUuid) : undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}
