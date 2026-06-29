import { BuffsPanel } from "./BuffsPanel.js";
import { ConditionsPanel } from "./ConditionsPanel.js";
import { HpPanel } from "./HpPanel.js";
import { ResourcesPanel } from "./ResourcesPanel.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * The in-play tracker — Stage 4's differentiator. Thin views over the pure live
 * models (`model/hp`, `model/buffs`, `model/conditions`, `model/resources`); each
 * mutation flows back through `update()` and the shared sheet recomputes live.
 */
export function Tracker(props: BuilderProps) {
  return (
    <div className="tracker-col">
      <HpPanel {...props} />
      <ConditionsPanel {...props} />
      <BuffsPanel {...props} />
      <ResourcesPanel {...props} />
    </div>
  );
}
