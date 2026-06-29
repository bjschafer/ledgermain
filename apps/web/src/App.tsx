import { useState } from "react";

import { AbilitiesSection } from "./components/builder/AbilitiesSection.js";
import { ClassesSection } from "./components/builder/ClassesSection.js";
import { FeatsSection } from "./components/builder/FeatsSection.js";
import { HitPointsSection } from "./components/builder/HitPointsSection.js";
import { IdentitySection } from "./components/builder/IdentitySection.js";
import { RaceSection } from "./components/builder/RaceSection.js";
import { SettingsSection } from "./components/builder/SettingsSection.js";
import { SkillsSection } from "./components/builder/SkillsSection.js";
import { SpellsSection } from "./components/builder/SpellsSection.js";
import type { BuilderProps } from "./components/builder/types.js";
import { Sheet } from "./components/Sheet.js";
import { Tracker } from "./components/tracker/Tracker.js";
import { useCharacter } from "./state/useCharacter.js";

type Mode = "build" | "play" | "settings";

export function App() {
  const store = useCharacter();
  const [mode, setMode] = useState<Mode>("build");

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="wordmark">
            Ledger<span className="gilt">main</span>
          </div>
          <div className="tagline">Pathfinder 1e · build &amp; live sheet</div>
        </div>
        <div className="mode-tabs" role="tablist" aria-label="Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "build"}
            className={`mode-tab${mode === "build" ? " active" : ""}`}
            onClick={() => setMode("build")}
          >
            Build
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "play"}
            className={`mode-tab${mode === "play" ? " active" : ""}`}
            onClick={() => setMode("play")}
          >
            Play
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "settings"}
            className={`mode-tab${mode === "settings" ? " active" : ""}`}
            onClick={() => setMode("settings")}
          >
            Settings
          </button>
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
        <Workbench
          mode={mode}
          doc={store.doc}
          sheet={store.sheet}
          refData={store.refData}
          update={store.update}
        />
      )}
    </div>
  );
}

function Workbench({ mode, ...props }: BuilderProps & { mode: Mode }) {
  return (
    <div className="layout">
      <div className="build-col">
        {mode === "build" ? (
          <>
            <IdentitySection {...props} />
            <AbilitiesSection {...props} />
            <RaceSection {...props} />
            <ClassesSection {...props} />
            <HitPointsSection {...props} />
            <SkillsSection {...props} />
            <FeatsSection {...props} />
            <SpellsSection {...props} />
          </>
        ) : mode === "settings" ? (
          <SettingsSection {...props} />
        ) : (
          <Tracker {...props} />
        )}
      </div>
      <div className="sheet-col">
        <Sheet doc={props.doc} sheet={props.sheet} refData={props.refData} />
      </div>
    </div>
  );
}
