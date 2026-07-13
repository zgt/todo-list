"use client";

import { ErrorBoundaryCard } from "../../_components/error-boundary-card";

export default function ListDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundaryCard reset={reset} />;
}
