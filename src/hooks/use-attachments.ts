"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { attachmentAPI } from "@/lib/api/endpoints"
import { getAttachmentUrl } from "@/lib/api/client"
import { toast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/constants/error-messages"
import type { Attachment } from "@/types"
import { fileToBase64 } from "@/components/ui/file-uploader"

interface UseAttachmentsOptions {
  ticketId: number
  enabled?: boolean
}

interface UploadAttachmentParams {
  files: File[]
}

export function useAttachments({ ticketId, enabled = true }: UseAttachmentsOptions) {
  const queryClient = useQueryClient()

  // Query to fetch attachments for a ticket
  const attachmentsQuery = useQuery({
    queryKey: ["attachments", ticketId],
    queryFn: async () => {
      const response = await attachmentAPI.getAttachments(ticketId)
      return response.data as Attachment[]
    },
    enabled: enabled && !!ticketId,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Mutation to upload attachments
  const uploadMutation = useMutation({
    mutationFn: async ({ files }: UploadAttachmentParams) => {
      // Convert files to base64
      const attachments = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          file_data: await fileToBase64(file),
        }))
      )

      return attachmentAPI.upload(ticketId, attachments)
    },
    onSuccess: () => {
      toast({
        title: "Upload Berhasil",
        description: "File berhasil diunggah",
      })
      queryClient.invalidateQueries({ queryKey: ["attachments", ticketId] })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (error: unknown) => {
      toast({
        title: "Gagal Upload",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    },
  })

  // Mutation to delete attachment
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      return attachmentAPI.delete(attachmentId)
    },
    onSuccess: () => {
      toast({
        title: "Berhasil Dihapus",
        description: "Attachment berhasil dihapus",
      })
      queryClient.invalidateQueries({ queryKey: ["attachments", ticketId] })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
    },
    onError: (error: unknown) => {
      toast({
        title: "Gagal Menghapus",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    },
  })

  // Function to download attachment
  const downloadAttachment = async (attachmentId: number, filename: string, attachmentUrl?: string) => {
    try {
      // If we have a direct URL from the attachment, use it for download
      if (attachmentUrl) {
        const fullUrl = getAttachmentUrl(attachmentUrl)
        const link = document.createElement("a")
        link.href = fullUrl
        link.download = filename
        link.target = "_blank"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      // Fallback to API endpoint
      const response = await attachmentAPI.download(attachmentId) as { data: Blob }
      const blob = response.data
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: "Gagal Download",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    }
  }

  return {
    // Query state
    attachments: attachmentsQuery.data ?? [],
    isLoading: attachmentsQuery.isLoading,
    isError: attachmentsQuery.isError,
    error: attachmentsQuery.error,
    refetch: attachmentsQuery.refetch,

    // Upload mutation
    uploadAttachments: uploadMutation.mutate,
    uploadAttachmentsAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,

    // Delete mutation
    deleteAttachment: deleteMutation.mutate,
    deleteAttachmentAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // Download function
    downloadAttachment,
  }
}
