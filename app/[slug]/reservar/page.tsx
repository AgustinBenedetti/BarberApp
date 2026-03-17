import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { Metadata } from "next";

import { db } from "@/lib/db";
import { tenants, barbers, services, profiles } from "@/lib/db/schema";
import BookingWizard from "@/components/booking/booking-wizard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const openingHoursSchema = z.record(
  z.string(),
  z.object({
    closed: z.boolean(),
    open: z.string().optional(),
    close: z.string().optional(),
  }),
);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
    columns: { name: true },
  });
  if (!tenant) return {};
  return { title: `Reservar turno | ${tenant.name}` };
}

export default async function ReservarPage({ params }: PageProps) {
  const { slug } = await params;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });
  if (!tenant) notFound();

  const [barberList, serviceList] = await Promise.all([
    db
      .select({
        id: barbers.id,
        displayName: barbers.displayName,
        bio: barbers.bio,
        avatarUrl: profiles.avatarUrl,
      })
      .from(barbers)
      .leftJoin(profiles, eq(barbers.profileId, profiles.id))
      .where(and(eq(barbers.tenantId, tenant.id), eq(barbers.isActive, true))),
    db
      .select()
      .from(services)
      .where(
        and(eq(services.tenantId, tenant.id), eq(services.isActive, true)),
      ),
  ]);

  const parsedHours = openingHoursSchema.safeParse(tenant.openingHours);
  const openingHours = parsedHours.success ? parsedHours.data : null;

  return (
    <BookingWizard
      tenantId={tenant.id}
      slug={slug}
      shopName={tenant.name}
      services={serviceList.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        price: s.price,
      }))}
      barbers={barberList.map((b) => ({
        id: b.id,
        displayName: b.displayName,
        bio: b.bio,
        avatarUrl: b.avatarUrl ?? null,
      }))}
      openingHours={openingHours}
    />
  );
}
