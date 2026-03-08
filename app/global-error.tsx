"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError( { error, reset }: GlobalErrorProps ) {
  useEffect( () => {
    console.error( "Global layout error:", error );
  }, [ error ] );

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f172a", color: "#f8fafc" }}>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", textAlign: "center" }}>
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#ef4444" aria-hidden="true" style={{ marginBottom: "1rem" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Application Error</h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem", maxWidth: "28rem" }}>
            A critical error occurred and the application could not load. Please refresh the page.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b", marginBottom: "1rem" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ padding: "0.5rem 1.5rem", borderRadius: "0.375rem", background: "#6366f1", color: "#fff", border: "none", cursor: "pointer", fontSize: "1rem" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
