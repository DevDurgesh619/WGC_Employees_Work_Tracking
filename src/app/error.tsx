"use client";

import { useEffect } from "react";

import * as Sentry from "@sentry/nextjs";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. The team has been notified.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">ref: {error.digest}</p>
        ) : null}
        <button
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
