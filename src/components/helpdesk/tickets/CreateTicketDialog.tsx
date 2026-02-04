"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ticketAPI } from "@/lib/api/endpoints"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useAuthStore } from "@/store/authStore"
import { Plus, Loader2, AlertCircle, Upload, X, Wrench, Monitor } from "lucide-react"

// ============================================
// HELPER CATEGORIES
// Kategori khusus untuk Ticketing Helper (bantuan fisik/lapangan)
// ============================================
const HELPER_CATEGORIES = [
    { value: "elektronik", label: "Elektronik (AC, TV, Proyektor, dll)" },
    { value: "komputer", label: "Komputer & Laptop" },
    { value: "printer", label: "Printer & Scanner" },
    { value: "jaringan", label: "Jaringan & Internet" },
    { value: "listrik", label: "Listrik & Kelistrikan" },
    { value: "pipa", label: "Pipa / Plumbing" },
    { value: "furniture", label: "Furniture & Perabotan" },
    { value: "cleaning", label: "Kebersihan / Cleaning" },
    { value: "keamanan", label: "Keamanan / Security" },
    { value: "lainnya", label: "Lainnya" },
]

// ============================================
// SYSTEM CATEGORIES
// Kategori sistem untuk Ticketing System
// ============================================
const SYSTEM_CATEGORIES = [
    { value: "odoo", label: "Odoo ERP" },
    { value: "p2h", label: "Web P2H" },
    { value: "job_portal", label: "Job Portal" },
    { value: "other", label: "Sistem Lainnya" },
]

// ============================================
// TICKET TYPES (hanya untuk System tickets)
// ============================================
const TICKET_TYPES = [
    { value: "question", label: "Pertanyaan / Question" },
    { value: "bug", label: "Bug / Error" },
    { value: "feature", label: "Permintaan Fitur" },
    { value: "access", label: "Akses / Permission" },
]

// Validation schema
const createTicketSchema = z.object({
    ticket_category_type: z.enum(["helper", "system"]).default("helper"),
    // Helper: kategori fisik
    helper_category: z.string().optional(),
    // System: kategori sistem + tipe tiket
    system_category: z.enum(["odoo", "p2h", "job_portal", "other"]).optional(),
    ticket_type: z.string().optional(),
    // Common fields
    subject: z.string().min(5, "Subject minimal 5 karakter").max(200, "Subject maksimal 200 karakter"),
    description: z.string().min(10, "Deskripsi minimal 10 karakter"),
    // Odoo context (untuk ticket system + system_category=odoo)
    captured_url: z.string().optional(),
    captured_module: z.string().optional(),
    captured_model: z.string().optional(),
    captured_view_type: z.string().optional(),
    captured_record_id: z.string().optional(),
    captured_record_ref: z.string().optional(),
    captured_menu_path: z.string().optional(),
    captured_browser: z.string().optional(),
})

