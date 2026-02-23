import axios, { AxiosInstance, AxiosError } from "axios"

// Base URL: /api/helpdesk → proxy ke http://localhost:8072/api/helpdesk
// Auth: POST /api/helpdesk/auth/login, Core: GET /api/helpdesk/dashboard, dll.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/helpdesk"

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    })

    // Request interceptor untuk menambahkan auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor dengan smart error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const { response, config, message } = error

        // Log error untuk debugging
        console.error('=== API ERROR ===')
        console.error('URL:', config?.url)
        console.error('Full URL:', (config?.baseURL ?? '') + (config?.url ?? ''))
        console.error('Method:', config?.method)
        console.error('Status:', response?.status)
        console.error('Status Text:', response?.statusText)
        console.error('Error Message:', message)
        console.error('Response Data:', response?.data)
        console.error('Has Token:', !!this.getToken())
        console.error('=================')

        // 1. Network error (no response dari server)
        if (!response) {
          console.error('Network error - no response from server')
          // Jangan redirect - ini network/CORS issue
          return Promise.reject(error)
        }

        // 2. Handle 401 Unauthorized - redirect ke login
        // Skip redirect if already on login page (avoids form reset on bad credentials)
        if (response.status === 401) {
          if (typeof window === "undefined" || window.location.pathname !== "/login") {
            this.handleAuthError()
          }
        }

        // Untuk semua error, jangan redirect
        // Biarkan component handle error-nya dengan toast/alert
        return Promise.reject(error)
      }
    )
  }

  /**
   * Handle authentication error - clear token dan redirect
   */
  private handleAuthError(): void {
    console.warn('Handling authentication error - clearing tokens')
    this.clearToken()

    if (typeof window !== "undefined") {
      // Dispatch custom event untuk auth store/components
      window.dispatchEvent(new Event('auth-error'))

      // Redirect setelah small delay untuk memastikan cleanup selesai
      setTimeout(() => {
        window.location.href = "/login"
      }, 100)
    }
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
  }

  private clearToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
    }
  }

  async get<T>(url: string, config?: import("axios").AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: import("axios").AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: import("axios").AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: unknown, config?: import("axios").AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: import("axios").AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config)
    return response.data
  }

  /**
   * Get the base URL for API requests
   */
  getBaseUrl(): string {
    return API_BASE_URL
  }
}

export const apiClient = new APIClient()

/**
 * Get the backend base URL for constructing full URLs (e.g., for images)
 * This returns the Odoo server URL, not the API endpoint
 */
export function getBackendBaseUrl(): string {
  // NEXT_PUBLIC_API_BACKEND_URL should be set to the Odoo server URL (e.g., http://localhost:8072)
  const backendUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL
  if (backendUrl) {
    return backendUrl.replace(/\/$/, '') // Remove trailing slash
  }

  // Fallback: try to extract from NEXT_PUBLIC_API_BASE_URL
  // e.g., http://localhost:8072/api/helpdesk -> http://localhost:8072
  // or /api/helpdesk -> use window.location.origin (but this won't work for Odoo)
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_URL

  if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
    try {
      const url = new URL(apiBaseUrl)
      return url.origin
    } catch {
      // Invalid URL, continue to next fallback
    }
  }

  // Last resort: for development, default to localhost:8072
  // This assumes Odoo is running on port 8072
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8072'
  }

  // In production or if nothing else works, use current origin
  // Note: This may not work if frontend and backend are on different domains
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

/**
 * Construct full URL for attachment
 * @param relativeUrl - The relative URL from backend (e.g., /web/content/1298)
 * @returns Full URL (e.g., http://localhost:8072/web/content/1298)
 */
export function getAttachmentUrl(relativeUrl: string | undefined | null): string {
  if (!relativeUrl) return ''

  // If already absolute URL, return as is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }

  // Ensure the relative URL starts with /
  const normalizedPath = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`

  // Prepend backend base URL
  const baseUrl = getBackendBaseUrl()
  return `${baseUrl}${normalizedPath}`
}
