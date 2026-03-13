"use client"

/**
 * SocketProvider — Fitur: Realtime
 *
 * Client Component yang:
 * 1. Membaca token dari auth store
 * 2. Menginisialisasi ws-manager saat user authenticated
 * 3. Menyediakan `isConnected` + `connectionStatus` via React Context
 * 4. Memutuskan koneksi saat user logout
 *
 * CARA PASANG:
 * Di `src/app/providers.tsx` (atau layout root), tambahkan:
 *
 * ```tsx
 * import { SocketProvider } from "@/features/realtime/providers/SocketProvider"
 *
 * export function Providers({ children }: { children: React.ReactNode }) {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <SocketProvider>
 *         {children}
 *       </SocketProvider>
 *     </QueryClientProvider>
 *   )
 * }
 * ```
 *
 * SocketProvider harus berada DI DALAM QueryClientProvider.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import {
  wsConnect,
  wsDisconnect,
  onWsStatusChange,
  type WsConnectionStatus,
} from "@/features/realtime/ws-manager"
import { useAuthStore, selectIsAuthenticated, selectAccessToken } from "@/features/auth/stores/auth.store"

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

interface SocketContextValue {
  /** True jika socket sedang terhubung ke server */
  isConnected: boolean
  /** Status detail koneksi */
  connectionStatus: WsConnectionStatus
}

const SocketContext = createContext<SocketContextValue>({
  isConnected: false,
  connectionStatus: "disconnected",
})

// ─────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const accessToken = useAuthStore(selectAccessToken)
  const [connectionStatus, setConnectionStatus] = useState<WsConnectionStatus>("disconnected")

  const handleStatusChange = useCallback((status: WsConnectionStatus) => {
    setConnectionStatus(status)
  }, [])

  useEffect(() => {
    // Subscribe ke perubahan status koneksi dari ws-manager
    const unsubscribe = onWsStatusChange(handleStatusChange)
    return unsubscribe
  }, [handleStatusChange])

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // User belum login atau sudah logout — putuskan koneksi
      wsDisconnect()
      return
    }

    // User authenticated → inisialisasi koneksi
    wsConnect(accessToken)

    // Cleanup: putuskan saat component unmount (layout change, dll.)
    return () => {
      wsDisconnect()
    }
  }, [isAuthenticated, accessToken])

  const value: SocketContextValue = {
    isConnected: connectionStatus === "connected",
    connectionStatus,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────
// Consumer Hook
// ─────────────────────────────────────────────────────────────

/**
 * Hook untuk membaca status koneksi WebSocket dari dalam komponen manapun.
 *
 * @example
 * const { isConnected, connectionStatus } = useSocketContext()
 *
 * @throws Jika digunakan di luar SocketProvider
 */
export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext)
  return ctx
}
