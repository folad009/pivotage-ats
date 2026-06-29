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
import {
  archiveApplicationAction,
  restoreApplicationAction,
} from "@/server/actions/compliance";

interface ApplicationArchiveControlsProps {
  applicationId: string;
  jobId: string;
  candidateName: string;
  isArchived: boolean;
  canArchive: boolean;
  canRestore: boolean;
}

export function ApplicationArchiveControls({
  applicationId,
  jobId,
  candidateName,
  isArchived,
  canArchive,
  canRestore,
}: ApplicationArchiveControlsProps) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  if (!canArchive && !canRestore) return null;

  async function onArchive() {
    setIsPending(true);
    const result = await archiveApplicationAction({ applicationId });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Application archived");
    setArchiveOpen(false);
    router.refresh();
  }

  async function onRestore() {
    setIsPending(true);
    const result = await restoreApplicationAction({ applicationId });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Application restored");
    setRestoreOpen(false);
    router.push(`/applications/board/${jobId}`);
    router.refresh();
  }

  return (
    <>
      {canArchive && !isArchived ? (
        <Button variant="outline" onClick={() => setArchiveOpen(true)}>
          Archive application
        </Button>
      ) : null}
      {canRestore && isArchived ? (
        <Button variant="outline" onClick={() => setRestoreOpen(true)}>
          Restore application
        </Button>
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {candidateName}?</DialogTitle>
            <DialogDescription>
              Archived applications are read-only and hidden from active pipeline
              boards and reports. Stage history and audit records are preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => void onArchive()}
            >
              {isPending ? "Archiving…" : "Archive application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore {candidateName}?</DialogTitle>
            <DialogDescription>
              This will return the application to active views. Only administrators
              can restore archived records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isPending} onClick={() => void onRestore()}>
              {isPending ? "Restoring…" : "Restore application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
