import { expect, test, type Page } from "@playwright/test";

/**
 * Elemental Defense in the tracker: spending some of the burn you're holding
 * on the defense moves a real number on the sheet, and a rest takes it back.
 *
 * `packages/engine/test/kineticistDefense.test.ts` pins the per-element
 * arithmetic; this covers that the counter is reachable under the Burn row
 * and that the sheet follows it.
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

test("burn spent on Shroud of Water raises armor class, and a rest gives it back", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);

  await page.goto("/");
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });

  const classes = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Classes" }),
  });
  await classes.getByRole("button", { name: "Kineticist", exact: true }).click();
  // 6th level: Shroud of Water is +5 armor (4, +1 for four levels past 2nd).
  const stepper = classes.locator(".stepper").filter({
    has: page.getByLabel("Kineticist level"),
  });
  for (let i = 0; i < 5; i++) {
    await stepper.getByRole("button", { name: "increment" }).click();
  }

  const focus = page.locator(".subsection", {
    has: page.getByRole("heading", { name: "Elemental Focus" }),
  });
  await focus.locator("select").first().selectOption("water");

  const ac = sealValue(page, "Armor Class");
  await expect(ac).toHaveText("15"); // 10 + 5 armor, Dex 10

  await page.getByRole("tab", { name: "Play" }).click();

  // The defense panel only offers burn the character is actually holding.
  const defense = page.locator(".elemental-defense");
  await expect(defense).toContainText("Shroud of Water");
  await expect(defense).toContainText("+5 armor bonus to AC");

  const burnRow = page.locator(".res-row", { hasText: "Burn" });
  await burnRow.getByRole("button", { name: "spend Burn" }).click();
  await burnRow.getByRole("button", { name: "spend Burn" }).click();

  await defense.getByRole("button", { name: "increment" }).click();
  await expect(ac).toHaveText("16");
  await defense.getByRole("button", { name: "increment" }).click();
  await expect(ac).toHaveText("17");

  // Cap is half the base (+2 here), so a third point does nothing at all.
  await expect(defense.getByRole("button", { name: "increment" })).toBeDisabled();

  // Reshaping it into a shield drops to the smaller base (+3, cap +1).
  await defense.locator("select").selectOption("shield");
  await expect(ac).toHaveText("14");

  // A rest removes the burn and the boost with it.
  await page.getByRole("button", { name: "Rest (full)" }).click();
  await expect(defense).toContainText("of 0 held");
  await expect(ac).toHaveText("13"); // shield base 3, no burn

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
