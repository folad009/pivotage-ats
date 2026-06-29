import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { appRouter } from "@/server/trpc/routers/_app";
import { createCallerFactory, createTRPCContext } from "@/server/trpc/trpc";

/**
 * Context for RSC initial fetches. Cached per request so a single page render
 * reuses one context (and one `auth()` call).
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");
  return createTRPCContext({ headers: heads });
});

/**
 * Server-side tRPC caller for React Server Components. Shares procedure logic
 * with the client without an HTTP round-trip (AGENTS.md §3).
 */
export const api = createCallerFactory(appRouter)(createContext);
