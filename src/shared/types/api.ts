export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: PaginationMeta
}

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  details?: Record<string, string[]>
}
