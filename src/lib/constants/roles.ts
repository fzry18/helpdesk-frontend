/**
 * Helpdesk role constants — selaras dengan field `helpdesk_role` di tipe Employee.
 *
 * Gunakan konstanta ini di semua pengecekan role; hindari magic string.
 */

export const HELPDESK_ROLES = {
  USER: "user",
  DEPT_ADMIN: "dept_admin",
  SUPER_ADMIN: "super_admin",
} as const

export type HelpdeskRole =
  (typeof HELPDESK_ROLES)[keyof typeof HELPDESK_ROLES]

/** Label tampilan untuk setiap role */
export const ROLE_LABEL: Record<HelpdeskRole, string> = {
  user: "Pengguna",
  dept_admin: "Admin Departemen",
  super_admin: "Super Admin",
}

/** Mengecek apakah sebuah string adalah role yang valid */
export function isValidRole(role: string): role is HelpdeskRole {
  return Object.values(HELPDESK_ROLES).includes(role as HelpdeskRole)
}

/** Role yang dianggap memiliki hak admin (dept_admin atau super_admin) */
export const ADMIN_ROLES: HelpdeskRole[] = [
  HELPDESK_ROLES.DEPT_ADMIN,
  HELPDESK_ROLES.SUPER_ADMIN,
]

/** Mengecek apakah sebuah role memiliki hak admin */
export function isAdminRole(role: HelpdeskRole | null | undefined): boolean {
  if (!role) return false
  return ADMIN_ROLES.includes(role)
}
