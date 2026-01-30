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
        if (response.status === 401) {
          this.handleAuthError()
        }

        // Untuk semua error, jangan redirect
        // Biarkan component handle error-nya dengan toast/alert
        return Promise.reject(error)
      }
    )
  }

  /**
   * Cek apakah endpoint adalah public endpoint (tidak perlu auth)
   */
  private isPublicEndpoint(url: string): boolean {
    const publicPaths = [
      '/categories',
      '/types',
      '/teams',
      '/products',
      '/stages',
      '/dashboard',
      '/tickets', // GET list bisa optional auth
    ]
    return publicPaths.some(path => url.includes(path))
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
