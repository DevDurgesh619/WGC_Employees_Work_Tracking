"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/user";
import type { ActionResult } from "@/types/api";

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

type SignInResult = ActionResult<{ redirectTo: string }>;

export async function signIn(formData: FormData): Promise<SignInResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      ok: false,
      error: "UNAUTHENTICATED",
      message: "Invalid email or password.",
    };
  }

  const rawRedirect = formData.get("redirectTo");
  const redirectTo =
    typeof rawRedirect === "string" && rawRedirect.startsWith("/") ? rawRedirect : "/dashboard";

  redirect(redirectTo);
}
