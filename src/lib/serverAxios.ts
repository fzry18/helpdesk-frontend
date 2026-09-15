import axios from "axios"

/**
 * Server-side only Axios instance for BFF Route Handlers.
 * Used for proxying requests to Odoo Live server (erp1.gpedata.id).
 */
export const serverAxios = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})
