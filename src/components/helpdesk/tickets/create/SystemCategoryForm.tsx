"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UseFormRegister } from "react-hook-form"
import { SYSTEM_CATEGORIES, TICKET_TYPES, type CreateTicketForm } from "./constants"

interface SystemCategoryFormProps {
  systemCategory: string | undefined
  ticketType: string | undefined
  onSystemCategoryChange: (value: "odoo" | "p2h" | "job_portal" | "other") => void
  onTicketTypeChange: (value: string) => void
  register: UseFormRegister<CreateTicketForm>
}

export function SystemCategoryForm({
  systemCategory,
  ticketType,
  onSystemCategoryChange,
  onTicketTypeChange,
  register,
}: SystemCategoryFormProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Sistem <span className="text-destructive">*</span>
          </Label>
          <Select
            value={systemCategory ?? ""}
            onValueChange={(v) =>
              onSystemCategoryChange(v as "odoo" | "p2h" | "job_portal" | "other")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih sistem" />
            </SelectTrigger>
            <SelectContent>
              {SYSTEM_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipe Masalah</Label>
          <Select value={ticketType ?? ""} onValueChange={onTicketTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih tipe" />
            </SelectTrigger>
            <SelectContent>
              {TICKET_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {systemCategory === "odoo" && (
        <div className="space-y-4 rounded-lg border p-4 bg-blue-50/50">
          <Label className="text-sm font-medium">Info konteks Odoo (opsional)</Label>
          <p className="text-xs text-muted-foreground">
            Isi jika Anda tahu detail teknis halaman yang bermasalah
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">URL Halaman</Label>
              <Input
                placeholder="URL halaman yang error"
                {...register("captured_url")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Module</Label>
              <Input
                placeholder="Nama modul (Sales, Purchase, dll)"
                {...register("captured_module")}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Menu path</Label>
              <Input
                placeholder="Contoh: Sales > Orders > Quotations"
                {...register("captured_menu_path")}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
