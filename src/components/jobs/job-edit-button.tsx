"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  JobFormDialog,
  type JobFormValues,
} from "@/components/jobs/job-form-dialog";
import { Button } from "@/components/ui/button";

export function JobEditButton({ job }: { job: JobFormValues }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Edit
      </Button>
      <JobFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={job}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
