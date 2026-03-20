import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getClients } from "@/actions/clients";
import { ClientListView } from "@/components/dashboard/clientes/client-list-view";

export const metadata = {
  title: "Clientes — BarberSaaS",
};

export default async function ClientesPage() {
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

  const { clients: initialClients, total } = await getClients("", "all", 1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-10">
      {/* Page header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          CRM
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
      </div>

      <ClientListView
        initialClients={initialClients}
        initialTotal={total}
      />
    </div>
  );
}
