"use client";

import { FileText, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_RESUME_BYTES } from "@/lib/upload-constants";
import {
  confirmResumeUploadAction,
  requestResumeUploadAction,
} from "@/server/actions/candidate";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface ResumeUploaderProps {
  candidateId?: string;
  disabled?: boolean;
  onUploaded?: () => void;
  /** When creating a candidate, hold the file until the record exists. */
  pendingFile?: File | null;
  onPendingFileChange?: (file: File | null) => void;
}

export function ResumeUploader({
  candidateId,
  disabled,
  onUploaded,
  pendingFile,
  onPendingFileChange,
}: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);

  const file = pendingFile ?? localFile;
  const setFile = onPendingFileChange ?? setLocalFile;

  const validateFile = useCallback((selected: File): boolean => {
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      toast.error("Only PDF and Word documents are allowed.");
      return false;
    }
    if (selected.size > MAX_RESUME_BYTES) {
      toast.error("File exceeds the 10 MB limit.");
      return false;
    }
    return true;
  }, []);

  async function uploadFile(selected: File, targetCandidateId: string) {
    setIsUploading(true);
    try {
      const request = await requestResumeUploadAction({
        candidateId: targetCandidateId,
        fileName: selected.name,
        mimeType: selected.type,
        size: selected.size,
      });
      if (!request.ok) {
        toast.error(request.error);
        return;
      }

      const putResponse = await fetch(request.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": selected.type },
        body: selected,
      });
      if (!putResponse.ok) {
        toast.error("Upload failed. Please try again.");
        return;
      }

      const confirm = await confirmResumeUploadAction({
        candidateId: targetCandidateId,
        storageKey: request.data.storageKey,
        fileName: selected.name,
        mimeType: selected.type,
        size: selected.size,
      });
      if (!confirm.ok) {
        toast.error(confirm.error);
        return;
      }

      toast.success("Resume uploaded");
      setFile(null);
      onUploaded?.();
    } finally {
      setIsUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const selected = files?.[0];
    if (!selected || !validateFile(selected)) return;

    setFile(selected);
    if (candidateId) {
      void uploadFile(selected, candidateId);
    }
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            document.getElementById("resume-file-input")?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "border-border/60 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
          isDragging && "border-primary bg-accent/50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="text-muted-foreground size-8" aria-hidden />
        <p className="text-sm font-medium">
          Drag and drop a resume, or{" "}
          <label
            htmlFor="resume-file-input"
            className="text-primary cursor-pointer underline-offset-4 hover:underline"
          >
            browse
          </label>
        </p>
        <p className="text-muted-foreground text-xs">
          PDF or Word, up to 10 MB
          {!candidateId ? " — saved after the candidate is created" : ""}
        </p>
        <input
          id="resume-file-input"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={disabled || isUploading}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {file ? (
        <div className="bg-muted/40 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <FileText className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          {isUploading ? (
            <span className="text-muted-foreground text-xs">Uploading…</span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Remove file"
              onClick={() => setFile(null)}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Upload a pending file after candidate creation. */
export async function uploadPendingResume(
  candidateId: string,
  file: File,
): Promise<boolean> {
  const request = await requestResumeUploadAction({
    candidateId,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  });
  if (!request.ok) {
    toast.error(request.error);
    return false;
  }

  const putResponse = await fetch(request.data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putResponse.ok) {
    toast.error("Upload failed. Please try again.");
    return false;
  }

  const confirm = await confirmResumeUploadAction({
    candidateId,
    storageKey: request.data.storageKey,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  });
  if (!confirm.ok) {
    toast.error(confirm.error);
    return false;
  }
  return true;
}
