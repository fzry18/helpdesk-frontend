"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation } from "@tanstack/react-query"
import { authAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

// Validasi NIK: harus tepat 4 digit angka
const loginSchema = z.object({
  login: z.string()
    .length(4, "NIK harus tepat 4 digit")
    .regex(/^\d{4}$/, "NIK harus berupa 4 digit angka"),
  password: z.string().min(1, "Password harus diisi"),
})

type LoginFormData = z.infer<typeof loginSchema>

// Error messages dalam Bahasa Indonesia
const errorMessages: Record<string, string> = {
  INVALID_LOGIN_FORMAT: 'Format login tidak valid. Gunakan 4 digit terakhir NIK.',
  NIK_NOT_FOUND: 'NIK tidak ditemukan. Pastikan Anda memasukkan 4 digit terakhir NIK dengan benar.',
  NO_HELPDESK_PASSWORD: 'Anda belum memiliki password helpdesk. Hubungi administrator.',
  INVALID_HELPDESK_PASSWORD: 'Password salah. Silakan coba lagi.',
  NETWORK_ERROR: 'Terjadi kesalahan jaringan. Periksa koneksi internet Anda.',
  SERVER_ERROR: 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.',
}

const getErrorMessage = (error: any): string => {
  const errorCode = error.response?.data?.error
  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode]
  }
  if (error.message === 'Network Error') {
    return errorMessages.NETWORK_ERROR
  }
  return error.response?.data?.message || errorMessages.SERVER_ERROR
}

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => authAPI.login(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { employee, access_token } = response.data

        // Set auth dengan employee (bukan user!)
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
    onError: (error: any) => {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Helpdesk System</CardTitle>
          <CardDescription className="text-center">
            Masuk dengan NIK untuk melanjutkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login">NIK (4 digit terakhir)</Label>
              <Input
                id="login"
                type="text"
                placeholder="Contoh: 6049"
                maxLength={4}
                inputMode="numeric"
                pattern="\d{4}"
                {...register("login")}
                disabled={isLoading}
                className={errors.login ? "border-destructive" : ""}
              />
              {errors.login && (
                <p className="text-sm text-destructive">{errors.login.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password Helpdesk</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password helpdesk"
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
            <p>Gunakan 4 digit terakhir NIK Anda untuk login</p>
            <p className="mt-1 text-xs">Contoh NIK: 81.0525.6049 → Login: 6049</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

