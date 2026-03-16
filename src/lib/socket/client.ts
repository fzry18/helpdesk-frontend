/**
 * Socket.io client factory — singleton pattern
 *
 * Membuat satu instance Socket.io yang dapat di-reuse di seluruh aplikasi.
 * Token diambil dari localStorage saat koneksi pertama kali dibuat.
 *
 * PENTING: Socket client HARUS mengikuti browser origin aktif, bukan env.
 * Jika browser load dari https://domain.com, socket harus connect ke https://domain.com
 * Jangan hardcode localhost jika browser sedang access domain lain.
 */
import { io, Socket } from "socket.io-client"

function resolveSocketUrl(): string {
  // Priority 1: Browser origin (PRODUCTION & CROSS-DOMAIN TESTING)
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin
  }

  // Priority 2: Explicit env (untuk edge case SSR/build time)
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL
  }

  // Priority 3: API base URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  if (apiBaseUrl && !apiBaseUrl.startsWith("/")) {
    return apiBaseUrl.replace("/api/helpdesk", "")
  }

  // Fallback: localhost (dev only)
  return "http://localhost:3000"
}

let socketInstance: Socket | null = null

/**
 * Membuat atau mengembalikan Socket.io instance yang sudah ada.
 * - Jika instance sudah ada dan terhubung, kembalikan instance tersebut.
 * - Jika instance sudah ada tapi tidak terhubung, hubungkan ulang.
 * - Jika instance belum ada, buat yang baru.
 */
export function createSocket(token: string): Socket {
  const socketUrl = resolveSocketUrl()

  if (socketInstance) {
    if (!socketInstance.connected) {
      socketInstance.connect()
    }
    return socketInstance
  }

  socketInstance = io(socketUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
  })

  return socketInstance
}

/**
 * Mengembalikan Socket.io instance yang aktif, atau null jika belum ada.
 */
export function getSocket(): Socket | null {
  return socketInstance
}

/**
 * Memutuskan koneksi dan menghapus instance.
 * Dipanggil saat user logout.
 */
export function destroySocket(): void {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}

/** Helper — cek apakah socket aktif dan terhubung */
export function isSocketConnected(): boolean {
  return socketInstance?.connected ?? false
}
