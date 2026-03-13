/**
 * use-ticket-mutations.ts — Feature: Tickets / Hooks
 *
 * Single-responsibility: semua operasi mutasi tiket (create, update, stage, reject, close, confirm).
 * Setelah mutasi berhasil, invalidate query terkait agar UI tetap konsisten.
 *
 * Exposes:
 *  - useCreateTicket
 *  - useUpdateTicket
 *  - useUpdateTicketStage
 *  - useOpenTicket
 *  - useCloseTicket
 *  - useRequestConfirmation
 *  - useConfirmResolved
 *  - useRejectTicket
 *  - useSetPriority
 *  - usePostMessage
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ticketService, type CreateTicketPayload } from "@/features/tickets/services/ticket.service"
import { queryKeys } from "@/lib/query/config"

// ─────────────────────────────────────────────────────────────
// Internal helper — invalidate setelah mutasi
// ─────────────────────────────────────────────────────────────

function useInvalidateTicket() {
  const queryClient = useQueryClient()
  return (ticketId?: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() })
    if (ticketId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.thread(ticketId) })
    }
  }
}

// ─────────────────────────────────────────────────────────────
// useCreateTicket
// ─────────────────────────────────────────────────────────────

export function useCreateTicket(options?: { onSuccess?: (ticketId: number) => void }) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: (payload: CreateTicketPayload) => ticketService.create(payload),
    onSuccess: ({ data }) => {
      invalidate()
      toast.success(`Tiket #${data.ticket_number} berhasil dibuat`)
      options?.onSuccess?.(data.id)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal membuat tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useUpdateTicket
// ─────────────────────────────────────────────────────────────

export function useUpdateTicket(
  ticketId: number,
  options?: { onSuccess?: () => void },
) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: (payload: Parameters<typeof ticketService.update>[1]) =>
      ticketService.update(ticketId, payload),
    onSuccess: () => {
      invalidate(ticketId)
      toast.success("Tiket berhasil diperbarui")
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal memperbarui tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useUpdateTicketStage
// ─────────────────────────────────────────────────────────────

export function useUpdateTicketStage(ticketId: number) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: (stageId: number) => ticketService.updateStage(ticketId, stageId),
    onSuccess: () => {
      invalidate(ticketId)
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mengubah stage tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useOpenTicket — Admin: Open (Draft → In Progress)
// ─────────────────────────────────────────────────────────────

export function useOpenTicket(options?: { onSuccess?: () => void }) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: ({ id, message }: { id: number; message?: string }) =>
      ticketService.openTicket(id, message),
    onSuccess: ({ data }) => {
      invalidate(data.id)
      toast.success("Tiket berhasil dibuka")
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal membuka tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useCloseTicket — Admin: Close langsung tanpa konfirmasi user
// ─────────────────────────────────────────────────────────────

export function useCloseTicket(options?: { onSuccess?: () => void }) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: ({ id, message }: { id: number; message?: string }) =>
      ticketService.closeTicket(id, message),
    onSuccess: ({ data }) => {
      invalidate(data.id)
      toast.success("Tiket berhasil ditutup")
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal menutup tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useRequestConfirmation — Admin: minta konfirmasi user
// ─────────────────────────────────────────────────────────────

export function useRequestConfirmation(options?: { onSuccess?: () => void }) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: ({ id, message }: { id: number; message?: string }) =>
      ticketService.requestConfirmation(id, message),
    onSuccess: ({ data }) => {
      invalidate(data.id)
      toast.success("Permintaan konfirmasi terkirim ke user")
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mengirim permintaan konfirmasi")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useConfirmResolved — User: konfirmasi tiket sudah selesai
// ─────────────────────────────────────────────────────────────

export function useConfirmResolved(options?: { onSuccess?: () => void }) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data?: { satisfaction?: string; feedback?: string }
    }) => ticketService.confirmResolved(id, data),
    onSuccess: ({ data }) => {
      invalidate(data.id)
      toast.success("Terima kasih! Tiket telah dikonfirmasi selesai")
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mengkonfirmasi tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useRejectTicket — Admin: tolak tiket dengan alasan
// ─────────────────────────────────────────────────────────────

export function useRejectTicket(options?: { onSuccess?: () => void }) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      ticketService.rejectTicket(id, reason),
    onSuccess: ({ data }) => {
      invalidate(data.id)
      toast.success("Tiket berhasil ditolak")
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal menolak tiket")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// useSetPriority — Admin: ubah prioritas
// ─────────────────────────────────────────────────────────────

export function useSetPriority(ticketId: number) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: (priority: string) => ticketService.setPriority(ticketId, priority),
    onSuccess: () => {
      invalidate(ticketId)
      toast.success("Prioritas tiket diperbarui")
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mengubah prioritas")
    },
  })
}

// ─────────────────────────────────────────────────────────────
// usePostMessage — Post komentar / internal note
// ─────────────────────────────────────────────────────────────

export function usePostMessage(
  ticketId: number,
  options?: { onSuccess?: () => void },
) {
  const invalidate = useInvalidateTicket()

  return useMutation({
    mutationFn: (data: { body: string; internal?: boolean }) =>
      ticketService.postMessage(ticketId, data),
    onSuccess: () => {
      // Hanya invalidate thread agar list tidak di-refetch
      invalidate(ticketId)
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mengirim pesan")
    },
  })
}
