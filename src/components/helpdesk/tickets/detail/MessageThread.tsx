"use client"

import { useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageItem, type MessageItemData } from "./MessageItem"
import { MessageForm, type MessageFormData, type MessageFormRef } from "./MessageForm"

interface MessageThreadProps {
  messages: MessageItemData[]
  messagesLoading: boolean
  isClosed: boolean
  isAdminUser: boolean
  onSendMessage: (data: MessageFormData) => void
  sendMessagePending: boolean
  messageFormRef?: React.RefObject<MessageFormRef | null>
}

export function MessageThread({
  messages,
  messagesLoading,
  isClosed,
  isAdminUser,
  onSendMessage,
  sendMessagePending,
  messageFormRef,
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Obrolan
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[300px] overflow-y-auto">
          {messagesLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : messages.length > 0 ? (
            <div className="divide-y">
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Belum ada pesan
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>
        <MessageForm
          ref={messageFormRef}
          ticketId={0}
          isClosed={isClosed}
          isAdminUser={isAdminUser}
          onSend={onSendMessage}
          isPending={sendMessagePending}
        />
      </CardContent>
    </Card>
  )
}
