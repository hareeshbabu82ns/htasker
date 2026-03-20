"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { updateEntry } from "@/app/actions/entries";
import { useDeleteEntryMutation } from "@/hooks/useTrackerQuery";
import { TrackerEntry, TrackerType } from "@/types";

// ── Form schema ───────────────────────────────────────────────────────────────
// All values are kept as strings because HTML inputs return strings.
// We coerce/convert to the correct types before calling the server action.
const editEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  note: z.string().max(500, "Note cannot exceed 500 characters"),
  tags: z.string(), // comma-separated; split on submit
  value: z.string(), // coerced to number for COUNTER / AMOUNT; ignored for TIMER
  startTime: z.string(), // TIMER only
  endTime: z.string(), // TIMER only
});

type EditEntryFormValues = z.infer<typeof editEntrySchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converts a Date (or ISO string / null / undefined) to the value expected by
 *  a <input type="datetime-local"> element: "YYYY-MM-DDTHH:mm" in LOCAL time.
 *  Using local time is required because datetime-local inputs work in the
 *  browser's local timezone, not UTC. */
function toDatetimeLocal(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Parses a datetime-local string to a Date, returning null when empty. */
function fromDatetimeLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EditEntryModalProps {
  entry: TrackerEntry;
  trackerType: TrackerType;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditEntryModal({ entry, trackerType, onSuccess }: EditEntryModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deleteEntryMutation = useDeleteEntryMutation(entry.trackerId);

  const isTimer = trackerType === TrackerType.TIMER;
  const hasNumericValue = trackerType === TrackerType.COUNTER || trackerType === TrackerType.AMOUNT;
  const hasCustomValue = trackerType === TrackerType.CUSTOM;
  const showValueField = hasNumericValue || hasCustomValue;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditEntryFormValues>({
    resolver: zodResolver(editEntrySchema),
    defaultValues: {
      date: toDatetimeLocal(entry.date),
      note: entry.note ?? "",
      tags: (entry.tags ?? []).join(", "),
      value: entry.value != null ? String(entry.value) : "",
      startTime: toDatetimeLocal(entry.startTime),
      endTime: toDatetimeLocal(entry.endTime),
    },
  });

  const onSubmit = async (formValues: EditEntryFormValues) => {
    setIsSubmitting(true);
    try {
      const tags = formValues.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Build the partial update payload; only include fields that are relevant
      // to the tracker type and have a value to avoid accidentally clearing data.
      const updatePayload: Parameters<typeof updateEntry>[1] = {
        date: fromDatetimeLocal(formValues.date) ?? new Date(),
        note: formValues.note || null,
        tags,
      };

      if (isTimer) {
        const startTime = fromDatetimeLocal(formValues.startTime);
        const endTime = fromDatetimeLocal(formValues.endTime);
        if (startTime && endTime && endTime <= startTime) {
          toast.error("End time must be after start time");
          setIsSubmitting(false);
          return;
        }
        if (startTime) updatePayload.startTime = startTime;
        if (endTime) updatePayload.endTime = endTime;
        // value is auto-calculated by the server action from startTime/endTime
      } else if (showValueField && formValues.value !== "") {
        const parsed = parseFloat(formValues.value);
        updatePayload.value = isNaN(parsed) ? null : parsed;
      }

      const result = await updateEntry(entry.id, updatePayload);

      if (result.success) {
        toast.success("Entry updated");
        setOpen(false);
        onSuccess();
      } else {
        toast.error(result.error ?? "Failed to update entry");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    deleteEntryMutation.mutate(entry.id, {
      onSuccess: () => {
        toast.success("Entry deleted");
        setOpen(false);
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete entry");
      },
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset form to entry values whenever the dialog closes
      reset({
        date: toDatetimeLocal(entry.date),
        note: entry.note ?? "",
        tags: (entry.tags ?? []).join(", "),
        value: entry.value != null ? String(entry.value) : "",
        startTime: toDatetimeLocal(entry.startTime),
        endTime: toDatetimeLocal(entry.endTime),
      });
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-7 w-7"
          aria-label="Edit entry"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Date — shown for all types except TIMER (which uses startTime/endTime) */}
          {!isTimer && (
            <div className="space-y-1.5">
              <Label htmlFor="entry-date">Date</Label>
              <Input id="entry-date" type="datetime-local" {...register("date")} />
              {errors.date && <p className="text-destructive text-xs">{errors.date.message}</p>}
            </div>
          )}

          {/* TIMER: start / end time */}
          {isTimer && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="entry-startTime">Start time</Label>
                <Input id="entry-startTime" type="datetime-local" {...register("startTime")} />
                {errors.startTime && (
                  <p className="text-destructive text-xs">{errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="entry-endTime">End time</Label>
                <Input id="entry-endTime" type="datetime-local" {...register("endTime")} />
                {errors.endTime && (
                  <p className="text-destructive text-xs">{errors.endTime.message}</p>
                )}
              </div>

              <p className="text-muted-foreground text-xs">
                Duration is calculated automatically from start and end times.
              </p>
            </>
          )}

          {/* Value — COUNTER, AMOUNT (number), CUSTOM (number stored in value field) */}
          {showValueField && (
            <div className="space-y-1.5">
              <Label htmlFor="entry-value">
                {trackerType === TrackerType.AMOUNT ? "Amount" : "Value"}
              </Label>
              <Input
                id="entry-value"
                type="number"
                step="any"
                placeholder="0"
                {...register("value")}
              />
              {errors.value && <p className="text-destructive text-xs">{errors.value.message}</p>}
            </div>
          )}

          {/* Note — all types */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-note">Note</Label>
            <Textarea id="entry-note" placeholder="Add a note…" rows={3} {...register("note")} />
            {errors.note && <p className="text-destructive text-xs">{errors.note.message}</p>}
          </div>

          {/* Tags — all types */}
          <div className="space-y-1.5">
            <Label htmlFor="entry-tags">Tags</Label>
            <Input
              id="entry-tags"
              type="text"
              placeholder="tag1, tag2, tag3"
              {...register("tags")}
            />
            <p className="text-muted-foreground text-xs">Separate tags with commas.</p>
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  disabled={isSubmitting || deleteEntryMutation.isPending}
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this entry and update tracker statistics. This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting || deleteEntryMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || deleteEntryMutation.isPending}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
