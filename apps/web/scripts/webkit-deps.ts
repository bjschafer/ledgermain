/**
 * Whether this host can launch Playwright's WebKit.
 *
 * That build links Ubuntu's library ABIs, and Playwright's launch check refuses
 * outright when any of them is absent rather than degrading. Rolling distros
 * carry newer sonames (ICU, libxml2) and no flite at all, so on those hosts
 * WebKit can never start, and `--with-deps` can't help: it shells out to apt.
 *
 * Consulted by `playwright.config.ts` (to drop the webkit project rather than
 * fail it) and by `scripts/e2e-webkit.ts` (to decide whether a container is
 * needed). Unknowns answer `true`: a wrong `false` silently drops coverage,
 * while a wrong `true` costs nothing but Playwright's own error message.
 */
import { webkit } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export function hasNativeWebkitDeps(): boolean {
  if (process.platform !== "linux") return true;

  let bundle: string;
  try {
    // Resolves to `<browsers>/webkit-<rev>/pw_run.sh` — asking Playwright beats
    // guessing the revision, which changes with every version bump.
    bundle = join(dirname(webkit.executablePath()), "minibrowser-gtk");
  } catch {
    return true; // not installed; let Playwright be the one to say so
  }

  const bin = join(bundle, "bin", "MiniBrowser");
  if (!existsSync(bin)) return true;

  try {
    const out = execFileSync("ldd", [bin], {
      encoding: "utf8",
      // WebKit ships its own copies of libwebkitgtk/libjxl/libbacktrace, which
      // resolve only via the launcher's search path. Without it every bundled
      // library also reads as a host gap and the probe is useless.
      env: {
        ...process.env,
        LD_LIBRARY_PATH: `${join(bundle, "lib")}:${join(bundle, "sys", "lib")}`,
      },
    });
    return !out.includes("not found");
  } catch {
    return true; // no ldd, or it failed — don't infer a gap from that
  }
}
