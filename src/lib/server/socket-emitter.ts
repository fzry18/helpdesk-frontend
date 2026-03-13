import Redis from "ioredis"
import { Emitter } from "@socket.io/redis-emitter"

import { getIO } from "@/lib/server/socket-io"

let redisClient: Redis | null = null
let redisEmitter: Emitter | null = null

function getRedisEmitter(): Emitter {
  if (!redisEmitter) {
    const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379"
    redisClient = new Redis(redisUrl)
    redisEmitter = new Emitter(redisClient)
  }

  return redisEmitter
}

export async function emitToRoom(
  room: string,
  event: string,
  payload: unknown
): Promise<"io" | "redis" | "none"> {
  const io = getIO()
  if (io) {
    io.to(room).emit(event, payload)
    return "io"
  }

  try {
    getRedisEmitter().to(room).emit(event, payload)
    return "redis"
  } catch {
    return "none"
  }
}
