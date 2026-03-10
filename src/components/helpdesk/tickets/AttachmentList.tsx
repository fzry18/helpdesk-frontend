"use client"

import { useState, useCallback, useMemo } from "react"
import { useAttachments } from "@/hooks/use-attachments"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileUploader } from "@/components/ui/file-uploader"
import {
  Paperclip,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  Loader2,
  Maximize2,
} from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { Attachment } from "@/types"
import type { Ticket } from "@/types"

interface AttachmentListProps {
  ticketId: number
  ticket?: Ticket | null
  showUpload?: boolean
}

// MIME types for images
const IMAGE_MIMETYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/** Append auth token as query param so <img> can fetch authenticated URLs */
function getAuthUrl(path: string): string {
  if (typeof window === "undefined") return path
  const token = localStorage.getItem("access_token")
  if (!token) return path
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}token=${encodeURIComponent(token)}`
}

export function AttachmentList({
  ticketId,
  ticket,
  showUpload = false,
}: AttachmentListProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const { employee, isAdmin, getHelpdeskRole } = useAuthStore()

  // Get the authenticated image URL for preview
  const getPreviewSrc = (attachment: Attachment): string => {
    const path = attachment.url || `/api/helpdesk/attachments/${attachment.id}/download`
    return getAuthUrl(path)
  }

  // Get the API URL for an attachment
  const getAttachmentSrc = (attachment: Attachment): string => {
    return attachment.url || `/api/helpdesk/attachments/${attachment.id}/download`
  }

  const {
    attachments,
    isLoading,
    isError,
    uploadAttachments,
    isUploading,
    deleteAttachment,
    isDeleting,
    downloadAttachment,
  } = useAttachments({ ticketId })

  // Separate images and documents
  const { images, documents } = useMemo(() => {
    const imgs: Attachment[] = []
    const docs: Attachment[] = []
    for (const att of attachments) {
      if (IMAGE_MIMETYPES.includes(att.mimetype)) {
        imgs.push(att)
      } else {
        docs.push(att)
      }
    }
    return { images: imgs, documents: docs }
  }, [attachments])

  // Check if user can delete attachment
  const canDelete = useCallback(
    (attachment: Attachment): boolean => {
      const role = getHelpdeskRole()
      if (role === "super_admin") return true
      if (role === "dept_admin") {
        const ticketDeptId = ticket?.department_id ?? null
        const myDeptId = employee?.department_id ?? null
        if (!ticketDeptId) return true
        if (myDeptId && ticketDeptId === myDeptId) return true
      }
      // Creator can delete their own attachments
      if (attachment.created_by?.id === employee?.id) return true
      if (ticket?.created_by?.id === employee?.id) return true
      return false
    },
    [employee, getHelpdeskRole, ticket]
  )

  // Get file icon based on mimetype
  const getFileIcon = (mimetype: string) => {
    if (IMAGE_MIMETYPES.includes(mimetype)) return ImageIcon
    if (mimetype === "application/pdf") return FileText
    if (mimetype.includes("spreadsheet") || mimetype.includes("excel"))
      return FileSpreadsheet
    return File
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Format date
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-"
    try {
      return format(new Date(dateStr), "dd MMM yyyy, HH:mm", { locale: idLocale })
    } catch {
      return "-"
    }
  }

  // Lightbox navigation
  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const navigateLightbox = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setLightboxIndex((i) => (i === 0 ? images.length - 1 : i - 1))
    } else {
      setLightboxIndex((i) => (i === images.length - 1 ? 0 : i + 1))
    }
  }

  // Handle upload
  const handleUpload = () => {
    if (uploadFiles.length === 0) return
    uploadAttachments(
      { files: uploadFiles },
      {
        onSuccess: () => {
          setUploadFiles([])
          setUploadOpen(false)
        },
      }
    )
  }

  // Handle delete
  const handleDelete = (id: number) => {
    deleteAttachment(id, {
      onSuccess: () => {
        setDeleteConfirmId(null)
      },
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Paperclip className="h-5 w-5" />
            Lampiran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Paperclip className="h-5 w-5" />
            Lampiran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Gagal memuat lampiran. Silakan refresh halaman.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (attachments.length === 0 && !showUpload) {
    return null // Don't show card if no attachments and upload not allowed
  }

  const currentImage = images[lightboxIndex]

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Paperclip className="h-5 w-5" />
            Lampiran
            {attachments.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({attachments.length})
              </span>
            )}
          </CardTitle>
          {showUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Empty state */}
          {attachments.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Paperclip className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada lampiran</p>
              {showUpload && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                  className="mt-2"
                >
                  Upload file pertama
                </Button>
              )}
            </div>
          )}

          {/* Image Grid */}
          {images.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Gambar</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                    onClick={() => openLightbox(index)}
                  >
                    <img
                      src={getPreviewSrc(img)}
                      alt={img.name || img.filename || "Attachment"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Actions overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadAttachment(img.id, img.name || img.filename || "download", img.url)
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {canDelete(img) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-white hover:text-red-300 hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmId(img.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document List */}
          {documents.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Dokumen</p>
              <div className="space-y-2">
                {documents.map((doc) => {
                  const Icon = getFileIcon(doc.mimetype)
                  return (
                    <div
                      key={doc.id}
                      className="group flex items-center gap-3 rounded-lg border bg-background p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          title={doc.name || doc.filename}
                        >
                          {doc.name || doc.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)} •{" "}
                          {formatDate(doc.create_date)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            downloadAttachment(doc.id, doc.name || doc.filename || "download", doc.url)
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canDelete(doc) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-0">
          <DialogTitle className="sr-only">
            {currentImage?.name || currentImage?.filename || "Image preview"}
          </DialogTitle>
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:text-white hover:bg-white/20"
              onClick={closeLightbox}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation - Previous */}
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 text-white hover:text-white hover:bg-white/20 h-12 w-12"
                onClick={() => navigateLightbox("prev")}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Image */}
            {currentImage && (
              <img
                src={getPreviewSrc(currentImage)}
                alt={currentImage.name || currentImage.filename || "Attachment"}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Navigation - Next */}
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 text-white hover:text-white hover:bg-white/20 h-12 w-12"
                onClick={() => navigateLightbox("next")}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Image info & counter */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex items-center justify-between text-white">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {currentImage?.name || currentImage?.filename}
                  </p>
                  <p className="text-xs opacity-75">
                    {currentImage && formatFileSize(currentImage.file_size)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    {lightboxIndex + 1} / {images.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-white hover:bg-white/20"
                    onClick={() => {
                      if (currentImage) {
                        downloadAttachment(
                          currentImage.id,
                          currentImage.name || currentImage.filename || "download",
                          currentImage.url
                        )
                      }
                    }}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Lampiran
          </DialogTitle>
          <div className="space-y-4 pt-2">
            <FileUploader
              files={uploadFiles}
              onFilesChange={setUploadFiles}
              inputId="attachment-upload"
              label=""
              description="Upload file lampiran tambahan untuk tiket ini"
              disabled={isUploading}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadFiles([])
                  setUploadOpen(false)
                }}
                disabled={isUploading}
              >
                Batal
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploadFiles.length === 0 || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengupload...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogTitle>Hapus Lampiran?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Apakah Anda yakin ingin menghapus lampiran ini? Tindakan ini tidak
            dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
