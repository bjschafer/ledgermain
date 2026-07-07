import { signed } from "../../model/names.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Sticky compact stat strip — the "what's your AC" fix (UX audit, Play-tab
 * cockpit slice). Below the 940px breakpoint (styles.css:44-56) `.sheet-col`
 * stops being sticky and drops below the entire tracker column, so AC/saves/
 * init can be thousands of pixels down the page. This strip surfaces the same
 * numbers as `Sheet.tsx`'s seals, pinned under the viewport top while the
 * player scrolls the tracker. Desktop (>940px) already has the sheet sticky
 * alongside the tracker, so this is hidden there via CSS (`display: none`)
 * rather than a JS media-query check, to avoid a resize-driven remount.
 */
export function StatStrip({ doc, sheet }: BuilderProps) {
  // Mirrors the low-HP guard in Sheet.tsx:58-60 — effective HP (current minus
  // nonlethal) at or below 1/4 max, with the `hpMax > 0` guard so a
  // not-yet-built character doesn't show a false "low HP" state.
  const hpMax = sheet.hp.max;
  const hpEffective = doc.live.hp.current - doc.live.hp.nonlethal;
  const hpLow = hpMax > 0 && hpEffective <= Math.floor(hpMax / 4);

  const items: Array<{ label: string; value: string; low?: boolean }> = [
    { label: "HP", value: `${doc.live.hp.current}/${sheet.hp.max}`, low: hpLow },
    { label: "AC", value: String(sheet.ac.normal) },
    { label: "Touch", value: String(sheet.ac.touch) },
    { label: "Flat", value: String(sheet.ac.flatFooted) },
    { label: "Fort", value: signed(sheet.saves.fort.total) },
    { label: "Ref", value: signed(sheet.saves.ref.total) },
    { label: "Will", value: signed(sheet.saves.will.total) },
    { label: "Init", value: signed(sheet.initiative.total) },
  ];

  return (
    <div className="stat-strip" role="group" aria-label="Key stats">
      {items.map((item) => (
        <div className="stat-strip-item" key={item.label} data-low={item.low}>
          <span className="stat-strip-label">{item.label}</span>
          <span className="stat-strip-value num">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
