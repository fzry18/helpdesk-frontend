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
import Redis from "ioredis"
import { createAdapter } from "@socket.io/redis-adapter"

let _io: SocketIOServer | null = null

async function waitUntilRedisReady(client: Redis): Promise<void> {
  if (client.status === "ready") {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      client.off("error", onError)
      resolve()
    }

    const onError = (error: Error) => {
      client.off("ready", onReady)
      reject(error)
    }

    client.once("ready", onReady)
    client.once("error", onError)
  })
}

/**
 * Inisialisasi IO singleton dan pasang Redis adapter jika REDIS_URL ada.
 * Harus dipanggil tepat sekali before server mulai menerima request.
 */
export async function initIO(io: SocketIOServer): Promise<void> {
  _io = io

  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379"
  let pubClient: Redis | null = null
  let subClient: Redis | null = null

  try {
    // Dua koneksi terpisah diperlukan oleh Socket.IO redis adapter
    pubClient = new Redis(redisUrl)
    subClient = pubClient.duplicate()

    await Promise.all([waitUntilRedisReady(pubClient), waitUntilRedisReady(subClient)])
    io.adapter(createAdapter(pubClient, subClient))
    console.info(`  Socket.IO Redis adapter aktif: ${redisUrl}`)
  } catch (err) {
    console.warn("  Socket.IO Redis adapter gagal, menggunakan in-memory adapter:", err)
    if (pubClient) {
      pubClient.disconnect()
    }
    if (subClient) {
      subClient.disconnect()
    }
  }
}

/**
 * Kembalikan instance Socket.IO yang sudah diinisialisasi.
 * Mengembalikan null jika dipanggil sebelum initIO (mis. di build time).
 */
export function getIO(): SocketIOServer | null {
  return _io
}
