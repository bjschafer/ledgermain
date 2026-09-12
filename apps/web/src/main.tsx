import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { parseShareHash } from "./model/shareLink.js";
import "./styles.css";

const SharedSheet = lazy(() =>
  import("./components/SharedSheet.js").then((m) => ({ default: m.SharedSheet })),
);

/**
 * A share link opens a reader for someone else's character instead of the
 * player's own app. The choice is made here, above `App`, so a reader never
 * mounts the player's storage, sync, or location tracking at all. It also
 * follows `hashchange`, since pasting a share link into an open tab changes
 * only the fragment.
 */
function Root() {
  const [shareToken, setShareToken] = useState(() => parseShareHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setShareToken(parseShareHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (shareToken) {
    return (
      <Suspense fallback={null}>
        <SharedSheet key={shareToken} token={shareToken} />
      </Suspense>
    );
  }
  return <App />;
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Outside <App/>, not inside it: a crash in App's own hooks has to be caught
// too, and that is the case that would otherwise blank the page entirely.
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
