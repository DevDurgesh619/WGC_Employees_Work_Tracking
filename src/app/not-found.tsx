import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">The page you’re looking for doesn’t exist.</p>
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
