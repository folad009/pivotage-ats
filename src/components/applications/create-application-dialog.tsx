"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createApplicationAction } from "@/server/actions/application";
import { api } from "@/trpc/react";

interface CreateApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  onSaved?: () => void;
}

export function CreateApplicationDialog({
  open,
  onOpenChange,
  jobId,
  onSaved,
}: CreateApplicationDialogProps) {
  const [candidateId, setCandidateId] = useState("");
  const [isPending, setIsPending] = useState(false);

  const candidatesQuery = api.candidates.list.useQuery(
    { limit: 100 },
    { enabled: open },
  );

  async function onSubmit() {
    if (!candidateId) {
      toast.error("Select a candidate");
      return;
    }
    setIsPending(true);
    const result = await createApplicationAction({ candidateId, jobId });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      if (result.existingId) {
        toast.info("This candidate already has an application for this job.");
      }
      return;
    }

    toast.success("Application created");
    setCandidateId("");
    onOpenChange(false);
    onSaved?.();
  }

  const candidates = candidatesQuery.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add application</DialogTitle>
          <DialogDescription>
            Link a candidate to this job requisition. They start in the first
            pipeline stage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="candidate-select">Candidate</Label>
          <Select value={candidateId} onValueChange={setCandidateId}>
            <SelectTrigger id="candidate-select">
              <SelectValue
                placeholder={
                  candidatesQuery.isPending
                    ? "Loading candidates…"
                    : "Select a candidate"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.firstName} {candidate.lastName} ({candidate.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button disabled={isPending || !candidateId} onClick={() => void onSubmit()}>
            {isPending ? "Creating…" : "Create application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
