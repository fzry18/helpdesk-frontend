"use client"

import { forwardRef, useImperativeHandle } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"

const messageSchema = z.object({
  body: z.string().min(1, "Pesan tidak boleh kosong"),
  internal: z.boolean().default(false),
})

export type MessageFormData = z.infer<typeof messageSchema>

export interface MessageFormRef {
  reset: () => void
}

interface MessageFormProps {
  ticketId: number
  isClosed: boolean
  isAdminUser: boolean
  onSend: (data: MessageFormData) => void
  isPending: boolean
}

export const MessageForm = forwardRef<MessageFormRef, MessageFormProps>(
  function MessageForm(
    { ticketId: _ticketId, isClosed, isAdminUser, onSend, isPending },
    ref
  ) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: { internal: false },
  })

  useImperativeHandle(ref, () => ({ reset }), [reset])

  if (isClosed) return null

  return (
    <form onSubmit={handleSubmit(onSend)} className="p-3 border-t bg-muted/20">
      <Textarea
        placeholder="Tulis pesan..."
        {...register("body")}
        className={`text-sm bg-background ${errors.body ? "border-destructive" : ""}`}
        rows={2}
      />
      <Button type="submit" size="sm" className="mt-2" disabled={isPending}>
        <Send className="mr-2 h-3 w-3" />
        Kirim
      </Button>
    </form>
  )
})
