"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";

// Refreshes RSC + TanStack Query caches whenever the *tab* (not just the
// window) regains visibility. Used so that when you switch back to a tab
// that's been in the background while you mutated data elsewhere, the page
// reflects the new state without a hard reload.
//
// Only listens to visibilitychange — `window.focus` fires too aggressively
// (Playwright clicks, dialog opens) and was racing against in-flight Server
// Action navigations.
export function RefreshOnVisible() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // useRef initializer runs during SSR — don't touch `document` there.
  const wasHiddenRef = useRef<boolean>(false);

  useEffect(() => {
    wasHiddenRef.current = document.visibilityState !== "visible";
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        wasHiddenRef.current = true;
        return;
      }
      // Only refresh on hidden → visible transitions, not visible → visible.
      if (!wasHiddenRef.current) return;
      wasHiddenRef.current = false;
      router.refresh();
      void queryClient.invalidateQueries();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router, queryClient]);

  return null;
}
