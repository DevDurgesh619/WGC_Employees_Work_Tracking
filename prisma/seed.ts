// Seeds 2 founders + 3 employees + sample tasks. Idempotent: safe to re-run.
//
// Uses the Supabase Admin REST API via raw fetch instead of @supabase/supabase-js,
// because supabase-js eagerly constructs a RealtimeClient that needs WebSocket
// (unavailable on Node < 22). This script only needs auth.admin.createUser /
// listUsers, which are plain HTTP.
//
// Requires SUPABASE_SERVICE_ROLE_KEY. Run: pnpm db:seed

import { Prisma, PrismaClient, Role, TaskPriority, TaskStatus } from "@prisma/client";

type SeedUser = {
  email: string;
  name: string;
  role: Role;
  password: string;
};

const SEED_PASSWORD = "DevPassword123!";

const SEED_USERS: SeedUser[] = [
  {
    email: "founder.one@example.test",
    name: "Founder One",
    role: Role.FOUNDER,
    password: SEED_PASSWORD,
  },
  {
    email: "founder.two@example.test",
    name: "Founder Two",
    role: Role.FOUNDER,
    password: SEED_PASSWORD,
  },
  {
    email: "employee.alice@example.test",
    name: "Employee Alice",
    role: Role.EMPLOYEE,
    password: SEED_PASSWORD,
  },
  {
    email: "employee.bob@example.test",
    name: "Employee Bob",
    role: Role.EMPLOYEE,
    password: SEED_PASSWORD,
  },
  {
    email: "employee.carol@example.test",
    name: "Employee Carol",
    role: Role.EMPLOYEE,
    password: SEED_PASSWORD,
  },
];

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env ${name}. Add it to .env.local before seeding.`);
  }
  return value;
}

type AdminApi = {
  url: string;
  key: string;
};

type AuthAdminUser = { id: string; email?: string | null };

async function adminFetch<T>(api: AdminApi, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${api.url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: api.key,
      Authorization: `Bearer ${api.key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase admin API ${res.status} ${path}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function ensureSupabaseUser(api: AdminApi, user: SeedUser): Promise<string> {
  type Created = { id: string };
  type ListResponse = { users: AuthAdminUser[] };

  // Create idempotently — Supabase returns 422 when the email already exists.
  try {
    const created = await adminFetch<Created>(api, "/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name },
      }),
    });
    return created.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/already|registered|exists/i.test(message)) throw err;
  }

  // Already exists — find them.
  const list = await adminFetch<ListResponse>(api, "/admin/users?per_page=200");
  const found = list.users.find((u) => u.email?.toLowerCase() === user.email.toLowerCase());
  if (!found) {
    throw new Error(`Supabase says ${user.email} exists but it isn't in /admin/users.`);
  }
  return found.id;
}

async function main() {
  const api: AdminApi = {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    key: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };

  console.log("Seeding users...");
  const userRecords = await Promise.all(
    SEED_USERS.map(async (u) => {
      const supabaseUserId = await ensureSupabaseUser(api, u);
      return prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role, supabaseUserId, isActive: true },
        create: { email: u.email, name: u.name, role: u.role, supabaseUserId },
      });
    }),
  );

  const founder = userRecords.find((u) => u.role === Role.FOUNDER);
  const employees = userRecords.filter((u) => u.role === Role.EMPLOYEE);
  if (!founder || employees.length === 0) {
    throw new Error("Seed user setup is missing a founder or employees.");
  }

  console.log("Seeding sample tasks...");
  const sampleTasks: Prisma.TaskCreateManyInput[] = employees.flatMap((emp, idx) => [
    {
      title: `Welcome task for ${emp.name}`,
      description: "Read the onboarding doc and reply with any questions.",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assigneeId: emp.id,
      createdById: founder.id,
      estimatedMinutes: 30,
    },
    {
      title: `Sprint kickoff for ${emp.name}`,
      description: "Pick up one ticket from the sprint board and start it today.",
      priority: idx === 0 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
      status: TaskStatus.NOT_STARTED,
      assigneeId: emp.id,
      createdById: founder.id,
      estimatedMinutes: 120,
    },
  ]);

  // Avoid duplicating sample tasks across re-runs.
  const existing = await prisma.task.count({ where: { createdById: founder.id } });
  if (existing === 0) {
    await prisma.task.createMany({ data: sampleTasks });
  } else {
    console.log(`Skipping task seed — ${existing} task(s) already exist for founder.`);
  }

  console.log("Seed complete.");
  console.log(`All seed users share password: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
