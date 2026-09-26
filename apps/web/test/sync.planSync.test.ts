import { describe, expect, test } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  acceptRemoteDoc,
  forceOverwriteDoc,
  planAction,
  planSync,
  sameContent,
  splitConflict,
  type SyncConflict,
} from "../src/sync/planSync.js";
import type { CharacterDoc } from "@pf1/schema";

function doc(version: number, name = "Test"): CharacterDoc {
  const base = createEmptyDoc("char-1");
  return { ...base, version, identity: { ...base.identity, name } };
}

describe("planAction", () => {
  test("pushes when there's no remote copy yet", () => {
    expect(planAction({ id: "a", version: 3 }, undefined, "a")).toEqual({ kind: "push", id: "a" });
  });

  test("pulls when there's no local copy yet", () => {
    expect(planAction(undefined, { id: "a", version: 1 }, "a")).toEqual({ kind: "pull", id: "a" });
  });

  test("pushes when only this device moved since the last sync", () => {
    expect(
      planAction({ id: "a", version: 5, syncedVersion: 3 }, { id: "a", version: 3 }, "a"),
    ).toEqual({ kind: "push", id: "a" });
  });

  test("pulls when only the server moved since the last sync", () => {
    expect(
      planAction({ id: "a", version: 2, syncedVersion: 2 }, { id: "a", version: 3 }, "a"),
    ).toEqual({ kind: "pull", id: "a" });
  });

  test("does nothing when neither side moved", () => {
    expect(
      planAction({ id: "a", version: 3, syncedVersion: 3 }, { id: "a", version: 3 }, "a"),
    ).toEqual({ kind: "same", id: "a" });
  });

  // The lost-edits case: a laptop whose session expired kept editing from 10
  // to 25 while a desktop went 10 to 12. Higher-wins would pull 12 over the
  // laptop's work (or push 25 over the desktop's); both moved, so ask.
  test("conflicts when both sides moved, whichever is numerically ahead", () => {
    const local = { id: "a", version: 25, syncedVersion: 10 };
    expect(planAction(local, { id: "a", version: 12 }, "a").kind).toBe("conflict");
    expect(planAction(local, { id: "a", version: 30 }, "a").kind).toBe("conflict");
  });

  test("conflicts when both sides moved to the same number", () => {
    expect(
      planAction({ id: "a", version: 15, syncedVersion: 10 }, { id: "a", version: 15 }, "a"),
    ).toEqual({ kind: "conflict", id: "a" });
  });

  test("conflicts when there's no record of the last sync to compare against", () => {
    expect(planAction({ id: "a", version: 5 }, { id: "a", version: 3 }, "a").kind).toBe("conflict");
    expect(planAction({ id: "a", version: 3 }, { id: "a", version: 3 }, "a").kind).toBe("conflict");
  });

  test("deletes the local copy when the id is tombstoned", () => {
    expect(planAction({ id: "a", version: 9 }, undefined, "a", true)).toEqual({
      kind: "delete-local",
      id: "a",
    });
  });

  test("a tombstoned id wins even if the server still lists a copy", () => {
    expect(planAction({ id: "a", version: 1 }, { id: "a", version: 5 }, "a", true)).toEqual({
      kind: "delete-local",
      id: "a",
    });
  });

  test("a tombstoned id with no local copy is a no-op (never pulls it back)", () => {
    expect(planAction(undefined, undefined, "a", true)).toEqual({ kind: "same", id: "a" });
  });
});

describe("planSync", () => {
  test("plans every id seen locally and/or remotely", () => {
    const actions = planSync(
      [
        { id: "local-only", version: 1 },
        { id: "ahead-locally", version: 5, syncedVersion: 3 },
        { id: "in-sync", version: 2, syncedVersion: 2 },
      ],
      [
        { id: "remote-only", version: 1 },
        { id: "ahead-locally", version: 3 },
        { id: "in-sync", version: 2 },
      ],
    );
    const byId = Object.fromEntries(actions.map((a) => [a.id, a.kind]));
    expect(byId).toEqual({
      "local-only": "push",
      "remote-only": "pull",
      "ahead-locally": "push",
      "in-sync": "same",
    });
  });

  test("plans a delete-local for a locally-present but tombstoned id", () => {
    const actions = planSync(
      [
        { id: "keep", version: 1, syncedVersion: 1 },
        { id: "deleted-elsewhere", version: 4 },
      ],
      [{ id: "keep", version: 1 }],
      [{ id: "deleted-elsewhere" }],
    );
    const byId = Object.fromEntries(actions.map((a) => [a.id, a.kind]));
    expect(byId).toEqual({ keep: "same", "deleted-elsewhere": "delete-local" });
  });

  test("returns an empty plan for no characters at all", () => {
    expect(planSync([], [])).toEqual([]);
  });
});

describe("conflict resolution", () => {
  const local = doc(4, "Test");
  const remote = doc(6, "Server Copy");
  const conflict: SyncConflict = { local, remote };

  test("acceptRemoteDoc adopts the server's copy verbatim", () => {
    expect(acceptRemoteDoc(conflict)).toBe(remote);
  });

  test("forceOverwriteDoc bumps local's version past the remote's", () => {
    const forced = forceOverwriteDoc(conflict);
    expect(forced.version).toBe(7);
    expect(forced.identity.name).toBe("Test"); // keeps local content, not the remote's
  });

  test("forceOverwriteDoc still wins even if local's version happens to already be higher", () => {
    const aheadConflict: SyncConflict = { local: doc(10), remote: doc(6) };
    expect(forceOverwriteDoc(aheadConflict).version).toBe(11);
  });
});

describe("sameContent", () => {
  test("ignores the sync envelope", () => {
    const a = doc(3);
    expect(sameContent(a, { ...a, version: 9, updatedAt: "2030-01-01T00:00:00.000Z" })).toBe(true);
  });

  test("sees a real edit", () => {
    expect(sameContent(doc(3, "Test"), doc(3, "Renamed"))).toBe(false);
  });
});

describe("splitConflict", () => {
  test("keeps the server's copy under the id and the local edits as a new character", () => {
    const local = doc(25, "Valeros");
    const remote = doc(12, "Valeros (desktop)");
    const { remote: kept, copy } = splitConflict(
      { local, remote },
      "new-id",
      "2026-09-25T00:00:00.000Z",
    );
    expect(kept).toBe(remote);
    expect(copy.id).toBe("new-id");
    expect(copy.identity.name).toBe("Valeros (copy)");
    expect(copy.build).toEqual(local.build);
    expect(copy.version).toBe(1);
  });
});
