import { formatLogTime } from "../../model/sessionLog.js";
import { Panel } from "../builder/Panel.js";
import type { BuilderProps } from "../builder/types.js";
import { BookmarkIcon } from "../icons.js";

/**
 * What the table did to this character, newest first. Written by nothing on
 * this screen: every line is a side effect of a tap somewhere else (Damage,
 * Heal, a condition chip, a spell cast, a pool spent), which is what makes it
 * worth having open. Hidden until there is something in it, like every other
 * panel that doesn't apply.
 *
 * Also the standing home for Undo. The toast a big hit raises carries one too,
 * but it is gone in six seconds and takes its button with it, so it can only
 * ever walk back the single most recent change. The header's copy is the one
 * that can be pressed twice.
 *
 * Device-local and not part of the character (see `state/sessionLog.ts`), so
 * "Clear" throws away this browser's memory of the evening and nothing else.
 * Undo, by contrast, is a real edit to the character. It takes back one line
 * at a time, and the line it would take next is marked, so nobody has to guess
 * what the button does. Round markers are dividers, not lines: the clock is
 * never undone, and a line whose undo a later change made unsafe simply stops
 * being marked (`state/undoSnapshot.ts`).
 */
export function SessionLogPanel({
  sessionLog,
  onClearSessionLog,
  undoLast,
  canUndo,
  undoNextLineId,
}: BuilderProps) {
  if (!sessionLog || sessionLog.length === 0) return null;

  const newestFirst = [...sessionLog].reverse();

  return (
    <Panel
      title="Session Log"

      icon={<BookmarkIcon />}
      storageKey="panel:SessionLog"
      right={
        <>
          {undoLast ? (
            <button
              type="button"
              // `rest` is the header's push-to-the-right utility, applied to the
              // first of the pair so the two buttons group at that edge.
              className="btn-ghost rest"
              disabled={!canUndo}
              title="Undo the marked line"
              onClick={(e) => {
                e.stopPropagation();
                undoLast();
              }}
            >
              Undo
            </button>
          ) : null}
          {onClearSessionLog ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={(e) => {
                e.stopPropagation();
                onClearSessionLog();
              }}
            >
              Clear
            </button>
          ) : null}
        </>
      }
    >
      <ol className="session-log">
        {newestFirst.map((entry) =>
          entry.divider ? (
            <li key={entry.id} className="session-log-divider">
              <span className="session-log-divider-text">{entry.text}</span>
            </li>
          ) : (
            <li
              key={entry.id}
              className={`session-log-row session-log-row--${entry.tone}${
                entry.id === undoNextLineId ? " session-log-row--undo-next" : ""
              }`}
            >
              <span className="session-log-time num">{formatLogTime(entry.at)}</span>
              <span className="session-log-text">{entry.text}</span>
              {entry.id === undoNextLineId ? (
                <span className="session-log-undo-tag">next undo</span>
              ) : null}
            </li>
          ),
        )}
      </ol>
      <p className="hint">
        Kept on this device only, newest first. It never leaves your browser and never travels with
        the character. Undo takes back the line marked next undo. Round markers note the clock and
        are never undone.
      </p>
    </Panel>
  );
}
