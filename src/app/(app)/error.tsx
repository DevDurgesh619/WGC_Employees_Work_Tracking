"use client";

import { useEffect } from "react";

import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";

// Scoped error boundary for the (app) shell — the sidebar and topbar stay
// visible above this so the user can navigate away from a broken page.
export default function AppRouteError({
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
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold">This page hit an error</h1>
        <p className="text-muted-foreground text-sm">
          You can retry, or use the navigation to go somewhere else.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">ref: {error.digest}</p>
        ) : null}
        <Button onClick={reset}>Retry</Button>
      </div>
    </div>
  );
}
