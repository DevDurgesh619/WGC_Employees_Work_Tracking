"use client";

import { useEffect } from "react";

import * as Sentry from "@sentry/nextjs";

// Catches errors thrown inside the root layout itself — React would otherwise
// blank-screen. Must render its own <html>/<body> because the root layout
// has already failed.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
          color: "#111",
          background: "#fff",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Application error</h1>
        <p style={{ color: "#555", marginTop: "0.5rem" }}>
          The page failed to load. Please refresh.
        </p>
        {error.digest ? (
          <p style={{ color: "#888", fontFamily: "monospace", fontSize: "0.75rem" }}>
            ref: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
