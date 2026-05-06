import Link from "next/link";

export const metadata = {
  title: "Access denied — Wallick Work Tracker",
};

export default function ForbiddenPage() {
  return (
    <main className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground text-sm font-medium">403</p>
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">
          You don’t have permission to view this page. If this looks wrong, ask a founder to update
          your role.
        </p>
        <Link
          href="/dashboard"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
