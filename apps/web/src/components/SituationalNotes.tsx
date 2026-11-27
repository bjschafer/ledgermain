import { useId, useState } from "react";

import type { SituationalNote } from "@pf1/schema";

import { BuffRollDataScope } from "../state/rollData.js";
import { RulesNote } from "./RulesNote.js";

/**
 * The compact `ⓘ N` marker a seal, skill row, or the skills header shows when
 * one or more active sources have a hand-apply reminder for that stat. The
 * note text itself is the source row's own `RulesNote` copy, resolved the same
 * way; a buff-sourced note carries its caster level so `@item.level` reads the
 * buff's level here too.
 */
export function SituationalNoteButton({
  count,
  label,
  open,
  onToggle,
  panelId,
}: {
  count: number;
  label: string;
  open: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  return (
    <button
      type="button"
      className="situational-badge"
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={`${count} situational ${count === 1 ? "note" : "notes"} for ${label}`}
      title={`Situational notes for ${label}`}
      onClick={onToggle}
    >
      <span aria-hidden="true">ⓘ</span>
      <span className="num">{count}</span>
    </button>
  );
}

export function SituationalNoteList({
  id,
  notes,
  label,
}: {
  id: string;
  notes: readonly SituationalNote[];
  label: string;
}) {
  return (
    <div
      id={id}
      className="situational-panel"
      role="group"
      aria-label={`Situational notes for ${label}`}
    >
      {notes.map((note, i) => (
        <div className="situational-note" key={`${note.source}-${i}`}>
          {note.casterLevel === undefined ? (
            <RulesNote text={note.text} />
          ) : (
            <BuffRollDataScope casterLevel={note.casterLevel}>
              <RulesNote text={note.text} />
            </BuffRollDataScope>
          )}
          <div className="situational-source">from {note.source}</div>
        </div>
      ))}
    </div>
  );
}

/** Button + panel together, for a seal or skill row that owns its own state. */
export function SituationalNotes({
  notes,
  label,
}: {
  notes: readonly SituationalNote[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (notes.length === 0) return null;
  return (
    <div className="situational">
      <SituationalNoteButton
        count={notes.length}
        label={label}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        panelId={panelId}
      />
      {open ? <SituationalNoteList id={panelId} notes={notes} label={label} /> : null}
    </div>
  );
}
