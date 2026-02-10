"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import imageCompression from "browser-image-compression"

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const ACCEPTED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_DOC_TYPES]

// File extensions for accept attribute
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"

interface FileError {
  file: string
  message: string
}

interface FileUploaderProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  inputId?: string
  label?: string
  description?: string
  maxFiles?: number
  maxSizeBytes?: number
  compressImages?: boolean
  disabled?: boolean
}

export function FileUploader({
  files,
  onFilesChange,
  inputId = "file-upload",
  label = "Lampiran (Opsional)",
  description = "Tambahkan foto atau file pendukung (screenshot error, foto kondisi, dll)",
  maxFiles = MAX_FILES,
  maxSizeBytes = MAX_FILE_SIZE,
  compressImages = true,
  disabled = false,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [errors, setErrors] = useState<FileError[]>([])
  const [processing, setProcessing] = useState(false)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate previews for image files
  useEffect(() => {
    const newPreviews: Record<string, string> = {}
    
    files.forEach((file) => {
      if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        const key = `${file.name}-${file.size}-${file.lastModified}`
        if (!previews[key]) {
          const url = URL.createObjectURL(file)
          newPreviews[key] = url
        } else {
          newPreviews[key] = previews[key]
        }
      }
    })

    // Revoke old URLs not in use
    Object.entries(previews).forEach(([key, url]) => {
      if (!newPreviews[key]) {
        URL.revokeObjectURL(url)
      }
    })

    setPreviews(newPreviews)

    // Cleanup on unmount
    return () => {
      Object.values(newPreviews).forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return `Tipe file tidak didukung. Tipe yang diterima: gambar (jpg, png, gif, webp), dokumen (pdf, doc, docx, xls, xlsx, txt)`
      }
      if (file.size > maxSizeBytes) {
        const maxSizeMB = maxSizeBytes / (1024 * 1024)
        return `Ukuran file melebihi batas ${maxSizeMB}MB`
      }
      return null
    },
    [maxSizeBytes]
  )

  const processFiles = useCallback(
    async (newFiles: File[]): Promise<File[]> => {
      const processedFiles: File[] = []

      for (const file of newFiles) {
        // Compress images if enabled
        if (compressImages && ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          try {
            const compressedBlob = await imageCompression(file, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            })
            // Create a new file with original name using Object.assign to preserve File interface
            const processedFile = Object.assign(compressedBlob, {
              name: file.name,
              lastModified: Date.now(),
            }) as File
            processedFiles.push(processedFile)
          } catch {
            // If compression fails, use original
            processedFiles.push(file)
          }
        } else {
          processedFiles.push(file)
        }
      }

      return processedFiles
    },
    [compressImages]
  )

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      setProcessing(true)
      setErrors([])

      const newErrors: FileError[] = []
      const validFiles: File[] = []

      // Check total file limit
      const remainingSlots = maxFiles - files.length
      const filesToProcess = Array.from(fileList).slice(0, remainingSlots)

      if (fileList.length > remainingSlots) {
        newErrors.push({
          file: "",
          message: `Maksimal ${maxFiles} file. ${fileList.length - remainingSlots} file diabaikan.`,
        })
      }

      // Validate each file
      for (const file of filesToProcess) {
        const error = validateFile(file)
        if (error) {
          newErrors.push({ file: file.name, message: error })
        } else {
          validFiles.push(file)
        }
      }

      // Process valid files (compress images)
      if (validFiles.length > 0) {
        const processedFiles = await processFiles(validFiles)
        onFilesChange([...files, ...processedFiles])
      }

      setErrors(newErrors)
      setProcessing(false)
    },
    [files, maxFiles, onFilesChange, processFiles, validateFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      if (!disabled) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [disabled, handleFiles]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      // Reset input value to allow selecting same file again
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    },
    [handleFiles]
  )

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index))
    },
    [files, onFilesChange]
  )

  const openFileDialog = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const getFileIcon = (file: File) => {
    const type = file.type
    if (ACCEPTED_IMAGE_TYPES.includes(type)) {
      return ImageIcon
    }
    if (type === "application/pdf") {
      return FileText
    }
    if (type.includes("spreadsheet") || type.includes("excel")) {
      return FileSpreadsheet
    }
    return File
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getPreviewKey = (file: File) =>
    `${file.name}-${file.size}-${file.lastModified}`

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Drop Zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          processing && "pointer-events-none"
        )}
        onClick={() => !disabled && !processing && openFileDialog()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
          accept={ACCEPTED_EXTENSIONS}
          disabled={disabled || processing}
        />

        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div
            className={cn(
              "p-3 rounded-full transition-colors",
              isDragOver ? "bg-primary/10" : "bg-muted"
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6 transition-colors",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {processing ? (
                "Memproses file..."
              ) : (
                <>
                  Drag & drop file di sini, atau{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-primary"
                    onClick={openFileDialog}
                    disabled={disabled}
                  >
                    pilih file
                  </Button>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Maks {maxFiles} file, {maxSizeBytes / (1024 * 1024)}MB per file.
              Format: JPG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, TXT
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-md"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {error.file && <strong>{error.file}:</strong>} {error.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file, index) => {
            const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)
            const Icon = getFileIcon(file)
            const previewUrl = previews[getPreviewKey(file)]

            return (
              <div
                key={`${file.name}-${index}`}
                className="group relative flex items-center gap-3 rounded-lg border bg-background p-2 hover:bg-muted/50 transition-colors"
              >
                {/* Thumbnail or Icon */}
                <div className="flex-shrink-0 h-12 w-12 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                  {isImage && previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Hapus {file.name}</span>
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* File count indicator */}
      {files.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {files.length} / {maxFiles} file
        </p>
      )}
    </div>
  )
}

/**
 * Convert file to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Compress image file
 */
export async function compressImage(file: File): Promise<File> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return file
  }

  try {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    })
    // Preserve File interface using Object.assign
    return Object.assign(compressedBlob, {
      name: file.name,
      lastModified: Date.now(),
    }) as File
  } catch {
    return file
  }
}
