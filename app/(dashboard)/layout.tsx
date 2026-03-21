import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { db } from "@/lib/db";
import { profiles, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let tenantSlug: string | undefined;
  let tenantName: string | undefined;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  if (profile?.tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, profile.tenantId),
    });
    tenantSlug = tenant?.slug ?? undefined;
    tenantName = tenant?.name ?? undefined;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardTopNav
        userEmail={user.email}
        tenantSlug={tenantSlug}
        tenantName={tenantName}
        role={profile?.role ?? undefined}
      />
      <main>{children}</main>
    </div>
  );
}
