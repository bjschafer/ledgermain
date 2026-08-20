/**
 * Run the `webkit-layout` project, reaching for a container only when the host
 * can't launch WebKit itself (see `webkit-deps.ts`). On Ubuntu — including CI —
 * this is a plain `playwright test` with no indirection.
 *
 * The container is a distrobox box, which shares `$HOME`: the checkout, its
 * `node_modules`, and the browser cache are the same files inside and out, so
 * there is nothing to sync and no second install to keep current.
 *
 * Set `PF1_E2E_BOX` to use a differently-named box.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasNativeWebkitDeps } from "./webkit-deps.ts";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const box = process.env.PF1_E2E_BOX ?? "pf1-e2e";
const args = ["test", "--project=webkit-layout", ...process.argv.slice(2)];
const bin = "node_modules/.bin/playwright";

function run(cmd: string, argv: string[]): never {
  const { status } = spawnSync(cmd, argv, { cwd: webRoot, stdio: "inherit" });
  process.exit(status ?? 1);
}

if (hasNativeWebkitDeps()) run(bin, args);

const boxes = spawnSync("distrobox", ["list", "--no-color"], { encoding: "utf8" });
if (boxes.error) {
  console.error(
    `This host can't launch WebKit (see scripts/webkit-deps.ts) and distrobox isn't installed.\n` +
      `Set one up with the recipe in .claude/skills/playwright/SKILL.md, or skip WebKit and let CI cover it.`,
  );
  process.exit(1);
}
if (!new RegExp(`\\b${box}\\b`).test(boxes.stdout ?? "")) {
  console.error(
    `This host can't launch WebKit (see scripts/webkit-deps.ts) and the '${box}' box doesn't exist.\n` +
      `Create it with the recipe in .claude/skills/playwright/SKILL.md.`,
  );
  process.exit(1);
}

// `CI=1` so the box boots its own dev server instead of reusing whatever is on
// 5173 — distrobox shares the host's network, so that would otherwise be the
// host's server, which is exactly the trap `reuseExistingServer` sets.
const inner = `cd ${JSON.stringify(webRoot)} && CI=1 ${bin} ${args.map((a) => JSON.stringify(a)).join(" ")}`;
run("distrobox", ["enter", "--name", box, "--", "bash", "-lc", inner]);
