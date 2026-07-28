"use client";

import { Recommendation } from "@/lib/prisma-browser";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RECOMMENDATION_LABELS } from "@/lib/labels";
import { upsertScorecardAction } from "@/server/actions/interview";

const DEFAULT_CRITERIA = [
  { key: "communication", label: "Communication" },
  { key: "technical", label: "Technical skills" },
  { key: "culture", label: "Culture fit" },
] as const;

const RECOMMENDATIONS = Object.values(Recommendation);

interface ScorecardFormProps {
  interviewId: string;
  canSubmit: boolean;
  initial?: {
    overall: number;
    recommendation: Recommendation;
    criteria?: Record<string, number> | null;
    comments?: string | null;
  } | null;
  onSaved?: () => void;
}

export function ScorecardForm({
  interviewId,
  canSubmit,
  initial,
  onSaved,
}: ScorecardFormProps) {
  const [overall, setOverall] = useState(String(initial?.overall ?? 3));
  const [recommendation, setRecommendation] = useState<Recommendation>(
    initial?.recommendation ?? Recommendation.YES,
  );
  const [criteria, setCriteria] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    for (const item of DEFAULT_CRITERIA) {
      const existing = initial?.criteria?.[item.key];
      values[item.key] = String(existing ?? 3);
    }
    return values;
  });
  const [comments, setComments] = useState(initial?.comments ?? "");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setOverall(String(initial.overall));
    setRecommendation(initial.recommendation);
    setComments(initial.comments ?? "");
    setCriteria((current) => {
      const next = { ...current };
      for (const item of DEFAULT_CRITERIA) {
        const existing = initial.criteria?.[item.key];
        if (existing !== undefined) next[item.key] = String(existing);
      }
      return next;
    });
  }, [initial]);

  if (!canSubmit) return null;

  async function onSubmit() {
    setIsPending(true);
    const criteriaPayload: Record<string, number> = {};
    for (const item of DEFAULT_CRITERIA) {
      criteriaPayload[item.key] = Number(criteria[item.key] ?? 3);
    }

    const result = await upsertScorecardAction({
      interviewId,
      overall: Number(overall),
      recommendation,
      criteria: criteriaPayload,
      comments: comments || undefined,
    });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Scorecard saved");
    onSaved?.();
  }

  return (
    <form
      className="bg-muted/30 space-y-3 rounded-md border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <p className="text-sm font-medium">Your scorecard</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`overall-${interviewId}`}>Overall (1–5)</Label>
          <Input
            id={`overall-${interviewId}`}
            type="number"
            min={1}
            max={5}
            value={overall}
            onChange={(event) => setOverall(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Recommendation</Label>
          <Select
            value={recommendation}
            onValueChange={(value) =>
              setRecommendation(value as Recommendation)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECOMMENDATIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {RECOMMENDATION_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {DEFAULT_CRITERIA.map((item) => (
          <div key={item.key} className="space-y-1">
            <Label htmlFor={`${item.key}-${interviewId}`}>{item.label}</Label>
            <Input
              id={`${item.key}-${interviewId}`}
              type="number"
              min={1}
              max={5}
              value={criteria[item.key] ?? "3"}
              onChange={(event) =>
                setCriteria((current) => ({
                  ...current,
                  [item.key]: event.target.value,
                }))
              }
            />
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`comments-${interviewId}`}>Comments</Label>
        <Textarea
          id={`comments-${interviewId}`}
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          rows={3}
          placeholder="Summary feedback for the hiring team"
        />
      </div>

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Saving…" : initial ? "Update scorecard" : "Submit scorecard"}
      </Button>
    </form>
  );
}
