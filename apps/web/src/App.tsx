import { useState } from "react";

import type { CharacterDoc } from "@pf1/schema";

import { AbilitiesSection } from "./components/builder/AbilitiesSection.js";
import { BuildNav, useAttentionBadges } from "./components/builder/BuildNav.js";
import { ClassesSection } from "./components/builder/ClassesSection.js";
import { FeatsSection } from "./components/builder/FeatsSection.js";
import { GearSection } from "./components/builder/GearSection.js";
import { WeaponsSection } from "./components/builder/WeaponsSection.js";
import { HitPointsSection } from "./components/builder/HitPointsSection.js";
import { IdentitySection } from "./components/builder/IdentitySection.js";
import { RaceSection } from "./components/builder/RaceSection.js";
import { SettingsSection } from "./components/builder/SettingsSection.js";
import { SkillsSection } from "./components/builder/SkillsSection.js";
import { SpellsSection } from "./components/builder/SpellsSection.js";
import { TraitsSection } from "./components/builder/TraitsSection.js";
import type { BuilderProps } from "./components/builder/types.js";
import { CharacterSwitcher } from "./components/CharacterSwitcher.js";
import { Dialog } from "./components/Dialog.js";
import { FeedbackButton } from "./components/FeedbackButton.js";
import { FloatingControls } from "./components/FloatingControls.js";
import { PreviewNotice } from "./components/PreviewNotice.js";
import { PrintView } from "./components/PrintView.js";
import { Sheet } from "./components/Sheet.js";
import { SyncStatus } from "./components/SyncStatus.js";
import { ToastHost } from "./components/ToastHost.js";
import { PlayNav } from "./components/tracker/PlayNav.js";
import { StatStrip } from "./components/tracker/StatStrip.js";
import { Tracker } from "./components/tracker/Tracker.js";
import { useCharacter } from "./state/useCharacter.js";
import { useTextSize, type TextSize } from "./state/useTextSize.js";

type Mode = "build" | "play" | "settings";

/**
 * Aggregate "unfinished business" cue on the Build mode tab — the sum of the
 * section badges BuildNav shows (unassigned ability increases, open skill
 * ranks/feat slots, unpicked exploits). Dim/informational badges (traits)
 * don't count; the tab cue only fires for things the player almost certainly
 * wants to spend. Rendered from Play/Settings too, so a level-up's new budget
 * is visible without switching to Build first.
 */
function BuildTabBadge(props: Pick<BuilderProps, "doc" | "sheet" | "refData">) {
  const badges = useAttentionBadges(props);
  const count = Object.values(badges)
    .filter((b) => b != null && b.tone !== "dim")
    .reduce((sum, b) => sum + b!.count, 0);
  if (count === 0) return null;
  return (
    <span className="mode-tab-badge" title={`${count} unspent build choices`}>
      {count}
    </span>
  );
}

export function App() {
  const store = useCharacter();
  const [mode, setMode] = useState<Mode>("build");
  const [printOpen, setPrintOpen] = useState(false);
  const [textSize, setTextSize] = useTextSize();

  if (printOpen && store.doc && store.sheet && store.refData) {
    return (
      <PrintView
        doc={store.doc}
        sheet={store.sheet}
        refData={store.refData}
        onClose={() => setPrintOpen(false)}
      />
    );
  }

  return (
    <div className="app">
      <PreviewNotice />
      <ToastHost />
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
            {store.status === "ready" && store.doc && store.sheet && store.refData ? (
              <BuildTabBadge doc={store.doc} sheet={store.sheet} refData={store.refData} />
            ) : null}
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
        <div className="masthead-right">
          <FeedbackButton mode={mode} doc={store.doc} />
          <SyncStatus
            status={store.syncStatus}
            onSignIn={store.signIn}
            onSignOut={() => void store.signOut()}
            onResolveConflict={(action) => void store.resolveConflict(action)}
          />
          {store.doc && (
            <CharacterSwitcher
              characters={store.characters}
              activeId={store.doc.id}
              disabled={store.actionPending}
              onSwitch={(id) => void store.switchCharacter(id)}
              onCreate={() => void store.createCharacter()}
            />
          )}
          {store.actionError && (
            <button
              type="button"
              className="action-error"
              onClick={store.clearActionError}
              title="Dismiss"
            >
              ⚠ {store.actionError}
            </button>
          )}
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
          undoLast={store.undoLast}
          onImportCharacter={(doc) => void store.importCharacter(doc)}
          onResetAll={() => void store.resetAll()}
          onDeleteCharacter={(id) => void store.deleteCharacter(id)}
          actionPending={store.actionPending}
          onOpenPrint={() => setPrintOpen(true)}
          textSize={textSize}
          onTextSizeChange={setTextSize}
        />
      )}
    </div>
  );
}

