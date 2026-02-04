"use client"

import { use, useRef, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ticketAPI, messageAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "@/hooks/use-toast"
import { 
  ArrowLeft, Send, CheckCircle, MessageSquare, ClipboardList,
  User, Calendar, Tag, Users, Building
} from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { TicketAdminActions } from "@/components/helpdesk/tickets/TicketAdminActions"

function messageToPlainText(htmlOrEncoded: string): string {
  if (!htmlOrEncoded) return ""
  const textarea = document.createElement("textarea")
  textarea.innerHTML = htmlOrEncoded
  let text = textarea.value
  text = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim()
  return text
}

/** Format body activity log: pisahkan label (Progress Update, dll) dari isi agar tampilan rapi */
function formatActivityBody(rawBody: string): { label: string | null; content: string } {
  const text = messageToPlainText(rawBody || "").trim()
  if (!text) return { label: null, content: "" }
  const progressPrefix = "Progress Update"
  if (text.toLowerCase().startsWith(progressPrefix.toLowerCase())) {
    const rest = text.slice(progressPrefix.length).replace(/^\s*[:.\-]\s*/, "").trim()
    return { label: "Progress Update", content: rest || text }
  }
  if (text.toLowerCase().includes("di-assign ke team")) return { label: null, content: text }
  if (text.toLowerCase().includes("diproses") || text.toLowerCase().includes("dibuka")) return { label: null, content: text }
  return { label: null, content: text }
}

const messageSchema = z.object({
  body: z.string().min(1, "Pesan tidak boleh kosong"),
  internal: z.boolean().default(false),
})

type MessageFormData = z.infer<typeof messageSchema>

interface Message {
  id: number
  body: string
  body_plain?: string
  author?: { id: number; name: string; email?: string } | null
  date?: string
  create_date?: string
  is_internal?: boolean
  message_type?: string
  subtype_xmlid?: string
  /** True = pesan sistem (Stage changed, IT Activity) - jangan tampilkan di Obrolan */
  is_system_status?: boolean
  /** True = activity log manual dari admin - tampilkan di On Progress */
  is_activity_log?: boolean
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const ticketId = parseInt(id)
  const queryClient = useQueryClient()
  const { isAdmin, getHelpdeskRole, employee } = useAuthStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activityEndRef = useRef<HTMLDivElement>(null)

  const { data: ticketData, isLoading: ticketLoading, error: ticketError } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => ticketAPI.get(ticketId),
  })

  const { data: threadData, isLoading: messagesLoading } = useQuery({
    queryKey: ["ticket", ticketId, "thread"],
    queryFn: () => messageAPI.getThread(ticketId),
    enabled: !!ticketId,
  })

  const allMessages = (threadData?.data && Array.isArray(threadData.data) ? threadData.data : []) as Message[]

  // Pisahkan Obrolan dan Activity Log. Flag is_activity_log dari backend = pasti masuk On Progress.
  // Pesan "Stage changed" / IT Activity disembunyikan dari Obrolan dan On Progress.
  const { chatMessages, activityLogs } = useMemo(() => {
    const chat: Message[] = []
    const activity: Message[] = []
    const bodyLower = (t: string) => messageToPlainText(t || "").toLowerCase()

    for (const msg of allMessages) {
      const bodyText = messageToPlainText(msg.body || "")
      const lower = bodyLower(msg.body || "")

      const isSystemStatus =
        msg.is_system_status === true ||
        lower.includes("stage changed") ||
        lower.includes("it activity update")

      if (isSystemStatus) continue

      // Prioritas: flag dari backend (activity log manual admin) -> selalu On Progress
      const isActivityLog =
        msg.is_activity_log === true ||
        msg.subtype_xmlid === "mail.mt_note" ||
        bodyText.includes("Progress Update") ||
        bodyText.includes("📋") ||
        bodyText.includes("🔄") ||
        bodyText.includes("👥") ||
        (msg.is_internal &&
          (bodyText.includes("progress") ||
            bodyText.includes("Catatan") ||
            bodyText.includes("di-assign") ||
            bodyText.includes("diproses")))

      if (isActivityLog) {
        activity.push(msg)
      } else {
        chat.push(msg)
      }
    }

    return { chatMessages: chat, activityLogs: activity }
  }, [allMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages.length])

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activityLogs.length])

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
      toast({ title: "Pesan terkirim" })
      reset()
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId, "thread"] })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal mengirim pesan",
        description: error.response?.data?.error?.message || "Terjadi kesalahan",
        variant: "destructive",
      })
    },
  })

  const confirmResolvedMutation = useMutation({
    mutationFn: (data?: { satisfaction?: string; feedback?: string }) =>
      ticketAPI.confirmResolved(ticketId, data),
    onSuccess: () => {
      toast({ title: "Ticket dikonfirmasi selesai" })
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
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (ticketError) {
    return (
      <div className="space-y-6">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold text-destructive">Error</h3>
            <p className="text-muted-foreground mt-2">
              {(ticketError as any)?.response?.data?.error?.message || "Gagal memuat ticket"}
            </p>
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
          <Button variant="ghost" size="sm">
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
      case "4": return { color: "bg-red-100 text-red-800 border-red-200", label: "Very High" }
      case "3": return { color: "bg-orange-100 text-orange-800 border-orange-200", label: "High" }
      case "2": return { color: "bg-amber-100 text-amber-800 border-amber-200", label: "Medium" }
      case "1": return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Low" }
      default: return { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Normal" }
    }
  }

  const getStageColor = (stageName: string) => {
    const name = stageName?.toLowerCase() || ""
    if (name.includes("draft") || name.includes("sent")) return "bg-gray-100 text-gray-800"
    if (name.includes("progress")) return "bg-blue-100 text-blue-800"
    if (name.includes("awaiting") || name.includes("waiting")) return "bg-amber-100 text-amber-800"
    if (name.includes("closed")) return "bg-green-100 text-green-800"
    return "bg-gray-100 text-gray-800"
  }

  const priorityConfig = getPriorityConfig(String(ticket.priority))
  const isAdminUser = isAdmin()
  const helpdeskRole = getHelpdeskRole()
  const isClosed = ticket.stage?.name?.toLowerCase().includes("closed") || ticket.resolution_confirmed
  const waitingConfirmation = ticket.waiting_user_confirmation && !ticket.resolution_confirmed
  
  const canModifyTicket = (): boolean => {
    if (helpdeskRole === 'super_admin') return true
    if (helpdeskRole === 'dept_admin') {
      const ticketDeptId = ticket.department_id ?? null
      const myDeptId = employee?.department_id ?? null
      if (!ticketDeptId) return true
      if (myDeptId && ticketDeptId === myDeptId) return true
      return false
    }
    return false
  }
  const canModify = canModifyTicket()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStageColor(ticket.stage?.name || "")}>
            {ticket.stage?.name || "Unknown"}
          </Badge>
          <Badge variant="outline" className={priorityConfig.color}>
            {ticket.priority_label || priorityConfig.label}
          </Badge>
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <p className="text-sm text-muted-foreground">#{ticket.ticket_number}</p>
      </div>

      {/* User Confirmation Alert */}
      {!isAdminUser && waitingConfirmation && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-amber-900">Konfirmasi Penyelesaian</p>
                <p className="text-sm text-amber-700">Apakah masalah sudah teratasi?</p>
              </div>
              <Button
                onClick={() => confirmResolvedMutation.mutate({ satisfaction: "5" })}
                disabled={confirmResolvedMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Ya, Selesai
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Deskripsi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description || "—"}</p>
            </CardContent>
          </Card>

          {/* Ticket Info (Compact) */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pemohon</p>
                    <p className="font-medium">{ticket.customer?.name || ticket.customer_name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="font-medium">{ticket.department_name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tim</p>
                    <p className="font-medium">{ticket.team?.name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dibuat</p>
                    <p className="font-medium">{formatDate(ticket.create_date)}</p>
                  </div>
                </div>
              </div>
              {(ticket.assigned_employee?.name || ticket.assigned_user?.name) && (
                <div className="mt-3 pt-3 border-t flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Ditangani oleh: <strong>{ticket.assigned_employee?.name ?? ticket.assigned_user?.name}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Odoo Context (for System tickets) */}
          {ticket.ticket_category_type === "system" && ticket.captured_url && (
            <Card className="bg-blue-50/50 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-900">Info Sistem</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {ticket.captured_url && <p><span className="text-muted-foreground">URL:</span> {ticket.captured_url}</p>}
                {ticket.captured_module && <p><span className="text-muted-foreground">Module:</span> {ticket.captured_module}</p>}
                {ticket.captured_menu_path && <p><span className="text-muted-foreground">Menu:</span> {ticket.captured_menu_path}</p>}
              </CardContent>
            </Card>
          )}

          {/* Activity Log / On Progress */}
          <Card>
            <CardHeader className="pb-3 bg-blue-50/50 rounded-t-lg">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600" />
                On Progress
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Riwayat progress pengerjaan</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[280px] overflow-y-auto">
                {messagesLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : activityLogs.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {activityLogs.map((log) => {
                      const bodyRaw = log.body_plain || log.body || ""
                      const { label, content } = formatActivityBody(bodyRaw)
                      return (
                        <div key={log.id} className="p-4 hover:bg-muted/20 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-medium text-foreground">{log.author?.name || "System"}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{formatDate(log.date || log.create_date || "")}</span>
                          </div>
                          {label && (
                            <Badge variant="secondary" className="mt-1.5 text-xs font-normal bg-blue-100 text-blue-800 border-blue-200">
                              {label}
                            </Badge>
                          )}
                          <p className={`text-sm mt-1.5 ${label ? "text-foreground" : "text-muted-foreground"}`}>
                            {content || messageToPlainText(bodyRaw)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="p-6 text-center text-sm text-muted-foreground">Belum ada aktivitas</p>
                )}
                <div ref={activityEndRef} />
              </div>
            </CardContent>
          </Card>

          {/* Chat / Obrolan */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Obrolan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[300px] overflow-y-auto">
                {messagesLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </div>
                ) : chatMessages.length > 0 ? (
                  <div className="divide-y">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 ${message.is_internal ? "bg-muted/30" : ""}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-medium">{message.author?.name || "System"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(message.date || message.create_date || "")}
                          </p>
                        </div>
                        <p className="text-sm mt-1">{messageToPlainText(message.body_plain || message.body || "")}</p>
                        {message.is_internal && (
                          <Badge variant="secondary" className="mt-1 text-xs">Internal</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-6 text-center text-sm text-muted-foreground">Belum ada pesan</p>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Send Message Form */}
              {!isClosed && (
                <form onSubmit={handleSubmit(onSubmit)} className="p-3 border-t bg-muted/20">
                  <Textarea
                    placeholder="Tulis pesan..."
                    {...register("body")}
                    className={`text-sm bg-background ${errors.body ? "border-destructive" : ""}`}
                    rows={2}
                  />
                  {isAdminUser && (
                    <div className="flex items-center gap-2 mt-2">
                      <input type="checkbox" id="internal" {...register("internal")} className="rounded" />
                      <label htmlFor="internal" className="text-xs text-muted-foreground">Internal</label>
                    </div>
                  )}
                  <Button type="submit" size="sm" className="mt-2" disabled={sendMessageMutation.isPending}>
                    <Send className="mr-2 h-3 w-3" />
                    Kirim
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Admin Actions */}
        <div className="space-y-4">
          {isAdminUser && (
            <TicketAdminActions ticket={ticket} canModify={canModify} />
          )}

          {/* Quick Info for Non-Admin */}
          {!isAdminUser && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className={getStageColor(ticket.stage?.name || "")}>
                    {ticket.stage?.name}
                  </Badge>
                </div>
                {ticket.team && (
                  <div>
                    <p className="text-muted-foreground">Tim</p>
                    <p className="font-medium">{ticket.team.name}</p>
                  </div>
                )}
                {(ticket.assigned_employee?.name || ticket.assigned_user?.name) && (
                  <div>
                    <p className="text-muted-foreground">Ditangani</p>
                    <p className="font-medium">{ticket.assigned_employee?.name ?? ticket.assigned_user?.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Terakhir Update</p>
                  <p>{formatDate(ticket.write_date)}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
