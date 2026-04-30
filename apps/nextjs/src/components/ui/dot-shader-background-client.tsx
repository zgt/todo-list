"use client";

import dynamic from "next/dynamic";

export const DotScreenShader = dynamic(
  () =>
    import("~/components/ui/dot-shader-background").then(
      (mod) => mod.DotScreenShader,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);
