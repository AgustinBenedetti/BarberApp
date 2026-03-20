import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getClientDetail } from "@/actions/clients";
import { ClientDetailView } from "@/components/dashboard/clientes/client-detail-view";

interface ClienteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: ClienteDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    columns: { tenantId: true },
  });

  if (!profile?.tenantId) redirect("/onboarding/step-1");

  const [client, tenant] = await Promise.all([
    getClientDetail(id),
    db.query.tenants.findFirst({
      where: eq(tenants.id, profile.tenantId),
      columns: { slug: true },
    }),
  ]);

  if (!client) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-10">
      <ClientDetailView client={client} tenantSlug={tenant?.slug ?? ""} />
    </div>
  );
}
