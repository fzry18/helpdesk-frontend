/**
 * API Client Exports
 * 
 * Re-export semua API functions untuk kemudahan import
 * 
 * Usage:
 * import { authAPI, ticketAPI, dashboardAPI } from '@/lib/api'
 */

export { apiClient } from './client'

export {
    authAPI,
    ticketAPI,
    messageAPI,
    attachmentAPI,
    masterDataAPI,
    dashboardAPI,
} from './endpoints'
