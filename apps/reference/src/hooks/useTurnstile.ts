/**
 * Dependency-free binding to the Cloudflare Turnstile widget: load the script
 * once, render explicitly into a ref, surface the token. Tokens are single-use
 * and expire after ~5 minutes, so the form calls `reset` after every failed
 * submit to mint a fresh one.
 */
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

interface TurnstileRenderParams {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  theme?: "auto" | "light" | "dark";
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

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // a later open may retry
      reject(new Error("Failed to load Turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileStatus = "loading" | "ready" | "error";

export interface UseTurnstile {
  containerRef: RefObject<HTMLDivElement | null>;
  /** `null` before a solve and after expiry. */
  token: string | null;
  status: TurnstileStatus;
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
        if (widgetIdRef.current) return; // StrictMode re-run
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey,
          theme: "dark",
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
          // Already gone.
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
        // Reset before the widget finished rendering.
      }
    }
  };

  return { containerRef, token, status, reset };
}
