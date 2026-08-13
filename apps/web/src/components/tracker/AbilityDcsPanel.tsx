import { AbilityDcList } from "../AbilityDcList.js";
import { Panel } from "../builder/Panel.js";
import { BoltIcon } from "../icons.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * The character's own enemy-facing ability DCs (hex, channel energy, bomb,
 * cruelty, mesmerist trick, Stunning Fist, Quivering Palm) — the numbers a
 * player reads off to the GM at the table ("my hex is DC 17"), not something
 * that needs adjusting mid-session, so this is a plain read-only display, the
 * same posture as `SpellResistancePanel`. Self-hides when the character has
 * none of the seven families (`sheet.abilityDCs` omitted).
 */
export function AbilityDcsPanel({ sheet }: BuilderProps) {
  if (!sheet.abilityDCs || sheet.abilityDCs.length === 0) return null;

  return (
    <Panel title="Ability DCs" icon={<BoltIcon />} storageKey="panel:AbilityDCs">
      <AbilityDcList abilityDCs={sheet.abilityDCs} />
    </Panel>
  );
}
