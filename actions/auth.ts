"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type ActionState = {
  error?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

export async function register(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/onboarding/step-1`,
    },
  });

  if (error) {
    return { error: { _form: [error.message] } };
  }

  // Crear el profile directamente con Drizzle como respaldo al trigger.
  // ON CONFLICT DO NOTHING por si el trigger ya lo creó.
  if (data.user) {
    await db
      .insert(profiles)
      .values({
        id: data.user.id,
        email: data.user.email!,
        fullName: data.user.email!,
        role: "client",
      })
      .onConflictDoNothing();
  }

  return {
    success: true,
    message: "Revisá tu email para confirmar tu cuenta y comenzar.",
  };
}

export async function login(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: { _form: [error.message] } };
  }

  const tenantId = data.user.app_metadata?.tenant_id;
  if (!tenantId) {
    redirect("/onboarding/step-1");
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
