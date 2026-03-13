/**
 * Socket.io client factory — singleton pattern
 *
 * Membuat satu instance Socket.io yang dapat di-reuse di seluruh aplikasi.
 * Token diambil dari localStorage saat koneksi pertama kali dibuat.
 */
import { io, Socket } from "socket.io-client"

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api/helpdesk", "") ||
  "http://localhost:8069"

let socketInstance: Socket | null = null

/**
 * Membuat atau mengembalikan Socket.io instance yang sudah ada.
 * - Jika instance sudah ada dan terhubung, kembalikan instance tersebut.
 * - Jika instance sudah ada tapi tidak terhubung, hubungkan ulang.
 * - Jika instance belum ada, buat yang baru.
 */
export function createSocket(token: string): Socket {
  if (socketInstance) {
    if (!socketInstance.connected) {
      socketInstance.connect()
    }
    return socketInstance
  }

  socketInstance = io(SOCKET_URL, {
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
