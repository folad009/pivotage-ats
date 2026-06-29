"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClientStatus } from "@prisma/client";
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
import { CLIENT_STATUS_LABELS } from "@/lib/labels";
import { createClientSchema } from "@/lib/validations/client";
import {
  createClientAction,
  updateClientAction,
} from "@/server/actions/client";

type FormIn = z.input<typeof createClientSchema>;
type FormOut = z.output<typeof createClientSchema>;

export interface ClientFormValues {
  id: string;
  name: string;
  contactEmail: string | null;
  industry: string | null;
  status: ClientStatus;
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ClientFormValues;
  onSaved?: () => void;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: ClientFormDialogProps) {
  const isEdit = Boolean(initial);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: initial?.name ?? "",
      contactEmail: initial?.contactEmail ?? "",
      industry: initial?.industry ?? "",
      status: initial?.status ?? ClientStatus.ACTIVE,
    },
  });

  async function onSubmit(values: FormOut) {
    setIsPending(true);
    const result = isEdit
      ? await updateClientAction({ id: initial!.id, ...values })
      : await createClientAction(values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Client updated" : "Client created");
    onOpenChange(false);
    form.reset();
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this client's details."
              : "Add a company you recruit for."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="talent@acme.test"
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
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Software"
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ClientStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {CLIENT_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    : "Create client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
