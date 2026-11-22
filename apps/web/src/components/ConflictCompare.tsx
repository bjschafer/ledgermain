import { useMemo } from "react";

import type { RefData } from "@pf1/schema";

import { formatLogTime } from "../model/sessionLog.js";
import { readSessionLog } from "../state/sessionLog.js";
import { compareConflict, type CompareRow } from "../sync/compareConflict.js";
import type { SyncConflict } from "../sync/planSync.js";

/** How many of this device's log lines the comparison shows. */
const LOG_LINES = 12;

function Rows({ rows }: { rows: CompareRow[] }) {
  return rows.map((row, i) => (
    // Labels can repeat (two unnamed entries), so the index disambiguates.
    <tr key={`${row.label}:${i}`}>
      <th scope="row">{row.label}</th>
      <td>{row.local}</td>
      <td>{row.remote}</td>
    </tr>
  ));
}

/**
 * The two copies of a conflicted character side by side, so the player can
 * tell which is which before picking. This device's session log rides along:
 * its timestamped lines are often the quickest way to recognize an evening.
 * The other device's log isn't synced, so there is none to show for it.
 */
export function ConflictCompare({
  conflict,
  refData,
  localLabel,
  remoteLabel,
}: {
  conflict: SyncConflict;
  refData: RefData;
  localLabel: string;
  remoteLabel: string;
}) {
  const comparison = useMemo(
    () => compareConflict(conflict.local, conflict.remote, refData),
    [conflict, refData],
  );
  const log = useMemo(
    () =>
      readSessionLog(conflict.local.id)
        .filter((entry) => !entry.divider)
        .slice(-LOG_LINES)
        .reverse(),
    [conflict.local.id],
  );
  const empty = comparison.headline.length === 0 && comparison.sections.length === 0;

  return (
    <div className="sync-compare">
      {empty ? (
        <p className="hint">These copies differ only in when they were saved.</p>
      ) : (
        <div className="sync-compare-scroll">
          <table className="sync-compare-table">
            <thead>
              <tr>
                <th scope="col">Detail</th>
                <th scope="col">{localLabel}</th>
                <th scope="col">{remoteLabel}</th>
              </tr>
            </thead>
            <tbody>
              <Rows rows={comparison.headline} />
              {comparison.sections.map((section) => (
                <SectionRows key={section.title} title={section.title} rows={section.rows} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {comparison.sections.length > 0 && (
        <p className="hint">Lists show only what one copy has and the other doesn't.</p>
      )}
      {log.length > 0 && (
        <>
          <h4 className="sync-compare-heading">This device's session log</h4>
          <ol className="session-log">
            {log.map((entry) => (
              <li key={entry.id} className={`session-log-row session-log-row--${entry.tone}`}>
                <span className="session-log-time num">
                  {new Date(entry.at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {formatLogTime(entry.at)}
                </span>
                <span className="session-log-text">{entry.text}</span>
              </li>
            ))}
          </ol>
          <p className="hint">Only this device keeps a log. The other device's isn't synced.</p>
        </>
      )}
    </div>
  );
}

function SectionRows({ title, rows }: { title: string; rows: CompareRow[] }) {
  return (
    <>
      <tr className="sync-compare-section">
        <th colSpan={3} scope="colgroup">
          {title}
        </th>
      </tr>
      <Rows rows={rows} />
    </>
  );
}
