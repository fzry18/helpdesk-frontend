import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

const BASE_STORAGE_DIR = path.join(process.cwd(), "storage", "uploads", "tickets")

/**
 * Ensure the directory exists
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

/**
 * Get the subfolder path for current year/month
 */
export function getSubfolder(): string {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  return path.join(year, month)
}

/**
 * Detect MIME type from extension or fallback
 */
export function detectMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
    ".zip": "application/zip",
  }
  return map[ext] || "application/octet-stream"
}

export interface SavedFileResult {
  filename: string
  diskPath: string
  relativeUrl: string
  fileSize: number
  mimetype: string
}

/**
 * Save a file from Base64 string or Buffer to local disk
 */
export async function saveFileToDisk(
  originalFilename: string,
  data: string | Buffer
): Promise<SavedFileResult> {
  const subfolder = getSubfolder()
  const targetDir = path.join(BASE_STORAGE_DIR, subfolder)
  await ensureDirectory(targetDir)

  // Clean filename and make it unique
  const ext = path.extname(originalFilename)
  const baseName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, "_")
  const uniqueId = crypto.randomBytes(6).toString("hex")
  const safeFilename = `${baseName}_${uniqueId}${ext}`
  const fullDiskPath = path.join(targetDir, safeFilename)

  let buffer: Buffer
  if (Buffer.isBuffer(data)) {
    buffer = data
  } else if (typeof data === "string") {
    // If base64 contains header e.g. "data:image/png;base64,..."
    const base64Data = data.includes(",") ? data.split(",")[1] : data
    buffer = Buffer.from(base64Data, "base64")
  } else {
    throw new Error("Invalid file data format")
  }

  await fs.writeFile(fullDiskPath, buffer)

  const relativeUrl = path.join("storage", "uploads", "tickets", subfolder, safeFilename).replace(/\\/g, "/")
  const mimetype = detectMimeType(originalFilename)

  return {
    filename: originalFilename,
    diskPath: fullDiskPath,
    relativeUrl,
    fileSize: buffer.length,
    mimetype,
  }
}

/**
 * Resolve full path from stored relative URL or diskPath
 */
export function resolveDiskPath(storedPath: string): string {
  if (path.isAbsolute(storedPath)) {
    return storedPath
  }
  return path.join(process.cwd(), storedPath)
}
