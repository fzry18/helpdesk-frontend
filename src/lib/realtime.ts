import { EventEmitter } from "events"
import Redis from "ioredis"

/**
 * Realtime event bus for ticket chat messages.
 * Uses Redis Pub/Sub when REDIS_URL is configured.
 * Falls back to in-memory EventEmitter with warning when Redis is unavailable.
 */

type MessageHandler = (data: string) => void

interface RealtimeBus {
  publish(channel: string, data: string): void
  subscribe(channel: string, handler: MessageHandler): () => void
}

// ============================================
// In-Memory Fallback (EventEmitter)
// ============================================

class InMemoryBus implements RealtimeBus {
  private emitter = new EventEmitter()

  constructor() {
    this.emitter.setMaxListeners(100)
  }

  publish(channel: string, data: string): void {
    this.emitter.emit(channel, data)
  }

  subscribe(channel: string, handler: MessageHandler): () => void {
    this.emitter.on(channel, handler)
    return () => {
      this.emitter.off(channel, handler)
    }
  }
}

// ============================================
// Redis Pub/Sub
// ============================================

class RedisBus implements RealtimeBus {
  private pub: Redis
  private subscribers = new Map<
    string,
    { sub: Redis; handlers: Set<MessageHandler> }
  >()

  constructor(redisUrl: string) {
    this.pub = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

    this.pub.connect().catch((err) => {
      console.error("[RedisBus] Publisher connection failed:", err.message)
    })
  }

  publish(channel: string, data: string): void {
    this.pub.publish(channel, data).catch((err) => {
      console.error("[RedisBus] Publish failed:", err.message)
    })
  }

  subscribe(channel: string, handler: MessageHandler): () => void {
    let entry = this.subscribers.get(channel)

    if (!entry) {
      const sub = this.pub.duplicate()
      const handlers = new Set<MessageHandler>()

      sub.subscribe(channel).catch((err) => {
        console.error(`[RedisBus] Subscribe to ${channel} failed:`, err.message)
      })

      sub.on("message", (_ch: string, message: string) => {
        for (const h of handlers) {
          h(message)
        }
      })

      entry = { sub, handlers }
      this.subscribers.set(channel, entry)
    }

    entry.handlers.add(handler)

    return () => {
      const e = this.subscribers.get(channel)
      if (e) {
        e.handlers.delete(handler)
        if (e.handlers.size === 0) {
          e.sub.unsubscribe(channel).catch(() => {})
          e.sub.disconnect()
          this.subscribers.delete(channel)
        }
      }
    }
  }
}

// ============================================
// Singleton Bus Factory
// ============================================

let _bus: RealtimeBus | null = null

export function getRealtimeBus(): RealtimeBus {
  if (_bus) return _bus

  const redisUrl = process.env.REDIS_URL

  if (redisUrl) {
    try {
      const redisBus = new RedisBus(redisUrl)
      console.log("[Realtime] ✅ Using Redis Pub/Sub:", redisUrl)
      _bus = redisBus
      return _bus
    } catch (err) {
      console.warn(
        "[Realtime] ⚠️ Redis connection failed, falling back to in-memory bus.",
        err
      )
    }
  } else {
    console.warn(
      "[Realtime] ⚠️ REDIS_URL not set. Using in-memory EventEmitter bus. " +
        "Set REDIS_URL in .env.local for production-grade Pub/Sub."
    )
  }

  _bus = new InMemoryBus()
  return _bus
}
