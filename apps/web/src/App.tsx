import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import type { CharacterDoc } from "@pf1/schema";

import type { AppLocation, Mode } from "./model/appLocation.js";
import { hasUnseenEntries, initChangelogSeen, markChangelogSeen } from "./model/changelog.js";

import { useAttentionBadges } from "./components/builder/BuildNav.js";
import type { BuilderProps } from "./components/builder/types.js";
import { CharacterSwitcher } from "./components/CharacterSwitcher.js";
import { Dialog } from "./components/Dialog.js";
import { FeedbackButton } from "./components/FeedbackButton.js";
import { FloatingControls } from "./components/FloatingControls.js";
import { PreviewNotice } from "./components/PreviewNotice.js";
import { ReferenceLink } from "./components/ReferenceLink.js";
import { ScrollTopButton } from "./components/ScrollTopButton.js";
import { Sheet } from "./components/Sheet.js";
import { SyncStatus } from "./components/SyncStatus.js";
import { ToastHost } from "./components/ToastHost.js";
import { PlayNav } from "./components/tracker/PlayNav.js";
import { StatStrip } from "./components/tracker/StatStrip.js";
import { Tracker } from "./components/tracker/Tracker.js";
import { RollDataProvider } from "./state/rollData.js";
import { SpellBonusesProvider } from "./state/spellBonuses.js";
import { useAppLocation } from "./state/useAppLocation.js";
import { useCharacter } from "./state/useCharacter.js";
import { useTextSize, type TextSize } from "./state/useTextSize.js";

/**
 * Build, Settings and Print are mutually exclusive with the tracker and none
 * of them is what a player opens at the table, so each is a chunk of its own
 * and Play alone ships in the initial download. The trees are named exports,
 * hence the `.then` shim: `lazy` wants a module whose default is the
 * component.
 */
const BuildMode = lazy(() =>
  import("./components/BuildMode.js").then((m) => ({ default: m.BuildMode })),
);
const SettingsMode = lazy(() =>
  import("./components/SettingsMode.js").then((m) => ({ default: m.SettingsMode })),
);
const PrintView = lazy(() =>
  import("./components/PrintView.js").then((m) => ({ default: m.PrintView })),
);

/** Held between "reference data is still loading" and "a mode chunk is still loading". */
function LoadingScreen() {
  return (
    <div className="state-screen">
      <div>
        <div className="glyph">✦</div>
        <p>Unrolling the compendium…</p>
      </div>
    </div>
  );
}

/**
 * A mode's Suspense fallback. Fills *both* of the grid slots the mode tree
 * occupies (rail, column), so the sheet column doesn't slide a track over for
 * the frames a chunk is in flight.
 */
function ModeFallback() {
  return (
    <>
      <div />
      <div className="build-col">
        <LoadingScreen />
      </div>
    </>
  );
}

/**
 * Whether to dot the Settings tab, and the bookkeeping that clears it.
 *
 * The entries are fetched rather than imported: the list is the single largest
 * string in the app and lives with the Settings panel that renders it, so the
 * dot resolves a beat late instead of holding the whole prose in the initial
 * chunk. Undecided reads as no dot, which is also what a reader on their
 * first-ever visit sees.
 *
 * Held until the sheet is up, so the fetch never races the reference data a
 * player is actually waiting on. Nobody is looking for the dot on a screen
 * that hasn't drawn a character yet.
 */
