import type { CharacterDoc } from "@pf1/schema";

import type { TextSize } from "../state/useTextSize.js";

import { SettingsNav } from "./builder/SettingsNav.js";
import { SettingsSection } from "./builder/SettingsSection.js";
import type { BuilderProps } from "./builder/types.js";

/**
 * Settings mode's render tree, split out for `React.lazy` alongside
 * `BuildMode`. It carries the changelog and coverage-notes prose and the
 * external-character importers, none of which a player opens mid-session.
 *
 * Settings has no stat strip to stack with, so the rail stands alone as the
 * first of the two layout-grid children.
 */
export function SettingsMode({
  onActiveSection,
  onImportCharacter,
  onResetAll,
  onDeleteCharacter,
  actionPending,
  onOpenPrint,
  textSize,
  onTextSizeChange,
  ...props
}: BuilderProps & {
  onActiveSection: (sectionId: string) => void;
  onImportCharacter: (doc: CharacterDoc) => void;
  onResetAll: () => void;
  onDeleteCharacter: (id: string) => void;
  actionPending: boolean;
  onOpenPrint: () => void;
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
}) {
  return (
    <>
      <SettingsNav doc={props.doc} onActiveChange={onActiveSection} />
      <div className="build-col">
        <SettingsSection
          {...props}
          onImportCharacter={onImportCharacter}
          onResetAll={onResetAll}
          onDeleteCharacter={onDeleteCharacter}
          actionPending={actionPending}
          onOpenPrint={onOpenPrint}
          textSize={textSize}
          onTextSizeChange={onTextSizeChange}
        />
      </div>
    </>
  );
}
