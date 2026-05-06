import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/server/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm" aria-label="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </form>
  );
}
