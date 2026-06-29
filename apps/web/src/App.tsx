import { AbilitiesSection } from "./components/builder/AbilitiesSection.js";
import { ClassesSection } from "./components/builder/ClassesSection.js";
import { FeatsSection } from "./components/builder/FeatsSection.js";
import { IdentitySection } from "./components/builder/IdentitySection.js";
import { RaceSection } from "./components/builder/RaceSection.js";
import { SkillsSection } from "./components/builder/SkillsSection.js";
import { SpellsSection } from "./components/builder/SpellsSection.js";
import type { BuilderProps } from "./components/builder/types.js";
import { Sheet } from "./components/Sheet.js";
import { useCharacter } from "./state/useCharacter.js";

export function App() {
  const store = useCharacter();

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="wordmark">
            Scriven<span className="gilt">er</span>
          </div>
          <div className="tagline">Pathfinder 1e · build &amp; live sheet</div>
        </div>
        <div className="tagline">
          {store.refData ? `data ${store.refData.meta.dataVersion.slice(0, 10)}` : ""}
        </div>
      </header>

      {store.status === "loading" && (
        <div className="state-screen">
          <div>
            <div className="glyph">✦</div>
            <p>Unrolling the compendium…</p>
          </div>
        </div>
      )}

      {store.status === "error" && (
        <div className="state-screen">
          <div>
            <div className="glyph">⚠</div>
            <p>Couldn't load reference data.</p>
            <p className="hint">{store.error}</p>
          </div>
        </div>
      )}

      {store.status === "ready" && store.doc && store.sheet && store.refData && (
        <Builder
          doc={store.doc}
          sheet={store.sheet}
          refData={store.refData}
          update={store.update}
        />
      )}
    </div>
  );
}

function Builder(props: BuilderProps) {
  return (
    <div className="layout">
      <div className="build-col">
        <IdentitySection {...props} />
        <AbilitiesSection {...props} />
        <RaceSection {...props} />
        <ClassesSection {...props} />
        <SkillsSection {...props} />
        <FeatsSection {...props} />
        <SpellsSection {...props} />
      </div>
      <div className="sheet-col">
        <Sheet doc={props.doc} sheet={props.sheet} refData={props.refData} />
      </div>
    </div>
  );
}
