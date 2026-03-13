"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import { getWsStatus, onWsStatusChange, wsConnect, wsDisconnect } from "@/features/realtime/ws-manager"

export function useWsConnection(enabled = true) {
  const token = useAuthStore((s) => s.accessToken)
  const [status, setStatus] = useState(getWsStatus())

  useEffect(() => {
    if (!enabled || !token) return
    wsConnect(token)
    const off = onWsStatusChange(setStatus)
    return () => {
      off()
      wsDisconnect()
    }
  }, [enabled, token])

  return {
    status,
    isConnected: status === "connected",
  }
}
