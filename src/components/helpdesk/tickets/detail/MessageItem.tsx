"use client"

import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { messageToPlainText } from "@/lib/utils/ticket-helpers"

export interface MessageItemData {
  id: number
  body: string
  body_plain?: string
  author?: { id: number; name: string; email?: string } | null
  date?: string
  create_date?: string
  is_internal?: boolean
  is_system_status?: boolean
  is_activity_log?: boolean
  message_type?: string
  subtype_xmlid?: string
}

interface MessageItemProps {
  message: MessageItemData
}

export function MessageItem({ message }: MessageItemProps) {
  const text = messageToPlainText(message.body_plain ?? message.body ?? "")
  return (
    <div className={`p-3 ${message.is_internal ? "bg-muted/30" : ""}`}>
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm font-medium">{message.author?.name ?? "System"}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(message.date ?? message.create_date ?? "")}
        </p>
      </div>
      <p className="text-sm mt-1">{text}</p>
      {message.is_internal && (
        <Badge variant="secondary" className="mt-1 text-xs">
          Internal
        </Badge>
      )}
    </div>
  )
}
