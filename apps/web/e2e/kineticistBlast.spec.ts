import { expect, test, type Page } from "@playwright/test";

/**
 * The kineticist's air/water simple-blast choice reaching the sheet: air and
 * water each offer two blasts, and the pick decides which composite blast the
 * character qualifies for.
 *
 * `packages/engine/test/kineticistElements.test.ts` pins the eligibility
 * arithmetic; what this adds is that the choice is reachable in the real
 * builder and that a composite blast appears/disappears as the player changes
 * it — the visible payoff of a pick that otherwise looks cosmetic.
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

test("a kineticist's air blast choice decides which air+water composite blast unlocks", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);

  await page.goto("/");
  await expect(
    page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value"),
  ).toBeVisible({ timeout: 15_000 });

  const classes = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Classes" }),
  });
  await classes.getByRole("button", { name: "Kineticist", exact: true }).click();
  // 7th level is the earliest an Expanded Element pick exists at all.
  const stepper = classes.locator(".stepper").filter({
    has: page.getByLabel("Kineticist level"),
  });
  for (let i = 0; i < 6; i++) {
    await stepper.getByRole("button", { name: "increment" }).click();
  }

  const focus = page.locator(".subsection", {
    has: page.getByRole("heading", { name: "Elemental Focus" }),
  });
  const selects = focus.locator("select");

  // Primary element -> Air. The blast select only exists for air/water.
  await selects.first().selectOption("air");
  const blastSelect = focus.locator("select").nth(1);
  await expect(blastSelect).toHaveValue("airBlast");
  await expect(blastSelect.locator("option")).toHaveText([/Air Blast/, /Electric Blast/]);

  // Expanded Element (7th) -> Water. Air blast + the default water blast
  // qualify for NEITHER air/water composite, so the list doesn't render at all
  // (both RAW prerequisites name an alternate blast).
  await focus.locator("select").nth(2).selectOption("water");
  const composites = focus.locator(".order-abilities");
  await expect(composites).toHaveCount(0);

  // Swapping the primary's blast to Electric Blast unlocks Charged Water Blast
  // (RAW prerequisite: electric blast + water blast) and nothing else.
  await blastSelect.selectOption("electricBlast");
  await expect(composites.locator("li")).toHaveText([/Charged Water Blast/]);

  // The mirror-image pick swaps which one you get: back to Air Blast, and the
  // expanded element's own blast select (rendered only for air/water) to Cold
  // Blast — RAW's Blizzard Blast prerequisite.
  await blastSelect.selectOption("airBlast");
  await expect(composites).toHaveCount(0);
  await focus.locator("select").nth(3).selectOption("coldBlast");
  await expect(composites.locator("li")).toHaveText([/Blizzard Blast/]);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
