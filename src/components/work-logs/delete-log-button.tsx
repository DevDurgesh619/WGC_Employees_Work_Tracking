"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteWorkLog } from "@/server/actions/work-logs";

type Props = {
  logId: string;
};

export function DeleteLogButton({ logId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteWorkLog(logId);
      if (!result.ok) {
        toast.error(result.message ?? "Could not delete log.");
        return;
      }
      toast.success("Log deleted.");
      router.refresh();
      setOpen(false);
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title="Delete log"
        aria-label="Delete log"
      >
        <Trash2 className="text-destructive h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete work log?</DialogTitle>
            <DialogDescription>
              This soft-deletes the log. It’s reversible at the database level but won’t show up
              in any future reports or totals.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
