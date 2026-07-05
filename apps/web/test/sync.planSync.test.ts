import { describe, expect, test } from "bun:test";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  acceptRemoteDoc,
  forceOverwriteDoc,
  planAction,
  planSync,
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

  test("pushes when local is ahead", () => {
    expect(planAction({ id: "a", version: 5 }, { id: "a", version: 3 }, "a")).toEqual({
      kind: "push",
      id: "a",
    });
  });

  test("pulls when remote is ahead", () => {
    expect(planAction({ id: "a", version: 2 }, { id: "a", version: 3 }, "a")).toEqual({
      kind: "pull",
      id: "a",
    });
  });

  test("does nothing when versions match", () => {
    expect(planAction({ id: "a", version: 3 }, { id: "a", version: 3 }, "a")).toEqual({
      kind: "same",
      id: "a",
    });
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
        { id: "ahead-locally", version: 5 },
        { id: "in-sync", version: 2 },
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
        { id: "keep", version: 1 },
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
