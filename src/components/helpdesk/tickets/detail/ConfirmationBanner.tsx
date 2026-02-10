"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

interface ConfirmationBannerProps {
  onConfirmResolved: (data?: { satisfaction?: string; feedback?: string }) => void
  isPending: boolean
}

/**
 * Banner shown when ticket is waiting for user confirmation (admin marked resolved).
 * User can confirm that the issue is resolved.
 */
export function ConfirmationBanner({
  onConfirmResolved,
  isPending,
}: ConfirmationBannerProps) {
  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-green-800">
          <CheckCircle className="h-4 w-4" />
          Konfirmasi Selesai
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-green-800">
          Admin telah menyelesaikan ticket ini. Silakan konfirmasi apakah masalah sudah
          teratasi.
        </p>
        <Button
          size="sm"
          onClick={() => onConfirmResolved()}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {isPending ? "Memproses..." : "Konfirmasi Selesai"}
        </Button>
      </CardContent>
    </Card>
  )
}
