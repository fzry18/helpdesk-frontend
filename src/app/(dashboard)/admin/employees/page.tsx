"use client"

import React, { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { adminAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DebouncedSearch } from "@/components/ui/debounced-search"
import { AdminEmployeeTable } from "@/components/helpdesk/admin/AdminEmployeeTable"
import { AddAdminDialog } from "@/components/helpdesk/admin/AddAdminDialog"
import { ShieldPlus, Shield } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function AdminEmployeesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const employee = useAuthStore((s) => s.employee)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  // Guard: only super_admin
  const isSuperAdmin = employee?.helpdesk_role === "super_admin"

  // Fetch admin employees
  const { data: adminsRes, isLoading } = useQuery({
    queryKey: ["admin-employees", search],
    queryFn: () => adminAPI.getAdmins({ search: search || undefined }),
    enabled: isSuperAdmin,
  })

  const admins = adminsRes?.data || []

  // Set role mutation
  const setRoleMutation = useMutation({
    mutationFn: (data: { nik: string; role: "DEPT_ADMIN" | "USER" }) =>
      adminAPI.setRole(data),
    onSuccess: (res) => {
      toast({ title: "Berhasil", description: res.message || "Role berhasil diperbarui" })
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] })
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Gagal",
        description: err.response?.data?.message || err.message || "Gagal mengubah role",
        variant: "destructive",
      })
    },
  })

  const handleAddAdmin = useCallback(
    async (nik: string) => {
      await setRoleMutation.mutateAsync({ nik, role: "DEPT_ADMIN" })
    },
    [setRoleMutation]
  )

  const handleRemoveAdmin = useCallback(
    (emp: { nik: string; name: string }) => {
      if (!confirm(`Yakin ingin menghapus ${emp.name} dari Dept Admin?`)) return
      setRoleMutation.mutate({ nik: emp.nik, role: "USER" })
    },
    [setRoleMutation]
  )

  const handleSearch = useCallback((q: string) => {
    setSearch(q)
  }, [])

  // Redirect non-super-admin
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold mb-1">Akses Dibatasi</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Halaman ini hanya dapat diakses oleh Super Admin
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Kembali ke Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Admin</h1>
          <p className="text-sm text-muted-foreground">
            Atur hak akses admin helpdesk per departemen
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <ShieldPlus className="h-4 w-4" />
          Tambah Admin
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Daftar Admin Helpdesk</CardTitle>
              <CardDescription>
                {!isLoading && `${admins.length} admin terdaftar`}
              </CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <DebouncedSearch
                onSearch={handleSearch}
                placeholder="Cari nama atau NIK..."
                debounceMs={300}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdminEmployeeTable
            employees={admins}
            isLoading={isLoading}
            onRemoveAdmin={handleRemoveAdmin}
            isRemoving={setRoleMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Add admin dialog */}
      <AddAdminDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAddAdmin}
        isAdding={setRoleMutation.isPending}
      />
    </div>
  )
}
