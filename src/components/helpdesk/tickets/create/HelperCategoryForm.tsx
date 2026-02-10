"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HELPER_CATEGORIES } from "./constants"

interface HelperCategoryFormProps {
  value: string | undefined
  onChange: (value: string) => void
}

export function HelperCategoryForm({ value, onChange }: HelperCategoryFormProps) {
  return (
    <div className="space-y-2">
      <Label>
        Kategori Masalah <span className="text-destructive">*</span>
      </Label>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger>
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
      <p className="text-xs text-muted-foreground">
        Pilih kategori yang paling sesuai dengan masalah Anda
      </p>
    </div>
  )
}
