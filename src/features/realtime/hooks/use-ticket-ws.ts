"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/config"
import type { Message, Ticket } from "@/types"
import { wsOn } from "@/features/realtime/ws-manager"

export function useTicketWs(ticketId?: number) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const offStatus = wsOn<{ ticket_id: number; data: Partial<Ticket> }>("ticket_status_changed", (payload) => {
      queryClient.setQueryData(queryKeys.tickets.detail(payload.ticket_id), (oldData: { data: Ticket } | undefined) => {
        if (!oldData) return oldData
        return { ...oldData, data: { ...oldData.data, ...payload.data } }
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists(), refetchType: "none" })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(), refetchType: "none" })
    })

    const offMsg = wsOn<{ ticket_id: number; data: Message }>("message_new", (payload) => {
      queryClient.setQueryData(queryKeys.tickets.thread(payload.ticket_id), (oldData: { data: Message[] } | undefined) => {
        if (!oldData?.data) return oldData
        if (oldData.data.some((m) => m.id === payload.data.id)) return oldData
        return { ...oldData, data: [...oldData.data, payload.data] }
      })
    })

    const offCreated = wsOn("ticket_created", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists(), refetchType: "active" })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all, refetchType: "active" })
    })

    return () => {
      offStatus()
      offMsg()
      offCreated()
    }
  }, [queryClient, ticketId])
}