function Workbench({
  mode,
  onImportCharacter,
  onResetAll,
  onDeleteCharacter,
  actionPending,
  onOpenPrint,
  textSize,
  onTextSizeChange,
  ...props
}: BuilderProps & {
  mode: Mode;
  onImportCharacter: (doc: CharacterDoc) => void;
  onResetAll: () => void;
  onDeleteCharacter: (id: string) => void;
  actionPending: boolean;
  onOpenPrint: () => void;
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className={`layout${mode === "build" || mode === "play" ? " layout--with-nav" : ""}`}>
        {mode === "build" && (
          /* On mobile (<=940px) `.mobile-build-header` collapses to a single
           sticky block stacking the compact stat strip over the section-jump
           chips (styles.css); above 940px it's `display: contents`, so the
           strip is hidden and BuildNav flows into the layout grid's rail column
           exactly as before. */
          <div className="mobile-build-header">
            <StatStrip {...props} />
            <BuildNav {...props} />
          </div>
        )}
        {mode === "play" && (
          /* Same header machinery for Play — StatStrip over the PlayNav jump rail
           (see components/tracker/PlayNav). */
          <div className="mobile-build-header">
            <StatStrip {...props} />
            <PlayNav {...props} />
          </div>
        )}
        <div className="build-col">
          {mode === "build" ? (
            <>
              <div id="section-identity">
                <IdentitySection {...props} />
              </div>
              <div id="section-abilities">
                <AbilitiesSection {...props} />
              </div>
              <div id="section-race">
                <RaceSection {...props} />
              </div>
              <div id="section-traits">
                <TraitsSection {...props} />
              </div>
              <div id="section-classes">
                <ClassesSection {...props} />
              </div>
              <div id="section-hp">
                <HitPointsSection {...props} />
              </div>
              <div id="section-skills">
                <SkillsSection {...props} />
              </div>
              <div id="section-feats">
                <FeatsSection {...props} />
              </div>
              <div id="section-gear">
                <GearSection {...props} />
              </div>
              <div id="section-weapons">
                <WeaponsSection {...props} />
              </div>
              <div id="section-spells">
                <SpellsSection {...props} />
              </div>
            </>
          ) : mode === "settings" ? (
            <SettingsSection
              {...props}
              onImportCharacter={onImportCharacter}
              onResetAll={onResetAll}
              onDeleteCharacter={onDeleteCharacter}
              actionPending={actionPending}
              onOpenPrint={onOpenPrint}
              textSize={textSize}
              onTextSizeChange={onTextSizeChange}
            />
          ) : (
            <Tracker {...props} />
          )}
        </div>
        <div className="sheet-col">
          <Sheet doc={props.doc} sheet={props.sheet} refData={props.refData} />
        </div>
      </div>
      <FloatingControls onOpenSheet={() => setSheetOpen(true)} />
      {sheetOpen && (
        <Dialog
          title={props.doc.identity.name || "Character Sheet"}
          onClose={() => setSheetOpen(false)}
        >
          <Sheet doc={props.doc} sheet={props.sheet} refData={props.refData} hideName />
        </Dialog>
      )}
    </>
  );
}
