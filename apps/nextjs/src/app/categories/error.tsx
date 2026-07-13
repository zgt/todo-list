"use client";

import { ErrorBoundaryCard } from "../_components/error-boundary-card";

export default function CategoriesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundaryCard reset={reset} />;
}
