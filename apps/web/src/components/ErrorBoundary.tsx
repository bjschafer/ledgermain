import { Component, type ErrorInfo, type ReactNode } from "react";

import { feedbackEnabled } from "../feedback/config.js";
import { buildCrashDraft } from "../model/feedback.js";

import { FeedbackModal } from "./FeedbackButton.js";

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
 *
 * Nothing about a crash leaves the browser unless the player sends it. The
 * default screen offers a report button that opens the ordinary feedback form
 * pre-filled with the error and the component stack, so a white screen becomes
 * a report someone can act on -- but it is still a form the player reads and
 * submits, not telemetry. See `model/feedback.ts`'s `buildCrashDraft`.
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
  /** React's component stack for `error`, kept for the crash report. */
  componentStack: string;
  reporting: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, componentStack: "", reporting: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Still logged unconditionally: the console is the one place a report is
    // available without a network call, and the only one at all when the
    // feedback endpoint isn't configured for this build.
    const where = this.props.label ?? "the sheet";
    console.error(`Ledgermain crashed while rendering ${where}:`, error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? "" });
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error);

    const build = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";
    const where = this.props.label ?? "the sheet";
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
          <div className="crash-actions">
            <button type="button" className="btn-gold" onClick={() => window.location.reload()}>
              Reload
            </button>
            {feedbackEnabled() && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => this.setState({ reporting: true })}
              >
                Send a report
              </button>
            )}
          </div>
        </div>
        {this.state.reporting && (
          <FeedbackModal
            mode="crash"
            initialDraft={buildCrashDraft(error, this.state.componentStack, where)}
            onClose={() => this.setState({ reporting: false })}
          />
        )}
      </div>
    );
  }
}
