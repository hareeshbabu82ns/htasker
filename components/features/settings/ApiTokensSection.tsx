"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Key, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  generateApiToken,
  listApiTokens,
  revokeApiToken,
  type ApiTokenSummary,
  type GenerateTokenInput,
} from "@/app/actions/api-tokens";

const generateTokenSchema = z.object({
  name: z.string().min(1, "Token name is required").max(50, "Name cannot exceed 50 characters"),
  expiresInDaysStr: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1 && parseInt(v, 10) <= 365),
      { message: "Must be between 1 and 365" }
    ),
});

type GenerateFormValues = z.infer<typeof generateTokenSchema>;

interface ApiTokensSectionProps {
  initialTokens: ApiTokenSummary[];
}

function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default function ApiTokensSection({ initialTokens }: ApiTokensSectionProps) {
  const [tokens, setTokens] = useState<ApiTokenSummary[]>(initialTokens);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateTokenSchema),
    defaultValues: { name: "", expiresInDaysStr: "" },
  });

  async function onGenerate(values: GenerateFormValues) {
    const expiresInDays =
      values.expiresInDaysStr && values.expiresInDaysStr !== ""
        ? parseInt(values.expiresInDaysStr, 10)
        : null;

    const input: GenerateTokenInput = {
      name: values.name,
      expiresInDays,
    };

    const result = await generateApiToken(input);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setGeneratedToken(result.data.token);

    const refreshResult = await listApiTokens();
    if (refreshResult.success) {
      setTokens(refreshResult.data);
    }
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setGeneratedToken(null);
      form.reset();
    }
    setDialogOpen(open);
  }

  function copyToClipboard(token: string) {
    navigator.clipboard.writeText(token).then(() => {
      toast.success("Token copied to clipboard");
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const result = await revokeApiToken(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setTokens((prev) => prev.filter((t) => t.id !== id));
      toast.success("Token revoked");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            Use API tokens to authenticate requests to the HTracker REST API. Tokens are shown only
            once when created.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Generate Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate API Token</DialogTitle>
              <DialogDescription>
                Give your token a descriptive name so you know where it&apos;s used.
              </DialogDescription>
            </DialogHeader>

            {generatedToken ? (
              <div className="space-y-4">
                <div className="bg-muted rounded-md p-3">
                  <p className="mb-2 text-sm font-medium text-green-600 dark:text-green-400">
                    Token generated — copy it now. You won&apos;t see it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs break-all">{generatedToken}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(generatedToken)}
                      aria-label="Copy token"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => handleDialogClose(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onGenerate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. My CLI script" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiresInDaysStr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expires in (days, optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            placeholder="Leave blank for no expiry"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogClose(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      Generate
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {tokens.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Key className="text-muted-foreground mx-auto mb-2 h-8 w-8" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">
            No API tokens yet. Generate one to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="sr-only">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-medium">{token.name}</TableCell>
                  <TableCell>
                    <code className="bg-muted rounded px-1 py-0.5 text-xs">
                      {token.tokenPrefix}…
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatDate(token.lastUsedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {token.expiresAt ? (
                      <Badge variant={isExpired(token.expiresAt) ? "destructive" : "outline"}>
                        {isExpired(token.expiresAt) ? "Expired" : formatDate(token.expiresAt)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Revoke token ${token.name}`}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke token?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Any scripts or integrations using <strong>{token.name}</strong> will
                            stop working immediately. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevoke(token.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="bg-muted rounded-md p-4 text-sm">
        <p className="mb-1 font-medium">Using your API token</p>
        <code className="text-muted-foreground block text-xs">
          Authorization: Bearer &lt;your-token&gt;
        </code>
        <p className="text-muted-foreground mt-2 text-xs">
          Base URL: <code>/api/v1/trackers</code>
        </p>
      </div>
    </div>
  );
}
