"use client";

import type { Role } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItemsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface NavLinksProps {
  role: Role;
  onNavigate?: () => void;
}

export function NavLinks({ role, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group focus-visible:ring-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
