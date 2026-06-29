"use client";

import { Download, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ResumeUploader } from "@/components/candidates/resume-uploader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getResumeDownloadUrlAction } from "@/server/actions/candidate";

interface AttachmentRow {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

interface CandidateAttachmentsProps {
  candidateId: string;
  attachments: AttachmentRow[];
  canManage: boolean;
  onChange?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CandidateAttachments({
  candidateId,
  attachments,
  canManage,
  onChange,
}: CandidateAttachmentsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  function download(attachmentId: string) {
    setDownloadingId(attachmentId);
    startTransition(async () => {
      const result = await getResumeDownloadUrlAction({ attachmentId });
      setDownloadingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.open(result.data.downloadUrl, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="space-y-4">
      {attachments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resumes"
          description={
            canManage
              ? "Upload a resume for this candidate."
              : "No attachments on file."
          }
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{attachment.fileName}</p>
                <p className="text-muted-foreground text-xs">
                  {formatBytes(attachment.size)} ·{" "}
                  {new Date(attachment.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending && downloadingId === attachment.id}
                onClick={() => download(attachment.id)}
              >
                <Download className="size-4" />
                Download
              </Button>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <ResumeUploader
          candidateId={candidateId}
          onUploaded={() => {
            onChange?.();
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
