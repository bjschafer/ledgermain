import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { isLegacyHost, parseHandoffHash } from "./model/legacyHost.js";
import { parseShareHash } from "./model/shareLink.js";
import "./styles.css";

const SharedSheet = lazy(() =>
  import("./components/SharedSheet.js").then((m) => ({ default: m.SharedSheet })),
);
const LegacyMove = lazy(() =>
  import("./components/LegacyMove.js").then((m) => ({ default: m.LegacyMove })),
);
const HandoffImport = lazy(() =>
  import("./components/HandoffImport.js").then((m) => ({ default: m.HandoffImport })),
);

/**
 * A share link opens a reader for someone else's character instead of the
 * player's own app. The choice is made here, above `App`, so a reader never
 * mounts the player's storage, sync, or location tracking at all. It also
 * follows `hashchange`, since pasting a share link into an open tab changes
 * only the fragment.
 *
 * The app's old address and the move it hands over (`model/legacyHost.ts`)
 * are decided here for the same reason: the old address must never mount the
 * app, and the new one must not mount it until the move has been written.
 */
function Root() {
  const [shareToken, setShareToken] = useState(() => parseShareHash(window.location.hash));
  const [handoff, setHandoff] = useState(() => parseHandoffHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setShareToken(parseShareHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (isLegacyHost(window.location.hostname)) {
    return (
      <Suspense fallback={null}>
        <LegacyMove />
      </Suspense>
    );
  }
  if (handoff) {
    return (
      <Suspense fallback={null}>
        <HandoffImport encoded={handoff} onDone={() => setHandoff(null)} />
      </Suspense>
    );
  }
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
