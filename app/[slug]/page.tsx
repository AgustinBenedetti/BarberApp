import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

interface TenantLandingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantLandingPage({
  params,
}: TenantLandingPageProps) {
  const { slug } = await params;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });

  if (!tenant) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      <header className="p-6">
        <h1 className="text-3xl font-bold">{tenant.name}</h1>
        {tenant.address && (
          <p className="text-muted-foreground">{tenant.address}</p>
        )}
      </header>
      {/* TODO: Servicios, barberos disponibles, botón de reserva */}
    </main>
  );
}

export async function generateMetadata({ params }: TenantLandingPageProps) {
  const { slug } = await params;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });

  if (!tenant) return {};

  return {
    title: tenant.name,
    description: `Reservá tu turno en ${tenant.name}`,
  };
}
