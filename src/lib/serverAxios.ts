import axios, { AxiosInstance } from "axios"

/**
 * Server-side Axios instance for BFF Route Handlers proxying requests to Odoo Live.
 * Patterned after stock-taking:
 * - Do NOT set default Content-Type (Odoo Werkzeug controller crashes on GET requests with application/json)
 * - Automatically handle Content-Type for POST/PUT/PATCH only
 */
export const serverAxios: AxiosInstance = axios.create({
  timeout: 60000,
})

serverAxios.interceptors.request.use(
  (config) => {
    // Only set Content-Type for POST/PUT/PATCH if not already set and not form-urlencoded
    if (["POST", "PUT", "PATCH"].includes(config.method?.toUpperCase() || "")) {
      if (!config.headers["Content-Type"] && !config.headers["content-type"]) {
        if (typeof config.data === "string" || config.data instanceof URLSearchParams) {
          // Let Axios handle form-urlencoded / string data
        } else {
          config.headers["Content-Type"] = "application/json"
        }
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

serverAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        `[Server Axios] Error ${error.response.status}: ${error.response.statusText}`,
        error.response.data
      )
    } else if (error.request) {
      console.error("[Server Axios] No response received:", error.request)
    } else {
      console.error("[Server Axios] Error:", error.message)
    }
    return Promise.reject(error)
  }
)
