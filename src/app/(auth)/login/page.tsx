import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in — Wallick Work Tracker",
};

type SearchParams = Promise<{ redirectTo?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { redirectTo } = await searchParams;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>Use your Wallick work email to access the tracker.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTo={redirectTo} />
      </CardContent>
    </Card>
  );
}
