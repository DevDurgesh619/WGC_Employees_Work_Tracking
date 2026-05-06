import "server-only";

import { Role, type User } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function listActiveEmployees() {
  return prisma.user.findMany({
    where: { role: Role.EMPLOYEE, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

export type EmployeeRow = Awaited<ReturnType<typeof listActiveEmployees>>[number];

export async function listAllUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function getMe(userId: User["id"]) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, timezone: true },
  });
}
