/**
 * Server-side Socket.IO singleton
 *
 * - `initIO(io)` — dipanggil sekali dari server.ts saat startup
 * - `getIO()`    — dipanggil dari API routes untuk emit event
 *
 * Redis adapter (opsional):
 *   Jika REDIS_URL diset, semua instance server (multi-worker) akan
 *   menerima broadcast yang sama via Redis pub/sub.
 *   Jika tidak diset, adapter in-memory default dipakai (single-process).
 */
import type { Server as SocketIOServer } from "socket.io"

let _io: SocketIOServer | null = null

/**
 * Inisialisasi IO singleton dan pasang Redis adapter jika REDIS_URL ada.
 * Harus dipanggil tepat sekali before server mulai menerima request.
 */
export async function initIO(io: SocketIOServer): Promise<void> {
  _io = io

  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    try {
      // Dynamic import agar tidak error di lingkungan yang tidak punya ioredis
      const { createClient } = await import("ioredis").then((m) => ({ createClient: m.default }))
      const { createAdapter } = await import("@socket.io/redis-adapter")

      // Dua koneksi terpisah diperlukan oleh Socket.IO redis adapter
      const pubClient = new createClient(redisUrl)
      const subClient = pubClient.duplicate()

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.once("ready", resolve)
          pubClient.once("error", reject)
        }),
        new Promise<void>((resolve, reject) => {
          subClient.once("ready", resolve)
          subClient.once("error", reject)
        }),
      ])

      io.adapter(createAdapter(pubClient, subClient))
      console.info(`  Socket.IO Redis adapter aktif: ${redisUrl}`)
    } catch (err) {
      console.warn("  Socket.IO Redis adapter gagal, menggunakan in-memory adapter:", err)
    }
  } else {
    console.info("  REDIS_URL tidak diset — Socket.IO menggunakan in-memory adapter")
  }
}

/**
 * Kembalikan instance Socket.IO yang sudah diinisialisasi.
 * Mengembalikan null jika dipanggil sebelum initIO (mis. di build time).
 */
export function getIO(): SocketIOServer | null {
  return _io
}
