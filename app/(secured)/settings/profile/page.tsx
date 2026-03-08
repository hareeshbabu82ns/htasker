import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/features/settings/ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account information
        </p>
      </div>
      <div className="bg-background border border-border rounded-lg p-6">
        <ProfileForm
          initialName={session.user.name ?? ""}
          initialImage={session.user.image ?? ""}
          email={session.user.email ?? ""}
        />
      </div>
    </div>
  );
}
