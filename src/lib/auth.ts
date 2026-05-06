import { redirect } from "next/navigation";

import { Role, type User } from "@prisma/client";

import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = User;

export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseUserId: supabaseUser.id },
  });

  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireFounder(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== Role.FOUNDER) redirect("/403");
  return user;
}

// Founders supervise; they don't log work or run timers themselves.
// Send them to the team overview rather than a 403, since they have a valid session.
export async function requireEmployee(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === Role.FOUNDER) redirect("/admin/overview");
  return user;
}
