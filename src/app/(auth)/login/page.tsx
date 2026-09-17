"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation } from "@tanstack/react-query"
import { authAPI } from "@/lib/api/endpoints"
import { apiClient } from "@/lib/api/client"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Loader2, KeyRound, ShieldAlert, CheckCircle2 } from "lucide-react"

// Validasi NIK lengkap
const loginSchema = z.object({
  nik: z
    .string()
    .min(1, "NIK harus diisi")
    .regex(/^[\d.]+$/, "NIK hanya boleh berisi angka dan titik"),
  password: z.string().min(1, "Password harus diisi"),
})

type LoginFormData = z.infer<typeof loginSchema>

// Validasi Form Ganti Password Default
const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "Password lama harus diisi"),
    new_password: z
      .string()
      .min(6, "Password baru minimal 6 karakter")
      .max(50, "Password baru maksimal 50 karakter"),
    confirm_password: z.string().min(1, "Konfirmasi password harus diisi"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Konfirmasi password tidak cocok",
  })

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

const errorMessages: Record<string, string> = {
  INVALID_LOGIN_FORMAT: "Format NIK tidak valid.",
  NIK_NOT_FOUND: "NIK tidak ditemukan. Pastikan NIK Anda benar.",
  NO_HELPDESK_PASSWORD: "Anda belum memiliki password. Hubungi administrator IT.",
  INVALID_HELPDESK_PASSWORD: "Password salah. Silakan coba lagi.",
  NETWORK_ERROR: "Terjadi kesalahan jaringan. Periksa koneksi internet Anda.",
  SERVER_ERROR: "Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.",
}

const getErrorMessage = (error: any): string => {
  const errorCode = error.response?.data?.error
  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode]
  }
  if (error.message === "Network Error") {
    return errorMessages.NETWORK_ERROR
  }
  return error.response?.data?.message || error.message || errorMessages.SERVER_ERROR
}

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  // Guest guard: jika sudah login, redirect langsung ke dashboard
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (isAuthenticated || token) {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, router])

  // State Dialog Ganti Password Default
  const [isDefaultPasswordModalOpen, setIsDefaultPasswordModalOpen] = useState(false)
  const [defaultPasswordNik, setDefaultPasswordNik] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const {
    register: registerChange,
    handleSubmit: handleChangeSubmit,
    setValue: setChangeValue,
    reset: resetChangeForm,
    formState: { errors: changeErrors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      old_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  // Mutasi Login Utama
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => authAPI.login(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { employee, access_token, roles, permissions } = response.data

        const enrichedEmployee = {
          ...employee,
          roles,
          permissions,
        }

        setAuth({
          employee: enrichedEmployee,
          accessToken: access_token,
        })

        toast({
          title: "Login berhasil",
          description: `Selamat datang, ${employee.name}!`,
        })
        router.push("/dashboard")
      }
    },
    onError: (error: any) => {
      const status = error.response?.status
      const data = error.response?.data
      const message = data?.message || error.message || ""
      const isDefault =
        status === 409 ||
        data?.code === "DEFAULT_PASSWORD" ||
        message.toLowerCase().includes("default") ||
        message.toLowerCase().includes("wajib ganti")

      if (isDefault) {
        // Tangkap kondisi password default secara tepat
        const currentNik = getValues("nik")
        const currentPassword = getValues("password")

        setDefaultPasswordNik(currentNik)
        setChangeValue("old_password", currentPassword)
        setChangeValue("new_password", "")
        setChangeValue("confirm_password", "")
        setIsDefaultPasswordModalOpen(true)

        toast({
          title: "Password Masih Default",
          description:
            "Akun Anda masih menggunakan password default. Harap buat password baru untuk keamanan akun Anda.",
        })
        return
      }

      toast({
        title: "Login gagal",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    loginMutation.mutate(data)
  }

  // Handle Form Ganti Password Default
  const onChangePasswordSubmit = async (values: ChangePasswordFormData) => {
    setIsChangingPassword(true)
    try {
      // 1. Panggil route ganti password Odoo
      const changeRes = await apiClient.post<{ success: boolean; message: string }>(
        "/auth/change-password",
        {
          nik: defaultPasswordNik,
          old_password: values.old_password,
          new_password: values.new_password,
        }
      )

      if (!changeRes.success) {
        throw new Error(changeRes.message || "Gagal mengubah password")
      }

      toast({
        title: "Password Berhasil Diubah",
        description: "Password baru telah aktif. Sedang mengalihkan ke dashboard...",
      })

      setIsDefaultPasswordModalOpen(false)
      resetChangeForm()

      // 2. Auto-login dengan password baru
      setIsLoading(true)
      loginMutation.mutate({
        nik: defaultPasswordNik,
        password: values.new_password,
      })
    } catch (err: any) {
      console.error("[Change Password Error]:", err)
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Gagal mengganti password. Periksa kembali data yang dimasukkan."

      toast({
        title: "Gagal Mengubah Password",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200/80">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-foreground">
            Helpdesk System
          </CardTitle>
          <CardDescription className="text-center">
            Masuk dengan NIK untuk melanjutkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nik">NIK (Nomor Induk Karyawan)</Label>
              <Input
                id="nik"
                type="text"
                placeholder="Contoh: 1.1025.274"
                {...register("nik")}
                disabled={isLoading}
                className={errors.nik ? "border-destructive" : ""}
              />
              {errors.nik && (
                <p className="text-sm text-destructive">{errors.nik.message}</p>
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
                <p className="text-sm text-destructive">{errors.password.message}</p>
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
            <p>Gunakan NIK lengkap Anda untuk login</p>
            <p className="mt-1 text-xs">Contoh: 1.1025.274</p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Modal: Ganti Password Default */}
      <Dialog
        open={isDefaultPasswordModalOpen}
        onOpenChange={(open) => {
          if (!isChangingPassword) setIsDefaultPasswordModalOpen(open)
        }}
      >
        <DialogContent className="max-w-md sm:rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-6 w-6" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Ganti Password Default
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Password akun NIK <span className="font-semibold text-foreground">{defaultPasswordNik}</span> masih default. Demi keamanan sistem, Anda diwajibkan mengganti password sebelum masuk.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangeSubmit(onChangePasswordSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="default-old-password">Password Lama</Label>
              <Input
                id="default-old-password"
                type="password"
                placeholder="Password saat ini"
                {...registerChange("old_password")}
                disabled={isChangingPassword}
                className={changeErrors.old_password ? "border-destructive" : ""}
              />
              {changeErrors.old_password && (
                <p className="text-xs text-destructive">{changeErrors.old_password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="default-new-password">Password Baru</Label>
              <Input
                id="default-new-password"
                type="password"
                placeholder="Minimal 6 karakter"
                {...registerChange("new_password")}
                disabled={isChangingPassword}
                className={changeErrors.new_password ? "border-destructive" : ""}
              />
              {changeErrors.new_password && (
                <p className="text-xs text-destructive">{changeErrors.new_password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="default-confirm-password">Konfirmasi Password Baru</Label>
              <Input
                id="default-confirm-password"
                type="password"
                placeholder="Ulangi password baru"
                {...registerChange("confirm_password")}
                disabled={isChangingPassword}
                className={changeErrors.confirm_password ? "border-destructive" : ""}
              />
              {changeErrors.confirm_password && (
                <p className="text-xs text-destructive">{changeErrors.confirm_password.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDefaultPasswordModalOpen(false)}
                disabled={isChangingPassword}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isChangingPassword}
                className="gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Ganti Password & Masuk
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