type CreateTicketForm = z.infer<typeof createTicketSchema>

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

    // Reset related fields when ticket type changes
    useEffect(() => {
        if (ticketCategoryType === "helper") {
            setValue("system_category", undefined)
            setValue("ticket_type", undefined)
        } else {
            setValue("helper_category", undefined)
        }
    }, [ticketCategoryType, setValue])

    // Create ticket mutation
    const createMutation = useMutation({
        mutationFn: async (data: CreateTicketForm) => {
            const payload: any = {
                subject: data.subject,
                description: data.description,
                ticket_category_type: data.ticket_category_type || "helper",
            }

            // Helper ticket: simpan kategori di description prefix atau field khusus
            if (data.ticket_category_type === "helper" && data.helper_category) {
                const categoryLabel = HELPER_CATEGORIES.find(c => c.value === data.helper_category)?.label || data.helper_category
                // Tambahkan kategori ke subject atau description
                payload.subject = `[${categoryLabel}] ${data.subject}`
            }

            // System ticket: sistem dan tipe tiket
            if (data.ticket_category_type === "system") {
                if (data.system_category) {
                    payload.system_category = data.system_category
                }
                if (data.ticket_type) {
                    // Simpan tipe tiket di subject prefix
                    const typeLabel = TICKET_TYPES.find(t => t.value === data.ticket_type)?.label || data.ticket_type
                    payload.subject = `[${typeLabel}] ${data.subject}`
                }
            }

            // Odoo context (untuk ticket system + Odoo)
            if (data.ticket_category_type === "system" && data.system_category === "odoo") {
                if (data.captured_url) payload.captured_url = data.captured_url
                if (data.captured_module) payload.captured_module = data.captured_module
                if (data.captured_model) payload.captured_model = data.captured_model
                if (data.captured_view_type) payload.captured_view_type = data.captured_view_type
                if (data.captured_record_id) payload.captured_record_id = parseInt(data.captured_record_id)
                if (data.captured_record_ref) payload.captured_record_ref = data.captured_record_ref
                if (data.captured_menu_path) payload.captured_menu_path = data.captured_menu_path
                if (data.captured_browser) payload.captured_browser = data.captured_browser
            }

            // Handle file attachments (convert to base64)
            if (attachments.length > 0) {
                payload.attachments = await Promise.all(
                    attachments.map(async (file) => {
                        const base64 = await fileToBase64(file)
                        return {
                            filename: file.name,
                            file_data: base64,
                        }
                    })
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
        onError: (error: any) => {
            toast({
                title: "Gagal Membuat Tiket",
                description: error.response?.data?.message || error.message || "Terjadi kesalahan",
                variant: "destructive",
            })
        },
    })

    const onSubmit = (data: CreateTicketForm) => {
        createMutation.mutate(data)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            setAttachments((prev) => [...prev, ...newFiles])
        }
    }

    const removeFile = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index))
    }

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = (error) => reject(error)
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
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
                    {/* Jenis Tiket: Helper vs System */}
                    <div className="space-y-3">
                        <Label className="text-base font-medium">Jenis Permintaan</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setValue("ticket_category_type", "helper")}
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                    ticketCategoryType === "helper"
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-muted-foreground/50"
                                }`}
                            >
                                <Wrench className={`h-8 w-8 ${ticketCategoryType === "helper" ? "text-primary" : "text-muted-foreground"}`} />
                                <div className="text-center">
                                    <p className={`font-medium ${ticketCategoryType === "helper" ? "text-primary" : ""}`}>
                                        Bantuan Fisik
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        AC, Listrik, Jaringan, dll
                                    </p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue("ticket_category_type", "system")}
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                    ticketCategoryType === "system"
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-muted-foreground/50"
                                }`}
                            >
                                <Monitor className={`h-8 w-8 ${ticketCategoryType === "system" ? "text-primary" : "text-muted-foreground"}`} />
                                <div className="text-center">
                                    <p className={`font-medium ${ticketCategoryType === "system" ? "text-primary" : ""}`}>
                                        Masalah Sistem
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Odoo, P2H, Job Portal
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* HELPER: Kategori Helper */}
                    {ticketCategoryType === "helper" && (
                        <div className="space-y-2">
                            <Label>Kategori Masalah <span className="text-destructive">*</span></Label>
                            <Select
                                value={helperCategory || ""}
                                onValueChange={(v) => setValue("helper_category", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih kategori masalah" />
                                </SelectTrigger>
                                <SelectContent>
                                    {HELPER_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Pilih kategori yang paling sesuai dengan masalah Anda
                            </p>
                        </div>
                    )}

                    {/* SYSTEM: Sistem + Tipe Tiket */}
                    {ticketCategoryType === "system" && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Sistem <span className="text-destructive">*</span></Label>
                                <Select
                                    value={systemCategory || ""}
                                    onValueChange={(v) => setValue("system_category", v as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih sistem" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SYSTEM_CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tipe Masalah</Label>
                                <Select
                                    value={watch("ticket_type") || ""}
                                    onValueChange={(v) => setValue("ticket_type", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih tipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TICKET_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Subject */}
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

                    {/* Description */}
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

                    {/* Info User */}
                    {employee && (
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Tiket akan dibuat atas nama Anda:</p>
                            <p className="text-sm font-medium">{employee.name}</p>
                            {employee.department && <p className="text-xs text-muted-foreground">Departement: {employee.department}</p>}
                            {employee.email && <p className="text-xs text-muted-foreground">{employee.email}</p>}
                            {employee.phone && <p className="text-xs text-muted-foreground">{employee.phone}</p>}
                        </div>
                    )}

                    {/* Odoo context (hanya untuk ticket system + Odoo) */}
                    {ticketCategoryType === "system" && systemCategory === "odoo" && (
                        <div className="space-y-4 rounded-lg border p-4 bg-blue-50/50">
                            <Label className="text-sm font-medium">Info konteks Odoo (opsional)</Label>
                            <p className="text-xs text-muted-foreground">Isi jika Anda tahu detail teknis halaman yang bermasalah</p>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">URL Halaman</Label>
                                    <Input placeholder="URL halaman yang error" {...register("captured_url")} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Module</Label>
                                    <Input placeholder="Nama modul (Sales, Purchase, dll)" {...register("captured_module")} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs">Menu path</Label>
                                    <Input placeholder="Contoh: Sales > Orders > Quotations" {...register("captured_menu_path")} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File Attachments */}
                    <div className="space-y-2">
                        <Label>Lampiran (Opsional)</Label>
                        <p className="text-xs text-muted-foreground">
                            Tambahkan foto atau file pendukung (screenshot error, foto kondisi, dll)
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById("file-upload")?.click()}
                                className="w-full"
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Pilih File
                            </Button>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                                accept="image/*,.pdf,.doc,.docx,.txt"
                            />
                        </div>
                        {attachments.length > 0 && (
                            <div className="space-y-2">
                                {attachments.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between rounded-md border p-2"
                                    >
                                        <span className="text-sm truncate">{file.name}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFile(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info: Admin akan assign team */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Info:</strong> Setelah tiket dibuat, Admin akan menentukan tim yang menangani dan prioritas pengerjaan.
                        </p>
                    </div>

                    {/* Action Buttons */}
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
