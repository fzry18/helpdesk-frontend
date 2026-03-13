/**
 * Custom Next.js server dengan Socket.IO + Redis adapter (opsional)
 *
 * Kenapa butuh custom server?
 * - Next.js App Router tidak mendukung upgrade WebSocket native.
 * - Socket.IO butuh akses ke raw HTTP server Node.js untuk handshake WS.
 * - Dengan memasang IO di sini dan mengekspornya sebagai singleton,
 *   semua API route bisa memanggil `getIO().to(room).emit(...)` tanpa
 *   harus membuat koneksi socket terpisah.
 *
 * Cara jalankan:
 *   pnpm dev      → ts-node server.ts (via script di package.json)
 *   pnpm start    → node dist/server.js (atau langsung via tsx)
 *
 * Environment variables:
 *   REDIS_URL          - opsional; e.g. redis://localhost:6379
 *   PORT               - default 3000
 */
import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { Server as SocketIOServer } from "socket.io"
import { initIO } from "./src/lib/server/socket-io"

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = parseInt(process.env.PORT || "3000", 10)

async function main() {
  const app = next({ dev, hostname, port })
  const handle = app.getRequestHandler()

  await app.prepare()

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error("Error handling request:", err)
      res.statusCode = 500
      res.end("Internal Server Error")
    }
  })

  // Inisialisasi Socket.IO dan pasang ke HTTP server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Simpan instance IO agar API routes bisa mengaksesnya
  await initIO(io)

  // Konfigurasi event handler Socket.IO
  io.on("connection", (socket) => {
    // Autentikasi: token dikirim via socket.handshake.auth.token
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) {
      socket.disconnect(true)
      return
    }

    // Join room spesifik (mis. "ticket:42")
    socket.on("join_room", ({ room }: { room: string }) => {
      socket.join(room)
    })

    // Leave room
    socket.on("leave_room", ({ room }: { room: string }) => {
      socket.leave(room)
    })

    // Heartbeat: client mengirim ping, server balas pong
    socket.on("ping", () => {
      socket.emit("pong")
    })

    socket.on("disconnect", () => {
      // Cleanup otomatis oleh Socket.IO
    })
  })

  httpServer.listen(port, hostname, () => {
    console.log(`▲ Next.js ready on http://${hostname}:${port}`)
    console.log(`  Socket.IO listening on ws://${hostname}:${port}`)
  })
}

main().catch((err) => {
  console.error("Fatal error starting server:", err)
  process.exit(1)
})
