"use client";

import { JobStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_STATUS_LABELS } from "@/lib/labels";
import { setJobStatusAction } from "@/server/actions/job";

export function JobStatusControl({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<JobStatus>(status);
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    const nextStatus = next as JobStatus;
    const previous = value;
    setValue(nextStatus);
    startTransition(async () => {
      const result = await setJobStatusAction({ id: jobId, status: nextStatus });
      if (!result.ok) {
        setValue(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Status updated");
      router.refresh();
    });
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="w-40" aria-label="Job status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(JobStatus).map((option) => (
          <SelectItem key={option} value={option}>
            {JOB_STATUS_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
