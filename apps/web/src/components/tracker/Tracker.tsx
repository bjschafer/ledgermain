import type { ReactNode } from "react";

import { ActiveFormPanel } from "./ActiveFormPanel.js";
import { AfflictionsPanel } from "./AfflictionsPanel.js";
import { BuffsPanel } from "./BuffsPanel.js";
import { CompanionPanel } from "./CompanionPanel.js";
import { ConditionsPanel } from "./ConditionsPanel.js";
import { DeedsPanel } from "./DeedsPanel.js";
import { EidolonPanel } from "./EidolonPanel.js";
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
import { VigilanteIdentityPanel } from "./VigilanteIdentityPanel.js";
import { XpPanel } from "./XpPanel.js";
import { heroPointsEnabled } from "../../model/heroPoints.js";
import { xpEnabled } from "../../model/xp.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * The in-play tracker — Stage 4's differentiator. Thin views over the pure live
 * models (`model/hp`, `model/buffs`, `model/conditions`, `model/resources`); each
 * mutation flows back through `update()` and the shared sheet recomputes live.
 *
 * Panels are ordered and grouped by how often they're touched at the table:
 * the combat loop first, then per-encounter toggles, companions, and reference.
 * Each panel is wrapped in a `.play-section` anchor whose `data-nav-*` feed the
 * sticky `PlayNav` jump rail (rendered from `App.tsx`'s layout header). Panels
 * self-hide when they don't apply; empty groups collapse away via CSS `:has`.
 */

interface Section {
  id: string;
  label: string;
  node: ReactNode;
}

interface Group {
  name: string;
  sections: Section[];
}

export function Tracker(props: BuilderProps) {
  const heroOn = heroPointsEnabled(props.doc);
  const xpOn = xpEnabled(props.doc);

  const groups: Group[] = [
    {
      name: "Combat",
      sections: [
        { id: "play-hp", label: "Hit Points", node: <HpPanel {...props} /> },
        { id: "play-conditions", label: "Conditions", node: <ConditionsPanel {...props} /> },
        { id: "play-buffs", label: "Buffs", node: <BuffsPanel {...props} /> },
        { id: "play-spells", label: "Spells", node: <PreparedSpellsPanel {...props} /> },
        { id: "play-resources", label: "Resources", node: <ResourcesPanel {...props} /> },
        { id: "play-rolls", label: "Saved Rolls", node: <SavedRollsPanel {...props} /> },
      ],
    },
    {
      name: "Encounter",
      sections: [
        { id: "play-deeds", label: "Deeds", node: <DeedsPanel {...props} /> },
        ...(heroOn
          ? [{ id: "play-hero", label: "Hero Points", node: <HeroPointsPanel {...props} /> }]
          : []),
        { id: "play-form", label: "Polymorph", node: <ActiveFormPanel {...props} /> },
        { id: "play-aspects", label: "Aspects", node: <ShifterAspectPanel {...props} /> },
        { id: "play-identity", label: "Identity", node: <VigilanteIdentityPanel {...props} /> },
        { id: "play-spirit", label: "Séance", node: <MediumSpiritPanel {...props} /> },
        { id: "play-afflictions", label: "Afflictions", node: <AfflictionsPanel {...props} /> },
      ],
    },
    {
      name: "Companions",
      sections: [
        { id: "play-familiar", label: "Familiar", node: <FamiliarPanel {...props} /> },
        { id: "play-companion", label: "Companion", node: <CompanionPanel {...props} /> },
        { id: "play-phantom", label: "Phantom", node: <PhantomPanel {...props} /> },
        { id: "play-eidolon", label: "Eidolon", node: <EidolonPanel {...props} /> },
      ],
    },
    {
      name: "Reference",
      sections: [
        ...(xpOn ? [{ id: "play-xp", label: "Experience", node: <XpPanel {...props} /> }] : []),
        { id: "play-feats", label: "Feats", node: <FeatsPanel {...props} /> },
      ],
    },
  ];

  return (
    <div className="tracker-col">
      <NewDayBar {...props} />
      {groups.map((group) => (
        <section className="play-group" data-group={group.name} key={group.name}>
          <h3 className="play-group-head">{group.name}</h3>
          {group.sections.map((section) => (
            <div
              className="play-section"
              id={section.id}
              data-nav-label={section.label}
              data-nav-group={group.name}
              key={section.id}
            >
              {section.node}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
