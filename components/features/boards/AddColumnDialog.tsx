"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAddColumnMutation, useUpdateColumnMutation } from "@/hooks/useBoardQuery";
import { toast } from "sonner";

const columnSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
});

type FormValues = z.infer<typeof columnSchema>;

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  column?: { id: string; name: string };
}

export function AddColumnDialog({ open, onOpenChange, boardId, column }: AddColumnDialogProps) {
  const isEdit = !!column;
  const addMutation = useAddColumnMutation(boardId);
  const updateMutation = useUpdateColumnMutation(boardId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(columnSchema),
    defaultValues: { name: column?.name ?? "" },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEdit && column) {
        await updateMutation.mutateAsync({ columnId: column.id, name: data.name });
        toast.success("Column renamed");
      } else {
        await addMutation.mutateAsync(data.name);
        toast.success("Column added");
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Rename Column" : "Add Column"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="column-name">Name</Label>
            <Input
              id="column-name"
              placeholder="e.g. In Review"
              autoFocus
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Rename" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
