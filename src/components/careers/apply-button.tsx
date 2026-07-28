"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { applyToJobAction } from "@/server/actions/careers";

interface ApplyButtonProps {
  jobId: string;
}

export function ApplyButton({ jobId }: ApplyButtonProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isPending, setIsPending] = useState(false);

  async function handleApply() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/careers/${jobId}`)}`);
      return;
    }

    if (session?.user?.accountType !== "candidate") {
      toast.error("Staff accounts cannot apply. Sign in with a candidate account.");
      return;
    }

    setIsPending(true);
    const result = await applyToJobAction({ jobId });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Application submitted");
    router.push("/my-applications");
    router.refresh();
  }

  return (
    <Button onClick={() => void handleApply()} disabled={isPending}>
      {isPending ? "Submitting…" : "Apply for this role"}
    </Button>
  );
}
