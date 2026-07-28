import type { Role } from "@/lib/prisma-browser";
import {
  Briefcase,
  Building2,
  CalendarClock,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  ChartColumn,
  Users,
  UserSquare,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see this entry (AGENTS.md §7). */
  roles: Role[];
}

const ALL_ROLES: Role[] = ["ADMIN", "RECRUITER", "HIRING_MANAGER"];

/**
 * Sidebar navigation. Visibility is role-aware: hiring managers don't manage
 * clients, and only admins reach settings (user & retention management).
 */
export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  { title: "Jobs", href: "/jobs", icon: Briefcase, roles: ALL_ROLES },
  {
    title: "Candidates",
    href: "/candidates",
    icon: Users,
    roles: ALL_ROLES,
  },
  {
    title: "Applications",
    href: "/applications",
    icon: UserSquare,
    roles: ALL_ROLES,
  },
  {
    title: "Interviews",
    href: "/interviews",
    icon: CalendarClock,
    roles: ALL_ROLES,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Building2,
    roles: ["ADMIN", "RECRUITER"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: ChartColumn,
    roles: ALL_ROLES,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
