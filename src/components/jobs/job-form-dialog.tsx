"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EmploymentType, JobStatus } from "@prisma/client";
import { useState } from "react";
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
import { EMPLOYMENT_TYPE_LABELS, JOB_STATUS_LABELS } from "@/lib/labels";
import { createJobSchema } from "@/lib/validations/job";
import { createJobAction, updateJobAction } from "@/server/actions/job";
import { api } from "@/trpc/react";

type FormIn = z.input<typeof createJobSchema>;
type FormOut = z.output<typeof createJobSchema>;

export interface JobFormValues {
  id: string;
  title: string;
  clientId: string;
  department: string | null;
  location: string | null;
  employmentType: EmploymentType;
  status: JobStatus;
  openings: number;
  description: string | null;
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

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: initial?.title ?? "",
      clientId: initial?.clientId ?? "",
      department: initial?.department ?? "",
      location: initial?.location ?? "",
      employmentType: initial?.employmentType ?? EmploymentType.FULL_TIME,
      status: initial?.status ?? JobStatus.DRAFT,
      openings: initial?.openings ?? 1,
      description: initial?.description ?? "",
    },
  });

  async function onSubmit(values: FormOut) {
    setIsPending(true);
    const result = isEdit
      ? await updateJobAction({ id: initial!.id, ...values })
      : await createJobAction(values);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Frontend Engineer" {...field} />
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
                  <Select value={field.value} onValueChange={field.onChange}>
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
                        placeholder="Remote"
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
            </div>
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
                      placeholder="Role summary, responsibilities…"
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
