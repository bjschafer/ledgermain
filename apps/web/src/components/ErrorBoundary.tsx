import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Last-resort guard around a render-time crash.
 *
 * React unmounts the entire tree when a render throws and nothing catches it,
 * so without a boundary any single bad render looks exactly like a failed
 * deploy: an empty page, no message, nothing to report. That makes the one
 * bug report a player can still file ("white screen") the least actionable one
 * there is. Showing the message and the build SHA turns it into a fixable
 * report.
 *
 * Scope is render, lifecycle, and constructors only. Event handlers and async
 * work are outside React's boundary machinery -- those paths guard themselves
 * (`state/useCharacter.ts` routes load failures to its own error screen).
 *
 * `fallback` narrows the blast radius: without it the whole tree is replaced by
 * the full-screen notice, which is right at the root and wrong around one
 * tracker panel, where losing the rest of the sheet mid-fight costs far more
 * than the panel does. See `PanelBoundary`.
 */
interface Props {
  children: ReactNode;
  /** What to render in place of `children` after a crash. Default: full screen. */
  fallback?: (error: Error) => ReactNode;
  /** Names the crashing region in the console line. Default: the whole sheet. */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Nothing ships this anywhere: the app has no telemetry and the feedback
    // endpoint needs a Turnstile token this screen can't obtain. The console
    // is what a bug reporter can actually be walked through reading.
    const where = this.props.label ?? "the sheet";
    console.error(`Ledgermain crashed while rendering ${where}:`, error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error);

    const build = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";
    return (
      <div className="state-screen">
        <div>
          <div className="glyph">⚠</div>
          <p>Something in the sheet broke.</p>
          <p className="hint">Your saved characters aren't affected. Try reloading.</p>
          <p className="crash-detail">
            {error.message || String(error)}
            <br />
            build {build}
          </p>
          <button type="button" className="btn-gold" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
