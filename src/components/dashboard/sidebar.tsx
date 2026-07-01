import type { Role } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import { NavLinks } from "@/components/dashboard/nav-links";

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="bg-card hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center border-b px-5 py-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/images/pivotage-logo.png" alt="Privotage ATS" width={200} height={200} className="w-auto h-auto object-contain" />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks role={role} />
      </div>
    </aside>
  );
}
