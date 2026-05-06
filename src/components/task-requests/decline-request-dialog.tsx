"use client";

import { useState, useTransition } from "react";

import { X } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { declineTaskRequest } from "@/server/actions/task-requests";

type FormValues = {
  reason: string;
};

type Props = {
  requestId: string;
  requesterName: string;
};

export function DeclineRequestDialog({ requestId, requesterName }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { reason: "" } });

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await declineTaskRequest(requestId, {
        reason: values.reason.trim() || undefined,
      });
      if (!result.ok) {
        const message = result.message ?? "Could not decline request.";
        setServerError(message);
        toast.error(message);
        return;
      }
      toast.success(`Declined ${requesterName}'s request.`);
      reset({ reason: "" });
      setOpen(false);
    });
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <X className="mr-1 h-4 w-4" />
        Decline
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            reset({ reason: "" });
            setServerError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline request from {requesterName}</DialogTitle>
            <DialogDescription>
              Optional note — visible to the employee on their dashboard.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder="e.g. Nothing pressing right now — try again tomorrow."
                {...register("reason", {
                  maxLength: { value: 500, message: "Max 500 characters." },
                })}
              />
              {errors.reason ? (
                <p className="text-destructive text-sm">{errors.reason.message}</p>
              ) : null}
            </div>

            {serverError ? (
              <p className="text-destructive text-sm" role="alert">
                {serverError}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? "Declining…" : "Confirm decline"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
