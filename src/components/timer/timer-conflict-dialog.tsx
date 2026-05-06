"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function TimerConflictDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Already running</DialogTitle>
          <DialogDescription>
            A timer is already running on another device or browser tab. Only one timer can be
            active per user at a time.
          </DialogDescription>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          We refreshed this widget — you should see the running timer now. Stop it here to start a
          new session.
        </p>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
