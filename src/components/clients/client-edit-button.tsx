"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ClientFormDialog,
  type ClientFormValues,
} from "@/components/clients/client-form-dialog";
import { Button } from "@/components/ui/button";

export function ClientEditButton({ client }: { client: ClientFormValues }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Edit
      </Button>
      <ClientFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={client}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
