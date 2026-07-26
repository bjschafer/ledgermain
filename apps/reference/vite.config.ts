import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Vite/workspace-TS gotcha: `@pf1/engine` and `@pf1/schema` publish raw `.ts`
 * via their `exports` field. We alias the bare specifiers to their `src/index.ts`
 * so Vite transpiles them as source; their internal `./foo.js` imports resolve to
 * the sibling `.ts` (Vite's resolver falls back `.js` -> `.ts`). `@pf1/data-pipeline`
 * is intentionally NOT aliased: it is Node-fs based and never imported in the
 * browser — this app fetches the generated index/shards under `public/ref/`.
 *
 * `@pf1/engine/formula` is a deeper alias (matched first — Rollup's alias plugin
 * treats a string `find` as a path prefix, so the bare entry would otherwise
 * swallow it). The engine package declares no `sideEffects: false`, so importing
 * its barrel for two formatters keeps the entire rules engine in the bundle —
 * ~330 KB for a site whose whole premise is answering a question in four
 * seconds. Aliasing straight at the module it needs is the fix; mirror any
 * change here in `tsconfig.json`'s `paths`.
 */
const pkg = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // 5173 belongs to @pf1/web; strictPort fails loudly rather than drifting to
  // yet another port when something is already listening.
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
  resolve: {
    alias: [
      { find: "@pf1/engine/formula", replacement: pkg("../../packages/engine/src/formula.ts") },
      { find: "@pf1/engine", replacement: pkg("../../packages/engine/src/index.ts") },
      { find: "@pf1/schema", replacement: pkg("../../packages/schema/src/index.ts") },
    ],
  },
  build: {
    target: "es2022",
  },
});
