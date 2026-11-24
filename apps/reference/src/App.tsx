import { useEffect, useState } from "react";

import { DetailPage } from "./components/DetailPage.js";
import { SearchPage } from "./components/SearchPage.js";
import { SummonPage } from "./components/SummonPage.js";
import { loadIndex } from "./data/loader.js";
import { useHashRoute } from "./hooks/useHashRoute.js";
import type { RefIndex } from "./shared/indexCodec.js";

export function App() {
  const route = useHashRoute();
  const [index, setIndex] = useState<RefIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadIndex().then(
      (loaded) => live && setIndex(loaded),
      (err: unknown) => live && setError(err instanceof Error ? err.message : String(err)),
    );
    return () => {
      live = false;
    };
  }, []);

  const inRules = route.kind === "detail" && route.collection === "rules";

  return (
    <div className="app">
      <header className="app-header">
        <a className="app-title" href="#/">
          <span className="app-wordmark">
            Ledger<span>main</span>
          </span>
          <span className="app-title-sub">Pathfinder 1e Reference</span>
        </a>
        <nav className="app-nav" aria-label="Reference">
          <a
            href="#/"
            aria-current={
              route.kind === "search"
                ? "page"
                : route.kind === "detail" && !inRules
                  ? "location"
                  : undefined
            }
          >
            Search
          </a>
          <a
            href="#/rules"
            aria-current={route.kind === "rules" ? "page" : inRules ? "location" : undefined}
          >
            Rules
          </a>
          <a href="#/summon" aria-current={route.kind === "summon" ? "page" : undefined}>
            Summons
          </a>
        </nav>
        <span className="app-version">
          {index
            ? `Data: PF1 v${index.meta.dataVersion.split("+")[0]} · content ${index.meta.contentVersion}`
            : "Loading data…"}
        </span>
      </header>

      <main className="app-main">
        {error && <p className="notice is-error">Could not load the reference index: {error}</p>}
        {!error && !index && <p className="notice">Loading the reference index…</p>}
        {index &&
          (route.kind === "detail" ? (
            <DetailPage
              index={index}
              collection={route.collection}
              id={route.id}
              section={route.section}
            />
          ) : route.kind === "rules" ? (
            <DetailPage index={index} collection="rules" id={index.rulesRoot} />
          ) : route.kind === "summon" ? (
            <SummonPage index={index} route={route} />
          ) : (
            <SearchPage index={index} />
          ))}
      </main>

      <footer className="app-footer">
        <span>
          Game content under the{" "}
          <a href="OGL.txt" target="_blank" rel="noreferrer">
            OGL
          </a>{" "}
          and Paizo&apos;s Community Use Policy; see the{" "}
          <a href="NOTICE.md" target="_blank" rel="noreferrer">
            notice
          </a>
          .
        </span>
        <a href="https://ledgermain.app" target="_blank" rel="noreferrer">
          Ledgermain tracker →
        </a>
      </footer>
    </div>
  );
}
