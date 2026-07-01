"use client";

import type { Role } from "@prisma/client";
import { Menu, Search } from "lucide-react";
import { useState } from "react";

import { NavLinks } from "@/components/dashboard/nav-links";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface TopBarProps {
  user: { name: string | null; email: string; role: Role };
}

export function TopBar({ user }: TopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="text-left text-base font-semibold">
              Privotage ATS
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <NavLinks
              role={user.role}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="relative hidden w-full max-w-sm md:block">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search candidates, jobs…"
          aria-label="Global search"
          className="pl-8"
          disabled
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu name={user.name} email={user.email} role={user.role} />
      </div>
    </header>
  );
}
