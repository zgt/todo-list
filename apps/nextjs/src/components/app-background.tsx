import { DotScreenShader } from "~/components/ui/dot-shader-background-client";

/**
 * Animated dot-shader backdrop for the app's authed surfaces. Mounted on the
 * dashboard page and the (app) layout group — NOT the root layout — so public
 * pages (privacy, terms, support, …) never load the three.js chunk. Must
 * render inside TRPCReactProvider: the shader listens to query/mutation
 * activity for its ripple effect.
 */
export function AppBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <DotScreenShader />
    </div>
  );
}
