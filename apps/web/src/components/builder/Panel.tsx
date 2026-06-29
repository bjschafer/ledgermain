import type { ReactNode } from "react";

/** A titled builder panel. `step` is a short ledger-style marker (e.g. "i", "ii"). */
export function Panel({
  title,
  step,
  right,
  children,
}: {
  title: string;
  step?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header>
        <h2>
          {title}
          {step ? <span className="step">{step}</span> : null}
        </h2>
        {right}
      </header>
      <div className="body">{children}</div>
    </section>
  );
}
