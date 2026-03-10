import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: BookPageProps) {
  const { slug } = await params;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });

  if (!tenant) {
    notFound();
  }

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold">Reservar turno en {tenant.name}</h1>
      {/* TODO: BookingWizard (servicio → barbero → fecha → confirmación) */}
    </main>
  );
}
