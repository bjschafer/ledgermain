/**
 * A tiny, dependency-free binding to the Cloudflare Turnstile widget for the
 * feedback form. Rolling this by hand (rather than pulling a React wrapper)
 * keeps `apps/web`'s dependency set as lean as it already is — the fiddly
 * parts a wrapper would hide are small: load the script once, render the widget
 * explicitly into a ref, and surface the current token.
 *
 * Turnstile tokens are single-use and expire ~5 min after issue, so the form
 * must reset the widget after each submit attempt (success or failure) to mint
 * a fresh one — hence the exposed {@link UseTurnstile.reset}.
 */
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

interface TurnstileRenderParams {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "flexible" | "compact";
}

interface TurnstileApi {
  render: (el: HTMLElement, params: TurnstileRenderParams) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Module-level so the script is fetched at most once no matter how many times
// the hook mounts.
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow a later retry
      reject(new Error("Failed to load Turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileStatus = "loading" | "ready" | "error";

export interface UseTurnstile {
  /** Attach to the element the widget renders into. */
  containerRef: RefObject<HTMLDivElement>;
  /** The current verification token, or `null` before solve / after expiry. */
  token: string | null;
  status: TurnstileStatus;
  /** Clear the token and re-arm the widget (tokens are single-use). */
  reset: () => void;
}

export function useTurnstile(sitekey: string): UseTurnstile {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<TurnstileStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return; // already rendered (StrictMode re-run)
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey,
          theme: "auto",
          callback: (t) => setToken(t),
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setStatus("error");
          },
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget may already be gone; nothing to clean up.
        }
        widgetIdRef.current = null;
      }
    };
  }, [sitekey]);

  const reset = () => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // Reset before the widget finished rendering — safe to ignore.
      }
    }
  };

  return { containerRef, token, status, reset };
}
