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
import { Search, UserPlus, Building2 } from "lucide-react"
import { adminTeamAPI } from "@/lib/api/endpoints"
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

interface AddTeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamName: string
  existingNiks: string[]
  onAdd: (nik: string) => Promise<void>
  isAdding: boolean
}

export function AddTeamMemberDialog({
  open,
  onOpenChange,
  teamName,
  existingNiks,
  onAdd,
  isAdding,
}: AddTeamMemberDialogProps) {
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
      const res = await adminTeamAPI.searchEmployees(q.trim())
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

  // Reset on close
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
    setSelectedNik(null)
    setQuery("")
    setResults([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Tambah Anggota — {teamName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cari karyawan berdasarkan nama atau NIK
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
              Tidak ditemukan karyawan dengan pencarian &quot;{query}&quot;
            </p>
          )}

          {!isSearching &&
            results.map((emp, idx) => {
              const isAlreadyMember = existingNiks.includes(emp.nik)
              const isSelected = selectedNik === emp.nik
              const empName = typeof emp.name === "string" ? emp.name : ""
              const initials = empName
                ? empName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
                : "?"

              return (
                <button
                  key={emp.nik || `emp-${idx}`}
                  type="button"
                  disabled={isAlreadyMember}
                  onClick={() => setSelectedNik(isSelected ? null : emp.nik)}
                  className={`
                    w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors
                    ${isAlreadyMember ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent"}
                    ${isSelected ? "bg-primary/10 ring-1 ring-primary" : ""}
                  `}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{empName || "-"}</span>
                      {isAlreadyMember && (
                        <Badge variant="secondary" className="text-[10px]">
                          Sudah anggota
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
                    {emp.job_title && (
                      <p className="text-xs text-muted-foreground truncate">{emp.job_title}</p>
                    )}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Batal
          </Button>
          <Button onClick={handleAdd} disabled={!selectedNik || isAdding}>
            {isAdding ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Menambahkan...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Tambah ke Tim
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
