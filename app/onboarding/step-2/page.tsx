import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Step2Form } from "@/components/onboarding/step-2-form";

export default async function Step2Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!user.app_metadata?.tenant_id) redirect("/onboarding/step-1");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Tus servicios</h2>
        <p className="text-sm text-muted-foreground">
          Agregá los servicios que ofrecés. Podés completarlo después.
        </p>
      </div>
      <Step2Form />
    </div>
  );
}
