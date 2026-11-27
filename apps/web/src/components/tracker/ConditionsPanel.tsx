import { Panel } from "../builder/Panel.js";
import {
  conditionImmunityFor,
  conditionRoundsLeft,
  hasCondition,
  setConditionRounds,
  supersedingCondition,
  toggleCondition,
} from "../../model/conditions.js";
import { AlertTriangleIcon } from "../icons.js";
import { ConditionChips } from "./ConditionChips.js";
import type { BuilderProps } from "../builder/types.js";

/** Toggle the core PF1 conditions; the sheet's numbers update live via compute(). */
export function ConditionsPanel({ doc, sheet, update }: BuilderProps) {
  return (
    <Panel
      title="Conditions"
      icon={<AlertTriangleIcon />}
      storageKey="panel:Conditions"
      right={<span className="hint">{doc.live.conditions.length} active</span>}
    >
      <ConditionChips
        isActive={(id) => hasCondition(doc, id)}
        supersededBy={(id) => supersedingCondition(doc, id)}
        onToggle={(id) => update((d) => toggleCondition(d, id))}
        immunityFor={(id) => conditionImmunityFor(sheet, id)}
        rounds={{
          get: (id) => conditionRoundsLeft(doc, id),
          set: (id, n) => update((d) => setConditionRounds(d, id, n)),
        }}
        emptyText="No conditions. Toggle one to see the sheet recompute."
      />
    </Panel>
  );
}
