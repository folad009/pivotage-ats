import Link from "next/link";

import { Button } from "@/components/ui/button";

export function PublicSiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/careers" className="text-lg font-semibold tracking-tight">
          Privotage Careers
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/careers">Open roles</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/my-applications">My applications</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/register">Register</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
