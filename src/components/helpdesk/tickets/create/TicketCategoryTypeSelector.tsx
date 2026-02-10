"use client"

import { Label } from "@/components/ui/label"
import { Wrench, Monitor } from "lucide-react"
interface TicketCategoryTypeSelectorProps {
  value: "helper" | "system"
  onChange: (value: "helper" | "system") => void
}

export function TicketCategoryTypeSelector({
  value,
  onChange,
}: TicketCategoryTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Jenis Permintaan</Label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("helper")}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
            value === "helper"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/50"
          }`}
        >
          <Wrench
            className={`h-8 w-8 ${
              value === "helper" ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <div className="text-center">
            <p
              className={`font-medium ${
                value === "helper" ? "text-primary" : ""
              }`}
            >
              Bantuan Fisik
            </p>
            <p className="text-xs text-muted-foreground">
              AC, Listrik, Jaringan, dll
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange("system")}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
            value === "system"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/50"
          }`}
        >
          <Monitor
            className={`h-8 w-8 ${
              value === "system" ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <div className="text-center">
            <p
              className={`font-medium ${
                value === "system" ? "text-primary" : ""
              }`}
            >
              Masalah Sistem
            </p>
            <p className="text-xs text-muted-foreground">
              Odoo, P2H, Job Portal
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
