import { describe, expect, it } from "bun:test";

import { compute } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  kineticUtilityActions,
  setKineticistElement,
  toggleKineticistWildTalent,
} from "../src/model/kineticistBuild.js";

const ref = loadRefData();

/**
 * `kineticUtilityActions` (`model/kineticistBuild.ts`) is what
 * `ResourcesPanel.tsx`'s `KineticUtilityActionsPanel` renders — the visible
 * "what does this activated pick do at the table" row Kinetic Healer and
 * friends need, since none of them carry a permanent `Change` (see
 * `@pf1/engine` `kineticist-wild-talents.ts`'s file doc comment).
 */
function withKineticist(level: number, element: string): CharacterDoc {
  const d = createEmptyDoc("t");
  return setKineticistElement(
    { ...d, identity: { ...d.identity, classes: [{ tag: "kineticist", level }] } },
    element,
  );
}

describe("kineticUtilityActions", () => {
  it("is empty for a kineticist who picked none of the covered talents", () => {
    const doc = withKineticist(6, "fire");
    const sheet = compute(doc, ref);
    expect(kineticUtilityActions(doc, ref, sheet)).toEqual([]);
  });

  it("Kinetic Healer surfaces its burn cost and the character's blast damage as the heal amount", () => {
    let doc = withKineticist(6, "water");
    doc = toggleKineticistWildTalent(doc, "water:kineticHealer");
    const sheet = compute(doc, ref);
    const actions = kineticUtilityActions(doc, ref, sheet);
    const healer = actions.find((a) => a.id === "water:kineticHealer");
    expect(healer?.name).toBe("Kinetic Healer");
    expect(healer?.burn).toBe(1);
    const blast = sheet.kineticBlasts[0]!;
    expect(healer?.detail).toContain(blast.damageDice);
    expect(healer?.detail).toContain("1 burn");
  });

  it("Void Healer and Wood Healer surface the same shape under their own ids", () => {
    let doc = withKineticist(6, "void");
    doc = toggleKineticistWildTalent(doc, "void:voidHealer");
    const sheet = compute(doc, ref);
    const actions = kineticUtilityActions(doc, ref, sheet);
    expect(actions.map((a) => a.id)).toEqual(["void:voidHealer"]);
    expect(actions[0]!.name).toBe("Void Healer");
  });

  it("Kinetic Restoration scales its healing dice with kineticist level", () => {
    let doc = withKineticist(9, "wood");
    doc = toggleKineticistWildTalent(doc, "universal:kineticRestoration");
    const sheet = compute(doc, ref);
    const restoration = kineticUtilityActions(doc, ref, sheet).find(
      (a) => a.id === "universal:kineticRestoration",
    );
    expect(restoration?.burn).toBe(1);
    expect(restoration?.detail).toContain("9d6");
  });

  it("Celerity surfaces its free 1-round grant and the burn-extended duration", () => {
    let doc = withKineticist(12, "air");
    doc = toggleKineticistWildTalent(doc, "air:celerity");
    const sheet = compute(doc, ref);
    const celerity = kineticUtilityActions(doc, ref, sheet).find((a) => a.id === "air:celerity");
    expect(celerity?.name).toBe("Celerity");
    expect(celerity?.burn).toBe(1);
    expect(celerity?.detail).toContain("12");
  });

  it("multiple picked talents surface as multiple rows", () => {
    let doc = withKineticist(9, "water");
    doc = toggleKineticistWildTalent(doc, "water:kineticHealer");
    doc = toggleKineticistWildTalent(doc, "universal:kineticRestoration");
    const sheet = compute(doc, ref);
    const ids = kineticUtilityActions(doc, ref, sheet).map((a) => a.id);
    expect(ids).toEqual(["water:kineticHealer", "universal:kineticRestoration"]);
  });
});
