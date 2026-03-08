import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listApiTokens } from "@/app/actions/api-tokens";
import ApiTokensSection from "@/components/features/settings/ApiTokensSection";

export default async function ApiTokensPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const result = await listApiTokens();
  const tokens = result.success ? result.data : [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API Tokens</h1>
        <p className="text-muted-foreground mt-1">
          Manage personal access tokens for the HTracker REST API
        </p>
      </div>
      <div className="bg-background border-border rounded-lg border p-6">
        <ApiTokensSection initialTokens={tokens} />
      </div>
    </div>
  );
}
