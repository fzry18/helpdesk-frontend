import { authAPI } from "@/lib/api/endpoints"
import type { LoginRequest } from "@/types"

export const authService = {
  login: (data: LoginRequest) => authAPI.login(data),
  me: () => authAPI.me(),
  logout: () => authAPI.logout(),
  changePassword: (oldPassword: string, newPassword: string) =>
    authAPI.changePassword(oldPassword, newPassword),
  forceChangePassword: (nik: string, oldPassword: string, newPassword: string) =>
    authAPI.forceChangePassword(nik, oldPassword, newPassword),
}
