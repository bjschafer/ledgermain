/**
 * Moving characters from the app's old address to its new one.
 *
 * Characters live in IndexedDB, which belongs to one origin, so a player who
 * used the app at {@link LEGACY_APP_ORIGIN} has characters that
 * {@link APP_ORIGIN} cannot read. The old host keeps serving this same bundle,
 * which recognizes it and offers to carry those characters over instead of
 * mounting the app.
 *
 * The characters travel in the URL fragment of a single navigation:
 * `https://ledgermain.app/#handoff=<payload>`. A fragment never reaches a
 * server, needs no popup or opener (which an installed home-screen app does
 * not get), and works the same in every browser. The new origin asks before it
 * writes anything, since anyone can build such a link, and never overwrites a
 * character it already has.
 *
 * A fragment has a length ceiling, and portraits make documents large, so a
 * big collection goes over in parts: the new origin sends the player back to
 * `#move=<part>` on the old one, which builds that part and navigates again.
 * The old origin cannot edit anything any more, so building the same plan on
 * every visit gives the same parts.
 */
import type { CharacterDoc } from "@pf1/schema";

import { parseImportedDoc } from "./importCharacter.js";
import { parseSessionLog, type SessionLogEntry } from "./sessionLog.js";

export const LEGACY_APP_HOST = "ledgermain.whizkid.dev";
export const LEGACY_APP_ORIGIN = `https://${LEGACY_APP_HOST}`;
export const APP_ORIGIN = "https://ledgermain.app";

/**
 * Encoded characters per navigation. Chromium caps a URL at 2 MB, and Firefox
 * and WebKit go higher, so this leaves room for the origin and the prefix with
 * margin to spare.
 */
export const HANDOFF_BUDGET = 1_000_000;

const PAYLOAD_VERSION = 1;
const HANDOFF_HASH = /^#handoff=([A-Za-z0-9_-]+)$/;
const MOVE_HASH = /^#move=([1-9]\d*)$/;

/** The name every blank character starts with (`createEmptyDoc`). */
const BLANK_NAME = "New Adventurer";

export interface HandoffCharacter {
  doc: CharacterDoc;
  log: SessionLogEntry[];
}

/** One navigation's worth of characters. `part` counts from 1. */
export interface HandoffPart {
  part: number;
  parts: number;
  /** The character the player had open on the old address, if it is in this part. */
  activeId: string | null;
  characters: HandoffCharacter[];
}

export interface HandoffPlan {
  /** Encoded payloads, one per part, in order. */
  parts: string[];
  /** Characters too large to fit a link even alone; these have to go by file export. */
  tooLarge: CharacterDoc[];
}

export function isLegacyHost(hostname: string): boolean {
  return hostname === LEGACY_APP_HOST;
}

/**
 * Whether a stored character is the player's, rather than something the app
 * put there on its own: the bundled sample as shipped, or the blank it creates
 * on a first visit. Both are recreated on the new origin, and both are still at
 * `version` 1 because only a real edit bumps it.
 */
export function isWorthMoving(doc: CharacterDoc, sampleId: string): boolean {
  if (doc.version > 1) return true;
  if (doc.id === sampleId) return false;
  const untouchedBlank =
    doc.identity.name === BLANK_NAME &&
    doc.identity.race === "" &&
    doc.identity.classes.length === 0;
  return !untouchedBlank;
}

/** The payload in a `#handoff=` fragment, or `null` when the fragment isn't one. */
export function parseHandoffHash(hash: string): string | null {
  return HANDOFF_HASH.exec(hash)?.[1] ?? null;
}

/** The part a `#move=` fragment on the old address asks for, or `null`. */
export function parseMoveHash(hash: string): number | null {
  const match = MOVE_HASH.exec(hash);
  return match ? Number(match[1]) : null;
}

export function handoffUrl(encoded: string): string {
  return `${APP_ORIGIN}/#handoff=${encoded}`;
}

export function moveUrl(part: number): string {
  return `${LEGACY_APP_ORIGIN}/#move=${part}`;
}

/**
 * Split characters into parts that each fit {@link HANDOFF_BUDGET}, in a fixed
 * order so every visit to the old address produces the same parts.
 *
 * Packing uses each character's size encoded alone. Encoding several together
 * only compresses better, so a part never comes out larger than its estimate.
 */
export async function planHandoff(
  characters: readonly HandoffCharacter[],
  activeId: string | null,
  budget: number = HANDOFF_BUDGET,
): Promise<HandoffPlan> {
  const ordered = [...characters].sort((a, b) => (a.doc.id < b.doc.id ? -1 : 1));
  const sized = await Promise.all(
    ordered.map(async (c) => ({
      character: c,
      size: (await encodeHandoff({ part: 1, parts: 1, activeId: null, characters: [c] })).length,
    })),
  );

  const groups: HandoffCharacter[][] = [];
  const tooLarge: CharacterDoc[] = [];
  let current: HandoffCharacter[] = [];
  let currentSize = 0;
  for (const { character, size } of sized) {
    if (size > budget) {
      tooLarge.push(character.doc);
      continue;
    }
    if (current.length > 0 && currentSize + size > budget) {
      groups.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(character);
    currentSize += size;
  }
  if (current.length > 0) groups.push(current);

  const parts = await Promise.all(
    groups.map((group, i) =>
      encodeHandoff({
        part: i + 1,
        parts: groups.length,
        activeId: group.some((c) => c.doc.id === activeId) ? activeId : null,
        characters: group,
      }),
    ),
  );
  return { parts, tooLarge };
}

export async function encodeHandoff(part: HandoffPart): Promise<string> {
  const json = JSON.stringify({ v: PAYLOAD_VERSION, ...part });
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return toBase64Url(bytes);
}

/**
 * Read a `#handoff=` payload. Anyone can build one of these links, so every
 * character goes through the same validation as a file import. Throws with a
 * message the import screen can show.
 */
export async function decodeHandoff(encoded: string): Promise<HandoffPart> {
  let value: unknown;
  try {
    const stream = new Blob([fromBase64Url(encoded)])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    value = JSON.parse(await new Response(stream).text());
  } catch {
    throw new Error("This link is damaged or incomplete.");
  }
  if (!isPlainObject(value) || value.v !== PAYLOAD_VERSION) {
    throw new Error("This link isn't one Ledgermain can read.");
  }
  const { part, parts, activeId, characters } = value;
  if (
    !Number.isInteger(part) ||
    !Number.isInteger(parts) ||
    (part as number) < 1 ||
    (part as number) > (parts as number) ||
    !Array.isArray(characters) ||
    characters.length === 0
  ) {
    throw new Error("This link isn't one Ledgermain can read.");
  }
  return {
    part: part as number,
    parts: parts as number,
    activeId: typeof activeId === "string" ? activeId : null,
    characters: characters.map((c: unknown) => {
      if (!isPlainObject(c)) throw new Error("This link isn't one Ledgermain can read.");
      return { doc: parseImportedDoc(c.doc), log: parseSessionLog(c.log) };
    }),
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  // Chunked: spreading a large array into one call overflows the argument limit.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
