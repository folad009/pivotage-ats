"use client";

import type { Role } from "@prisma/client";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  name: string | null;
  email: string;
  role: Role;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring Manager",
};

function initialsFrom(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-2 px-2 py-1.5"
          aria-label="Open user menu"
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">
              {initialsFrom(name, email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:flex sm:flex-col sm:leading-tight">
            <span className="text-sm font-medium">{name ?? email}</span>
            <span className="text-muted-foreground text-xs">
              {ROLE_LABELS[role]}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground hidden size-4 sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{name ?? "Account"}</span>
          <span className="text-muted-foreground text-xs font-normal">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
