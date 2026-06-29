"use client";

import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gdprEraseCandidateAction } from "@/server/actions/compliance";

interface GdprEraseDialogProps {
  candidateId: string;
  candidateName: string;
}

export function GdprEraseDialog({
  candidateId,
  candidateName,
}: GdprEraseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function onErase() {
    setIsPending(true);
    const result = await gdprEraseCandidateAction({
      candidateId,
      confirmation: confirmation as "ERASE",
    });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Candidate PII permanently erased");
    setConfirmation("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        GDPR erasure
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently erase {candidateName}?</DialogTitle>
            <DialogDescription>
              This action anonymizes all candidate PII, deletes resumes and
              attachments from storage, and writes a PII-free audit record.
              Application history and stage audit trails are retained without
              personal data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="erase-confirm">
              Type <span className="font-mono font-semibold">ERASE</span> to
              confirm
            </Label>
            <Input
              id="erase-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending || confirmation !== "ERASE"}
              onClick={() => void onErase()}
            >
              {isPending ? "Erasing…" : "Permanently erase PII"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
