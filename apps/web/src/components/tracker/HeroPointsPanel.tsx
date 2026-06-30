import { Panel } from "../builder/Panel.js";
import {
  HERO_POINT_CAP,
  gainHeroPoint,
  heroPoints,
  spendHeroPoint,
} from "../../model/heroPoints.js";
import type { BuilderProps } from "../builder/types.js";

/** Live hero point pool — gain/spend at the table (PF1 optional rule). */
export function HeroPointsPanel({ doc, update }: BuilderProps) {
  const current = heroPoints(doc);
  // Respect the per-character cap override (Settings); fall back to PF1 default.
  const cap = doc.build.settings?.heroPointsCap ?? HERO_POINT_CAP;

  const pips = Array.from({ length: cap }, (_, i) => i < current);

  return (
    <Panel title="Hero Points" step="✦" storageKey="panel:HeroPoints">
      <div className="hero-display">
        <div className="hero-pips" aria-label={`${current} of ${cap} hero points`}>
          {pips.map((filled, i) => (
            <span key={i} className={filled ? "hero-pip filled" : "hero-pip empty"}>
              {filled ? "◆" : "◇"}
            </span>
          ))}
        </div>
        <span className="hero-count num">
          {current} / {cap}
        </span>
      </div>

      <div className="hero-controls">
        <button
          type="button"
          className="btn-act"
          disabled={current <= 0}
          onClick={() => update((d) => spendHeroPoint(d))}
        >
          Spend
        </button>
        <button
          type="button"
          className="btn-act"
          disabled={current >= cap}
          onClick={() => update((d) => gainHeroPoint(d, cap))}
        >
          Gain
        </button>
      </div>
    </Panel>
  );
}
