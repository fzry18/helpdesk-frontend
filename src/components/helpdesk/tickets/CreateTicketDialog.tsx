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
import { Plus, Loader2, AlertCircle, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Validation schema based on API documentation
const createTicketSchema = z.object({
    ticket_category_type: z.enum(["helper", "system"]).default("helper"),
    system_category: z.enum(["odoo", "p2h", "job_portal", "other"]).optional(),
    subject: z.string().min(5, "Subject minimal 5 karakter").max(200, "Subject maksimal 200 karakter"),
    description: z.string().min(10, "Deskripsi minimal 10 karakter"),
    customer_name: z.string().optional(),
    email: z.string().email("Email tidak valid").optional().or(z.literal("")),
    phone: z.string().optional(),
    department_id: z.string().optional(),
    priority: z.string().optional(),
    category_id: z.string().optional(),
    team_id: z.string().optional(),
    ticket_type_id: z.string().optional(),
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
    const isAdmin = useAuthStore((s) => s.isManager())
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
            department_id: employee?.department_id ? employee.department_id.toString() : "all",
        },
    })

    const ticketCategoryType = watch("ticket_category_type")
    const systemCategory = watch("system_category")

    useEffect(() => {
        if (open && isAdmin && employee) {
            setValue("department_id", employee.department_id ? employee.department_id.toString() : "all")
        }
    }, [open, isAdmin, employee, setValue])

    // Fetch master data
    const { data: masterData } = useQuery({
        queryKey: ["master-data"],
        queryFn: () => masterDataAPI.getAll(),
    })

    // Create ticket mutation
    const createMutation = useMutation({
        mutationFn: async (data: CreateTicketForm) => {
            const payload: any = {
                subject: data.subject,
                description: data.description,
                ticket_category_type: data.ticket_category_type || "helper",
            }
            if (data.ticket_category_type === "system" && data.system_category)
                payload.system_category = data.system_category
            if (isAdmin && data.department_id && data.department_id !== "all")
                payload.department_id = parseInt(data.department_id)
            if (isAdmin) {
                if (data.customer_name?.trim()) payload.customer_name = data.customer_name.trim()
                if (data.email?.trim()) payload.email = data.email.trim()
                if (data.phone?.trim()) payload.phone = data.phone.trim()
            }
            if (data.category_id) payload.category_id = parseInt(data.category_id)
            if (data.team_id) payload.team_id = parseInt(data.team_id)
            if (data.ticket_type_id) payload.ticket_type_id = parseInt(data.ticket_type_id)
            // Odoo context (untuk ticket system + Odoo)
            if (data.captured_url) payload.captured_url = data.captured_url
            if (data.captured_module) payload.captured_module = data.captured_module
            if (data.captured_model) payload.captured_model = data.captured_model
            if (data.captured_view_type) payload.captured_view_type = data.captured_view_type
            if (data.captured_record_id) payload.captured_record_id = parseInt(data.captured_record_id)
            if (data.captured_record_ref) payload.captured_record_ref = data.captured_record_ref
            if (data.captured_menu_path) payload.captured_menu_path = data.captured_menu_path
            if (data.captured_browser) payload.captured_browser = data.captured_browser

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
                title: "✅ Tiket Berhasil Dibuat!",
                description: `Tiket #${response.data.ticket_number} telah dibuat.`,
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
                        Isi form dibawah untuk membuat tiket helpdesk baru. Field yang wajib diisi ditandai dengan *
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Tipe Tiket: Helper vs System */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Tipe Tiket</Label>
                            <Select
                                value={ticketCategoryType}
                                onValueChange={(v) => {
                                    setValue("ticket_category_type", v as "helper" | "system")
                                    if (v === "helper") setValue("system_category", undefined)
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="helper">Ticketing Helper (bantuan lapangan/manpower)</SelectItem>
                                    <SelectItem value="system">Ticketing System (masalah sistem Odoo/P2H/dll)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Helper: printer, logistik, dll. System: Odoo, P2H, Job Portal.
                            </p>
                        </div>
                        {ticketCategoryType === "system" && (
                            <div className="space-y-2">
                                <Label>Sistem</Label>
                                <Select
                                    value={systemCategory || ""}
                                    onValueChange={(v) => setValue("system_category", v as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih sistem" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="odoo">Odoo</SelectItem>
                                        <SelectItem value="p2h">Web P2H</SelectItem>
                                        <SelectItem value="job_portal">Job Portal</SelectItem>
                                        <SelectItem value="other">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                        <Label htmlFor="subject">
                            Subject <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="subject"
                            placeholder="Mis: Website tidak bisa diakses"
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
                            Deskripsi <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="Jelaskan detail masalah yang Anda alami..."
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

                    {/* User biasa: data dari employee (tidak perlu isi). Admin: bisa isi data peminta. */}
                    {!isAdmin && employee && (
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Tiket akan dibuat atas nama Anda (data dari profil):</p>
                            <p className="text-sm">{employee.name}</p>
                            {employee.department && <p className="text-xs text-muted-foreground">Departement: {employee.department}</p>}
                            {employee.email && <p className="text-xs text-muted-foreground">{employee.email}</p>}
                            {employee.phone && <p className="text-xs text-muted-foreground">{employee.phone}</p>}
                        </div>
                    )}

                    {isAdmin && (
                        <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                            <p className="text-sm font-medium">Data peminta (untuk tiket atas nama orang lain)</p>
                            <p className="text-xs text-muted-foreground">Kosongkan jika tiket untuk diri Anda. Isi jika membuat tiket untuk orang lain.</p>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="customer_name">Nama peminta</Label>
                                    <Input
                                        id="customer_name"
                                        placeholder={employee?.name || "Nama peminta"}
                                        {...register("customer_name")}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Departement</Label>
                                    <Select
                                        value={watch("department_id") || "all"}
                                        onValueChange={(v) => setValue("department_id", v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih departement" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Sama dengan departement saya</SelectItem>
                                            {masterData?.data?.departments?.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.id.toString()}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email peminta</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={employee?.email || "email@example.com"}
                                        {...register("email")}
                                        className={errors.email ? "border-destructive" : ""}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-destructive flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {errors.email.message}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telepon peminta</Label>
                                    <Input
                                        id="phone"
                                        placeholder={employee?.phone || "+628123456789"}
                                        {...register("phone")}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-3">
                        {/* Category */}
                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori</Label>
                            <Select
                                onValueChange={(value) => setValue("category_id", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    {masterData?.data?.categories?.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Team */}
                        <div className="space-y-2">
                            <Label htmlFor="team">Team</Label>
                            <Select onValueChange={(value) => setValue("team_id", value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih team" />
                                </SelectTrigger>
                                <SelectContent>
                                    {masterData?.data?.teams?.map((team) => (
                                        <SelectItem key={team.id} value={team.id.toString()}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Ticket Type */}
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipe Tiket</Label>
                            <Select
                                onValueChange={(value) => setValue("ticket_type_id", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih tipe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Question</SelectItem>
                                    <SelectItem value="2">Bug Report</SelectItem>
                                    <SelectItem value="3">Feature Request</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Odoo context (hanya untuk ticket system + Odoo) */}
                    {ticketCategoryType === "system" && systemCategory === "odoo" && (
                        <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                            <Label className="text-sm font-medium">Info konteks Odoo (opsional)</Label>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">URL</Label>
                                    <Input placeholder="URL halaman" {...register("captured_url")} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Module</Label>
                                    <Input placeholder="Modul" {...register("captured_module")} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Model</Label>
                                    <Input placeholder="Model teknis" {...register("captured_model")} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Tipe View</Label>
                                    <Input placeholder="list, form, kanban" {...register("captured_view_type")} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs">Menu path</Label>
                                    <Input placeholder="Path menu" {...register("captured_menu_path")} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File Attachments */}
                    <div className="space-y-2">
                        <Label>Lampiran (Opsional)</Label>
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
