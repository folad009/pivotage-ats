"use client";

import { ThemeProvider } from "next-themes";

import { TRPCReactProvider } from "@/trpc/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </ThemeProvider>
  );
}
