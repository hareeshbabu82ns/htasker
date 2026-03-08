"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Target, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Tracker, TrackerType } from "@/types";
import { setTrackerGoal, clearTrackerGoal } from "@/app/actions/trackers";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const goalSchema = z.object({
  goalValue: z
    .number({ message: "Must be a number" })
    .positive("Must be greater than 0"),
  goalPeriod: z.enum(["daily", "weekly", "monthly"] as const, {
    message: "Select a period",
  }),
  goalUnit: z
    .string()
    .min(1, "Unit is required")
    .max(20, "Unit must be 20 characters or less"),
});

type GoalFormValues = z.infer<typeof goalSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface GoalFormProps {
  tracker: Tracker;
  onSuccess?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultUnitForType(type: TrackerType): string {
  switch (type) {
    case TrackerType.TIMER:
      return "minutes";
    case TrackerType.COUNTER:
      return "times";
    case TrackerType.AMOUNT:
      return "units";
    case TrackerType.OCCURRENCE:
      return "occurrences";
    default:
      return "entries";
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GoalForm({ tracker, onSuccess }: GoalFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const isEditing = tracker.goalEnabled === true;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goalValue: tracker.goalValue ?? undefined,
      goalPeriod: (tracker.goalPeriod as GoalFormValues["goalPeriod"]) ?? "daily",
      goalUnit: tracker.goalUnit ?? defaultUnitForType(tracker.type),
    },
  });

  const watchedPeriod = watch("goalPeriod");

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: GoalFormValues) => {
    const res = await setTrackerGoal(tracker.id, {
      enabled: true,
      value: data.goalValue,
      period: data.goalPeriod,
      unit: data.goalUnit,
    });

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["tracker", tracker.id] });
    router.refresh();
    toast.success(isEditing ? "Goal updated" : "Goal set");
    onSuccess?.();
  };

  // ── Clear ───────────────────────────────────────────────────────────────────

  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const res = await clearTrackerGoal(tracker.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["tracker", tracker.id] });
      router.refresh();
      toast.success("Goal cleared");
      onSuccess?.();
    } finally {
      setIsClearing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4" />
          Goal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Target value */}
          <div className="space-y-1.5">
            <Label htmlFor="goalValue">Target value</Label>
            <Input
              id="goalValue"
              type="number"
              step="any"
              min={0.001}
              placeholder="e.g. 30"
              {...register("goalValue", { valueAsNumber: true })}
            />
            {errors.goalValue && (
              <p className="text-xs text-destructive">{errors.goalValue.message}</p>
            )}
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label htmlFor="goalPeriod">Period</Label>
            <Select
              value={watchedPeriod}
              onValueChange={(val) =>
                setValue("goalPeriod", val as GoalFormValues["goalPeriod"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="goalPeriod" className="w-full">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {errors.goalPeriod && (
              <p className="text-xs text-destructive">{errors.goalPeriod.message}</p>
            )}
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <Label htmlFor="goalUnit">Unit</Label>
            <Input
              id="goalUnit"
              type="text"
              placeholder={`e.g. ${defaultUnitForType(tracker.type)}`}
              {...register("goalUnit")}
            />
            {errors.goalUnit && (
              <p className="text-xs text-destructive">{errors.goalUnit.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isSubmitting || isClearing} className="flex-1">
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEditing ? "Update Goal" : "Set Goal"}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                disabled={isClearing}
                onClick={handleClear}
              >
                {isClearing && <Loader2 className="mr-2 size-4 animate-spin" />}
                Clear Goal
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
