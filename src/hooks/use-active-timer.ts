"use client";

import { useQuery } from "@tanstack/react-query";

import { getActiveTimer } from "@/server/actions/time-entries";

export type ActiveTimerRow = Awaited<ReturnType<typeof getActiveTimer>>;

export const ACTIVE_TIMER_QUERY_KEY = ["active-timer"] as const;

export function useActiveTimer() {
  return useQuery<ActiveTimerRow>({
    queryKey: ACTIVE_TIMER_QUERY_KEY,
    queryFn: () => getActiveTimer(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}
