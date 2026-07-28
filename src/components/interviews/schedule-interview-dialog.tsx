"use client";

import { InterviewType } from "@/lib/prisma-browser";
import { CalendarPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTERVIEW_TYPE_LABELS } from "@/lib/labels";
import { scheduleInterviewAction } from "@/server/actions/interview";
import { api } from "@/trpc/react";

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  onSaved?: () => void;
}

const INTERVIEW_TYPES = Object.values(InterviewType);

function defaultDateTimeLocal(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  applicationId,
  onSaved,
}: ScheduleInterviewDialogProps) {
  const [type, setType] = useState<InterviewType>(InterviewType.PHONE);
  const [scheduledAt, setScheduledAt] = useState(defaultDateTimeLocal());
  const [durationMins, setDurationMins] = useState("60");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [panelUserIds, setPanelUserIds] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);

  const panelUsersQuery = api.interviews.panelUsers.useQuery(undefined, {
    enabled: open,
  });

  function togglePanelUser(userId: string) {
    setPanelUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function onSubmit() {
    if (panelUserIds.length === 0) {
      toast.error("Select at least one panel member");
      return;
    }

    setIsPending(true);
    const result = await scheduleInterviewAction({
      applicationId,
      type,
      scheduledAt: new Date(scheduledAt),
      durationMins: Number(durationMins),
      location: location || undefined,
      meetingUrl: meetingUrl || undefined,
      panelUserIds,
    });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(
      result.data.inviteMocked
        ? "Interview scheduled (invite logged in dev mode)"
        : `Interview scheduled — ${result.data.invitesSent} invites sent`,
    );
    setPanelUserIds([]);
    onOpenChange(false);
    onSaved?.();
  }

  const panelUsers = panelUsersQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule interview</DialogTitle>
          <DialogDescription>
            Set the interview details and assign panel members. Invites are sent
            to the candidate and panel automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="interview-type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as InterviewType)}
            >
              <SelectTrigger id="interview-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {INTERVIEW_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduled-at">Date & time</Label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                max={480}
                value={durationMins}
                onChange={(event) => setDurationMins(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Office, room, or address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-url">Meeting link (optional)</Label>
            <Input
              id="meeting-url"
              type="url"
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="https://meet.example.com/..."
            />
          </div>

          <div className="space-y-2">
            <Label>Panel members</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
              {panelUsersQuery.isPending ? (
                <p className="text-muted-foreground text-sm">Loading users…</p>
              ) : panelUsers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No users available</p>
              ) : (
                panelUsers.map((user) => (
                  <label
                    key={user.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={panelUserIds.includes(user.id)}
                      onChange={() => togglePanelUser(user.id)}
                      className="size-4 rounded border"
                    />
                    <span>
                      {user.name ?? user.email}{" "}
                      <span className="text-muted-foreground">({user.role})</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isPending || panelUserIds.length === 0}
            onClick={() => void onSubmit()}
          >
            <CalendarPlus className="size-4" />
            {isPending ? "Scheduling…" : "Schedule interview"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
