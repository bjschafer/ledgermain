/**
 * A small, dependency-free ZIP reader: archive bytes -> named entries.
 *
 * Hero Lab classic's `.por` portfolio is the only consumer today (see
 * `importHeroLab.ts`) — a `.por` is a plain ZIP holding the statblock exports
 * plus Hero Lab's own native save files. Same posture as the sibling
 * `xml.ts`: hand-rolled rather than a dependency, so the importer's tests
 * exercise the exact same path production does.
 *
 * Decompression uses the platform `DecompressionStream("deflate-raw")`, which
 * both the browser and Bun provide, so there is no bundled inflate here. Only
 * the two compression methods a `.por` actually uses are supported — stored
 * (0) and deflate (8); anything else throws rather than returning garbage.
 * No zip64, no encryption, no multi-disk archives.
 */

/** One file in the archive. Directory entries are not returned. */
export interface ZipEntry {
  /** Path within the archive, e.g. `"statblocks_xml/1_Crush.xml"`. */
  name: string;
  bytes: Uint8Array;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
/** EOCD is 22 bytes plus a comment of up to 0xffff. */
const MAX_EOCD_SCAN = 22 + 0xffff;

/** True when `bytes` starts with the ZIP local-header magic (`PK\x03\x04`). */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

/** Locate the End Of Central Directory record by scanning backwards for its signature. */
function findEocd(view: DataView): number {
  const limit = Math.max(0, view.byteLength - MAX_EOCD_SCAN);
  for (let i = view.byteLength - 22; i >= limit; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) return i;
  }
  throw new Error("not a ZIP archive (no end-of-central-directory record found)");
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("this browser can't decompress ZIP archives (no DecompressionStream)");
  }
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Read every file in a ZIP archive. Throws a descriptive `Error` on anything
 * malformed or unsupported — callers turn that into a clean, user-facing
 * rejection rather than letting it escape raw.
 */
export async function readZip(input: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const eocd = findEocd(view);
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  // The directory walk is synchronous; each entry's decompression is kicked
  // off as it's found and the whole batch awaited at the end, so a portfolio's
  // handful of files inflate concurrently rather than one after another.
  const pending: { name: string; bytes: Uint8Array | Promise<Uint8Array> }[] = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > input.byteLength || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) {
      throw new Error(`corrupt ZIP central directory (entry ${i + 1} of ${count})`);
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(input.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    // Directory entries carry a trailing slash and no content.
    if (name.endsWith("/")) continue;

    // The local header repeats the name/extra fields, and its extra field
    // length can differ from the central one — so the data start has to be
    // computed from the LOCAL header, not the central directory's copy.
    if (
      localOffset + 30 > input.byteLength ||
      view.getUint32(localOffset, true) !== LOCAL_SIGNATURE
    ) {
      throw new Error(`corrupt ZIP entry "${name}" (bad local header)`);
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = input.subarray(start, start + compressedSize);

    if (method === 0) {
      pending.push({ name, bytes: raw });
    } else if (method === 8) {
      pending.push({ name, bytes: inflateRaw(raw) });
    } else {
      throw new Error(`unsupported ZIP compression method ${method} for "${name}"`);
    }
  }

  return await Promise.all(pending.map(async (e) => ({ name: e.name, bytes: await e.bytes })));
}
