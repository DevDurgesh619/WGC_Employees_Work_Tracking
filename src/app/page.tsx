import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware redirects unauthenticated requests to /login. Authenticated
  // users land on /dashboard.
  redirect("/dashboard");
}
