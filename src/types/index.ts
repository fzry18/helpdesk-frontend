export * from "@/features/auth/types"
export * from "@/features/tickets/types"
export * from "@/features/dashboard/types"
export * from "@/shared/types/api"
export * from "@/shared/types/master-data"

export interface User {
  id: number
  name: string
  email?: string
  image_url?: string | null
}
