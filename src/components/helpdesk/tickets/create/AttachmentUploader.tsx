"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X } from "lucide-react"

interface AttachmentUploaderProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  inputId?: string
}

export function AttachmentUploader({
  files,
  onFilesChange,
  inputId = "file-upload",
}: AttachmentUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      onFilesChange([...files, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <Label>Lampiran (Opsional)</Label>
      <p className="text-xs text-muted-foreground">
        Tambahkan foto atau file pendukung (screenshot error, foto kondisi, dll)
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById(inputId)?.click()}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Pilih File
        </Button>
        <input
          id={inputId}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <span className="text-sm truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}
