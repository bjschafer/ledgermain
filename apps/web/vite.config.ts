import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Vite/workspace-TS gotcha: `@pf1/engine` and `@pf1/schema` publish raw `.ts`
 * via their `exports` field. We alias the bare specifiers to their `src/index.ts`
 * so Vite transpiles them as source; their internal `./foo.js` imports resolve to
 * the sibling `.ts` (Vite's resolver falls back `.js` -> `.ts`). `@pf1/data-pipeline`
 * is intentionally NOT aliased: it is Node-fs based and never imported in the
 * browser — the app loads RefData over `fetch` instead (see src/refdata/loader.ts).
 */
const pkg = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@pf1/engine": pkg("../../packages/engine/src/index.ts"),
      "@pf1/schema": pkg("../../packages/schema/src/index.ts"),
    },
  },
  build: {
    target: "es2022",
  },
});
