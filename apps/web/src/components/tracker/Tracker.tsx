import { AfflictionsPanel } from "./AfflictionsPanel.js";
import { BuffsPanel } from "./BuffsPanel.js";
import { CompanionPanel } from "./CompanionPanel.js";
import { ConditionsPanel } from "./ConditionsPanel.js";
import { DeedsPanel } from "./DeedsPanel.js";
import { FamiliarPanel } from "./FamiliarPanel.js";
import { FeatsPanel } from "./FeatsPanel.js";
import { HeroPointsPanel } from "./HeroPointsPanel.js";
import { HpPanel } from "./HpPanel.js";
import { MediumSpiritPanel } from "./MediumSpiritPanel.js";
import { NewDayBar } from "./NewDayBar.js";
import { PhantomPanel } from "./PhantomPanel.js";
import { PreparedSpellsPanel } from "./PreparedSpellsPanel.js";
import { ResourcesPanel } from "./ResourcesPanel.js";
import { SavedRollsPanel } from "./SavedRollsPanel.js";
import { ShifterAspectPanel } from "./ShifterAspectPanel.js";
import { StatStrip } from "./StatStrip.js";
import { VigilanteIdentityPanel } from "./VigilanteIdentityPanel.js";
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
      <StatStrip {...props} />
      <NewDayBar {...props} />
      <HpPanel {...props} />
      <VigilanteIdentityPanel {...props} />
      <MediumSpiritPanel {...props} />
      <ConditionsPanel {...props} />
      <BuffsPanel {...props} />
      <ShifterAspectPanel {...props} />
      <PreparedSpellsPanel {...props} />
      <SavedRollsPanel {...props} />
      <ResourcesPanel {...props} />
      <DeedsPanel {...props} />
      {heroOn && <HeroPointsPanel {...props} />}
      {xpOn && <XpPanel {...props} />}
      <AfflictionsPanel {...props} />
      <FamiliarPanel {...props} />
      <CompanionPanel {...props} />
      <PhantomPanel {...props} />
      <FeatsPanel {...props} />
    </div>
  );
}
