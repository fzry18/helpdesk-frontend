/**
 * WebSocket Manager — Fitur: Realtime
 *
 * Singleton connection manager yang murni memanage lifecycle Socket.io:
 * connect, reconnect, heartbeat, dan room subscription.
 *
 * PENTING:
 * - File ini sengaja TIDAK mengimpor hook React apapun.
 * - File ini sengaja TIDAK mengimpor React Query / store.
 * - Semua callback berbasis event emitter — consumer (hook/provider) yang
 *   bertanggung jawab mengolah data dan mengupdate state.
 *
 * INTEGRASI:
 * - SocketProvider.tsx — inisialisasi manager dan subscribe on/off event koneksi
 * - use-ticket-realtime.ts — subscribe event domain spesifik
 *
 * HUBUNGAN DENGAN lib/socket/client.ts:
 * - ws-manager.ts adalah wrapper dengan interface yang lebih kaya
 *   di atas instance Socket.io yang sudah ada di lib/socket/client.ts.
 * - ws-manager.ts TIDAK membuat socket baru — ia mendelegasikan ke
 *   createSocket/getSocket/destroySocket dari client.ts.
 */
import { createSocket, destroySocket, getSocket } from "@/lib/socket/client"
import type { Socket } from "socket.io-client"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/** Semua event Socket.io yang dapat dipancarkan oleh server */
export type WsServerEvent =
  | "ticket_status_changed"
  | "ticket_assigned"
  | "ticket_priority_changed"
  | "ticket_created"
  | "ticket_closed"
  | "message_new"
  | "notification"
  | "connect"
  | "disconnect"
  | "connect_error"

export type WsConnectionStatus = "connected" | "disconnected" | "connecting" | "error"

/** Handler yang dipanggil saat status koneksi berubah */
export type ConnectionStatusHandler = (status: WsConnectionStatus) => void

/** Handler generik untuk payload event apapun */
export type WsEventHandler<T = unknown> = (payload: T) => void

// ─────────────────────────────────────────────────────────────
// Internal state (module-scoped — tetap ada walau komponen unmount)
// ─────────────────────────────────────────────────────────────

let _socket: Socket | null = null
let _connectionStatus: WsConnectionStatus = "disconnected"
let _heartbeatInterval: ReturnType<typeof setInterval> | null = null

/** Registry listener status koneksi agar provider bisa sync state */
const _statusListeners: Set<ConnectionStatusHandler> = new Set()

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

function _setStatus(status: WsConnectionStatus): void {
  _connectionStatus = status
  _statusListeners.forEach((fn) => fn(status))
}

function _startHeartbeat(): void {
  if (_heartbeatInterval) return
  _heartbeatInterval = setInterval(() => {
    if (_socket?.connected) {
      _socket.emit("ping")
    }
  }, 25_000) // 25 detik — lebih pendek dari timeout server
}

function _stopHeartbeat(): void {
  if (_heartbeatInterval) {
    clearInterval(_heartbeatInterval)
    _heartbeatInterval = null
  }
}

function _attachSocketListeners(socket: Socket): void {
  socket.on("connect", () => {
    _setStatus("connected")
    _startHeartbeat()
  })

  socket.on("disconnect", (reason) => {
    _stopHeartbeat()
    // "io server disconnect" = server sengaja memutus; tidak reconnect otomatis
    if (reason === "io server disconnect") {
      _setStatus("disconnected")
    } else {
      // Socket.io akan reconnect sendiri; kita set status "connecting"
      _setStatus("connecting")
    }
  })

  socket.on("connect_error", () => {
    _setStatus("error")
  })

  // Server mengirim "pong" sebagai jawaban heartbeat
  socket.on("pong", () => {
    /* keep-alive — tidak perlu action */
  })
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Inisialisasi koneksi Socket.io.
 * Aman dipanggil berkali-kali — hanya membuat socket baru jika belum ada.
 *
 * @param token - JWT access token untuk autentikasi
 */
export function wsConnect(token: string): void {
  if (_socket?.connected) return

  _setStatus("connecting")
  _socket = createSocket(token)
  _attachSocketListeners(_socket)
}

/**
 * Putuskan koneksi dan cleanup semua resource.
 * Harus dipanggil saat user logout atau provider unmount.
 */
export function wsDisconnect(): void {
  _stopHeartbeat()
  destroySocket()
  _socket = null
  _setStatus("disconnected")
}

/**
 * Kembalikan instance Socket aktif, atau null jika belum connect.
 * Digunakan oleh hook domain untuk subscribe event.
 */
export function getWsSocket(): Socket | null {
  return getSocket()
}

/** Status koneksi saat ini */
export function getWsStatus(): WsConnectionStatus {
  return _connectionStatus
}

/**
 * Subscribe ke perubahan status koneksi.
 * Kembalikan fungsi unsubscribe yang harus dipanggil saat cleanup.
 */
export function onWsStatusChange(handler: ConnectionStatusHandler): () => void {
  _statusListeners.add(handler)
  // Kirim status saat ini langsung ke listener baru
  handler(_connectionStatus)
  return () => _statusListeners.delete(handler)
}

/**
 * Subscribe sebuah event Socket.io.
 * Kembalikan fungsi unsubscribe untuk dipakai di useEffect cleanup.
 *
 * @example
 * const off = wsOn("ticket_status_changed", (payload) => { … })
 * return () => off()
 */
export function wsOn<T = unknown>(
  event: WsServerEvent | string,
  handler: WsEventHandler<T>
): () => void {
  const socket = getSocket()
  if (!socket) return () => {}

  socket.on(event, handler as (...args: unknown[]) => void)
  return () => socket.off(event, handler as (...args: unknown[]) => void)
}

/**
 * Emit event ke server.
 * Tidak melakukan apapun jika socket belum connect.
 */
export function wsEmit(event: string, payload?: unknown): void {
  const socket = getSocket()
  if (socket?.connected) {
    socket.emit(event, payload)
  }
}

/**
 * Join sebuah room (mis. "ticket:42") agar menerima event yang spesifik.
 */
export function wsJoinRoom(room: string): void {
  wsEmit("join_room", { room })
}

/**
 * Leave sebuah room.
 */
export function wsLeaveRoom(room: string): void {
  wsEmit("leave_room", { room })
}
