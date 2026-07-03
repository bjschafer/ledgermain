import { AfflictionsPanel } from "./AfflictionsPanel.js";
import { BuffsPanel } from "./BuffsPanel.js";
import { ConditionsPanel } from "./ConditionsPanel.js";
import { FeatsPanel } from "./FeatsPanel.js";
import { HeroPointsPanel } from "./HeroPointsPanel.js";
import { HpPanel } from "./HpPanel.js";
import { PreparedSpellsPanel } from "./PreparedSpellsPanel.js";
import { ResourcesPanel } from "./ResourcesPanel.js";
import { SavedRollsPanel } from "./SavedRollsPanel.js";
import { XpPanel } from "./XpPanel.js";
import { heroPointsEnabled } from "../../model/heroPoints.js";
import { xpEnabled } from "../../model/xp.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * The in-play tracker — Stage 4's differentiator. Thin views over the pure live
 * models (`model/hp`, `model/buffs`, `model/conditions`, `model/resources`); each
 * mutation flows back through `update()` and the shared sheet recomputes live.
 */
export function Tracker(props: BuilderProps) {
  const heroOn = heroPointsEnabled(props.doc);
  const xpOn = xpEnabled(props.doc);
  return (
    <div className="tracker-col">
      <HpPanel {...props} />
      {heroOn && <HeroPointsPanel {...props} />}
      {xpOn && <XpPanel {...props} />}
      <SavedRollsPanel {...props} />
      <ConditionsPanel {...props} />
      <AfflictionsPanel {...props} />
      <BuffsPanel {...props} />
      <PreparedSpellsPanel {...props} />
      <ResourcesPanel {...props} />
      <FeatsPanel {...props} />
    </div>
  );
}
