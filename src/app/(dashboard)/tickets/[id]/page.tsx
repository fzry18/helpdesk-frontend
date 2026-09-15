"use client"

import { use, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ticketAPI, messageAPI } from "@/lib/api/endpoints"
import { apiClient } from "@/lib/api/client"
import { useAuthStore } from "@/store/authStore"
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
} from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

const messageSchema = z.object({
  body: z.string().min(1, "Pesan tidak boleh kosong"),
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
  const { isManager, hasRole } = useAuthStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const sendMessageMutation = useMutation({
    mutationFn: (data: MessageFormData) =>
      messageAPI.postMessage(ticketId, { body: data.body, internal: data.internal }),
    onSuccess: () => {
      toast({ title: "Pesan terkirim", description: "Pesan Anda telah berhasil dikirim" })
      reset()
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId, "thread"] })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal mengirim pesan",
        description: error.response?.data?.error?.message || "Terjadi kesalahan",
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
        description: error.response?.data?.error?.message || "Terjadi kesalahan",
        variant: "destructive",
      })
    },
  })

  const confirmResolvedMutation = useMutation({
    mutationFn: (data?: { satisfaction?: string; feedback?: string }) =>
      ticketAPI.confirmResolved(ticketId, data),
    onSuccess: () => {
      toast({ title: "Terima kasih! Ticket dikonfirmasi selesai." })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.error?.message || "Terjadi kesalahan",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (data: MessageFormData) => {
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
                {(ticketError as any)?.response?.data?.error?.message ||
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
        return { color: "bg-red-100 text-red-800 border-red-200", label: "Very High" }
      case "3":
        return { color: "bg-orange-100 text-orange-800 border-orange-200", label: "High" }
      case "2":
        return { color: "bg-amber-100 text-amber-800 border-amber-200", label: "Medium" }
      case "1":
        return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Low" }
      default:
        return { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Normal" }
    }
  }

  const priorityConfig = getPriorityConfig(String(ticket.priority))
  const isAdmin =
    isManager() ||
    hasRole("SUPER_ADMIN") ||
    hasRole("ADMIN_IT_SUPPORT") ||
    hasRole("IT_SUPPORT")
  const isClosed = ticket.stage?.name?.toLowerCase().includes("closed") || ticket.resolution_confirmed
  const waitingConfirmation = ticket.waiting_user_confirmation && !ticket.resolution_confirmed

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Tiket
          </Button>
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
              <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Tiket #{ticket.id} · Dibuat oleh {ticket.customer?.name || ticket.customer_name || "User"} pada {formatDate(ticket.create_date)}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {ticket.stage?.name && (
                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                  {ticket.stage.name}
                </Badge>
              )}
              {ticket.ticket_category_type && (
                <Badge variant="secondary" className="capitalize">
                  {ticket.ticket_category_type}
                  {ticket.system_category && ` · ${ticket.system_category}`}
                </Badge>
              )}
              {waitingConfirmation && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                  Menunggu konfirmasi Anda
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deskripsi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

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
                  <Select
                    value={ticket.stage?.id ? String(ticket.stage.id) : undefined}
                    onValueChange={(val) => updateStageMutation.mutate(parseInt(val))}
                    disabled={updateStageMutation.isPending}
                  >
                    <SelectTrigger className="w-full h-9">
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
                </div>

                {/* 2. Tugaskan Teknisi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    Tugaskan ke Teknisi IT Support
                  </label>
                  <div className="flex gap-2">
                    <Select
                      value={ticket.assigned_user?.id ? String(ticket.assigned_user.id) : undefined}
                      onValueChange={(val) => assignUserMutation.mutate(parseInt(val))}
                      disabled={assignUserMutation.isPending}
                    >
                      <SelectTrigger className="flex-1 h-9">
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

                {/* 3. Minta Konfirmasi User */}
                <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Perbaikan sudah selesai? Minta konfirmasi penyelesaian dari user:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestConfirmationMutation.mutate()}
                    disabled={requestConfirmationMutation.isPending}
                    className="h-8 text-xs gap-1.5"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    Minta Konfirmasi User
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User: Confirm Resolved (when waiting_confirmation) */}
          {!isAdmin && waitingConfirmation && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="text-base">Konfirmasi Selesai</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Tim telah menyelesaikan ticket ini. Apakah masalah sudah teratasi?
                </p>
                <Button
                  onClick={() => confirmResolvedMutation.mutate({ satisfaction: "5" })}
                  disabled={confirmResolvedMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Ya, Sudah Teratasi
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Info + Chat Log */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-sm">{ticket.stage?.name || ticket.stage_name || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team</p>
                <p className="text-sm">{ticket.team?.name || ticket.team_name || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-sm">{ticket.category?.name || ticket.category_name || "-"}</p>
              </div>
              {(ticket.customer?.name || ticket.customer_name || ticket.email || ticket.phone) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  {(ticket.customer?.name || ticket.customer_name) && (
                    <p className="text-sm">{ticket.customer?.name || ticket.customer_name}</p>
                  )}
                  {(ticket.customer?.email || ticket.email) && (
                    <p className="text-xs text-muted-foreground">{ticket.customer?.email || ticket.email}</p>
                  )}
                  {(ticket.customer?.phone || ticket.phone) && (
                    <p className="text-xs text-muted-foreground">{ticket.customer?.phone || ticket.phone}</p>
                  )}
                </div>
              )}
              {(ticket.assigned_user?.name || ticket.assigned_user_name) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                  <p className="text-sm">{ticket.assigned_user?.name || ticket.assigned_user_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(ticket.create_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Updated</p>
                <p className="text-sm">{formatDate(ticket.write_date)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Chat Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Obrolan / Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg border p-3 ${
                        message.is_internal ? "bg-muted/50 border-muted" : "bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm">{message.author?.name || "Sistem"}</p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(message.date || message.create_date || "")}
                        </p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {message.body_plain || message.body?.replace(/<[^>]+>/g, "").trim() || message.body}
                      </p>
                      {message.is_internal && (
                        <Badge variant="secondary" className="mt-2 text-xs">Internal</Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-6 text-sm">Belum ada pesan</p>
                )}
                <div ref={messagesEndRef} />
              </div>
              {!isClosed && (
                <form onSubmit={handleSubmit(onSubmit)} className="p-4 border-t space-y-2">
                  <Textarea
                    placeholder="Tulis pesan atau tanya progress..."
                    {...register("body")}
                    className={errors.body ? "border-destructive" : ""}
                    rows={2}
                  />
                  {errors.body && (
                    <p className="text-xs text-destructive">{errors.body.message}</p>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="internal"
                        {...register("internal")}
                        className="rounded"
                      />
                      <label htmlFor="internal" className="text-xs">Pesan internal</label>
                    </div>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={sendMessageMutation.isPending}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Kirim
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
