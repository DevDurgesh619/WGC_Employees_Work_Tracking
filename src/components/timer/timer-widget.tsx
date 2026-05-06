"use client";

import { useEffect, useState } from "react";

import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TimerConflictDialog } from "@/components/timer/timer-conflict-dialog";
import { TimerStartDialog } from "@/components/timer/timer-start-dialog";
import { TimerStopDialog } from "@/components/timer/timer-stop-dialog";
import { useActiveTimer } from "@/hooks/use-active-timer";

type TaskOption = { id: string; title: string };

type Props = {
  taskOptions: TaskOption[];
};

function formatHHMMSS(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function useTickingNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export function TimerWidget({ taskOptions }: Props) {
  const { data: active, isLoading } = useActiveTimer();
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  const isRunning = Boolean(active);
  const now = useTickingNow(isRunning);
  const elapsedMs = isRunning && active ? now - new Date(active.startedAt).getTime() : 0;

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-2">
      {isRunning && active ? (
        <>
          <span
            className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 font-mono text-xs tabular-nums"
            aria-live="polite"
          >
            {formatHHMMSS(elapsedMs)}
          </span>
          <Button size="sm" variant="outline" onClick={() => setStopDialogOpen(true)}>
            <Pause className="mr-1 h-4 w-4" />
            Stop
          </Button>
          <TimerStopDialog
            active={active}
            open={stopDialogOpen}
            onOpenChange={setStopDialogOpen}
            taskOptions={taskOptions}
          />
        </>
      ) : (
        <>
          <Button size="sm" variant="outline" onClick={() => setStartDialogOpen(true)}>
            <Play className="mr-1 h-4 w-4" />
            Start timer
          </Button>
          <TimerStartDialog
            open={startDialogOpen}
            onOpenChange={setStartDialogOpen}
            taskOptions={taskOptions}
            onConflict={() => setConflictOpen(true)}
          />
        </>
      )}
      <TimerConflictDialog open={conflictOpen} onClose={() => setConflictOpen(false)} />
    </div>
  );
}
