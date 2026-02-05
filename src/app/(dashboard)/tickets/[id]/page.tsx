"use client"

import { use, useRef, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ticketAPI, messageAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, cn } from "@/lib/utils"
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
  let text = messageToPlainText(rawBody || "").trim()
  if (!text) return { label: null, content: "" }
  
  // Clean up broken emoji characters (mojibake) - comprehensive cleanup
  text = text.replace(/ð[^\s]*/g, "")  // Remove mojibake sequences starting with ð
  text = text.replace(/â[^\s]*/g, "")  // Remove mojibake sequences starting with â
  text = text.replace(/Ã[^\s]*/g, "")  // Remove mojibake sequences starting with Ã
  text = text.replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
  text = text.trim()
  
  if (!text) return { label: null, content: "" }
  
  // Pattern untuk mendeteksi dan memisahkan label dari content
  const patterns = [
    { pattern: /progress\s*update/i, label: "Progress Update" },
    { pattern: /ticket\s*sedang\s*diproses/i, label: "Ticket Diproses" },
    { pattern: /ticket\s*di-?assign\s*ke\s*member[:\s]*/i, label: "Member Assignment" },
    { pattern: /ticket\s*di-?assign\s*ke\s*team[:\s]*/i, label: "Team Assignment" },
    { pattern: /ticket\s*selesai/i, label: "Ticket Selesai" },
    { pattern: /menunggu\s*konfirmasi/i, label: "Menunggu Konfirmasi" },
    { pattern: /catatan/i, label: "Catatan" },
  ]
  
  for (const { pattern, label } of patterns) {
    const match = text.match(pattern)
    if (match) {
      const idx = match.index || 0
      const matchLen = match[0].length
      
      // Extract content after the matched pattern
      let content = text.slice(idx + matchLen).replace(/^\s*[:.\-]\s*/, "").trim()
      
      // If match has team name, extract it
      if (label === "Team Assignment") {
        const teamMatch = text.match(/team[:\s]*([A-Za-z0-9\s]+)/i)
        if (teamMatch) {
          content = teamMatch[1].trim()
        }
      }
      
      // If match has member name, extract it
      if (label === "Member Assignment") {
        const memberMatch = text.match(/member[:\s]*([A-Za-z0-9\s]+)/i)
        if (memberMatch) {
          content = memberMatch[1].trim()
        }
      }
      
      // Provide default content based on label if content is empty
      if (!content) {
        switch (label) {
          case "Ticket Diproses":
            content = "Admin telah membuka ticket ini untuk diproses"
            break
          case "Ticket Selesai":
            content = "Ticket telah diselesaikan oleh admin"
            break
          case "Menunggu Konfirmasi":
            content = "Menunggu konfirmasi dari user"
            break
          default:
            content = ""
        }
      }
      
      return { label, content: content.trim() }
    }
  }
  
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
        bodyText.includes("👤") ||
        bodyText.includes("di-assign ke member") ||
        bodyText.includes("di-assign ke team") ||
        bodyText.includes("Ticket sedang diproses") ||
        bodyText.includes("Ticket selesai") ||
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

  // Priority config sesuai dengan Odoo: 0=Very Low, 1=Low, 2=Normal, 3=High, 4=Very High
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "4": return { color: "bg-red-100 text-red-700 border-red-300", label: "Very High" }
      case "3": return { color: "bg-orange-100 text-orange-700 border-orange-300", label: "High" }
      case "2": return { color: "bg-yellow-50 text-yellow-700 border-yellow-300", label: "Normal" }
      case "1": return { color: "bg-green-50 text-green-700 border-green-300", label: "Low" }
      case "0": return { color: "bg-gray-100 text-gray-600 border-gray-300", label: "Very Low" }
      default: return { color: "bg-yellow-50 text-yellow-700 border-yellow-300", label: "Normal" }
    }
  }

  // Helper untuk mendapatkan label sistem
  const getSystemLabel = (systemCategory: string | null | undefined): string => {
    switch (systemCategory) {
      case "odoo": return "Odoo ERP"
      case "p2h": return "Web P2H"
      case "job_portal": return "Job Portal"
      case "other": return "Sistem Lainnya"
      default: return ""
    }
  }

  // Helper untuk warna sistem badge
  const getSystemBadgeStyle = (systemCategory: string | null | undefined): string => {
    switch (systemCategory) {
      case "odoo": return "bg-purple-100 text-purple-700 border-purple-300"
      case "p2h": return "bg-blue-100 text-blue-700 border-blue-300"
      case "job_portal": return "bg-teal-100 text-teal-700 border-teal-300"
      case "other": return "bg-gray-100 text-gray-700 border-gray-300"
      default: return "bg-gray-100 text-gray-600 border-gray-200"
    }
  }

  // Get display stage name - handle null/missing stage for System tickets
  const getDisplayStageName = (ticket: any): string => {
    // Check if stage object exists and has name
    if (ticket.stage && typeof ticket.stage === "object" && ticket.stage.name) {
      return ticket.stage.name
    }
    // Fallback to stage_name
    if (ticket.stage_name) {
      return ticket.stage_name
    }
    // If stage is a string directly
    if (typeof ticket.stage === "string" && ticket.stage) {
      return ticket.stage
    }
    // Final fallback - "Sent" for new tickets (especially system tickets)
    return "Sent"
  }

  const getStageColor = (stageName: string, isRejected?: boolean) => {
    // If rejected, always show red
    if (isRejected) return "bg-red-600 text-white"
    
    const name = stageName?.toLowerCase() || ""
    // Sent/Draft - Blue (prominent)
    if (name.includes("draft") || name.includes("sent")) return "bg-blue-500 text-white"
    // In Progress - Amber
    if (name.includes("progress")) return "bg-amber-500 text-white"
    // Awaiting/Waiting - Orange
    if (name.includes("awaiting") || name.includes("waiting") || name.includes("menunggu")) return "bg-orange-500 text-white"
    // Closed/Done - Green
    if (name.includes("closed") || name.includes("selesai")) return "bg-green-600 text-white"
    // Rejected
    if (name.includes("reject") || name.includes("tolak")) return "bg-red-600 text-white"
    return "bg-gray-500 text-white"
  }

  // Get display stage name considering rejection
  const getDisplayStageNameWithRejection = (): string => {
    if (ticket.is_rejected) return "Ditolak"
    return getDisplayStageName(ticket)
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("text-sm font-semibold px-3 py-1", getStageColor(getDisplayStageNameWithRejection(), ticket.is_rejected))}>
            {getDisplayStageNameWithRejection()}
          </Badge>
          <Badge variant="outline" className={priorityConfig.color}>
            {ticket.priority_label || priorityConfig.label}
          </Badge>
        </div>
      </div>

      {/* Rejection Notice */}
      {ticket.is_rejected && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 text-lg">✕</span>
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Ticket Ditolak</h3>
              {ticket.rejection_reason && (
                <p className="text-sm text-red-700 mt-1">
                  <strong>Alasan:</strong> {ticket.rejection_reason}
                </p>
              )}
              {ticket.rejected_date && (
                <p className="text-xs text-red-600 mt-2">
                  Ditolak pada: {new Date(ticket.rejected_date).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        {/* System Category Badge - tampil di atas judul untuk ticket system */}
        {ticket.ticket_category_type === "system" && ticket.system_category && (
          <Badge 
            variant="outline" 
            className={cn("text-xs font-medium px-2 py-0.5 mb-2", getSystemBadgeStyle(ticket.system_category))}
          >
            {getSystemLabel(ticket.system_category)}
          </Badge>
        )}
        <h1 className="text-xl sm:text-2xl font-bold break-words">{ticket.subject}</h1>
        <p className="text-sm text-muted-foreground">#{ticket.ticket_number}</p>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Pemohon</p>
                    <p className="font-medium truncate">{ticket.customer?.name || ticket.customer_name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="font-medium truncate">
                      {ticket.department_name || ticket.department?.name || ticket.customer_department || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Tim</p>
                    <p className="font-medium truncate">{ticket.team?.name || ticket.team_name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Dibuat</p>
                    <p className="font-medium truncate">{formatDate(ticket.create_date)}</p>
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
            <Card className="bg-blue-50/50 border-blue-100 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-900">Info Sistem</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                {ticket.captured_url && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1">
                    <span className="text-muted-foreground shrink-0">URL:</span>
                    <a 
                      href={ticket.captured_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {ticket.captured_url}
                    </a>
                  </div>
                )}
                {ticket.captured_module && (
                  <p className="break-words">
                    <span className="text-muted-foreground">Module:</span> {ticket.captured_module}
                  </p>
                )}
                {ticket.captured_menu_path && (
                  <p className="break-words">
                    <span className="text-muted-foreground">Menu:</span> {ticket.captured_menu_path}
                  </p>
                )}
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
                      
                      // Determine icon based on label
                      const getIcon = (lbl: string | null) => {
                        if (!lbl) return "📌"
                        if (lbl.includes("Progress")) return "📋"
                        if (lbl.includes("Diproses")) return "🔄"
                        if (lbl.includes("Member")) return "👤"
                        if (lbl.includes("Team")) return "👥"
                        if (lbl.includes("Selesai")) return "✅"
                        if (lbl.includes("Catatan")) return "📝"
                        return "📌"
                      }
                      
                      return (
                        <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-medium text-foreground">{log.author?.name || "System"}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{formatDate(log.date || log.create_date || "")}</span>
                          </div>
                          <div className="flex items-start gap-2 mt-2">
                            <span className="text-base shrink-0">{getIcon(label)}</span>
                            <div className="flex-1 min-w-0">
                              {label && (
                                <Badge variant="secondary" className="mb-1 text-xs font-medium bg-blue-100 text-blue-800 border-blue-200">
                                  {label}
                                </Badge>
                              )}
                              {(content || !label) && (
                                <p className={`text-sm ${label ? "text-foreground" : "text-muted-foreground"} break-words`}>
                                  {content || messageToPlainText(bodyRaw) || "—"}
                                </p>
                              )}
                              {/* Show assigned member for Team Assignment */}
                              {label === "Team Assignment" && (ticket.assigned_employee?.name || ticket.assigned_user?.name) && (
                                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                  <span>👤</span> Ditangani: <strong>{ticket.assigned_employee?.name || ticket.assigned_user?.name}</strong>
                                </p>
                              )}
                            </div>
                          </div>
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
        <div className="space-y-4 order-1 lg:order-2">
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
