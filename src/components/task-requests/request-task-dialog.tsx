"use client";

import { useState, useTransition } from "react";

import { HandHelping } from "lucide-react";
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
import { createTaskRequest } from "@/server/actions/task-requests";

type FormValues = {
  message: string;
};

export function RequestTaskDialog({
  hasOpenRequest,
  variant = "default",
  size = "default",
}: {
  hasOpenRequest: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { message: "" } });

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createTaskRequest({
        message: values.message.trim() || undefined,
      });
      if (!result.ok) {
        const message = result.message ?? "Could not send request.";
        setServerError(message);
        toast.error(message);
        return;
      }
      toast.success("Request sent. A founder will respond shortly.");
      reset({ message: "" });
      setOpen(false);
    });
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        disabled={hasOpenRequest}
        title={hasOpenRequest ? "You already have an open request." : undefined}
        onClick={() => setOpen(true)}
      >
        <HandHelping className="mr-1 h-4 w-4" />
        {hasOpenRequest ? "Request pending" : "Request a task"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setServerError(null);
            reset({ message: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a task</DialogTitle>
            <DialogDescription>
              Let the founders know what kind of work you&apos;re free for. Optional
              — they&apos;ll see who&apos;s asking either way.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                rows={4}
                placeholder="e.g. I have ~3 hours, comfortable with frontend work."
                {...register("message", {
                  maxLength: { value: 500, message: "Max 500 characters." },
                })}
              />
              {errors.message ? (
                <p className="text-destructive text-sm">{errors.message.message}</p>
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
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending…" : "Send request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
