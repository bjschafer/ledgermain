import { SectionNav } from "../SectionNav.js";
import type { BuilderProps } from "./types.js";

/**
 * Section-jump navigation for the Settings tab — same rail as Build and Play.
 * Settings grew to ~17 panels, well past the point where finding one meant
 * scrolling the whole column looking for its heading.
 */
export function SettingsNav({
  doc,
  onActiveChange,
}: Pick<BuilderProps, "doc"> & { onActiveChange?: (sectionId: string) => void }) {
  return (
    <SectionNav
      containerSelector=".settings-col [data-nav-label]"
      revision={doc}
      ariaLabel="Jump to settings section"
      className="play-nav"
      onActiveChange={onActiveChange}
    />
  );
}
