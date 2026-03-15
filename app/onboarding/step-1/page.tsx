import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Step1Form } from "@/components/onboarding/step-1-form";

export default async function Step1Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Already completed step 1 → skip ahead
  if (user.app_metadata?.tenant_id) {
    redirect("/onboarding/step-2");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Tu barbería</h2>
        <p className="text-sm text-muted-foreground">
          Configurá los datos básicos de tu local
        </p>
      </div>
      <Step1Form />
    </div>
  );
}
