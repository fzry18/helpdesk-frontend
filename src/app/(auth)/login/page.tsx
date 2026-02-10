"use client"

import { useState, useEffect } from "react"
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { getErrorMessage } from "@/lib/constants/error-messages"
import { cn } from "@/lib/utils"

const loginSchema = z.object({
  login: z
    .string()
    .length(4, "NIK harus tepat 4 digit")
    .regex(/^\d{4}$/, "NIK harus berupa 4 digit angka"),
  password: z.string().min(1, "Password harus diisi"),
})

type LoginFormData = z.infer<typeof loginSchema>

/** Error codes that indicate the login (NIK) field is wrong */
const LOGIN_FIELD_ERROR_CODES = new Set([
  "INVALID_LOGIN_FORMAT",
  "NIK_NOT_FOUND",
])

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

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
      const err = error as { response?: { data?: { error?: string } } }
      const code = err?.response?.data?.error ?? null
      setErrorCode(code ?? null)
      const errorMsg = getErrorMessage(error)
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

  // Focus field that caused error; do NOT reset form on error
  useEffect(() => {
    if (!loginError) return
    if (errorCode && LOGIN_FIELD_ERROR_CODES.has(errorCode)) {
      document.getElementById("login")?.focus()
    } else {
      document.getElementById("password")?.focus()
    }
  }, [loginError, errorCode])

  const onSubmit = (data: LoginFormData) => {
    setLoginError(null)
    setErrorCode(null)
    setIsLoading(true)
    loginMutation.mutate(data)
  }

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
            Masuk dengan NIK untuk melanjutkan
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
                <p className="text-sm text-destructive">
                  {errors.login.message}
                </p>
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
            <p>Gunakan 4 digit terakhir NIK Anda untuk login</p>
            <p className="mt-1 text-xs">
              Contoh NIK: 81.0525.6049 → Login: 6049
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
