"use client"

import { use, useRef, useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ticketAPI, messageAPI } from "@/lib/api/endpoints"
import { apiClient } from "@/lib/api/client"
import { useAuthStore } from "@/store/authStore"
import { useTicketChat } from "@/hooks/useTicketChat"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Send,
  CheckCircle,
  MessageSquare,
  UserCheck,
  GitBranch,
  Paperclip,
  Download,
  FileIcon,
  X,
  Clock,
  ExternalLink,
  Plus,
  Star,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateTicketDialog } from "@/components/helpdesk/tickets/CreateTicketDialog"

const messageSchema = z.object({
  body: z.string().optional(),
  internal: z.boolean().default(false),
})

type MessageFormData = z.infer<typeof messageSchema>

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const ticketId = parseInt(id)
  const queryClient = useQueryClient()
  const { isManager, hasRole, employee: currentEmployee } = useAuthStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [chatAttachments, setChatAttachments] = useState<File[]>([])
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [satisfactionRating, setSatisfactionRating] = useState<string>("5")
  const [feedbackText, setFeedbackText] = useState<string>("")

  // Subscribe to real-time SSE ticket chat & status updates
  useTicketChat({ ticketId, enabled: !!ticketId })

  const { data: ticketData, isLoading: ticketLoading, error: ticketError } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => ticketAPI.get(ticketId),
  })

  const { data: threadData, isLoading: messagesLoading } = useQuery({
    queryKey: ["ticket", ticketId, "thread"],
    queryFn: () => messageAPI.getThread(ticketId),
    enabled: !!ticketId,
  })

  // Fetch stages for stage switcher
  const { data: stagesData } = useQuery({
    queryKey: ["admin-stages"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: any[] }>("/stages")
      return res.data || []
    },
    enabled: !!ticketId,
  })

  // Fetch technicians for assignee switcher
  const { data: techData } = useQuery({
    queryKey: ["admin-techs"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: any[] }>("/users")
      return res.data || []
    },
    enabled: !!ticketId,
  })

  const updateStageMutation = useMutation({
    mutationFn: (stageId: number) => ticketAPI.updateStage(ticketId, stageId),
    onSuccess: () => {
      toast({ title: "Status Tahapan Berhasil Diperbarui" })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Mengubah Status",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  const assignUserMutation = useMutation({
    mutationFn: (userId: number) => ticketAPI.assignUser(ticketId, userId),
    onSuccess: () => {
      toast({ title: "Penugasan Teknisi Berhasil" })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menugaskan",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  const assignToMeMutation = useMutation({
    mutationFn: () => ticketAPI.assignToMe(ticketId),
    onSuccess: () => {
      toast({ title: "Tiket Berhasil Ditugaskan ke Anda" })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menugaskan",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  const messages = (threadData?.data && Array.isArray(threadData.data) ? threadData.data : []) as Array<{
    id: number
    body: string
    body_plain?: string
    author?: { id: number; name: string; email?: string } | null
    date?: string
    create_date?: string
    is_internal?: boolean
    attachments?: Array<{
      id: number
      name: string
      filename: string
      mimetype: string
      file_size: number
      url: string
    }>
  }>

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: { internal: false },
  })

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      let attachmentsPayload: Array<{ filename: string; file_data: string }> | undefined
      if (chatAttachments.length > 0) {
        attachmentsPayload = await Promise.all(
          chatAttachments.map(async (file) => ({
            filename: file.name,
            file_data: await fileToBase64(file),
          }))
        )
      }

      return messageAPI.postMessage(ticketId, {
        body: data.body || "",
        internal: data.internal,
        attachments: attachmentsPayload,
      })
    },
    onSuccess: () => {
      toast({ title: "Pesan terkirim", description: "Pesan Anda telah berhasil dikirim" })
      reset()
      setChatAttachments([])
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId, "thread"] })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal mengirim pesan",
        description: error.response?.data?.message || "Terjadi kesalahan",
        variant: "destructive",
      })
    },
  })

  const requestConfirmationMutation = useMutation({
    mutationFn: (message?: string | void) => ticketAPI.requestConfirmation(ticketId, message || undefined),
    onSuccess: () => {
      toast({ title: "Permintaan konfirmasi terkirim ke user" })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Terjadi kesalahan",
        variant: "destructive",
      })
    },
  })

  const confirmResolvedMutation = useMutation({
    mutationFn: (data?: { satisfaction?: string; feedback?: string }) =>
      ticketAPI.confirmResolved(ticketId, data),
    onSuccess: () => {
      toast({ title: "Terima kasih! Tiket telah dikonfirmasi selesai." })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Terjadi kesalahan",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: MessageFormData) => {
    if ((!data.body || data.body.trim() === "") && chatAttachments.length === 0) {
      toast({ title: "Pesan atau lampiran tidak boleh kosong", variant: "destructive" })
      return
    }
    sendMessageMutation.mutate(data)
  }

  if (ticketLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (ticketError) {
    return (
      <div className="space-y-6">
        <Link href="/tickets">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-destructive">Error Memuat Ticket</h3>
              <p className="text-muted-foreground">
                {(ticketError as any)?.response?.data?.message ||
                  (ticketError as any)?.message ||
                  "Terjadi kesalahan saat memuat ticket"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ticket = ticketData?.data
  if (!ticket) {
    return (
      <div className="space-y-6">
        <Link href="/tickets">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Ticket tidak ditemukan</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "4":
        return { color: "bg-red-100 text-red-800 border-red-200", label: "Mendesak (Critical)" }
      case "3":
        return { color: "bg-orange-100 text-orange-800 border-orange-200", label: "Tinggi (High)" }
      case "2":
        return { color: "bg-amber-100 text-amber-800 border-amber-200", label: "Sedang (Medium)" }
      case "1":
        return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Rendah (Low)" }
      default:
        return { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Normal" }
    }
  }

  const priorityConfig = getPriorityConfig(String(ticket.priority))
  const isSuperAdmin = hasRole("SUPER_ADMIN")
  const isAdminIt = hasRole("ADMIN_IT_SUPPORT")
  const isTechnician = hasRole("IT_SUPPORT")
  const isAdmin = isManager() || isSuperAdmin || isAdminIt || isTechnician
  const isAssignedToMe = Boolean(
    ticket.assigned_user?.id && ticket.assigned_user.id === currentEmployee?.id
  )
  const canManageTicket = isSuperAdmin || isAdminIt || isAssignedToMe

  const closingStage = stagesData?.find(
    (s: any) => s.isClosing || s.name?.toLowerCase() === "closed" || s.name?.toLowerCase() === "selesai"
  )

  const isClosed =
    ticket.status === "closed" ||
    ticket.resolution_confirmed ||
    ticket.stage?.name?.toLowerCase().includes("closed") ||
    ticket.stage?.name?.toLowerCase().includes("selesai")

  const waitingConfirmation = ticket.waiting_user_confirmation && !isClosed

  // Duration calculations
  const createdDate = new Date(ticket.create_date)
  const hoursSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60))
  const isOver24Hours = !isClosed && hoursSinceCreation >= 24

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Tiket
          </Button>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
              <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
              {isOver24Hours && (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 gap-1">
                  <Clock className="h-3 w-3" />
                  Berjalan {hoursSinceCreation} jam
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Tiket #{ticket.ticket_number || ticket.id} · Dibuat oleh{" "}
              <span className="font-medium text-foreground">
                {ticket.customer?.name || ticket.customer_name || "User"}
              </span>{" "}
              pada {formatDate(ticket.create_date)}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {ticket.stage?.name && (
                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                  {ticket.stage.name}
                </Badge>
              )}
              {ticket.category?.name && (
                <Badge variant="secondary">
                  {ticket.category.name}
                </Badge>
              )}
              {waitingConfirmation && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 animate-pulse">
                  Menunggu Konfirmasi User
                </Badge>
              )}
              {isClosed && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                  Tiket Selesai
                </Badge>
              )}
            </div>
          </div>

          {/* If ticket is closed, provide quick CTA to create a related follow-up ticket */}
          {isClosed && (
            <div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setFollowUpOpen(true)}
                className="gap-2 bg-primary hover:bg-primary/90 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Buat Tiket Baru Terkait
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Deskripsi Tiket */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Deskripsi Kendala</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Lampiran Berkas Tiket (Awal Pembuatan) */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Lampiran Berkas Tiket ({ticket.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ticket.attachments.map((att: any) => {
                    const isImg = att.mimetype?.startsWith("image/")
                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {isImg ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              className="h-9 w-9 rounded object-cover border shrink-0"
                            />
                          ) : (
                            <FileIcon className="h-6 w-6 text-muted-foreground shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="font-medium truncate">{att.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(att.file_size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-md shrink-0"
                          title="Unduh / Buka Lampiran"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Panel Aksi Admin & IT Support */}
          {isAdmin && !isClosed && (
            <Card className="border-primary/30 bg-primary/[0.02]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Panel Aksi IT & Dispatcher
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 1. Ganti Stage */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-primary" />
                    Ubah Status / Tahapan Tiket
                  </label>
                  {canManageTicket ? (
                    <Select
                      value={ticket.stage?.id ? String(ticket.stage.id) : undefined}
                      onValueChange={(val) => updateStageMutation.mutate(parseInt(val))}
                      disabled={updateStageMutation.isPending}
                    >
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue placeholder="Pilih status/stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stagesData?.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2.5 rounded-lg border bg-muted/40 text-xs text-muted-foreground">
                      Tiket ini ditugaskan ke <strong className="text-foreground">{ticket.assigned_user?.name || "teknisi lain"}</strong>. Anda dapat melihat percakapan dan catatan teknis, namun hanya teknisi penanggung jawab atau Admin IT yang dapat memproses tahapan tiket ini.
                    </div>
                  )}
                </div>

                {/* 2. Tugaskan Teknisi (Hanya Dispatcher / Super Admin) */}
                {(isSuperAdmin || isAdminIt) && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-primary" />
                      Tugaskan ke Teknisi IT Support (Dispatcher)
                    </label>
                    <div className="flex gap-2">
                      <Select
                        value={ticket.assigned_user?.id ? String(ticket.assigned_user.id) : undefined}
                        onValueChange={(val) => assignUserMutation.mutate(parseInt(val))}
                        disabled={assignUserMutation.isPending}
                      >
                        <SelectTrigger className="flex-1 h-9 text-xs">
                          <SelectValue placeholder="Pilih teknisi IT..." />
                        </SelectTrigger>
                        <SelectContent>
                          {techData?.map((t: any) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name} ({t.nik})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => assignToMeMutation.mutate()}
                        disabled={assignToMeMutation.isPending}
                        className="text-xs h-9 shrink-0"
                      >
                        Ke Saya
                      </Button>
                    </div>
                  </div>
                )}

                {/* 3. Langsung Closed oleh Teknisi (Hasil Grill-Me) */}
                {canManageTicket && (
                  <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        Pekerjaan Perbaikan Selesai?
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Tutup langsung tiket setelah perbaikan kendala tuntas.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {closingStage && ticket.stage?.id !== closingStage.id && (
                        <Button
                          size="sm"
                          onClick={() => updateStageMutation.mutate(closingStage.id)}
                          disabled={updateStageMutation.isPending}
                          className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Tandai Selesai (Closed)
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* User: Confirm Resolved (saat waiting_confirmation) */}
          {!isAdmin && waitingConfirmation && (
            <Card className="border-amber-300 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                  <CheckCircle className="h-5 w-5 text-amber-600" />
                  Konfirmasi Penyelesaian Tiket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-amber-800">
                  Tim teknisi IT telah menyatakan kendala Anda selesai. Mohon konfirmasi apakah masalah sudah teratasi:
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Nilai Kepuasan Layanan (Bintang 1-5):
                  </label>
                  <div className="flex gap-2">
                    {["1", "2", "3", "4", "5"].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setSatisfactionRating(num)}
                        className={`flex items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                          satisfactionRating === num
                            ? "bg-amber-400 text-amber-950 border-amber-500 shadow-sm"
                            : "bg-white hover:bg-amber-100/50"
                        }`}
                      >
                        <Star className="h-3.5 w-3.5 mr-1 fill-amber-400 text-amber-500" />
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Catatan / Umpan Balik (Opsional):
                  </label>
                  <Textarea
                    placeholder="Beri pesan terima kasih atau saran untuk tim IT..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={2}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() =>
                      confirmResolvedMutation.mutate({
                        satisfaction: satisfactionRating,
                        feedback: feedbackText,
                      })
                    }
                    disabled={confirmResolvedMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Ya, Masalah Sudah Teratasi
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Info Tiket & Chat Thread */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informasi Tiket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div>
                <p className="font-semibold text-muted-foreground mb-0.5">Status / Stage</p>
                <p className="font-medium text-foreground">{ticket.stage?.name || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground mb-0.5">Tim Penanganan</p>
                <p className="font-medium text-foreground">
                  {ticket.team?.name || <span className="text-amber-600 italic">Belum Ditugaskan (Unassigned)</span>}
                </p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground mb-0.5">Kategori</p>
                <p className="font-medium text-foreground">{ticket.category?.name || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground mb-0.5">Teknisi Penanggung Jawab</p>
                <p className="font-medium text-foreground">
                  {ticket.assigned_user?.name || (
                    <span className="text-amber-600 italic">Belum Ditugaskan</span>
                  )}
                </p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground mb-0.5">Pemohon (Karyawan)</p>
                <p className="font-medium text-foreground">{ticket.customer?.name || ticket.customer_name || "-"}</p>
                {ticket.customer?.email && (
                  <p className="text-[11px] text-muted-foreground">{ticket.customer.email}</p>
                )}
              </div>
              <div className="pt-2 border-t">
                <p className="text-muted-foreground">Dibuat: {formatDate(ticket.create_date)}</p>
                <p className="text-muted-foreground">Diperbarui: {formatDate(ticket.write_date)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Obrolan / Chat Thread */}
          <Card className="flex flex-col h-[520px]">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Obrolan & Riwayat Penanganan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl border p-3 text-xs space-y-1.5 shadow-sm ${
                        message.is_internal
                          ? "bg-amber-50/70 border-amber-200 text-amber-950"
                          : "bg-background border-border/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {message.author?.name || "Sistem"}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDate(message.date || message.create_date || "")}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                        {message.body_plain || message.body?.replace(/<[^>]+>/g, "").trim() || message.body}
                      </p>

                      {/* Attachments inside message */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="pt-1.5 space-y-1">
                          {message.attachments.map((att) => {
                            const isImg = att.mimetype?.startsWith("image/")
                            return (
                              <div
                                key={att.id}
                                className="flex items-center justify-between p-1.5 rounded-lg border bg-muted/40 text-[11px]"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {isImg ? (
                                    <img
                                      src={att.url}
                                      alt={att.filename}
                                      className="h-8 w-8 rounded object-cover border shrink-0"
                                    />
                                  ) : (
                                    <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                  <span className="truncate">{att.filename}</span>
                                </div>
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 hover:bg-muted rounded text-primary shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {message.is_internal && (
                        <div className="pt-1">
                          <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-800 border-amber-300">
                            Catatan Internal IT
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-10 text-xs">Belum ada obrolan</p>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input or Closed Message */}
              {!isClosed ? (
                <form onSubmit={handleSubmit(onSubmit)} className="p-3 border-t bg-muted/20 space-y-2">
                  <Textarea
                    placeholder="Tulis pesan atau tanya progres..."
                    {...register("body")}
                    className={`text-xs min-h-[50px] max-h-[100px] ${errors.body ? "border-destructive" : ""}`}
                    rows={2}
                  />

                  {/* Attached files preview */}
                  {chatAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {chatAttachments.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border text-[11px]"
                        >
                          <span className="truncate max-w-[120px]">{f.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setChatAttachments((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => document.getElementById("chat-file-upload")?.click()}
                        className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Lampiran
                      </Button>
                      <input
                        id="chat-file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setChatAttachments((prev) => [
                              ...prev,
                              ...Array.from(e.target.files!),
                            ])
                          }
                        }}
                      />

                      {isAdmin && (
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            {...register("internal")}
                            className="rounded border-gray-300"
                          />
                          Pesan Internal
                        </label>
                      )}
                    </div>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={sendMessageMutation.isPending}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Send className="h-3 w-3" />
                      Kirim
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-3 border-t bg-muted/40 text-center space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Tiket ini telah berstatus <span className="font-semibold text-emerald-700">Selesai</span>.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Jika ada kendala baru, silakan gunakan tombol <strong>Buat Tiket Baru Terkait</strong>.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow-up Ticket Dialog */}
      {followUpOpen && (
        <CreateTicketDialog
          open={followUpOpen}
          onOpenChange={setFollowUpOpen}
          initialSubject={`[Follow-up HD-${ticket.ticket_number || ticket.id}] ${ticket.subject}`}
          initialDescription={`Melanjutkan kendala dari tiket sebelumnya #${ticket.ticket_number || ticket.id}:\n\n`}
          trigger={null}
        />
      )}
    </div>
  )
}
