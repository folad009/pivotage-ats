import { redirect } from "next/navigation";

export default async function HomePage() {
  const { auth } = await import("@/server/auth");
  const session = await auth();
  if (session?.user?.accountType === "candidate") {
    redirect("/careers");
  }
  redirect("/dashboard");
}
