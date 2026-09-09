import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  migrateDoc,
  migrateImportedDoc,
} from "../src/model/migrations.js";

/** A current-shape doc stamped with an older version, as persistence holds. */
function stored(schemaVersion: number, patch: (doc: CharacterDoc) => CharacterDoc = (d) => d) {
  return patch({ ...createEmptyDoc("t"), schemaVersion });
}

const stepById = (id: string) => {
  const step = MIGRATIONS.find((m) => m.id === id);
  if (!step) throw new Error(`no migration step ${id}`);
  return step;
};

describe("the chain itself", () => {
  it("is ordered by ascending target version", () => {
    const versions = MIGRATIONS.map((m) => m.to);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
  });

  it("has unique step ids", () => {
    const ids = MIGRATIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tops out at CURRENT_SCHEMA_VERSION", () => {
    expect(Math.max(...MIGRATIONS.map((m) => m.to))).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("createEmptyDoc stamps the current version", () => {
    expect(createEmptyDoc("t").schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("every step is idempotent on a fresh doc", () => {
    for (const step of MIGRATIONS) {
      const doc = createEmptyDoc("t");
      expect(step.apply(doc)).toBe(doc);
    }
  });
});

describe("step: live-spells", () => {
  const apply = stepById("live-spells").apply;

  it("adds live.spells to a doc that has none", () => {
    const legacy = {
      ...createEmptyDoc("t"),
      live: { ...createEmptyDoc("t").live, spells: undefined },
    } as unknown as CharacterDoc;
    expect(apply(legacy).live.spells).toEqual({ prepared: [] });
  });

  it("leaves an existing prepared list alone", () => {
    const doc = createEmptyDoc("t");
    doc.live.spells = { prepared: [{ spellId: "x", expended: false }] };
    expect(apply(doc)).toBe(doc);
  });
});

describe("step: drop-legacy-prepared", () => {
  const apply = stepById("drop-legacy-prepared").apply;

  it("keeps `known` and drops the legacy `prepared` sibling", () => {
    const legacy = {
      ...createEmptyDoc("t"),
      build: { ...createEmptyDoc("t").build, spells: { known: ["x"], prepared: [] } },
    } as unknown as CharacterDoc;
    const out = apply(legacy);
    expect(out.build.spells).toEqual({ known: ["x"] });
    expect("prepared" in out.build.spells).toBe(false);
  });

  it("is a no-op once the sibling is gone", () => {
    const doc = createEmptyDoc("t");
    expect(apply(apply(doc))).toBe(doc);
  });
});

describe("step: cleric-domains", () => {
  const apply = stepById("cleric-domains").apply;

  it("backfills the empty array", () => {
    const legacy = { ...createEmptyDoc("t") };
    delete (legacy.build as { clericDomains?: string[] }).clericDomains;
    expect(apply(legacy).build.clericDomains).toEqual([]);
  });

  it("never clobbers picked domains", () => {
    const doc = createEmptyDoc("t");
    doc.build.clericDomains = ["Air", "Fire"];
    expect(apply(doc).build.clericDomains).toEqual(["Air", "Fire"]);
  });
});

describe("step: archetypes", () => {
  const apply = stepById("archetypes").apply;

  it("backfills the empty array on a pre-archetype doc", () => {
    const legacy = { ...createEmptyDoc("t") };
    delete (legacy.build as { archetypes?: string[] }).archetypes;
    expect(apply(legacy).build.archetypes).toEqual([]);
  });

  it("never clobbers picked archetypes", () => {
    const doc = createEmptyDoc("t");
    doc.build.archetypes = ["two-handed-fighter"];
    expect(apply(doc).build.archetypes).toEqual(["two-handed-fighter"]);
  });
});

describe("step: alignment-code", () => {
  const apply = stepById("alignment-code").apply;

  it("rewrites a full label to its code", () => {
    const doc = { ...createEmptyDoc("t") };
    doc.identity.alignment = "Neutral Good";
    expect(apply(doc).identity.alignment).toBe("NG");
  });

  it("leaves a code alone", () => {
    const doc = { ...createEmptyDoc("t") };
    doc.identity.alignment = "NG";
    expect(apply(doc)).toBe(doc);
  });

  it("keeps an unrecognized string as-is", () => {
    const doc = { ...createEmptyDoc("t") };
    doc.identity.alignment = "Chaotic Delicious";
    expect(apply(doc).identity.alignment).toBe("Chaotic Delicious");
  });
});

describe("migrateDoc()", () => {
  it("runs every step for a v1 doc and stamps the current version", () => {
    const legacy = {
      ...stored(1),
      identity: { ...stored(1).identity, alignment: "Neutral Good" },
      build: { ...stored(1).build, spells: { known: ["x"], prepared: [] } },
      live: { ...stored(1).live, spells: undefined },
    } as unknown as CharacterDoc;
    delete (legacy.build as { clericDomains?: string[] }).clericDomains;
    delete (legacy.build as { archetypes?: string[] }).archetypes;

    const out = migrateDoc(legacy);
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(out.live.spells).toEqual({ prepared: [] });
    expect(out.build.spells).toEqual({ known: ["x"] });
    expect(out.build.clericDomains).toEqual([]);
    expect(out.build.archetypes).toEqual([]);
    expect(out.identity.alignment).toBe("NG");
  });

  it("still runs the v3 steps for a v2 doc", () => {
    const doc = stored(2);
    delete (doc.build as { archetypes?: string[] }).archetypes;
    doc.identity.alignment = "Lawful Evil";
    const out = migrateDoc(doc);
    expect(out.build.archetypes).toEqual([]);
    expect(out.identity.alignment).toBe("LE");
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("is a no-op for an already-current doc", () => {
    const doc = createEmptyDoc("t");
    expect(migrateDoc(doc)).toBe(doc);
  });

  it("is idempotent", () => {
    const once = migrateDoc(stored(1));
    expect(migrateDoc(once)).toBe(once);
  });

  it("treats a missing schemaVersion as v0", () => {
    const doc = { ...createEmptyDoc("t") } as Partial<CharacterDoc>;
    delete doc.schemaVersion;
    expect(migrateDoc(doc as CharacterDoc).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("never downgrades a doc written by a newer build", () => {
    const future = { ...createEmptyDoc("t"), schemaVersion: CURRENT_SCHEMA_VERSION + 5 };
    expect(migrateDoc(future)).toBe(future);
    expect(future.schemaVersion).toBe(CURRENT_SCHEMA_VERSION + 5);
  });
});

describe("migrateImportedDoc()", () => {
  it("repairs a file whose schemaVersion outruns its shape", () => {
    const lying = { ...createEmptyDoc("t"), schemaVersion: CURRENT_SCHEMA_VERSION };
    delete (lying.build as { archetypes?: string[] }).archetypes;
    lying.identity.alignment = "Neutral Good";

    // The Dexie read path trusts the stamp; import does not.
    expect(migrateDoc(lying).build.archetypes).toBeUndefined();
    const out = migrateImportedDoc(lying);
    expect(out.build.archetypes).toEqual([]);
    expect(out.identity.alignment).toBe("NG");
  });

  it("brings an older export up to the current version", () => {
    expect(migrateImportedDoc(stored(1)).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("leaves a newer export's version alone", () => {
    const future = { ...createEmptyDoc("t"), schemaVersion: CURRENT_SCHEMA_VERSION + 5 };
    expect(migrateImportedDoc(future).schemaVersion).toBe(CURRENT_SCHEMA_VERSION + 5);
  });
});
