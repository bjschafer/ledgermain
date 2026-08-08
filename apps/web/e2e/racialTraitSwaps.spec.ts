import { expect, type Page, test } from "@playwright/test";

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

/**
 * A race has one of each standard trait to trade away, so two alternates that
 * replace the same one can't both be taken. Elf is the fixture: Dreamspeaker
 * and Fleet-Footed both trade Elven Magic, and the vendored list's Silent
 * Hunter does too, which is what makes this the case that has to hold across
 * both pickers rather than inside one of them.
 */
test("taking an alternate blocks the others that trade the same standard trait", async ({
  page,
}) => {
  const errs = guard(page);

  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();

  // The panel h2 runs its step marker straight onto the title ("Raceiii"), so
  // this matches on a prefix rather than a word boundary.
  const racePanel = page
    .locator("section.panel")
    .filter({ has: page.locator("h2", { hasText: /^Race/ }) });

  const header = racePanel.getByRole("button", { name: "Race" });
  if ((await header.getAttribute("aria-expanded")) === "false") await header.click();

  await racePanel.getByRole("button", { name: "Elf", exact: true }).click();
  const confirmSwitch = page.getByRole("button", { name: "Switch race" });
  if (await confirmSwitch.isVisible().catch(() => false)) await confirmSwitch.click();

  // Filtered on the row's name line, not the whole row: a blocked row also
  // names the trait that took the swap, which would make `hasText` ambiguous.
  const row = (name: string) =>
    racePanel.locator(".pick-row").filter({ has: page.locator(".pname", { hasText: name }) });
  const fleetFooted = row("Fleet-Footed");
  const dreamspeaker = row("Dreamspeaker");

  await expect(fleetFooted.getByRole("button", { name: "Add" })).toBeEnabled();
  await dreamspeaker.getByRole("button", { name: "Add" }).click();

  await expect(fleetFooted.getByRole("button", { name: "Add" })).toBeDisabled();
  await expect(fleetFooted).toContainText("Dreamspeaker already replaces Elven Magic");
  // The pick that spent the trait stays removable, and so does an alternate
  // trading something Dreamspeaker left alone.
  await expect(dreamspeaker.getByRole("button", { name: "Remove" })).toBeEnabled();
  await expect(row("Urbanite").getByRole("button", { name: "Add" })).toBeEnabled();

  // Same standard trait, other catalog.
  const vendored = racePanel.locator(".subsection", { hasText: "More alternate racial traits" });
  const vendoredHeader = vendored.getByRole("button").first();
  if ((await vendoredHeader.getAttribute("aria-expanded")) === "false")
    await vendoredHeader.click();
  await vendored.getByPlaceholder(/Search alternate racial traits/).fill("Silent Hunter");
  const silentHunter = vendored
    .locator(".pick-row")
    .filter({ has: page.locator(".pname", { hasText: "Silent Hunter" }) });
  await expect(silentHunter.getByRole("button", { name: "Add" })).toBeDisabled();

  // Freeing the standard trait re-opens both.
  await dreamspeaker.getByRole("button", { name: "Remove" }).click();
  await expect(fleetFooted.getByRole("button", { name: "Add" })).toBeEnabled();
  await expect(silentHunter.getByRole("button", { name: "Add" })).toBeEnabled();

  expect(errs.consoleErrors).toEqual([]);
  expect(errs.pageErrors).toEqual([]);
});
