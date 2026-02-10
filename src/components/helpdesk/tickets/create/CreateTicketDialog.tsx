"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ticketAPI } from "@/lib/api/endpoints"
import type { CreateTicketPayload } from "@/lib/api/endpoints"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { useAuthStore } from "@/store/authStore"
import { Plus, Loader2, AlertCircle } from "lucide-react"
import { getErrorMessage } from "@/lib/constants/error-messages"
import {
  createTicketSchema,
  type CreateTicketForm,
  HELPER_CATEGORIES,
  TICKET_TYPES,
} from "./constants"
import { TicketCategoryTypeSelector } from "./TicketCategoryTypeSelector"
import { HelperCategoryForm } from "./HelperCategoryForm"
import { SystemCategoryForm } from "./SystemCategoryForm"
import { FileUploader, fileToBase64 } from "@/components/ui/file-uploader"

interface CreateTicketDialogProps {
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function CreateTicketDialog({ trigger, onSuccess }: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const queryClient = useQueryClient()
  const employee = useAuthStore((s) => s.employee)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      ticket_category_type: "helper",
    },
  })

  const ticketCategoryType = watch("ticket_category_type")
  const systemCategory = watch("system_category")
  const helperCategory = watch("helper_category")

  useEffect(() => {
    if (ticketCategoryType === "helper") {
      setValue("system_category", undefined)
      setValue("ticket_type", undefined)
    } else {
      setValue("helper_category", undefined)
    }
  }, [ticketCategoryType, setValue])

  const createMutation = useMutation({
    mutationFn: async (data: CreateTicketForm) => {
      const payload: CreateTicketPayload = {
        subject: data.subject,
        description: data.description,
        ticket_category_type: data.ticket_category_type ?? "helper",
      }

      if (data.ticket_category_type === "helper" && data.helper_category) {
        const categoryLabel =
          HELPER_CATEGORIES.find((c) => c.value === data.helper_category)?.label ??
          data.helper_category
        payload.subject = `[${categoryLabel}] ${data.subject}`
      }

      if (data.ticket_category_type === "system") {
        if (data.system_category) {
          payload.system_category = data.system_category
        }
        if (data.ticket_type) {
          const typeLabel =
            TICKET_TYPES.find((t) => t.value === data.ticket_type)?.label ??
            data.ticket_type
          payload.subject = `[${typeLabel}] ${data.subject}`
        }
      }

      if (
        data.ticket_category_type === "system" &&
        data.system_category === "odoo"
      ) {
        if (data.captured_url) payload.captured_url = data.captured_url
        if (data.captured_module) payload.captured_module = data.captured_module
        if (data.captured_model) payload.captured_model = data.captured_model
        if (data.captured_view_type)
          payload.captured_view_type = data.captured_view_type
        if (data.captured_record_id)
          payload.captured_record_id = parseInt(data.captured_record_id, 10)
        if (data.captured_record_ref)
          payload.captured_record_ref = data.captured_record_ref
        if (data.captured_menu_path)
          payload.captured_menu_path = data.captured_menu_path
        if (data.captured_browser) payload.captured_browser = data.captured_browser
      }

      if (attachments.length > 0) {
        payload.attachments = await Promise.all(
          attachments.map(async (file) => ({
            filename: file.name,
            file_data: await fileToBase64(file),
          }))
        )
      }

      return ticketAPI.create(payload)
    },
    onSuccess: (response) => {
      toast({
        title: "Tiket Berhasil Dibuat!",
        description: `Tiket #${response.data.ticket_number} telah dibuat. Admin akan segera memproses.`,
      })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      reset()
      setAttachments([])
      setOpen(false)
      onSuccess?.()
    },
    onError: (error: unknown) => {
      toast({
        title: "Gagal Membuat Tiket",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: CreateTicketForm) => {
    createMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Buat Tiket Baru
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Plus className="h-6 w-6" />
            Buat Tiket Baru
          </DialogTitle>
          <DialogDescription>
            Isi form dibawah untuk membuat tiket helpdesk baru
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <TicketCategoryTypeSelector
            value={ticketCategoryType}
            onChange={(v) => setValue("ticket_category_type", v)}
          />

          {ticketCategoryType === "helper" && (
            <HelperCategoryForm
              value={helperCategory}
              onChange={(v) => setValue("helper_category", v)}
            />
          )}

          {ticketCategoryType === "system" && (
            <SystemCategoryForm
              systemCategory={systemCategory}
              ticketType={watch("ticket_type")}
              onSystemCategoryChange={(v) => setValue("system_category", v)}
              onTicketTypeChange={(v) => setValue("ticket_type", v)}
              register={register}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">
              Judul / Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              placeholder={
                ticketCategoryType === "helper"
                  ? "Mis: AC di ruang meeting tidak dingin"
                  : "Mis: Error saat membuat PO di Odoo"
              }
              {...register("subject")}
              className={errors.subject ? "border-destructive" : ""}
            />
            {errors.subject && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.subject.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Deskripsi Detail <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder={
                ticketCategoryType === "helper"
                  ? "Jelaskan detail masalah: lokasi, kondisi saat ini, kapan terjadi, dll..."
                  : "Jelaskan masalah: langkah yang dilakukan, error yang muncul, screenshot jika ada..."
              }
              rows={5}
              {...register("description")}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.description.message}
              </p>
            )}
          </div>

          {employee && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Tiket akan dibuat atas nama Anda:
              </p>
              <p className="text-sm font-medium">{employee.name}</p>
              {employee.department && (
                <p className="text-xs text-muted-foreground">
                  Departement: {employee.department}
                </p>
              )}
              {employee.email && (
                <p className="text-xs text-muted-foreground">{employee.email}</p>
              )}
              {employee.phone && (
                <p className="text-xs text-muted-foreground">{employee.phone}</p>
              )}
            </div>
          )}

          <FileUploader
            files={attachments}
            onFilesChange={setAttachments}
            inputId="create-ticket-attachments"
            label="Lampiran (Opsional)"
            description="Tambahkan foto atau file pendukung (screenshot error, foto kondisi, dll)"
            compressImages={true}
          />

          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <p className="text-sm text-blue-800">
              <strong>Info:</strong> Setelah tiket dibuat, Admin akan menentukan
              tim yang menangani dan prioritas pengerjaan.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                setAttachments([])
                setOpen(false)
              }}
              disabled={createMutation.isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Membuat Tiket...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Buat Tiket
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
