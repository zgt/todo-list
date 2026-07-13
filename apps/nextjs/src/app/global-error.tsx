"use client";

/**
 * Global error boundary — catches failures in the root layout itself.
 * This boundary replaces the entire document, so it must render its own
 * <html>/<body> and cannot rely on the root layout's CSS. Everything here
 * is inline-styled and self-contained.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backgroundColor: "#0A1A1A",
          color: "#DCE4E4",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            textAlign: "center",
            backgroundColor: "#102A2A",
            border: "1px solid #164B49",
            borderRadius: "16px",
            padding: "40px 32px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.37)",
          }}
        >
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: "0 0 28px",
              fontSize: "15px",
              lineHeight: 1.5,
              color: "#8FA8A8",
            }}
          >
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-block",
              padding: "10px 24px",
              fontSize: "15px",
              fontWeight: 600,
              color: "#0A1A1A",
              backgroundColor: "#50C878",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
