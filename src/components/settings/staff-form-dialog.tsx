"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Role } from "@prisma/client";
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
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { ROLE_LABELS } from "@/lib/labels";
import { createUserSchema, updateUserSchema } from "@/lib/validations/user";
import { createUserAction, updateUserAction } from "@/server/actions/user";

const createFormSchema = createUserSchema;
const updateFormSchema = updateUserSchema.omit({ id: true });

type CreateFormIn = z.input<typeof createFormSchema>;
type CreateFormOut = z.output<typeof createFormSchema>;
type UpdateFormIn = z.input<typeof updateFormSchema>;
type UpdateFormOut = z.output<typeof updateFormSchema>;

export interface StaffFormValues {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: StaffFormValues;
  onSaved?: () => void;
}

export function StaffFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: StaffFormDialogProps) {
  const isEdit = Boolean(initial);
  const [isPending, setIsPending] = useState(false);

  const createForm = useForm<CreateFormIn, unknown, CreateFormOut>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: Role.RECRUITER,
      password: "",
      isActive: true,
    },
  });

  const updateForm = useForm<UpdateFormIn, unknown, UpdateFormOut>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      role: initial?.role ?? Role.RECRUITER,
      password: "",
      isActive: initial?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initial) {
      updateForm.reset({
        name: initial.name,
        email: initial.email,
        role: initial.role,
        password: "",
        isActive: initial.isActive,
      });
      return;
    }

    createForm.reset({
      name: "",
      email: "",
      role: Role.RECRUITER,
      password: "",
      isActive: true,
    });
  }, [open, initial, createForm, updateForm]);

  async function onCreateSubmit(values: CreateFormOut) {
    setIsPending(true);
    const result = await createUserAction(values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Staff member created");
    onOpenChange(false);
    createForm.reset();
    onSaved?.();
  }

  async function onUpdateSubmit(values: UpdateFormOut) {
    if (!initial) {
      return;
    }

    setIsPending(true);
    const result = await updateUserAction({ id: initial.id, ...values });
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Staff member updated");
    onOpenChange(false);
    updateForm.reset();
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit staff member" : "Add staff member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update account details and role. Leave password blank to keep the current password."
              : "Create a new staff account with email credentials and an assigned role."}
          </DialogDescription>
        </DialogHeader>

        {isEdit ? (
          <Form {...updateForm}>
            <form
              className="space-y-4"
              onSubmit={updateForm.handleSubmit(onUpdateSubmit)}
            >
              <FormField
                control={updateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
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

              <FormField
                control={updateForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(Role).map((value) => (
                          <SelectItem key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="Leave blank to keep current"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional. Minimum 8 characters.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active account</FormLabel>
                      <FormDescription>
                        Inactive users cannot sign in.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Active account"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...createForm}>
            <form
              className="space-y-4"
              onSubmit={createForm.handleSubmit(onCreateSubmit)}
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
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

              <FormField
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(Role).map((value) => (
                          <SelectItem key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>Minimum 8 characters.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active account</FormLabel>
                      <FormDescription>
                        Inactive users cannot sign in.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Active account"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating…" : "Create staff member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
