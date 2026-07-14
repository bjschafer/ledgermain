import { useState } from "react";

import type { Feat } from "@pf1/schema";

import { addFeatInstance, removeFeatInstance } from "../../model/doc.js";
import { homebrewId, removeHomebrewFeat, upsertHomebrewFeat } from "../../model/homebrew.js";
import {
  buildHomebrewFeat,
  emptyHomebrewFeatDraft,
  featToDraft,
  type HomebrewFeatDraft,
} from "../../model/homebrewEditor.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { ChangeListEditor } from "./ChangeListEditor.js";
import type { BuilderProps } from "./types.js";

/** `FeatsSection`'s category chips — reused here so a homebrew feat can opt into one. */
const FEAT_CATEGORIES = ["Combat", "General", "Metamagic", "Item Creation", "Teamwork"] as const;

/**
 * Create/edit/delete UI for homebrew feats (`model/homebrew.ts`), rendered
 * inline in `FeatsSection`'s picker. Like `HomebrewRaceEditor`, a homebrew
 * feat appears in the normal feat list the moment it's upserted (same
 * doc-overlaid `refData`) — this section only owns authoring + management,
 * not a second pick/remove control (`addFeatInstance`/`removeFeatInstance`
 * on "select on create" reuse the exact transitions the main picker uses).
 */
export function HomebrewFeatEditor({ doc, update }: BuilderProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HomebrewFeatDraft>(emptyHomebrewFeatDraft());
  const [selectOnCreate, setSelectOnCreate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const entries = Object.entries(doc.build.homebrew?.feats ?? {});

  function startCreate() {
    setEditingId(null);
    setDraft(emptyHomebrewFeatDraft());
    setError(null);
    setFormOpen(true);
    setDetailsOpen(true);
  }

  function startEdit(id: string, feat: Feat) {
    setEditingId(id);
    setDraft(featToDraft(feat));
    setError(null);
    setFormOpen(true);
    setDetailsOpen(true);
  }

  function cancel() {
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  }

  function save() {
    const id = editingId ?? homebrewId();
    const result = buildHomebrewFeat(id, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const wasCreate = editingId == null;
    update((d) => {
      let next = upsertHomebrewFeat(d, id, result.value);
      if (wasCreate && selectOnCreate && !next.build.feats.includes(id)) {
        next = addFeatInstance(next, id);
      }
      return next;
    });
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  }

  function remove(id: string) {
    update((d) => removeHomebrewFeat(d, id));
    if (editingId === id) cancel();
  }

  return (
    <details
      className="hb-editor"
      open={detailsOpen}
      onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
    >
      <summary>Homebrew feats{entries.length > 0 ? ` (${entries.length})` : ""}</summary>
      {entries.length > 0 && (
        <div className="hb-list">
          {entries.map(([id, feat]) => {
            const isSel = doc.build.feats.includes(id);
            return (
              <div key={id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                <div className="pmain">
                  <div className="pname">
                    {feat.name} <HomebrewBadge id={id} />
                  </div>
                  {feat.prerequisites.prereqText ? (
                    <div className="preq">
                      <span className="soft">{feat.prerequisites.prereqText}</span>
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() =>
                      update((d) => (isSel ? removeFeatInstance(d, id) : addFeatInstance(d, id)))
                    }
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => startEdit(id, feat)}>
                    Edit
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => remove(id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <FeatDraftForm
          draft={draft}
          setDraft={setDraft}
          isNew={editingId == null}
          selectOnCreate={selectOnCreate}
          setSelectOnCreate={setSelectOnCreate}
          error={error}
          onSave={save}
          onCancel={cancel}
        />
      ) : (
        <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={startCreate}>
          + Create homebrew feat
        </button>
      )}
    </details>
  );
}

function FeatDraftForm({
  draft,
  setDraft,
  isNew,
  selectOnCreate,
  setSelectOnCreate,
  error,
  onSave,
  onCancel,
}: {
  draft: HomebrewFeatDraft;
  setDraft: (d: HomebrewFeatDraft) => void;
  isNew: boolean;
  selectOnCreate: boolean;
  setSelectOnCreate: (v: boolean) => void;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  function patch(p: Partial<HomebrewFeatDraft>) {
    setDraft({ ...draft, ...p });
  }

  return (
    <div className="hb-form">
      <div className="hb-field">
        <label htmlFor="hb-feat-name">Name</label>
        <input
          id="hb-feat-name"
          type="text"
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Keen Nose"
        />
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Category (optional)</span>
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={draft.category === ""}
            onClick={() => patch({ category: "" })}
          >
            None
          </button>
          {FEAT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className="chip"
              aria-pressed={draft.category === cat}
              onClick={() => patch({ category: cat })}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="hb-field">
        <label htmlFor="hb-feat-prereq">Prerequisites (prose)</label>
        <input
          id="hb-feat-prereq"
          type="text"
          value={draft.prereqText}
          onChange={(e) => patch({ prereqText: e.target.value })}
          placeholder="e.g. GM approval, Str 13"
        />
        <span className="hb-field-label">
          Shown as a soft warning only — like every prose prerequisite, it never blocks taking the
          feat.
        </span>
      </div>

      <div className="hb-field">
        <label htmlFor="hb-feat-desc">Description / benefit</label>
        <textarea
          id="hb-feat-desc"
          rows={4}
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="What the feat does…"
        />
      </div>

      <div className="hb-field">
        <span className="hb-field-label">Typed bonuses (optional)</span>
        <ChangeListEditor drafts={draft.changes} onChange={(next) => patch({ changes: next })} />
      </div>

      {isNew && (
        <label className="hb-field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={selectOnCreate}
            onChange={(e) => setSelectOnCreate(e.target.checked)}
          />
          Take this feat immediately after creating it
        </label>
      )}

      {error ? <div className="hb-error">{error}</div> : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="pick-btn add" onClick={onSave}>
          {isNew ? "Create feat" : "Save changes"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
