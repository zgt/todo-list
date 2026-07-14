"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

const DotScreenShaderCanvas = dynamic(
  () =>
    import("~/components/ui/dot-shader-background").then(
      (mod) => mod.DotScreenShader,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => {
    query.removeEventListener("change", callback);
  };
}

function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// Assume motion is allowed during SSR; the client snapshot resolves the real
// preference on mount. Since the Canvas is a dynamic ssr:false import, the
// server output is null either way, so this cannot cause a hydration mismatch.
function getServerSnapshot() {
  return false;
}

// True only after hydration. The hydration render replays the server snapshot,
// so without this gate the dynamic Canvas would render once for everyone and
// next/dynamic would start downloading the three.js chunk before the real
// motion preference is applied.
const noopSubscribe = () => () => undefined;
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Gates the animated shader on the user's motion preference. When the user
 * prefers reduced motion we render nothing — the Canvas is never mounted and
 * the three.js chunk is never downloaded — and the page's CSS gradient
 * background remains. useSyncExternalStore keeps the preference in sync with
 * the media query (including live changes) without a hydration mismatch.
 */
export function DotScreenShader() {
  const hydrated = useHydrated();
  const prefersReducedMotion = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!hydrated || prefersReducedMotion) return null;

  return <DotScreenShaderCanvas />;
}
