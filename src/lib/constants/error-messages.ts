export const ERROR_MESSAGES = {
  INVALID_LOGIN_FORMAT: "Format login tidak valid. Gunakan 4 digit terakhir NIK.",
  NIK_NOT_FOUND: "NIK tidak ditemukan.",
  INVALID_HELPDESK_PASSWORD: "Password salah. Silakan coba lagi.",
  NO_HELPDESK_PASSWORD:
    "Anda belum memiliki password helpdesk. Hubungi administrator.",
  ACCOUNT_LOCKED: "Akun dikunci sementara. Coba lagi dalam beberapa menit.",
  NETWORK_ERROR: "Terjadi kesalahan jaringan.",
  SERVER_ERROR: "Terjadi kesalahan pada server.",
  TICKET_NOT_FOUND: "Ticket tidak ditemukan.",
  TICKET_CREATE_FAILED: "Gagal membuat ticket.",
  UNKNOWN_ERROR: "Terjadi kesalahan yang tidak diketahui.",
} as const

interface ErrorLike {
  response?: {
    data?: {
      error?: string | { message?: string }
      message?: string
    }
  }
  message?: string
}

export function getErrorMessage(error: unknown): string {
  const err = error as ErrorLike
  const dataError = err?.response?.data?.error
  const code = typeof dataError === "string" ? dataError : undefined
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES]
  }
  if (err?.response?.data?.message) {
    return String(err.response.data.message)
  }
  if (typeof dataError === "object" && dataError?.message) {
    return String(dataError.message)
  }
  if (err?.message === "Network Error") {
    return ERROR_MESSAGES.NETWORK_ERROR
  }
  return ERROR_MESSAGES.UNKNOWN_ERROR
}
