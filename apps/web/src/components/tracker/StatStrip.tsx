import { useMemo } from "react";

import { baselineSheet } from "../../model/baseline.js";
import { advanceRound, currentRound, resetRound } from "../../model/buffs.js";
import { signed } from "../../model/names.js";
import { RotateIcon } from "../icons.js";
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
 *
 * Mirrors the sheet seals' baseline tint (model/baseline.ts): values that
 * differ from the unconditioned baseline tint sage (higher) / oxblood (lower),
 * so the strip agrees with the seals about which stats are currently altered.
 *
 * With `showRound` it also carries the round clock: a tap advances it, which
 * runs the same `advanceRound` the Buffs panel's control does (ticking buff
 * durations and timed conditions), so a table that tracks conditions and no
 * buffs never has to open Buffs to find the clock.
 */
interface StatStripProps extends BuilderProps {
  /** Show the round clock. Play only: Build mode has no round to be on. */
  showRound?: boolean;
}

export function StatStrip({ doc, sheet, refData, update, showRound }: StatStripProps) {
  // Mirrors the low-HP guard in Sheet.tsx:58-60 — effective HP (current minus
  // nonlethal) at or below 1/4 max, with the `hpMax > 0` guard so a
  // not-yet-built character doesn't show a false "low HP" state.
  const hpMax = sheet.hp.max;
  const hpEffective = doc.live.hp.current - doc.live.hp.nonlethal;
  const hpLow = hpMax > 0 && hpEffective <= Math.floor(hpMax / 4);

  const base = useMemo(() => baselineSheet(doc, refData), [doc, refData]);

  const tintOf = (current: number, baseline: number) =>
    current === baseline ? undefined : current > baseline ? "higher" : "lower";

  const items: Array<{ label: string; value: string; low?: boolean; tint?: string }> = [
    { label: "HP", value: `${doc.live.hp.current}/${sheet.hp.max}`, low: hpLow },
    { label: "AC", value: String(sheet.ac.normal), tint: tintOf(sheet.ac.normal, base.ac.normal) },
    {
      label: "Touch",
      value: String(sheet.ac.touch),
      tint: tintOf(sheet.ac.touch, base.ac.touch),
    },
    {
      label: "Flat",
      value: String(sheet.ac.flatFooted),
      tint: tintOf(sheet.ac.flatFooted, base.ac.flatFooted),
    },
    {
      label: "Fort",
      value: signed(sheet.saves.fort.total),
      tint: tintOf(sheet.saves.fort.total, base.saves.fort.total),
    },
    {
      label: "Ref",
      value: signed(sheet.saves.ref.total),
      tint: tintOf(sheet.saves.ref.total, base.saves.ref.total),
    },
    {
      label: "Will",
      value: signed(sheet.saves.will.total),
      tint: tintOf(sheet.saves.will.total, base.saves.will.total),
    },
    {
      label: "Init",
      value: signed(sheet.initiative.total),
      tint: tintOf(sheet.initiative.total, base.initiative.total),
    },
  ];

  const round = currentRound(doc);

  return (
    <div className="stat-strip" role="group" aria-label="Key stats">
      <div className="stat-strip-scroll">
        {items.map((item) => (
          <div className="stat-strip-item" key={item.label} data-low={item.low}>
            <span className="stat-strip-label">{item.label}</span>
            <span className="stat-strip-value num" data-tint={item.tint}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
      {showRound && (
        <div className="stat-strip-round">
          <button
            type="button"
            className="stat-strip-item round-advance"
            onClick={() => update((d) => advanceRound(d).doc)}
            aria-label={`Round ${round}. Advance to round ${round + 1}`}
          >
            <span className="stat-strip-label">Round</span>
            <span className="stat-strip-value num">{round}</span>
          </button>
          {round > 1 && (
            <button
              type="button"
              className="round-reset"
              onClick={() => update(resetRound)}
              title="End combat (back to round 1)"
              aria-label="End combat: back to round 1"
            >
              <RotateIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
