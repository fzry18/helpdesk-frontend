"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, UserPlus, Building2, Shield } from "lucide-react"
import { adminAPI } from "@/lib/api/endpoints"
import { useDebounce } from "@/hooks/use-performance"

interface OdooEmployee {
  odoo_id: number
  nik: string
  name: string
  department: string
  department_id: number | null
  job_title: string
  email: string
  phone: string
  operating_unit: string
  helpdesk_role: string
}

interface AddAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (nik: string) => Promise<void>
  isAdding: boolean
}

export function AddAdminDialog({ open, onOpenChange, onAdd, isAdding }: AddAdminDialogProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<OdooEmployee[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedNik, setSelectedNik] = useState<string | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setIsSearching(true)
    try {
      const res = await adminAPI.searchEmployees(q.trim())
      setResults(res.data || [])
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const debouncedSearch = useDebounce(doSearch, 400)

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setSelectedNik(null)
    }
  }, [open])

  const handleAdd = async () => {
    if (!selectedNik) return
    await onAdd(selectedNik)
    onOpenChange(false)
  }

  const selectedEmployee = results.find((e) => e.nik === selectedNik)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tambah Dept Admin
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Karyawan akan menjadi admin untuk departemen mereka sendiri
          </p>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan nama atau NIK..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {isSearching && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isSearching && query.length >= 2 && results.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Tidak ditemukan karyawan dengan pencarian "{query}"
            </p>
          )}

          {!isSearching &&
            results.map((emp) => {
              const isAlreadyAdmin = emp.helpdesk_role === "dept_admin" || emp.helpdesk_role === "super_admin"
              const isSelected = selectedNik === emp.nik

              return (
                <button
                  key={emp.nik}
                  type="button"
                  disabled={isAlreadyAdmin}
                  onClick={() => setSelectedNik(isSelected ? null : emp.nik)}
                  className={`
                    w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors
                    ${isAlreadyAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent"}
                    ${isSelected ? "bg-primary/10 ring-1 ring-primary" : ""}
                  `}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {emp.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{emp.name}</span>
                      {isAlreadyAdmin && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Shield className="mr-1 h-3 w-3" />
                          {emp.helpdesk_role === "super_admin" ? "Super Admin" : "Dept Admin"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>NIK: {emp.nik}</span>
                      {emp.department && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {emp.department}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

          {!isSearching && query.length < 2 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Ketik minimal 2 karakter untuk mencari karyawan
            </p>
          )}
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Batal
          </Button>
          <Button onClick={handleAdd} disabled={!selectedNik || isAdding}>
            {isAdding ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Menyimpan...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Jadikan Dept Admin
              </>
            )}
          </Button>
        </DialogFooter>

        {/* Info departemen yang akan di-admin-kan */}
        {selectedEmployee && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              <Building2 className="mr-1 inline h-3.5 w-3.5" />
              {selectedEmployee.name} akan menjadi admin untuk dept:{" "}
              <strong>{selectedEmployee.department || "(belum ada dept)"}</strong>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
