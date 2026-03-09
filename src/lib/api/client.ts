import axios, { AxiosInstance, AxiosError } from "axios"

// Base URL: /api/helpdesk → Next.js API routes (local)
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

        // 409 = expected flow (e.g. PASSWORD_CHANGE_REQUIRED), resolve as normal response
        if (response?.status === 409) {
          return response
        }

        // Log error untuk debugging
        console.error('=== API ERROR ===')
        console.error('URL:', config?.url)
        console.error('Method:', config?.method)
        console.error('Status:', response?.status)
        console.error('Error Message:', message)
        console.error('=================')

        // 1. Network error (no response dari server)
        if (!response) {
          console.error('Network error - no response from server')
          return Promise.reject(error)
        }

        // 2. Handle 401 Unauthorized - redirect ke login
        if (response.status === 401) {
          if (typeof window === "undefined" || window.location.pathname !== "/login") {
            this.handleAuthError()
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private handleAuthError(): void {
    this.clearToken()
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event('auth-error'))
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

  getBaseUrl(): string {
    return API_BASE_URL
  }
}

export const apiClient = new APIClient()

/**
 * Get attachment download URL
 */
export function getAttachmentUrl(relativeUrl: string | undefined | null): string {
  if (!relativeUrl) return ''
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }
  // Attachments are served from our own API
  const normalizedPath = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`
  return normalizedPath
}
