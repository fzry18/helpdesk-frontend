"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation } from "@tanstack/react-query"
import { authAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Loader2, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { getErrorMessage } from "@/lib/constants/error-messages"
import { cn } from "@/lib/utils"

const loginSchema = z.object({
  nik: z
    .string()
    .min(1, "NIK harus diisi")
    .regex(/^[\d.]+$/, "NIK hanya boleh berisi angka dan titik"),
  password: z.string().min(1, "Password harus diisi"),
})

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
})

type LoginFormData = z.infer<typeof loginSchema>
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

/** Error codes that indicate the login (NIK) field is wrong */
const LOGIN_FIELD_ERROR_CODES = new Set([
  "INVALID_LOGIN_FORMAT",
  "NIK_NOT_FOUND",
  "INVALID_CREDENTIALS",
])

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  // Change password flow state
  const [changePasswordMode, setChangePasswordMode] = useState(false)
  const [changePasswordNik, setChangePasswordNik] = useState("")
  const [changePasswordOldPw, setChangePasswordOldPw] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const {
    register: registerCp,
    handleSubmit: handleSubmitCp,
    formState: { errors: cpErrors },
    reset: resetCpForm,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => authAPI.login(data),
    onSuccess: (response) => {
      // Handle PASSWORD_CHANGE_REQUIRED (409 resolved as normal response)
      const resp = response as unknown as Record<string, unknown>
      if (
        resp.error === "PASSWORD_CHANGE_REQUIRED" ||
        resp.code === "PASSWORD_CHANGE_REQUIRED" ||
        resp.success === false
      ) {
        const nikFromResp = (resp.data as { nik?: string } | null)?.nik
        const nikInput = (document.getElementById("nik") as HTMLInputElement)?.value
        const nik = nikFromResp || nikInput
        if (nik && (resp.error === "PASSWORD_CHANGE_REQUIRED" || resp.code === "PASSWORD_CHANGE_REQUIRED")) {
          const pwInput = (document.getElementById("password") as HTMLInputElement)?.value
          setChangePasswordNik(nik)
          setChangePasswordOldPw(pwInput || nik)
          setChangePasswordMode(true)
          resetCpForm()
          setLoginError(null)
          setErrorCode(null)
          setIsLoading(false)
          return
        }
        return
      }

      if (response.success && response.data) {
        const { employee, access_token } = response.data
        setAuth({
          employee,
          accessToken: access_token,
        })
        toast({
          title: "Login berhasil",
          description: `Selamat datang, ${employee.name}!`,
        })
        router.push("/dashboard")
      }
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { status?: number; data?: { error?: string; message?: string; code?: string; data?: { nik?: string } } }
      }
      const respData = err?.response?.data
      const code = respData?.error || respData?.code || null

      // Actual errors
      setErrorCode(code ?? null)
      const errorMsg = respData?.message || getErrorMessage(error)
      setLoginError(errorMsg)
      toast({
        title: "Login gagal",
        description: errorMsg,
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: { nik: string; oldPassword: string; newPassword: string }) =>
      authAPI.forceChangePassword(data.nik, data.oldPassword, data.newPassword),
    onSuccess: () => {
      toast({
        title: "Password berhasil diubah",
        description: "Silakan login dengan password baru Anda.",
      })
      setChangePasswordMode(false)
      setChangePasswordNik("")
      setChangePasswordOldPw("")
      setLoginError(null)
      resetCpForm()
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      const errorMsg = err?.response?.data?.message || "Gagal mengubah password"
      setLoginError(errorMsg)
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  useEffect(() => {
    if (!loginError) return
    if (errorCode && LOGIN_FIELD_ERROR_CODES.has(errorCode)) {
      document.getElementById("nik")?.focus()
    } else if (!changePasswordMode) {
      document.getElementById("password")?.focus()
    }
  }, [loginError, errorCode, changePasswordMode])

  const onSubmit = (data: LoginFormData) => {
    setLoginError(null)
    setErrorCode(null)
    setIsLoading(true)
    loginMutation.mutate(data)
  }

  const onSubmitChangePassword = (data: ChangePasswordFormData) => {
    setLoginError(null)
    setIsLoading(true)
    changePasswordMutation.mutate({
      nik: changePasswordNik,
      oldPassword: changePasswordOldPw,
      newPassword: data.newPassword,
    })
  }

  const handleBackToLogin = () => {
    setChangePasswordMode(false)
    setLoginError(null)
    setChangePasswordNik("")
    setChangePasswordOldPw("")
    resetCpForm()
  }

  // ============================================
  // CHANGE PASSWORD VIEW
  // ============================================
  if (changePasswordMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className={cn("w-full max-w-md", loginError && "animate-shake")}>
          <CardHeader className="space-y-1">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <KeyRound className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Ganti Password
            </CardTitle>
            <CardDescription className="text-center">
              Password masih default. Buat password baru untuk akun NIK{" "}
              <strong>{changePasswordNik}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitCp(onSubmitChangePassword)} className="space-y-4">
              {loginError && (
                <div className="rounded-md bg-destructive/15 border border-destructive/50 p-3">
                  <p className="text-sm font-medium text-destructive">{loginError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    {...registerCp("newPassword")}
                    disabled={isLoading}
                    className={cn("pr-10", cpErrors.newPassword && "border-destructive")}
                    autoFocus
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {cpErrors.newPassword && (
                  <p className="text-sm text-destructive">{cpErrors.newPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Simpan Password Baru
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBackToLogin}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // LOGIN VIEW
  // ============================================
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card
        className={cn(
          "w-full max-w-md",
          loginError && "animate-shake"
        )}
      >
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Helpdesk System
          </CardTitle>
          <CardDescription className="text-center">
            Masuk dengan NIK karyawan untuk melanjutkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {loginError && (
              <div className="rounded-md bg-destructive/15 border border-destructive/50 p-3">
                <p className="text-sm font-medium text-destructive">
                  {loginError}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="nik">NIK Karyawan</Label>
              <Input
                id="nik"
                type="text"
                placeholder="Contoh: 1.1025.274"
                {...register("nik")}
                disabled={isLoading}
                className={errors.nik ? "border-destructive" : ""}
              />
              {errors.nik && (
                <p className="text-sm text-destructive">
                  {errors.nik.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                {...register("password")}
                disabled={isLoading}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Gunakan NIK karyawan Anda untuk login</p>
            <p className="mt-1 text-xs">
              Contoh NIK: 1.1025.274
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
