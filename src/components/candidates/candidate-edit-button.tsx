"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CandidateFormDialog,
  type CandidateFormValues,
} from "@/components/candidates/candidate-form-dialog";
import { Button } from "@/components/ui/button";

export function CandidateEditButton({
  candidate,
}: {
  candidate: CandidateFormValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Edit
      </Button>
      <CandidateFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={candidate}
        canManage
        onSaved={() => router.refresh()}
      />
    </>
  );
}
