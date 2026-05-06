import { BarChart3, ClipboardList, Inbox, LayoutDashboard, ListChecks, Timer, UserCog, Users } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { isFounder } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";

import { NavLink } from "./nav-link";

type Props = {
  user: SessionUser;
};

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

export function Sidebar({ user }: Props) {
  const founder = isFounder(user);
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-60 flex-col border-r md:flex">
      <div className="px-4 py-5">
        <p className="text-sm font-semibold">Wallick Tracker</p>
        <p className="text-muted-foreground truncate text-xs">{user.name}</p>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {founder ? (
          founderNav.map((item) => <NavLink key={item.href} {...item} />)
        ) : (
          employeeNav.map((item) => <NavLink key={item.href} {...item} />)
        )}
      </nav>
    </aside>
  );
}
