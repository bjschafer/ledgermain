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
 */
interface Props {
  children: ReactNode;
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
    console.error("Ledgermain crashed while rendering:", error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

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
