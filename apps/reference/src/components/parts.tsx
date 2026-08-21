import type { SourceRef } from "@pf1/schema";

/**
 * Pipeline-produced Foundry HTML (p/em/strong/br), with every `@UUID` link
 * already resolved to plain text at data-build time — no markup to interpret and
 * nothing to sanitise beyond what the pipeline already emitted.
 */
export function Description({ html }: { html: string | undefined }) {
  if (!html) return null;
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** `PZO1110 p. 239` — id and pages verbatim; no product-name table exists. */
export function Sources({ sources }: { sources: SourceRef[] | undefined }) {
  if (!sources || sources.length === 0) return null;
  return (
    <p className="sources">
      {sources.map((s, i) => (
        <span key={`${s.id}-${s.pages ?? i}`}>
          {i > 0 && "; "}
          {s.id}
          {s.pages ? ` p. ${s.pages}` : ""}
        </span>
      ))}
    </p>
  );
}

/** One label/value line in a detail stat block. Renders nothing for empty values. */
export function Row({
  label,
  children,
  changed,
}: {
  label: string;
  children: React.ReactNode;
  /** Marks the row as changed by a statblock adjustment (adds "row-changed"). */
  changed?: boolean;
}) {
  if (children === null || children === undefined || children === false || children === "") {
    return null;
  }
  return (
    <div className={changed ? "row row-changed" : "row"}>
      <span className="row-label">{label}</span>
      <span className="row-value">{children}</span>
    </div>
  );
}

/** A compact pill in the always-visible stat strip under an entry's name. */
export function Chip({
  children,
  tone,
  changed,
}: {
  children: React.ReactNode;
  tone?: "save" | "damage";
  /** Marks the chip as changed by a statblock adjustment (adds "row-changed"). */
  changed?: boolean;
}) {
  const classes = ["stat-chip"];
  if (tone) classes.push(`is-${tone}`);
  if (changed) classes.push("row-changed");
  return <span className={classes.join(" ")}>{children}</span>;
}
