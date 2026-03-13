/**
 * TicketFormDialog.tsx — Feature: Tickets / Components
 *
 * Dialog untuk create / edit tiket.
 * - mode = "create" → form kosong, panggil useCreateTicket
 * - mode = "edit"   → form pre-filled dengan ticket, panggil useUpdateTicket
 *
 * State open/close diatur dari useTicketUIStore.
 * Setelah berhasil: tutup dialog + navigate jika diperlukan.
 */

"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateTicket, useUpdateTicket } from "@/features/tickets/hooks/use-ticket-mutations"
import { useTicketUIStore } from "@/features/tickets/stores/ticket-ui.store"

// ─────────────────────────────────────────────────────────────
// Zod schema
// ─────────────────────────────────────────────────────────────

const ticketSchema = z.object({
  subject: z
    .string()
    .min(5, "Judul minimal 5 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  priority: z.enum(["0", "1", "2", "3", "4"], {
    required_error: "Pilih prioritas",
  }),
  /** Opsional — dipilih jika user punya akses kategori */
  categoryId: z.number().nullish(),
})

type TicketFormValues = z.infer<typeof ticketSchema>

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

interface TicketFormDialogProps {
  onSuccess?: (ticketId?: number) => void
}

export function TicketFormDialog({ onSuccess }: TicketFormDialogProps) {
  const activeDialog = useTicketUIStore((s) => s.activeDialog)
  const selectedTicket = useTicketUIStore((s) => s.selectedTicket)
  const closeDialog = useTicketUIStore((s) => s.closeDialog)

  const isOpen = activeDialog === "create" || activeDialog === "edit"
  const isEdit = activeDialog === "edit" && !!selectedTicket

  // ── Form setup ──────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "2",
    },
  })

  // Populate form saat edit mode
  useEffect(() => {
    if (isEdit && selectedTicket) {
      reset({
        subject: selectedTicket.subject ?? "",
        description: selectedTicket.description ?? "",
        priority: String(selectedTicket.priority ?? "2") as TicketFormValues["priority"],
      })
    } else {
      reset({ subject: "", description: "", priority: "2" })
    }
  }, [isEdit, selectedTicket, reset])

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useCreateTicket({
    onSuccess: (id) => {
      closeDialog()
      onSuccess?.(id)
    },
  })

  const updateMutation = useUpdateTicket(selectedTicket?.id ?? 0, {
    onSuccess: () => {
      closeDialog()
      onSuccess?.()
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  // ── Submit ──────────────────────────────────────────────────
  const onSubmit = (values: TicketFormValues) => {
    const payload = {
      subject: values.subject.trim(),
      description: values.description.trim(),
      priority: values.priority,
      ...(values.categoryId ? { category_id: values.categoryId } : {}),
    }

    if (isEdit && selectedTicket) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tiket" : "Buat Tiket Baru"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-subject">Judul Tiket *</Label>
            <Input
              id="ticket-subject"
              placeholder="Deskripsi singkat masalah…"
              disabled={isPending}
              {...register("subject")}
            />
            {errors.subject && (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-description">Detail Permasalahan *</Label>
            <Textarea
              id="ticket-description"
              rows={4}
              placeholder="Jelaskan masalah secara lengkap — langkah reproduksi, screenshot, dll."
              disabled={isPending}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-priority">Prioritas *</Label>
            <Select
              defaultValue="2"
              onValueChange={(val) =>
                setValue("priority", val as TicketFormValues["priority"], {
                  shouldValidate: true,
                })
              }
              disabled={isPending}
            >
              <SelectTrigger id="ticket-priority">
                <SelectValue placeholder="Pilih prioritas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">⭐⭐⭐⭐ Sangat Tinggi</SelectItem>
                <SelectItem value="3">⭐⭐⭐ Tinggi</SelectItem>
                <SelectItem value="2">⭐⭐ Normal</SelectItem>
                <SelectItem value="1">⭐ Rendah</SelectItem>
                <SelectItem value="0">Sangat Rendah</SelectItem>
              </SelectContent>
            </Select>
            {errors.priority && (
              <p className="text-xs text-destructive">{errors.priority.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Menyimpan…"
                  : "Membuat…"
                : isEdit
                  ? "Simpan Perubahan"
                  : "Buat Tiket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
