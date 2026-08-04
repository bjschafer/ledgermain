/**
 * Mobile floating action cluster, bottom-right: a "Sheet" button that opens
 * the full derived sheet in a dialog (see Workbench in App.tsx — below the
 * 940px breakpoint `.sheet-col` is pulled out of the document flow entirely,
 * so this is the only way to reach it). Hidden entirely at desktop widths
 * (`.floating-controls` in styles.css) — desktop already has the sheet
 * sticky alongside the build column. The scroll-to-top button lives in
 * `ScrollTopButton.tsx` instead, bottom-left, since that one applies at every
 * viewport width and would otherwise stack awkwardly on top of this cluster.
 */
export function FloatingControls({ onOpenSheet }: { onOpenSheet: () => void }) {
  return (
    <div className="floating-controls">
      <button
        type="button"
        className="floating-btn floating-sheet"
        onClick={onOpenSheet}
        aria-label="Open character sheet"
        title="Open character sheet"
      >
        Sheet
      </button>
    </div>
  );
}
