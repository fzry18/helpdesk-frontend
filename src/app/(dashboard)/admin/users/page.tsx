"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  ShieldCheck,
  Search,
  UserPlus,
  Loader2,
  AlertCircle,
  Building2,
  Briefcase,
  Check,
  Trash2,
} from "lucide-react"

interface EmployeeUser {
  id: number
  nik: string
  name: string
  email: string
  department: string
  job_title: string
  operating_unit: string
  is_super_admin: boolean
  role: string
  roles: string[]
}

interface OdooEmployee {
  id: number
  nik: string
  name: string
  operating_unit: string
  department?: string
  job_title?: string
}

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; desc: string }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
    desc: "Akses penuh sistem, kelola hak akses & master data",
  },
  ADMIN_IT_SUPPORT: {
    label: "Admin IT Support",
    color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
    desc: "Dispatcher tiket, assign teknisi, pantau seluruh tiket",
  },
  IT_SUPPORT: {
    label: "IT Support",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
    desc: "Teknisi pelaksana, tangani tiket & catatan teknis",
  },
  USER: {
    label: "User",
    color: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
    desc: "Requestor umum, buat tiket & konfirmasi selesai",
  },
}

export default function UsersManagementPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { hasRole, employee: currentEmployee } = useAuthStore()
  const isSuperAdmin = hasRole("SUPER_ADMIN")
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [odooQuery, setOdooQuery] = useState("")
  const [selectedOdooEmp, setSelectedOdooEmp] = useState<OdooEmployee | null>(null)
  const [assignRole, setAssignRole] = useState("IT_SUPPORT")
  const [deleteTargetUser, setDeleteTargetUser] = useState<EmployeeUser | null>(null)

  // Fetch local employees
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (roleFilter !== "ALL") params.set("role", roleFilter)
      const res = await apiClient.get<{ success: boolean; data: EmployeeUser[] }>(
        `/users?${params.toString()}`
      )
      return res.data || []
    },
    enabled: isSuperAdmin,
  })

  // Search Odoo employees query
  const {
    data: odooResults,
    isFetching: isSearchingOdoo,
    error: odooSearchError,
  } = useQuery({
    queryKey: ["odoo-search", odooQuery],
    queryFn: async () => {
      const trimmed = odooQuery.trim()
      if (trimmed.length < 2) return []
      const isNik = /^[\d\.]+$/.test(trimmed)
      const paramKey = isNik ? "f_nik" : "f_name"
      const res = await apiClient.get<{ success: boolean; data: OdooEmployee[] }>(
        `/users/search-odoo?${paramKey}=${encodeURIComponent(trimmed)}`
      )
      return res.data || []
    },
    enabled: odooQuery.trim().length >= 2,
    retry: false,
  })

  // Change Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({
      employee_id,
      role_slug,
    }: {
      employee_id: number
      role_slug: string
    }) => apiClient.put<any>("/users", { employee_id, role_slug }),
    onSuccess: (data: any) => {
      toast({
        title: "Peran Diperbarui",
        description: data?.message || "Hak akses karyawan berhasil diperbarui.",
      })
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Mengubah Role",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  // Import from Odoo Mutation
  const importEmployeeMutation = useMutation({
    mutationFn: (payload: {
      employee_id: number
      nik: string
      name: string
      operating_unit: string
      department?: string
      job_title?: string
      role_slug: string
    }) => apiClient.post<any>("/users/search-odoo", payload),
    onSuccess: (data: any) => {
      toast({
        title: "Karyawan Ditambahkan",
        description: data.message || "Karyawan berhasil didaftarkan.",
      })
      setIsAddOpen(false)
      setSelectedOdooEmp(null)
      setOdooQuery("")
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menambahkan Karyawan",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiClient.delete<any>(`/users?id=${userId}`),
    onSuccess: (data: any) => {
      toast({
        title: "Pengguna Dihapus",
        description: data?.message || "Pengguna berhasil dihapus.",
      })
      setDeleteTargetUser(null)
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menghapus Pengguna",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  if (!isHydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="rounded-full bg-destructive/10 p-4 mb-4 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">Akses Ditolak</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Halaman Manajemen Pengguna & Role RBAC hanya dapat diakses oleh Super Admin.
        </p>
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>
          Kembali ke Dashboard
        </Button>
      </div>
    )
  }

  const users = usersData || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              Manajemen Pengguna & Staf
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Kelola hak akses staf penangan tiket (Super Admin, Admin IT Support, IT Support) dan penetapan role RBAC
          </p>
        </div>

        {isSuperAdmin && (
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Tambah Karyawan dari Odoo
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan nama, NIK, atau departemen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="w-full md:w-56">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Role</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN_IT_SUPPORT">Admin IT Support</SelectItem>
                  <SelectItem value="IT_SUPPORT">IT Support</SelectItem>
                  <SelectItem value="USER">User (Requestor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna ({users.length})</CardTitle>
          <CardDescription>
            Tabel seluruh karyawan yang terdaftar dan hak akses aktif di Helpdesk
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
              <p className="font-medium">Tidak ada data pengguna ditemukan.</p>
              <p className="text-xs">Coba sesuaikan kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Karyawan</th>
                    <th className="px-6 py-3">Departemen & Jabatan</th>
                    <th className="px-6 py-3">Unit Kerja</th>
                    <th className="px-6 py-3">Peran Saat Ini</th>
                    <th className="px-6 py-3 text-right">Aksi Hak Akses</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => {
                    const primaryRole = u.roles[0] || "USER"
                    const config = ROLE_CONFIG[primaryRole] || ROLE_CONFIG.USER

                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground">NIK: {u.nik}</div>
                          {u.email && (
                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                              {u.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{u.department}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span>{u.job_title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-medium">
                            {u.operating_unit}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={`border px-2.5 py-0.5 font-medium ${config.color}`}
                          >
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isSuperAdmin ? (
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                value={primaryRole}
                                onValueChange={(val) =>
                                  updateRoleMutation.mutate({
                                    employee_id: u.id,
                                    role_slug: val,
                                  })
                                }
                                disabled={updateRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-40 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                  <SelectItem value="ADMIN_IT_SUPPORT">
                                    Admin IT Support
                                  </SelectItem>
                                  <SelectItem value="IT_SUPPORT">IT Support</SelectItem>
                                  <SelectItem value="USER">User (Requestor)</SelectItem>
                                </SelectContent>
                              </Select>

                              {!(
                                currentEmployee?.id === u.id ||
                                currentEmployee?.nik === u.nik
                              ) ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Hapus Pengguna dari Helpdesk"
                                  onClick={() => setDeleteTargetUser(u)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground/30 cursor-not-allowed"
                                  title="Akun Anda sendiri tidak dapat dihapus"
                                  disabled
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Hanya Super Admin
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Tambah Karyawan dari Odoo */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cari & Tambah Karyawan dari Odoo</DialogTitle>
            <DialogDescription>
              Cari data karyawan dari Odoo Live ERP dan tentukan peran awalnya di Helpdesk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama atau NIK Karyawan</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Ketik minimal 2 karakter (contoh: fazry atau 1.1025)..."
                  value={odooQuery}
                  onChange={(e) => {
                    setOdooQuery(e.target.value)
                    setSelectedOdooEmp(null)
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Odoo Search Error Alert */}
            {odooSearchError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Pencarian Odoo Terkendala</p>
                  <p>
                    {(odooSearchError as any)?.response?.data?.message ||
                      (odooSearchError as any)?.message ||
                      "Gagal mengambil data dari server Odoo Live."}
                  </p>
                </div>
              </div>
            )}

            {!isSearchingOdoo && !odooSearchError && odooQuery.length >= 2 && (!odooResults || odooResults.length === 0) && (
              <p className="text-center text-xs text-muted-foreground py-4">
                Tidak ditemukan karyawan di Odoo dengan kata kunci &quot;{odooQuery}&quot;.
              </p>
            )}

            {odooResults && odooResults.length > 0 && !selectedOdooEmp && (
              <div className="max-h-52 overflow-y-auto rounded-md border divide-y bg-background">
                {odooResults.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedOdooEmp(emp)}
                    className="w-full text-left p-2.5 hover:bg-accent transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        NIK: {emp.nik} • Unit: {emp.operating_unit}
                      </p>
                    </div>
                    <span className="text-xs text-primary font-medium">Pilih</span>
                  </button>
                ))}
              </div>
            )}

            {selectedOdooEmp && (
              <div className="rounded-lg border bg-primary/5 p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{selectedOdooEmp.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    NIK: {selectedOdooEmp.nik} • Unit: {selectedOdooEmp.operating_unit}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOdooEmp(null)}
                  className="text-xs h-7"
                >
                  Ganti
                </Button>
              </div>
            )}

            {/* Role Assignment */}
            {selectedOdooEmp && (
              <div className="space-y-2 pt-2 border-t">
                <label className="text-sm font-medium">Peran di Helpdesk</label>
                <Select value={assignRole} onValueChange={setAssignRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">Super Admin (Akses Mutlak)</SelectItem>
                    <SelectItem value="ADMIN_IT_SUPPORT">
                      Admin IT Support (Dispatcher Tim)
                    </SelectItem>
                    <SelectItem value="IT_SUPPORT">IT Support (Teknisi)</SelectItem>
                    <SelectItem value="USER">User (Requestor Umum)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ROLE_CONFIG[assignRole]?.desc}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false)
                setSelectedOdooEmp(null)
              }}
            >
              Batal
            </Button>
            <Button
              disabled={!selectedOdooEmp || importEmployeeMutation.isPending}
              onClick={() => {
                if (!selectedOdooEmp) return
                importEmployeeMutation.mutate({
                  employee_id: selectedOdooEmp.id,
                  nik: selectedOdooEmp.nik,
                  name: selectedOdooEmp.name,
                  operating_unit: selectedOdooEmp.operating_unit,
                  department: selectedOdooEmp.department,
                  job_title: selectedOdooEmp.job_title,
                  role_slug: assignRole,
                })
              }}
            >
              {importEmployeeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Karyawan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Konfirmasi Hapus Pengguna */}
      <Dialog
        open={!!deleteTargetUser}
        onOpenChange={(open) => !open && setDeleteTargetUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Cabut Hak Akses Staf
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground/80">
              Apakah Anda yakin ingin mencabut hak akses staf untuk{" "}
              <strong className="text-foreground">{deleteTargetUser?.name}</strong>{" "}
              (NIK: {deleteTargetUser?.nik})?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            Peran staf dan keanggotaan tim Helpdesk akan dicabut. Pengguna akan dikembalikan menjadi User biasa (pelapor tiket), dan seluruh riwayat tiket masa lalunya akan tetap tersimpan secara aman.
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTargetUser(null)}
              disabled={deleteUserMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTargetUser) {
                  deleteUserMutation.mutate(deleteTargetUser.id)
                }
              }}
              disabled={deleteUserMutation.isPending}
              className="gap-2"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Cabut Akses Staf
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
