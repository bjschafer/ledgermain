import { useMemo } from "react";

import {
  addClass,
  removeClass,
  setClassLevel,
  setFavoredClass,
} from "../../model/doc.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function ClassesSection({ doc, refData, update }: BuilderProps) {
  const baseClasses = useMemo(
    () =>
      Object.values(refData.classes)
        .filter((c) => c.subType === "base")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [refData],
  );

  const chosen = new Set(doc.identity.classes.map((c) => c.tag));
  const totalLevel = doc.identity.classes.reduce((s, c) => s + c.level, 0);

  return (
    <Panel
      title="Classes"
      step="iv"
      right={<span className="hint">multiclass-capable · total level {totalLevel}</span>}
    >
      <div className="chips" style={{ marginBottom: 14 }}>
        {baseClasses.map((c) => (
          <button
            key={c.tag}
            type="button"
            className="chip"
            aria-pressed={chosen.has(c.tag)}
            onClick={() =>
              update((d) => (chosen.has(c.tag) ? removeClass(d, c.tag) : addClass(d, c.tag)))
            }
          >
            {c.name}
          </button>
        ))}
      </div>

      {doc.identity.classes.length === 0 ? (
        <p className="empty">No class chosen. Pick one or more above.</p>
      ) : (
        doc.identity.classes.map((cls) => {
          const def = baseClasses.find((c) => c.tag === cls.tag);
          const isFav = doc.identity.favoredClass === cls.tag;
          return (
            <div className="class-row" key={cls.tag}>
              <button
                type="button"
                className="favstar"
                aria-pressed={isFav}
                title="Favored class"
                onClick={() => update((d) => setFavoredClass(d, cls.tag))}
              >
                {isFav ? "★" : "☆"}
              </button>
              <span className="cname">{def?.name ?? cls.tag}</span>
              <span className="smeta num">d{def?.hd ?? "?"}</span>
              <div className="lvl-stepper">
                <button
                  type="button"
                  aria-label="Lower level"
                  onClick={() => update((d) => setClassLevel(d, cls.tag, cls.level - 1))}
                >
                  −
                </button>
                <span className="lvl">{cls.level}</span>
                <button
                  type="button"
                  aria-label="Raise level"
                  onClick={() => update((d) => setClassLevel(d, cls.tag, cls.level + 1))}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => update((d) => removeClass(d, cls.tag))}
              >
                remove
              </button>
            </div>
          );
        })
      )}
    </Panel>
  );
}
