"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  ResumeUploader,
  uploadPendingResume,
} from "@/components/candidates/resume-uploader";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createCandidateSchema } from "@/lib/validations/candidate";
import {
  createCandidateAction,
  updateCandidateAction,
} from "@/server/actions/candidate";
import { api } from "@/trpc/react";

type FormIn = z.input<typeof createCandidateSchema>;
type FormOut = z.output<typeof createCandidateSchema>;

export interface CandidateFormValues {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  source: string | null;
  linkedinUrl: string | null;
  tagIds: string[];
}

interface CandidateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CandidateFormValues;
  canManage: boolean;
  onSaved?: () => void;
}

export function CandidateFormDialog({
  open,
  onOpenChange,
  initial,
  canManage,
  onSaved,
}: CandidateFormDialogProps) {
  const isEdit = Boolean(initial);
  const [isPending, setIsPending] = useState(false);
  const [pendingResume, setPendingResume] = useState<File | null>(null);

  const tagsQuery = api.candidates.listTags.useQuery(undefined, {
    enabled: open && canManage,
  });

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createCandidateSchema),
    defaultValues: {
      firstName: initial?.firstName ?? "",
      lastName: initial?.lastName ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      location: initial?.location ?? "",
      source: initial?.source ?? "",
      linkedinUrl: initial?.linkedinUrl ?? "",
      tagIds: initial?.tagIds ?? [],
    },
  });

  async function onSubmit(values: FormOut) {
    setIsPending(true);
    const result = isEdit
      ? await updateCandidateAction({ id: initial!.id, ...values })
      : await createCandidateAction(values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      if (result.existingId) {
        toast.info("Open the existing candidate to update their profile.");
      }
      return;
    }

    if (!isEdit && pendingResume) {
      const uploaded = await uploadPendingResume(result.data.id, pendingResume);
      if (uploaded) {
        toast.success("Candidate created with resume");
      } else {
        toast.success("Candidate created (resume upload failed)");
      }
      setPendingResume(null);
    } else {
      toast.success(isEdit ? "Candidate updated" : "Candidate created");
    }

    onOpenChange(false);
    form.reset();
    onSaved?.();
  }

  if (!canManage) return null;

  const tags = tagsQuery.data ?? [];
  const selectedTagIds = form.watch("tagIds") ?? [];

  function toggleTag(tagId: string) {
    const current = form.getValues("tagIds") ?? [];
    form.setValue(
      "tagIds",
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit candidate" : "New candidate"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update candidate profile information."
              : "Add a person to the talent pool."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="LinkedIn, Referral…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="linkedinUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://linkedin.com/in/…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {tags.length > 0 ? (
              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <Button
                        key={tag.id}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => toggleTag(tag.id)}
                        aria-pressed={selected}
                      >
                        {tag.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <FormLabel>Resume</FormLabel>
              <ResumeUploader
                candidateId={isEdit ? initial?.id : undefined}
                pendingFile={pendingResume}
                onPendingFileChange={setPendingResume}
                disabled={isPending}
                onUploaded={onSaved}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create candidate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
