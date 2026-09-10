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
 * Undo, by contrast, is a real edit to the character, and is not itself one of
 * the things the log records.
 */
export function SessionLogPanel({
  sessionLog,
  onClearSessionLog,
  undoLast,
  canUndo,
}: BuilderProps) {
  if (!sessionLog || sessionLog.length === 0) return null;

  const newestFirst = [...sessionLog].reverse();

  return (
    <Panel
      title="Session Log"
      step="✦"
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
              title="Step back through the changes you have made, one at a time"
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
        {newestFirst.map((entry) => (
          <li key={entry.id} className={`session-log-row session-log-row--${entry.tone}`}>
            <span className="session-log-time num">{formatLogTime(entry.at)}</span>
            <span className="session-log-text">{entry.text}</span>
          </li>
        ))}
      </ol>
      <p className="hint">
        Kept on this device only, newest first. It never leaves your browser and never travels with
        the character.
      </p>
    </Panel>
  );
}
