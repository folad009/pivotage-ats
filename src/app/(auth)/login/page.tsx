import { Suspense } from "react";

import {
  LoginBrandPanel,
  LoginMobileBrand,
} from "@/components/auth/login-brand-panel";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

function LoginFormFallback() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <LoginBrandPanel />

      <section className="bg-background flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <LoginMobileBrand />
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
