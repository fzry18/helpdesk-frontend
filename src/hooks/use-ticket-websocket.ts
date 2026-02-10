/**
 * WebSocket + React Query Integration
 * 
 * STRATEGI:
 * - WebSocket event langsung update React Query cache
 * - Tidak refetch jika bisa inject ke cache
 * - Automatic reconnection dengan exponential backoff
 * - Room-based subscription (per ticket)
 */

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/config'
import type { Ticket, Message } from '@/types'

// Types untuk WebSocket events
interface WSEvent {
  type: WSEventType
  ticket_id?: number
  data?: unknown
  timestamp?: string
}

type WSEventType = 
  | 'ticket_status_changed'
  | 'ticket_assigned'
  | 'ticket_priority_changed'
  | 'message_new'
  | 'ticket_created'
  | 'ticket_closed'
  | 'notification'

interface UseTicketWebSocketOptions {
  ticketId?: number
  enabled?: boolean
  onNotification?: (data: unknown) => void
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || ''
const WS_ENABLED = !!WS_URL

/**
 * Hook untuk WebSocket dengan integrasi React Query cache
 * 
 * PENGGUNAAN:
 * 1. Di halaman ticket list: useTicketWebSocket({ enabled: true })
 * 2. Di halaman ticket detail: useTicketWebSocket({ ticketId: 123 })
 * 
 * NOTE: WebSocket disabled jika NEXT_PUBLIC_WS_URL tidak dikonfigurasi
 */
export function useTicketWebSocket(options: UseTicketWebSocketOptions = {}) {
  const { ticketId, enabled = true, onNotification } = options
  const isEnabled = enabled && WS_ENABLED
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)
  const maxReconnectAttempts = 5

  // Handler untuk WebSocket events
  const handleWSEvent = useCallback((event: WSEvent) => {
    const { type, ticket_id, data } = event
    
    switch (type) {
      case 'ticket_status_changed':
      case 'ticket_assigned':
      case 'ticket_priority_changed': {
        if (!ticket_id) return
        
        // Update ticket detail di cache jika ada
        queryClient.setQueryData(
          queryKeys.tickets.detail(ticket_id),
          (oldData: { data: Ticket } | undefined) => {
            if (!oldData) return oldData
            return {
              ...oldData,
              data: { ...oldData.data, ...(data as Partial<Ticket>) }
            }
          }
        )
        
        // Update ticket di list cache (partial update)
        queryClient.setQueriesData(
          { queryKey: queryKeys.tickets.lists() },
          (oldData: { data: Ticket[] } | undefined) => {
            if (!oldData?.data) return oldData
            return {
              ...oldData,
              data: oldData.data.map(ticket => 
                ticket.id === ticket_id 
                  ? { ...ticket, ...(data as Partial<Ticket>) }
                  : ticket
              )
            }
          }
        )
        
        // Mark dashboard stale (tapi jangan refetch)
        if (type === 'ticket_status_changed') {
          queryClient.invalidateQueries({ 
            queryKey: queryKeys.dashboard.stats(),
            refetchType: 'none'
          })
        }
        break
      }
      
      case 'message_new': {
        if (!ticket_id || !data) return
        
        // Inject message ke thread cache
        queryClient.setQueryData(
          queryKeys.tickets.thread(ticket_id),
          (oldData: { data: Message[] } | undefined) => {
            if (!oldData?.data) return oldData
            
            const newMessage = data as Message
            // Cek apakah message sudah ada (avoid duplicate)
            if (oldData.data.some(m => m.id === newMessage.id)) {
              return oldData
            }
            
            return {
              ...oldData,
              data: [...oldData.data, newMessage]
            }
          }
        )
        break
      }
      
      case 'ticket_created': {
        // Invalidate list saja, bukan refetch agresif
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.tickets.lists(),
          refetchType: 'active' // Hanya refetch jika query sedang aktif
        })
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.dashboard.all,
          refetchType: 'active'
        })
        break
      }
      
      case 'ticket_closed': {
        if (!ticket_id) return
        
        // Update cache
        queryClient.setQueryData(
          queryKeys.tickets.detail(ticket_id),
          (oldData: { data: Ticket } | undefined) => {
            if (!oldData) return oldData
            return {
              ...oldData,
              data: { ...oldData.data, ...(data as Partial<Ticket>) }
            }
          }
        )
        
        // Invalidate dashboard stats karena count berubah
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.dashboard.stats(),
          refetchType: 'active'
        })
        break
      }
      
      case 'notification': {
        onNotification?.(data)
        break
      }
    }
  }, [queryClient, onNotification])

  // Connect/reconnect logic
  const connect = useCallback(() => {
    if (!isEnabled) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    try {
      const url = ticketId 
        ? `${WS_URL}?ticket_id=${ticketId}` 
        : WS_URL
        
      const ws = new WebSocket(url)
      
      ws.onopen = () => {
        console.log('[WS] Connected', ticketId ? `to ticket ${ticketId}` : '')
        reconnectAttempts.current = 0
        
        // Subscribe ke ticket jika ada
        if (ticketId) {
          ws.send(JSON.stringify({ 
            action: 'subscribe', 
            ticket_id: ticketId 
          }))
        }
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent
          handleWSEvent(data)
        } catch (err) {
          console.error('[WS] Parse error:', err)
        }
      }
      
      ws.onclose = (event) => {
        // Only log if not a normal closure and not already logged via onerror
        if (event.code !== 1000) {
          console.log('[WS] Disconnected:', event.code, event.reason || 'Connection closed')
        }
        wsRef.current = null
        
        // Reconnect dengan exponential backoff (skip jika connection refused/1006)
        if (isEnabled && reconnectAttempts.current < maxReconnectAttempts && event.code !== 1006) {
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000)
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++
            console.log(`[WS] Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`)
            connect()
          }, delay)
        }
      }
      
      ws.onerror = () => {
        // WebSocket onerror doesn't provide useful info - onclose will handle it
        // Suppress noisy console errors for connection failures
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('[WS] Connection failed:', error)
    }
  }, [isEnabled, ticketId, handleWSEvent])

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect')
      wsRef.current = null
    }
  }, [])

  // Send message
  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // Effect untuk auto connect/disconnect
  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    send,
    disconnect,
  }
}

/**
 * Hook untuk partial cache update (optimistic-like tapi setelah response)
 */
export function usePartialTicketUpdate() {
  const queryClient = useQueryClient()
  
  return useCallback((ticketId: number, updates: Partial<Ticket>) => {
    // Update detail cache
    queryClient.setQueryData(
      queryKeys.tickets.detail(ticketId),
      (oldData: { data: Ticket } | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          data: { ...oldData.data, ...updates }
        }
      }
    )
    
    // Update in list cache
    queryClient.setQueriesData(
      { queryKey: queryKeys.tickets.lists() },
      (oldData: { data: Ticket[] } | undefined) => {
        if (!oldData?.data) return oldData
        return {
          ...oldData,
          data: oldData.data.map(ticket => 
            ticket.id === ticketId 
              ? { ...ticket, ...updates }
              : ticket
          )
        }
      }
    )
  }, [queryClient])
}
