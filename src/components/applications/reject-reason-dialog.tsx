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
import { Textarea } from "@/components/ui/textarea";
import { rejectApplicationAction } from "@/server/actions/application";

interface RejectReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  toStageId: string;
  candidateName: string;
  onComplete: (success: boolean) => void;
}

export function RejectReasonDialog({
  open,
  onOpenChange,
  applicationId,
  toStageId,
  candidateName,
  onComplete,
}: RejectReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function onSubmit() {
    setIsPending(true);
    const result = await rejectApplicationAction({
      applicationId,
      toStageId,
      reason,
    });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      onComplete(false);
      return;
    }

    toast.success("Candidate rejected");
    setReason("");
    onOpenChange(false);
    onComplete(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {candidateName}</DialogTitle>
          <DialogDescription>
            A reason is required when moving a candidate to Rejected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this candidate is being rejected…"
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending || reason.trim().length === 0}
            onClick={() => void onSubmit()}
          >
            {isPending ? "Rejecting…" : "Reject candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
