import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TimerWidget } from "@/components/timer/timer-widget";
import { isFounder } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";

import { MobileNav } from "./mobile-nav";
import { SignOutButton } from "./sign-out-button";

type TimerTaskOption = { id: string; title: string };

type Props = {
  user: SessionUser;
  // Omitted for founders — they don't run timers.
  timerTaskOptions?: TimerTaskOption[];
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({ user, timerTaskOptions }: Props) {
  const founder = isFounder(user);
  return (
    <header className="bg-background flex h-14 items-center justify-between border-b px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <MobileNav user={user} />
        <span className="text-sm font-medium md:hidden">Wallick Tracker</span>
        {founder ? <Badge variant="secondary">Founder</Badge> : null}
      </div>
      <div className="flex items-center gap-3">
        {founder ? null : <TimerWidget taskOptions={timerTaskOptions ?? []} />}
        <div className="hidden text-right sm:block">
          <p className="text-sm leading-tight font-medium">{user.name}</p>
          <p className="text-muted-foreground text-xs leading-tight">{user.email}</p>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback>{initials(user.name) || "?"}</AvatarFallback>
        </Avatar>
        <SignOutButton />
      </div>
    </header>
  );
}
