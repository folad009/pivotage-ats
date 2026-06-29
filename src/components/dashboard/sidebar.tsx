import type { Role } from "@prisma/client";
import Link from "next/link";

import { NavLinks } from "@/components/dashboard/nav-links";

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="bg-card hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-sm font-bold">
            P
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Privotage ATS
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks role={role} />
      </div>
    </aside>
  );
}
