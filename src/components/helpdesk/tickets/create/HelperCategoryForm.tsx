"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle } from "lucide-react"
import { HELPER_CATEGORIES } from "./constants"

interface HelperCategoryFormProps {
  value: string | undefined
  onChange: (value: string) => void
  error?: string
}

export function HelperCategoryForm({ value, onChange, error }: HelperCategoryFormProps) {
  return (
    <div className="space-y-2">
      <Label>
        Kategori Masalah <span className="text-destructive">*</span>
      </Label>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder="Pilih kategori masalah" />
        </SelectTrigger>
        <SelectContent>
          {HELPER_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      {!error && (
        <p className="text-xs text-muted-foreground">
          Pilih kategori yang paling sesuai dengan masalah Anda
        </p>
      )}
    </div>
  )
}
