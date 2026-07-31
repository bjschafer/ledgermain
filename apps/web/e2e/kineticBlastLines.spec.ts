import { expect, test, type Page } from "@playwright/test";

/**
 * The blast lines and the burn/nonlethal link, end to end: picking an element
 * puts real attack lines on the sheet, and accepting burn in the tracker both
 * raises them (Elemental Overflow) and costs hit points.
 *
 * `packages/engine/test/kineticBlast.test.ts` pins the arithmetic; what this
 * adds is that a player can reach it by building a kineticist and pressing
 * the tracker's own buttons.
 */

const benign = (t: string) =>
  /fonts\.(googleapis|gstatic)|favicon|net::ERR_|Failed to load resource/i.test(t);

function guard(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !benign(msg.text())) consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  return { consoleErrors, pageErrors };
}

function sealValue(page: Page, label: string) {
  return page.locator(".seal", { hasText: label }).locator(".seal-value");
}

test("blast lines land on the sheet, and burn raises them while costing hit points", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);

  await page.goto("/");
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });

  const classes = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Classes" }),
  });
  await classes.getByRole("button", { name: "Kineticist", exact: true }).click();
  // 4th level: BAB +3, blasts at 2d6, Elemental Overflow already online.
  const stepper = classes.locator(".stepper").filter({
    has: page.getByLabel("Kineticist level"),
  });
  for (let i = 0; i < 3; i++) {
    await stepper.getByRole("button", { name: "increment" }).click();
  }

  const focus = page.locator(".subsection", {
    has: page.getByRole("heading", { name: "Elemental Focus" }),
  });
  await focus.locator("select").first().selectOption("earth");

  // Earth Blast is physical, so it rolls against normal AC: BAB +3, Dex +0.
  const blastRow = page.locator(".weapon-attack-row", { hasText: "Earth Blast" });
  await expect(blastRow).toBeVisible();
  await expect(blastRow.locator(".blast-line-sub")).toContainText("ranged · 30 ft");
  await expect(blastRow.locator(".seal", { hasText: "Attack" }).locator(".seal-value")).toHaveText(
    "+3",
  );
  // 2d6 dice, +2 physical-blast rider, Con 10 adds nothing.
  await expect(blastRow.locator(".seal", { hasText: "Dmg" }).locator(".seal-value")).toHaveText(
    "2d6+2",
  );

  await page.getByRole("tab", { name: "Play" }).click();

  const burnRow = page.locator(".res-row", { hasText: "Burn" });
  await expect(burnRow).toBeVisible();
  await burnRow.getByRole("button", { name: "spend Burn" }).click();

  // 1 point of nonlethal per character level, applied for the player...
  await expect(page.locator(".hp-chip.nl")).toHaveText("4 nonlethal");
  // ...and Elemental Overflow's +1 attack / +2 damage rides the burn held.
  const playBlastRow = page.locator(".weapon-attack-row", { hasText: "Earth Blast" });
  await expect(
    playBlastRow.locator(".seal", { hasText: "Attack" }).locator(".seal-value"),
  ).toHaveText("+4");
  await expect(playBlastRow.locator(".seal", { hasText: "Dmg" }).locator(".seal-value")).toHaveText(
    "2d6+4",
  );

  // Giving the burn back heals exactly what it cost.
  await burnRow.getByRole("button", { name: "restore Burn" }).click();
  await expect(page.locator(".hp-chip.nl")).toHaveCount(0);
  await expect(
    playBlastRow.locator(".seal", { hasText: "Attack" }).locator(".seal-value"),
  ).toHaveText("+3");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
