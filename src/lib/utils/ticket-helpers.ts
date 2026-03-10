/**
 * Helper functions for ticket detail display and message formatting.
 */

export function messageToPlainText(htmlOrEncoded: string): string {
  if (!htmlOrEncoded) return ""
  const textarea = document.createElement("textarea")
  textarea.innerHTML = htmlOrEncoded
  let text = textarea.value
  text = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim()
  return text
}

export interface FormatActivityResult {
  label: string | null
  content: string
}

/** Format body activity log: pisahkan label (Progress Update, dll) dari isi agar tampilan rapi */
export function formatActivityBody(rawBody: string): FormatActivityResult {
  let text = messageToPlainText(rawBody || "").trim()
  if (!text) return { label: null, content: "" }

  text = text.replace(/ð[^\s]*/g, "")
  text = text.replace(/â[^\s]*/g, "")
  text = text.replace(/Ã[^\s]*/g, "")
  text = text.replace(/[\x00-\x1F\x7F]/g, "")
  text = text.trim()

  if (!text) return { label: null, content: "" }

  const patterns = [
    { pattern: /progress\s*update/i, label: "Progress Update" },
    { pattern: /ticket\s*sedang\s*diproses/i, label: "Ticket Diproses" },
    { pattern: /ticket\s*di-?assign\s*ke\s*member[:\s]*/i, label: "Member Assignment" },
    { pattern: /ticket\s*di-?assign\s*ke\s*team[:\s]*/i, label: "Team Assignment" },
    { pattern: /ticket\s*selesai/i, label: "Ticket Selesai" },
    { pattern: /menunggu\s*konfirmasi/i, label: "Menunggu Konfirmasi" },
    { pattern: /catatan/i, label: "Catatan" },
  ]

  for (const { pattern, label } of patterns) {
    const match = text.match(pattern)
    if (match) {
      const idx = match.index ?? 0
      const matchLen = match[0].length
      let content = text.slice(idx + matchLen).replace(/^\s*[:.\-]\s*/, "").trim()


      if (!content) {
        switch (label) {
          case "Ticket Diproses":
            content = "Admin telah membuka ticket ini untuk diproses"
            break
          case "Ticket Selesai":
            content = "Ticket telah diselesaikan oleh admin"
            break
          case "Menunggu Konfirmasi":
            content = "Menunggu konfirmasi dari user"
            break
          default:
            content = ""
        }
      }
      return { label, content: content.trim() }
    }
  }
  return { label: null, content: text }
}

export interface PriorityConfig {
  color: string
  label: string
}

/** Priority config sesuai Odoo: 0=Very Low .. 4=Very High */
export function getPriorityConfig(priority: string): PriorityConfig {
  switch (priority) {
    case "4":
      return { color: "bg-red-100 text-red-700 border-red-300", label: "Very High" }
    case "3":
      return { color: "bg-orange-100 text-orange-700 border-orange-300", label: "High" }
    case "2":
      return { color: "bg-yellow-50 text-yellow-700 border-yellow-300", label: "Normal" }
    case "1":
      return { color: "bg-green-50 text-green-700 border-green-300", label: "Low" }
    case "0":
      return { color: "bg-gray-100 text-gray-600 border-gray-300", label: "Very Low" }
    default:
      return { color: "bg-yellow-50 text-yellow-700 border-yellow-300", label: "Normal" }
  }
}

export function getSystemLabel(systemCategory: string | null | undefined): string {
  switch (systemCategory) {
    case "odoo":
      return "Odoo ERP"
    case "p2h":
      return "Web P2H"
    case "job_portal":
      return "Job Portal"
    case "other":
      return "Sistem Lainnya"
    default:
      return ""
  }
}

export function getSystemBadgeStyle(systemCategory: string | null | undefined): string {
  switch (systemCategory) {
    case "odoo":
      return "bg-purple-100 text-purple-700 border-purple-300"
    case "p2h":
      return "bg-blue-100 text-blue-700 border-blue-300"
    case "job_portal":
      return "bg-teal-100 text-teal-700 border-teal-300"
    case "other":
      return "bg-gray-100 text-gray-700 border-gray-300"
    default:
      return "bg-gray-100 text-gray-600 border-gray-200"
  }
}

export interface TicketStageLike {
  stage?: { id: number; name: string } | string | null
  stage_name?: string
}

export function getDisplayStageName(ticket: TicketStageLike, isAdmin?: boolean): string {
  if (ticket.stage && typeof ticket.stage === "object" && "name" in ticket.stage) {
    return ticket.stage.name
  }
  if (ticket.stage_name) return ticket.stage_name
  if (typeof ticket.stage === "string" && ticket.stage) {
    return ticket.stage
  }
  return isAdmin ? "Draft" : "Sent"
}

export function getStageColor(stageName: string, isRejected?: boolean): string {
  if (isRejected) return "bg-red-600 text-white"
  const name = stageName?.toLowerCase() ?? ""
  if (name.includes("draft") || name.includes("sent")) return "bg-blue-500 text-white"
  if (name.includes("progress")) return "bg-amber-500 text-white"
  if (name.includes("awaiting") || name.includes("waiting") || name.includes("menunggu"))
    return "bg-orange-500 text-white"
  if (name.includes("closed") || name.includes("selesai")) return "bg-green-600 text-white"
  if (name.includes("reject") || name.includes("tolak")) return "bg-red-600 text-white"
  return "bg-gray-500 text-white"
}

export function getActivityIcon(label: string | null): string {
  if (!label) return "📌"
  if (label.includes("Progress")) return "📋"
  if (label.includes("Diproses")) return "🔄"
  if (label.includes("Member")) return "👤"
  if (label.includes("Team")) return "👥"
  if (label.includes("Selesai")) return "✅"
  if (label.includes("Catatan")) return "📝"
  return "📌"
}