function useChangelogCue(mode: Mode, ready: boolean): boolean {
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void import("./model/changelogEntries.js").then(({ CHANGELOG }) => {
      if (cancelled) return;
      setUnseen(hasUnseenEntries(CHANGELOG, initChangelogSeen(CHANGELOG)));
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  // Opening Settings *is* seeing the list — the newest entries render inline
  // at the top of the What's New panel, so there's nothing further to click.
  useEffect(() => {
    if (mode !== "settings" || !unseen) return;
    void import("./model/changelogEntries.js").then(({ CHANGELOG }) => {
      markChangelogSeen(CHANGELOG);
      setUnseen(false);
    });
  }, [mode, unseen]);

  return unseen;
}

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
  const { location, initial: initialLocation, setMode, setSection } = useAppLocation();
  const mode = location.mode;
  const [printOpen, setPrintOpen] = useState(false);
  const [textSize, setTextSize] = useTextSize();
  const changelogUnseen = useChangelogCue(mode, store.status === "ready");

  if (printOpen && store.doc && store.sheet && store.refData) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PrintView
          doc={store.doc}
          sheet={store.sheet}
          refData={store.refData}
          onClose={() => setPrintOpen(false)}
        />
      </Suspense>
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
            {changelogUnseen ? (
              <span className="mode-tab-dot" title="Something new since your last visit" />
            ) : null}
          </button>
        </div>
        <div className="masthead-right">
          <ReferenceLink />
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

      {store.status === "loading" && <LoadingScreen />}

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
          initialLocation={initialLocation}
          onActiveSection={setSection}
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

/**
 * Scroll back to the section this page load asked for, once. The panels all
 * commit in a single render, so one frame to lay them out and a second for
 * anything that sizes itself off that layout is enough; nothing here retries,
 * because a target that isn't in the DOM by then belongs to a tab the reader
 * isn't in.
 *
 * Rendered as a component, and from *inside* the mode's Suspense boundary, so
 * a cold load straight into Build starts counting those frames when the mode's
 * chunk paints rather than when the shell does. The `restored` ref is what
 * keeps a later mode switch (which re-suspends the boundary and so re-runs
 * this effect) from yanking the reader back.
 */
function SectionRestore({ sectionId }: { sectionId: string | undefined }) {
  useRestoreSection(sectionId);
  return null;
}

function useRestoreSection(sectionId: string | undefined) {
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current || !sectionId) return;
    let cancelled = false;
    // Marked restored only once the scroll actually lands, not on scheduling:
    // StrictMode mounts, tears down, and remounts, and a flag set up front
    // would be spent on the run whose cleanup cancels the frame.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        restored.current = true;
        // Never animated: this is where the reader already was, not a trip.
        document.getElementById(sectionId)?.scrollIntoView({ block: "start", behavior: "auto" });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [sectionId]);
}

function Workbench({
  mode,
  initialLocation,
  onActiveSection,
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
  initialLocation: AppLocation;
  onActiveSection: (mode: Mode, sectionId: string) => void;
  onImportCharacter: (doc: CharacterDoc) => void;
  onResetAll: () => void;
  onDeleteCharacter: (id: string) => void;
  actionPending: boolean;
  onOpenPrint: () => void;
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const onBuildSection = useCallback(
    (id: string) => onActiveSection("build", id),
    [onActiveSection],
  );
  const onPlaySection = useCallback((id: string) => onActiveSection("play", id), [onActiveSection]);
  const onSettingsSection = useCallback(
    (id: string) => onActiveSection("settings", id),
    [onActiveSection],
  );

  return (
    <RollDataProvider doc={props.doc} sheet={props.sheet} refData={props.refData}>
      <SpellBonusesProvider doc={props.doc} sheet={props.sheet} refData={props.refData}>
        <div className="layout layout--with-nav">
          {/* One boundary around the whole mode, rail included: SectionRestore
              is a sibling of the mode tree, so it waits on the same chunk the
              scroll target arrives in. */}
          <Suspense fallback={<ModeFallback />}>
            <SectionRestore sectionId={initialLocation.section} />
            {mode === "build" ? (
              <BuildMode {...props} onActiveSection={onBuildSection} />
            ) : mode === "settings" ? (
              <SettingsMode
                {...props}
                onActiveSection={onSettingsSection}
                onImportCharacter={onImportCharacter}
                onResetAll={onResetAll}
                onDeleteCharacter={onDeleteCharacter}
                actionPending={actionPending}
                onOpenPrint={onOpenPrint}
                textSize={textSize}
                onTextSizeChange={onTextSizeChange}
              />
            ) : (
              <>
                {/* Same header machinery as Build: StatStrip over the PlayNav
                    jump rail (see components/tracker/PlayNav). */}
                <div className="mobile-build-header">
                  <StatStrip {...props} showRound />
                  <PlayNav {...props} onActiveChange={onPlaySection} />
                </div>
                <div className="build-col">
                  <Tracker {...props} />
                </div>
              </>
            )}
          </Suspense>
          <div className="sheet-col">
            <Sheet doc={props.doc} sheet={props.sheet} refData={props.refData} />
          </div>
        </div>
        <FloatingControls onOpenSheet={() => setSheetOpen(true)} />
        <ScrollTopButton />
        {sheetOpen && (
          <Dialog
            title={props.doc.identity.name || "Character Sheet"}
            onClose={() => setSheetOpen(false)}
          >
            {/* The picker dialogs fill `.dialog-body` with panes that scroll
                themselves; the sheet is one tall document, so it brings its
                own scroller or the dialog surface just clips it. */}
            <div className="sheet-dialog-scroll">
              <Sheet doc={props.doc} sheet={props.sheet} refData={props.refData} hideName />
            </div>
          </Dialog>
        )}
      </SpellBonusesProvider>
    </RollDataProvider>
  );
}
