import { AbilitiesSection } from "./builder/AbilitiesSection.js";
import { BuildNav } from "./builder/BuildNav.js";
import { ClassesSection } from "./builder/ClassesSection.js";
import { FeatsSection } from "./builder/FeatsSection.js";
import { GearSection } from "./builder/GearSection.js";
import { HitPointsSection } from "./builder/HitPointsSection.js";
import { IdentitySection } from "./builder/IdentitySection.js";
import { RaceSection } from "./builder/RaceSection.js";
import { SkillsSection } from "./builder/SkillsSection.js";
import { SpellsSection } from "./builder/SpellsSection.js";
import { TraitsSection } from "./builder/TraitsSection.js";
import type { BuilderProps } from "./builder/types.js";
import { WeaponsSection } from "./builder/WeaponsSection.js";
import { StatStrip } from "./tracker/StatStrip.js";

/**
 * Build mode's whole render tree, in its own module so `App.tsx` can reach it
 * through `React.lazy`: the eleven builder panels and their pickers are the
 * app's largest body of code and none of it runs at the table.
 *
 * Returns the two layout-grid children (rail, column) as a fragment, so the
 * grid sees exactly what it did when this lived inline in the Workbench.
 */
export function BuildMode({
  onActiveSection,
  ...props
}: BuilderProps & { onActiveSection: (sectionId: string) => void }) {
  return (
    <>
      {/* On mobile (<=940px) `.mobile-build-header` collapses to a single
          sticky block stacking the compact stat strip over the section-jump
          chips (styles.css); above 940px it's `display: contents`, so the
          strip is hidden and BuildNav flows into the layout grid's rail column
          exactly as before. */}
      <div className="mobile-build-header">
        <StatStrip {...props} />
        <BuildNav {...props} onActiveChange={onActiveSection} />
      </div>
      <div className="build-col">
        <div id="section-identity">
          <IdentitySection {...props} />
        </div>
        <div id="section-abilities">
          <AbilitiesSection {...props} />
        </div>
        <div id="section-race">
          <RaceSection {...props} />
        </div>
        <div id="section-traits">
          <TraitsSection {...props} />
        </div>
        <div id="section-classes">
          <ClassesSection {...props} />
        </div>
        <div id="section-hp">
          <HitPointsSection {...props} />
        </div>
        <div id="section-skills">
          <SkillsSection {...props} />
        </div>
        <div id="section-feats">
          <FeatsSection {...props} />
        </div>
        <div id="section-gear">
          <GearSection {...props} />
        </div>
        <div id="section-weapons">
          <WeaponsSection {...props} />
        </div>
        <div id="section-spells">
          <SpellsSection {...props} />
        </div>
      </div>
    </>
  );
}
