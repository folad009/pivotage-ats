"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EmploymentType, JobStatus, WorkMode } from "@/lib/prisma-browser";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  IN_HOUSE_CLIENT_LABEL,
  IN_HOUSE_CLIENT_VALUE,
} from "@/lib/constants";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_STATUS_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/labels";
import { createJobSchema, updateJobSchema, jobFormSchema } from "@/lib/validations/job";
import { createJobAction, updateJobAction } from "@/server/actions/job";
import { api } from "@/trpc/react";

type FormIn = z.input<typeof jobFormSchema>;
type FormOut = z.input<typeof jobFormSchema>;

export interface JobFormValues {
  id: string;
  title: string;
  clientId: string | null;
  department: string | null;
  location: string | null;
  employmentType: EmploymentType;
  workMode: WorkMode;
  status: JobStatus;
  openings: number;
  jobRole: string | null;
  description: string | null;
  requirements: string | null;
}

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: JobFormValues;
  onSaved?: () => void;
}

export function JobFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: JobFormDialogProps) {
  const isEdit = Boolean(initial);
  const [isPending, setIsPending] = useState(false);

  const clientsQuery = api.clients.list.useQuery(
    { limit: 100 },
    { enabled: open },
  );
  const clients = clientsQuery.data?.items ?? [];

  const form = useForm<FormIn>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: initial?.title ?? "",
      clientId: initial ? (initial.clientId ?? IN_HOUSE_CLIENT_VALUE) : IN_HOUSE_CLIENT_VALUE,
      department: initial?.department ?? "",
      location: initial?.location ?? "",
      employmentType: initial?.employmentType ?? EmploymentType.FULL_TIME,
      workMode: initial?.workMode ?? WorkMode.REMOTE,
      status: initial?.status ?? JobStatus.DRAFT,
      openings: initial?.openings ?? 1,
      jobRole: initial?.jobRole ?? "",
      description: initial?.description ?? "",
      requirements: initial?.requirements ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: initial?.title ?? "",
      clientId: initial ? (initial.clientId ?? IN_HOUSE_CLIENT_VALUE) : IN_HOUSE_CLIENT_VALUE,
      department: initial?.department ?? "",
      location: initial?.location ?? "",
      employmentType: initial?.employmentType ?? EmploymentType.FULL_TIME,
      workMode: initial?.workMode ?? WorkMode.REMOTE,
      status: initial?.status ?? JobStatus.DRAFT,
      openings: initial?.openings ?? 1,
      jobRole: initial?.jobRole ?? "",
      description: initial?.description ?? "",
      requirements: initial?.requirements ?? "",
    });
  }, [open, initial, form]);

  async function onSubmit(values: FormOut) {
    setIsPending(true);
    const parsed = isEdit
      ? updateJobSchema.parse({ id: initial!.id, ...values })
      : createJobSchema.parse(values);
    const result = isEdit
      ? await updateJobAction(parsed)
      : await createJobAction(parsed);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Job updated" : "Job created");
    onOpenChange(false);
    form.reset();
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit job" : "New job"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this requisition."
              : "Open a requisition. Default pipeline stages are created automatically."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job title</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Frontend Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="jobRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job role</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Frontend Engineer"
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
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select
                    value={field.value ?? IN_HOUSE_CLIENT_VALUE}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            clientsQuery.isPending
                              ? "Loading clients…"
                              : "Select a client"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={IN_HOUSE_CLIENT_VALUE}>
                        {IN_HOUSE_CLIENT_LABEL}
                      </SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Engineering"
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="London, UK"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="workMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(WorkMode).map((value) => (
                          <SelectItem key={value} value={value}>
                            {WORK_MODE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(EmploymentType).map((value) => (
                          <SelectItem key={value} value={value}>
                            {EMPLOYMENT_TYPE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="openings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Openings</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      value={(field.value as number | string | undefined) ?? 1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(JobStatus).map((value) => (
                        <SelectItem key={value} value={value}>
                          {JOB_STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Role summary and responsibilities…"
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
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Skills, experience, and qualifications…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create job"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
