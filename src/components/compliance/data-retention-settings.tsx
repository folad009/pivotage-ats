"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  runRetentionPurgeAction,
  updateRetentionSettingsAction,
} from "@/server/actions/compliance";

interface DataRetentionSettingsProps {
  initialRetentionDays: number;
}

export function DataRetentionSettings({
  initialRetentionDays,
}: DataRetentionSettingsProps) {
  const [retentionDays, setRetentionDays] = useState(String(initialRetentionDays));
  const [isSaving, setIsSaving] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  async function onSave() {
    setIsSaving(true);
    const result = await updateRetentionSettingsAction({
      retentionDays: Number(retentionDays),
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Retention settings saved");
  }

  async function onPurge() {
    setIsPurging(true);
    const result = await runRetentionPurgeAction();
    setIsPurging(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(
      `Retention purge complete (${result.data.processed} anonymized, ${result.data.skippedActive} skipped with active applications)`,
    );
    setPurgeOpen(false);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data retention</CardTitle>
          <CardDescription>
            Archived applications past this window are eligible for automated PII
            anonymization. Audit records without PII are always kept.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="retention-days">Retention window (days)</Label>
            <Input
              id="retention-days"
              type="number"
              min={30}
              max={3650}
              value={retentionDays}
              onChange={(event) => setRetentionDays(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} onClick={() => void onSave()}>
              {isSaving ? "Saving…" : "Save settings"}
            </Button>
            <Button variant="outline" onClick={() => setPurgeOpen(true)}>
              Run manual purge
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run retention purge now?</DialogTitle>
            <DialogDescription>
              This anonymizes candidate PII for archived applications older than
              the configured retention window. Candidates with active applications
              are skipped. A PII-free audit entry is written for each anonymization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPurging}
              onClick={() => void onPurge()}
            >
              {isPurging ? "Purging…" : "Run purge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
