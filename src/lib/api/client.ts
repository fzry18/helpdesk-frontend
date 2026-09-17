import axios, { AxiosInstance, AxiosError } from "axios"
import { useAuthStore } from "@/store/authStore"

// Base URL: /api/helpdesk → proxy ke http://localhost:8072/api/helpdesk
// Auth: POST /api/helpdesk/auth/login, Core: GET /api/helpdesk/dashboard, dll.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/helpdesk"

// Endpoints autentikasi yang TIDAK boleh memicu auto-logout / redirect saat return 401/409
const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/change-password",
]

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
        const { response, config } = error

        // 1. Network error (no response dari server)
        if (!response) {
          return Promise.reject(error)
        }

        const url = config?.url || ""
        const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => url.includes(ep))

        // 2. Handle 401 Unauthorized
        // HANYA lakukan auto-logout/redirect jika:
        // - Bukan endpoint autentikasi (/auth/login, /auth/change-password)
        // - Request sebelumnya membawa token (sesi login kadaluarsa)
        // - Tidak sedang berada di halaman login
        if (response.status === 401 && !isAuthEndpoint) {
          const hadToken = !!this.getToken()
          if (hadToken) {
            this.handleAuthError()
          }
        }

        // Biarkan component / React Query onError menangani error secara spesifik melalui UI toast
        return Promise.reject(error)
      }
    )
  }

  /**
   * Handle authentication error - clear token dan sinkronkan auth state
   */
  private handleAuthError(): void {
    try {
      useAuthStore.getState().logout()
    } catch {
      this.clearToken()
    }

    if (typeof window !== "undefined") {
      if (window.location.pathname !== "/login") {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      }
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

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config)
    return response.data
  }
}

export const apiClient = new APIClient()
