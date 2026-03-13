/**
 * use-ticket-assignments.ts — Feature: Tickets / Hooks
 *
 * Single-responsibility: semua operasi assign tiket (team, member, self).
 *
 * Exposes:
 *  - useAssignTeam       — assign ticket ke helpdesk team
 *  - useAssignEmployee   — assign ke specific employee (by ID)
 *  - useAssignToMe       — assign ke diri sendiri (Admin/Dept Admin)
 *  - usePostActivityLog  — post progress update / activity note
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ticketService } from "@/features/tickets/services/ticket.service"
import { queryKeys } from "@/lib/query/config"

// ─────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────

function useInvalidateTicket(ticketId: number) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() })
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) })
  }
}

// ─────────────────────────────────────────────────────────────
// useAssignTeam
// ─────────────────────────────────────────────────────────────

export function useAssignTeam(
  ticketId: number,
  options?: { onSuccess?: () => void },
) {
  const invalidate = useInvalidateTicket(ticketId)

  return useMutation({
    mutationFn: ({
      teamId,
      employeeId,
      message,
    }: {
      teamId: number
      employeeId?: number
      message?: string
    }) => ticketService.assignTeam(ticketId, teamId, employeeId, message),
    onSuccess: ({ data }) => {
      invalidate()
      const msg = data.assignee
        ? `Tiket di-assign ke ${data.assignee.name} (${data.team.name})`
        : `Tiket di-assign ke tim ${data.team.name}`
      toast.success(msg)
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal meng-assign tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useAssignEmployee — assign ke anggota tim (by employee ID)
// ─────────────────────────────────────────────────────────────

export function useAssignEmployee(
  ticketId: number,
  options?: { onSuccess?: () => void },
) {
  const invalidate = useInvalidateTicket(ticketId)

  return useMutation({
    mutationFn: (employeeId: number) =>
      ticketService.assignByEmployee(ticketId, employeeId),
    onSuccess: ({ data }) => {
      invalidate()
      const name = data.assigned_employee?.name ?? "anggota tim"
      toast.success(`Tiket di-assign ke ${name}`)
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal meng-assign tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useAssignToMe — assign ke diri sendiri
// ─────────────────────────────────────────────────────────────

export function useAssignToMe(
  ticketId: number,
  options?: { onSuccess?: () => void },
) {
  const invalidate = useInvalidateTicket(ticketId)

  return useMutation({
    mutationFn: () => ticketService.assignToMe(ticketId),
    onSuccess: () => {
      invalidate()
      toast.success("Tiket di-assign ke Anda")
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal meng-assign tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// usePostActivityLog — post progress update
// ─────────────────────────────────────────────────────────────

export function usePostActivityLog(
  ticketId: number,
  options?: { onSuccess?: () => void },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      content,
      activityType = "progress",
    }: {
      content: string
      activityType?: "progress" | "note" | "update"
    }) => ticketService.postActivityLog(ticketId, content, activityType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.thread(ticketId) })
      toast.success("Catatan progress berhasil ditambahkan")
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal menambahkan catatan")
    },
  })
}
