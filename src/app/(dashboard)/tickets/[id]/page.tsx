"use client"

import { use, useRef, useMemo } from "react"
import type { MessageFormRef } from "@/components/helpdesk/tickets/detail/MessageForm"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ticketAPI, messageAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import { queryKeys } from "@/lib/query/config"
import { useTicketRealtime } from "@/features/realtime/hooks/use-ticket-realtime"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { TicketAdminActions } from "@/components/helpdesk/tickets/TicketAdminActions"
import { AttachmentList } from "@/components/helpdesk/tickets/AttachmentList"
import { TicketHeader } from "@/components/helpdesk/tickets/detail/TicketHeader"
import { TicketMetadata, TicketMetadataSidebar } from "@/components/helpdesk/tickets/detail/TicketMetadata"
import { TicketDescription, TicketOdooContext } from "@/components/helpdesk/tickets/detail/TicketDescription"
import { MessageThread } from "@/components/helpdesk/tickets/detail/MessageThread"
import { ActivityLogCard } from "@/components/helpdesk/tickets/detail/ActivityLogCard"
import { ConfirmationBanner } from "@/components/helpdesk/tickets/detail/ConfirmationBanner"
import { messageToPlainText } from "@/lib/utils/ticket-helpers"
import { getErrorMessage } from "@/lib/constants/error-messages"
import type { MessageFormData } from "@/components/helpdesk/tickets/detail/MessageForm"
import type { MessageItemData } from "@/components/helpdesk/tickets/detail/MessageItem"

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const ticketId = parseInt(id)
  const queryClient = useQueryClient()
  const { isAdmin, getHelpdeskRole, employee } = useAuthStore()
  const messageFormRef = useRef<MessageFormRef>(null)

  // Fix Bug #1: Gunakan queryKeys.* yang sama dengan yang dipakai ws-manager
  // untuk memastikan setQueryData dari socket mengenai cache yang sama.
  const { data: ticketData, isLoading: ticketLoading, error: ticketError } = useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: () => ticketAPI.get(ticketId),
  })

  const { data: threadData, isLoading: messagesLoading } = useQuery({
    queryKey: queryKeys.tickets.thread(ticketId),
    queryFn: () => messageAPI.getThread(ticketId),
    enabled: !!ticketId,
  })

  // Fix Bug #2: Daftarkan socket listeners untuk tiket ini.
  // Hook ini join room "ticket:{ticketId}" dan subscribe event message_new,
  // sehingga pesan baru langsung mengupdate cache thread di atas.
  useTicketRealtime({ ticketId })

  const allMessages = (threadData?.data && Array.isArray(threadData.data)
    ? threadData.data
    : []) as MessageItemData[]

  const { chatMessages, activityLogs } = useMemo(() => {
    const chat: MessageItemData[] = []
    const activity: MessageItemData[] = []
    const bodyLower = (t: string) => messageToPlainText(t || "").toLowerCase()

    for (const msg of allMessages) {
      const bodyText = messageToPlainText(msg.body || "")
      const lower = bodyLower(msg.body || "")
      const isSystemStatus =
        msg.is_system_status === true ||
        lower.includes("stage changed") ||
        lower.includes("it activity update")
      if (isSystemStatus) continue

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

      if (isActivityLog) activity.push(msg)
      else chat.push(msg)
    }
    return { chatMessages: chat, activityLogs: activity }
  }, [allMessages])

  const sendMessageMutation = useMutation({
    mutationFn: (data: MessageFormData) =>
      messageAPI.postMessage(ticketId, { body: data.body, internal: data.internal }),
    onSuccess: () => {
      toast({ title: "Pesan terkirim" })
      messageFormRef.current?.reset()
      // Fix: pakai queryKeys agar konsisten dengan kunci fetch + socket
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.thread(ticketId) })
    },
    onError: (error: unknown) => {
      toast({
        title: "Gagal mengirim pesan",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    },
  })

  const confirmResolvedMutation = useMutation({
    mutationFn: (data?: { satisfaction?: string; feedback?: string }) =>
      ticketAPI.confirmResolved(ticketId, data),
    onSuccess: () => {
      toast({ title: "Ticket dikonfirmasi selesai" })
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) })
    },
    onError: (error: unknown) => {
      toast({
        title: "Gagal",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    },
  })

  const onSubmitMessage = (data: MessageFormData) => {
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
              {getErrorMessage(ticketError)}
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

  const isAdminUser = isAdmin()
  const helpdeskRole = getHelpdeskRole()
  const isTicketOwner = Boolean(employee?.id && ticket.assigned_employee?.id && employee.id === ticket.assigned_employee.id)
  const isClosed =
    Boolean(ticket.stage?.name?.toLowerCase().includes("closed")) ||
    Boolean(ticket.resolution_confirmed)
  const waitingConfirmation =
    Boolean(ticket.waiting_user_confirmation) && !ticket.resolution_confirmed

  const canModifyTicket = (): boolean => {
    if (helpdeskRole === "super_admin") return true
    if (helpdeskRole === "dept_admin") {
      const ticketDeptId = ticket.department_id ?? null
      const myDeptId = employee?.department_id ?? null
      if (!ticketDeptId || !myDeptId) return false // strict: tanpa dept = tidak boleh
      return ticketDeptId === myDeptId
    }
    return false
  }
  const canModify = canModifyTicket()

  return (
    <div className="space-y-4">
      <TicketHeader ticket={ticket} />

      {waitingConfirmation && !isAdminUser && (
        <ConfirmationBanner
          onConfirmResolved={(data) => confirmResolvedMutation.mutate(data)}
          isPending={confirmResolvedMutation.isPending}
        />
      )}

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <TicketDescription ticket={ticket} />
          <TicketMetadata ticket={ticket} isAdminUser={isAdminUser} />
          <TicketOdooContext ticket={ticket} />
          <AttachmentList
            ticketId={ticketId}
            ticket={ticket}
            showUpload={!isClosed && isAdminUser}
          />
          <ActivityLogCard
            activityLogs={activityLogs}
            messagesLoading={messagesLoading}
            ticket={ticket}
          />
        </div>

        <div className="space-y-4 order-1 lg:order-2">
          {(isAdminUser || isTicketOwner) && (
            <TicketAdminActions ticket={ticket} canModify={canModify} isTicketOwner={isTicketOwner} />
          )}
          {!isAdminUser && <TicketMetadataSidebar ticket={ticket} />}
          <MessageThread
            messages={chatMessages}
            messagesLoading={messagesLoading}
            isClosed={isClosed}
            isAdminUser={isAdminUser}
            onSendMessage={onSubmitMessage}
            sendMessagePending={sendMessageMutation.isPending}
            messageFormRef={messageFormRef}
          />
        </div>
      </div>
    </div>
  )
}
