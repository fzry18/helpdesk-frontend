/**
 * TicketActions.tsx — Feature: Tickets / Components
 *
 * Render tombol aksi yang relevan berdasarkan role + status tiket.
 * Komponen ini adalah "control panel" dari satu tiket:
 *
 *  Super Admin / Dept Admin:
 *    - Open (New → In Progress)
 *    - Request Confirmation
 *    - Close
 *    - Reject
 *    - Assign To Me
 *
 *  User (creator):
 *    - Confirm Resolved
 *
 * Semua state loading / error ditangani di hook masing-masing.
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  useOpenTicket,
  useCloseTicket,
  useRequestConfirmation,
  useConfirmResolved,
  useRejectTicket,
} from "@/features/tickets/hooks/use-ticket-mutations"
import { useAssignToMe } from "@/features/tickets/hooks/use-ticket-assignments"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import type { Ticket } from "@/types"

interface TicketActionsProps {
  ticket: Ticket
  onActionSuccess?: () => void
  layout?: "horizontal" | "vertical"
}

export function TicketActions({
  ticket,
  onActionSuccess,
  layout = "horizontal",
}: TicketActionsProps) {
  const role = useAuthStore((s) => s.getHelpdeskRole())
  const employee = useAuthStore((s) => s.employee)

  // ── Mutations ───────────────────────────────────────────────
  const openTicket = useOpenTicket({ onSuccess: onActionSuccess })
  const closeTicket = useCloseTicket({ onSuccess: onActionSuccess })
  const requestConfirm = useRequestConfirmation({ onSuccess: onActionSuccess })
  const confirmResolved = useConfirmResolved({ onSuccess: onActionSuccess })
  const rejectTicket = useRejectTicket({ onSuccess: onActionSuccess })
  const assignToMe = useAssignToMe(ticket.id, { onSuccess: onActionSuccess })

  // ── Local reject dialog state ────────────────────────────
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const stageName = ticket.stage?.name?.toLowerCase() ?? ticket.stage_name?.toLowerCase() ?? ""
  const isNew = stageName === "new" || stageName === "draft"
  const isInProgress = stageName === "in progress" || stageName === "open"
  const isDone = stageName === "done" || stageName === "resolved"
  const isClosed = stageName === "cancelled" || stageName === "closed"

  const isAdmin = role === "super_admin" || role === "dept_admin"
  const isUser = role === "user"

  const isCreator = employee?.id === ticket.created_by?.id

  const layoutClass = layout === "vertical" ? "flex-col" : "flex-wrap"

  if (isClosed || isDone) {
    return null
  }

  return (
    <div className={`flex items-start gap-2 ${layoutClass}`}>
      {/* ── Admin actions ── */}
      {isAdmin && (
        <>
          {/* Open ticket (Draft/New → In Progress) */}
          {isNew && (
            <Button
              size="sm"
              onClick={() => openTicket.mutate({ id: ticket.id })}
              disabled={openTicket.isPending}
            >
              {openTicket.isPending ? "Membuka…" : "Buka Tiket"}
            </Button>
          )}

          {/* Request user confirmation */}
          {isInProgress && !ticket.waiting_user_confirmation && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => requestConfirm.mutate({ id: ticket.id })}
              disabled={requestConfirm.isPending}
            >
              {requestConfirm.isPending ? "Mengirim…" : "Minta Konfirmasi"}
            </Button>
          )}

          {/* Close directly */}
          {(isInProgress || isNew) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => closeTicket.mutate({ id: ticket.id })}
              disabled={closeTicket.isPending}
            >
              {closeTicket.isPending ? "Menutup…" : "Tutup Tiket"}
            </Button>
          )}

          {/* Assign to me */}
          {!ticket.assigned_user_id && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => assignToMe.mutate()}
              disabled={assignToMe.isPending}
            >
              {assignToMe.isPending ? "Mengambil…" : "Ambil Tiket"}
            </Button>
          )}

          {/* Reject */}
          {!ticket.is_rejected && (
            <>
              {showRejectInput ? (
                <div className="flex w-full flex-col gap-1.5">
                  <textarea
                    className="w-full rounded border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                    placeholder="Alasan penolakan…"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!rejectReason.trim() || rejectTicket.isPending}
                      onClick={() =>
                        rejectTicket.mutate(
                          { id: ticket.id, reason: rejectReason },
                          {
                            onSuccess: () => {
                              setShowRejectInput(false)
                              setRejectReason("")
                            },
                          },
                        )
                      }
                    >
                      {rejectTicket.isPending ? "Menolak…" : "Konfirmasi Tolak"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowRejectInput(false)
                        setRejectReason("")
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowRejectInput(true)}
                >
                  Tolak Tiket
                </Button>
              )}
            </>
          )}
        </>
      )}

      {/* ── User actions ── */}
      {isUser && isCreator && ticket.waiting_user_confirmation && (
        <Button
          size="sm"
          onClick={() => confirmResolved.mutate({ id: ticket.id })}
          disabled={confirmResolved.isPending}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {confirmResolved.isPending ? "Mengkonfirmasi…" : "✅ Konfirmasi Selesai"}
        </Button>
      )}
    </div>
  )
}
