"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  BarChart3,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Menu,
  Timer,
  UserCog,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isFounder } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";

const employeeNav = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/tasks", label: "My Tasks", icon: <ListChecks className="h-4 w-4" /> },
  { href: "/log", label: "Log Work", icon: <Timer className="h-4 w-4" /> },
];

const founderNav = [
  { href: "/admin/overview", label: "Team Overview", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/employees", label: "Employees", icon: <UserCog className="h-4 w-4" /> },
  { href: "/admin/assign", label: "Assign Tasks", icon: <ClipboardList className="h-4 w-4" /> },
  { href: "/admin/requests", label: "Task Requests", icon: <Inbox className="h-4 w-4" /> },
  { href: "/admin/reports", label: "Team Reports", icon: <BarChart3 className="h-4 w-4" /> },
];

export function MobileNav({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = isFounder(user) ? founderNav : employeeNav;

  // Close the drawer the moment the route changes — otherwise a tap on a
  // link feels broken because the overlay still sits over the next page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            className="bg-foreground/40 absolute inset-0"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="bg-sidebar text-sidebar-foreground border-sidebar-border absolute inset-y-0 left-0 flex w-64 flex-col border-r shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-semibold">Wallick Tracker</p>
                <p className="text-muted-foreground truncate text-xs">{user.name}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-2">
              {items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
