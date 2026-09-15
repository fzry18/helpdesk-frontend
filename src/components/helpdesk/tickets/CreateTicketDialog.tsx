"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ticketAPI, masterDataAPI } from "@/lib/api/endpoints"
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
import { Plus, Loader2, AlertCircle, Upload, X, FileIcon, Sparkles } from "lucide-react"

const createTicketSchema = z.object({
    subject: z.string().min(5, "Subject minimal 5 karakter").max(200, "Subject maksimal 200 karakter"),
    description: z.string().min(10, "Deskripsi minimal 10 karakter"),
    priority: z.string().default("1"),
    category_id: z.string().optional(),
    team_id: z.string().optional(),
    ticket_type_id: z.string().optional(),
    customer_name: z.string().optional(),
    email: z.string().email("Email tidak valid").optional().or(z.literal("")),
    phone: z.string().optional(),
    department_id: z.string().optional(),
})

type CreateTicketForm = z.infer<typeof createTicketSchema>

interface CreateTicketDialogProps {
    trigger?: React.ReactNode
    onSuccess?: () => void
    initialSubject?: string
    initialDescription?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const PRESETS = [
    {
        id: "hardware",
        label: "Printer / PC",
        icon: "🖨️",
        keyword: "Hardware",
        defaultSubject: "Kendala Printer / Komputer Fisik",
        placeholder: "Sebutkan nama perangkat, nomor aset, atau kendala fisik printer/komputer...",
    },
    {
        id: "network",
        label: "Jaringan & WiFi",
        icon: "🌐",
        keyword: "Jaringan",
        defaultSubject: "Gangguan Koneksi Jaringan / WiFi",
        placeholder: "Jelaskan lokasi ruangan, nama SSID WiFi, dan detail kendala koneksi...",
    },
    {
        id: "system",
        label: "Sistem / Odoo ERP",
        icon: "💻",
        keyword: "Software",
        defaultSubject: "Error Aplikasi / Odoo ERP",
        placeholder: "Sebutkan menu/modul yang bermasalah, nomor dokumen, dan pesan error...",
    },
    {
        id: "account",
        label: "Akun & Password",
        icon: "🔑",
        keyword: "Akun",
        defaultSubject: "Permintaan Reset Password / Hak Akses",
        placeholder: "Sebutkan akun, NIK, sistem yang dituju, dan jenis akses yang dibutuhkan...",
    },
]

export function CreateTicketDialog({
    trigger,
    onSuccess,
    initialSubject,
    initialDescription,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
}: CreateTicketDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : uncontrolledOpen
    const setOpen = (val: boolean) => {
        if (isControlled) {
            setControlledOpen?.(val)
        } else {
            setUncontrolledOpen(val)
        }
    }

    const [attachments, setAttachments] = useState<File[]>([])
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
    const queryClient = useQueryClient()
    const { isManager, hasRole, employee } = useAuthStore()
    const isStaff =
        isManager() ||
        hasRole("SUPER_ADMIN") ||
        hasRole("ADMIN_IT_SUPPORT") ||
        hasRole("IT_SUPPORT")

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
            subject: initialSubject || "",
            description: initialDescription || "",
            priority: "1",
            department_id: employee?.department_id ? employee.department_id.toString() : "all",
        },
    })

    useEffect(() => {
        if (initialSubject) setValue("subject", initialSubject)
        if (initialDescription) setValue("description", initialDescription)
    }, [initialSubject, initialDescription, setValue])

    // Fetch master data
    const { data: masterData } = useQuery({
        queryKey: ["master-data"],
        queryFn: () => masterDataAPI.getAll(),
    })

    const handleSelectPreset = (preset: typeof PRESETS[number]) => {
        setSelectedPreset(preset.id)
        if (!watch("subject") || watch("subject") === "") {
            setValue("subject", preset.defaultSubject)
        }
        // Match category
        const categories = masterData?.data?.categories || []
        const matched = categories.find((c: any) =>
            c.name.toLowerCase().includes(preset.keyword.toLowerCase())
        )
        if (matched) {
            setValue("category_id", String(matched.id))
        }
    }

    // Create ticket mutation
    const createMutation = useMutation({
        mutationFn: async (data: CreateTicketForm) => {
            const payload: any = {
                subject: data.subject,
                description: data.description,
                priority: data.priority || "1",
            }
            if (data.category_id) payload.category_id = parseInt(data.category_id)
            if (isStaff && data.team_id) payload.team_id = parseInt(data.team_id)
            if (isStaff && data.ticket_type_id) payload.ticket_type_id = parseInt(data.ticket_type_id)

            if (isStaff && data.customer_name?.trim()) payload.customer_name = data.customer_name.trim()
            if (isStaff && data.email?.trim()) payload.email = data.email.trim()
            if (isStaff && data.phone?.trim()) payload.phone = data.phone.trim()

            // Handle file attachments
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
                title: "✅ Tiket Berhasil Dibuat!",
                description: `Tiket #${response.data.ticket_number || response.data.id} telah tercatat.`,
            })
            queryClient.invalidateQueries({ queryKey: ["tickets"] })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            reset()
            setAttachments([])
            setSelectedPreset(null)
            setOpen(false)
            onSuccess?.()
        },
        onError: (error: any) => {
            toast({
                title: "❌ Gagal Membuat Tiket",
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
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Buat Tiket Baru
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Plus className="h-5 w-5 text-primary" />
                        Buat Tiket Bantuan Helpdesk
                    </DialogTitle>
                    <DialogDescription>
                        Pilih jenis kendala atau ceritakan masalah yang Anda alami secara rinci.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Quick Issue Presets */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            Pintasan Jenis Masalah Cepat
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {PRESETS.map((p) => {
                                const isSelected = selectedPreset === p.id
                                return (
                                    <button
                                        type="button"
                                        key={p.id}
                                        onClick={() => handleSelectPreset(p)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                                            isSelected
                                                ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                                                : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                                        }`}
                                    >
                                        <span className="text-xl mb-1">{p.icon}</span>
                                        <span className="text-xs font-medium leading-tight">{p.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Category & Priority (Staff only for priority) */}
                    <div className={isStaff ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "space-y-1.5"}>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                Kategori Masalah <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watch("category_id")}
                                onValueChange={(val) => setValue("category_id", val)}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Pilih kategori kendala" />
                                </SelectTrigger>
                                <SelectContent>
                                    {masterData?.data?.categories?.map((cat: any) => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {isStaff && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Tingkat Prioritas</Label>
                                <Select
                                    value={watch("priority") || "2"}
                                    onValueChange={(val) => setValue("priority", val)}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Prioritas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">🟢 Rendah (Low)</SelectItem>
                                        <SelectItem value="2">🟡 Sedang (Normal)</SelectItem>
                                        <SelectItem value="3">🟠 Tinggi (High - Menghambat)</SelectItem>
                                        <SelectItem value="4">🔴 Mendesak (Critical - Urgent)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                        <Label htmlFor="subject" className="text-xs font-medium">
                            Judul Singkat / Subjek <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="subject"
                            placeholder="Contoh: Printer EPSON L3110 tidak mau menarik kertas"
                            {...register("subject")}
                            className={`h-9 ${errors.subject ? "border-destructive" : ""}`}
                        />
                        {errors.subject && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.subject.message}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="description" className="text-xs font-medium">
                            Ceritakan Kendala Secara Rinci <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Jelaskan kronologi kendala, pesan error di layar, atau apa yang sudah dicoba..."
                            rows={4}
                            {...register("description")}
                            className={errors.description ? "border-destructive" : ""}
                        />
                        {errors.description && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    {/* Lampiran Berkas / Screenshot */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Lampiran Screenshot / Foto / Dokumen (Opsional)</Label>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById("create-ticket-file-upload")?.click()}
                                className="w-full h-9 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-xs gap-2"
                            >
                                <Upload className="h-3.5 w-3.5 text-primary" />
                                Klik untuk Unggah Foto / File Bukti Kendala
                            </Button>
                            <input
                                id="create-ticket-file-upload"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                                accept="image/*,.pdf,.doc,.docx,.txt"
                            />
                        </div>

                        {attachments.length > 0 && (
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {attachments.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 rounded-lg border bg-muted/40 text-xs"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="truncate font-medium">{file.name}</span>
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                ({(file.size / 1024).toFixed(1)} KB)
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFile(idx)}
                                            className="h-6 w-6 p-0 hover:text-destructive"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Kontrol Khusus Admin / Dispatcher IT */}
                    {isStaff && (
                        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/[0.02] space-y-3">
                            <p className="text-xs font-semibold text-primary">
                                Panel Dispatcher / Kontrol Admin IT
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Tugaskan ke Tim IT Langsung</Label>
                                    <Select
                                        value={watch("team_id") || ""}
                                        onValueChange={(val) => setValue("team_id", val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Biarkan Kosong (Unassigned)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">-- Belum Ditugaskan --</SelectItem>
                                            {masterData?.data?.teams?.map((t: any) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Nama Pemohon (Jika Atas Nama Orang Lain)</Label>
                                    <Input
                                        placeholder="Kosongkan jika tiket untuk diri Anda"
                                        {...register("customer_name")}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tombol Aksi */}
                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                reset()
                                setAttachments([])
                                setSelectedPreset(null)
                                setOpen(false)
                            }}
                            disabled={createMutation.isPending}
                        >
                            Batal
                        </Button>
                        <Button type="submit" size="sm" disabled={createMutation.isPending}>
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    Menyimpan Tiket...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                    Kirim Tiket
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
