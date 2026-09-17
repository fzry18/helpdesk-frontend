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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
  Database,
  Tag,
  Users,
  GitFork,
  Plus,
  Loader2,
  FolderOpen,
  UserPlus,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react"

interface CategoryItem {
  id: number
  name: string
  sequence: number
}

interface TeamMemberInfo {
  id: number
  nik: string
  name: string
  email?: string | null
  jobTitle?: string | null
  department?: string | null
}

interface TeamItem {
  id: number
  name: string
  email?: string | null
  member_count: number
  members?: TeamMemberInfo[]
}

interface StageItem {
  id: number
  name: string
  sequence: number
  is_starting: boolean
  is_closing: boolean
}

export default function MasterDataPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { hasPermission, hasRole } = useAuthStore()
  const canManage =
    hasRole("SUPER_ADMIN") ||
    hasRole("ADMIN_IT_SUPPORT") ||
    hasPermission("master:manage")
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const [activeTab, setActiveTab] = useState<"categories" | "teams" | "stages">(
    "categories"
  )

  // Dialog State
  const [modalType, setModalType] = useState<"category" | "team" | "stage" | null>(
    null
  )
  const [editingItem, setEditingItem] = useState<{
    id: number
    type: "category" | "team" | "stage"
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "team" | "stage"
    id: number
    name: string
  } | null>(null)

  const [nameInput, setNameInput] = useState("")
  const [sequenceInput, setSequenceInput] = useState<number>(10)
  const [extraInput, setExtraInput] = useState("")
  const [isStarting, setIsStarting] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Managing Team Members State
  const [managingTeam, setManagingTeam] = useState<TeamItem | null>(null)
  const [selectedEmpId, setSelectedEmpId] = useState<string>("")

  // Fetch Master Data
  const { data: masterData, isLoading } = useQuery({
    queryKey: ["admin-master-data"],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean
        data: {
          categories: CategoryItem[]
          teams: TeamItem[]
          stages: StageItem[]
        }
      }>("/master-data")
      return res.data
    },
  })

  // Fetch all employees for team member assignment dropdown
  const { data: allEmployeesData } = useQuery({
    queryKey: ["all-employees-dropdown"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: any[] }>("/users")
      return res.data || []
    },
    enabled: !!managingTeam,
  })

  // Add Member Mutation
  const addMemberMutation = useMutation({
    mutationFn: (payload: { teamId: number; employeeId: number }) =>
      apiClient.post<any>(`/teams/${payload.teamId}/members`, {
        employee_id: payload.employeeId,
      }),
    onSuccess: (data: any) => {
      toast({
        title: "Berhasil",
        description: data?.message || "Anggota berhasil ditambahkan ke tim.",
      })
      setSelectedEmpId("")
      queryClient.invalidateQueries({ queryKey: ["admin-master-data"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menambahkan Anggota",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: (payload: { teamId: number; employeeId: number }) =>
      apiClient.delete<any>(
        `/teams/${payload.teamId}/members?employee_id=${payload.employeeId}`
      ),
    onSuccess: (data: any) => {
      toast({
        title: "Berhasil",
        description: data?.message || "Anggota berhasil dihapus dari tim.",
      })
      queryClient.invalidateQueries({ queryKey: ["admin-master-data"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menghapus Anggota",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  // Create / Update Category Mutation
  const saveCategoryMutation = useMutation({
    mutationFn: (payload: { id?: number; name: string; sequence: number }) => {
      if (payload.id) {
        return apiClient.put<any>("/categories", payload)
      }
      return apiClient.post<any>("/categories", payload)
    },
    onSuccess: (data: any) => {
      toast({
        title: "Berhasil",
        description: data?.message || "Kategori berhasil disimpan.",
      })
      setModalType(null)
      setEditingItem(null)
      setNameInput("")
      queryClient.invalidateQueries({ queryKey: ["admin-master-data"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menyimpan Kategori",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  // Delete Category Mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete<any>(`/categories?id=${id}`),
    onSuccess: (data: any) => {
      toast({
        title: "Berhasil",
        description: data?.message || "Kategori berhasil dihapus.",
      })
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ["admin-master-data"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menghapus Kategori",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  // Create / Update Team Mutation
  const saveTeamMutation = useMutation({
    mutationFn: (payload: { id?: number; name: string; email?: string }) => {
      if (payload.id) {
        return apiClient.put<any>("/teams", payload)
      }
      return apiClient.post<any>("/teams", payload)
    },
    onSuccess: (data: any) => {
      toast({
        title: "Berhasil",
        description: data?.message || "Tim berhasil disimpan.",
      })
      setModalType(null)
      setEditingItem(null)
      setNameInput("")
      setExtraInput("")
      queryClient.invalidateQueries({ queryKey: ["admin-master-data"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menyimpan Tim",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  // Delete Team Mutation
  const deleteTeamMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete<any>(`/teams?id=${id}`),
    onSuccess: (data: any) => {
      toast({
        title: "Berhasil",
        description: data?.message || "Tim berhasil dihapus.",
      })
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ["admin-master-data"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menghapus Tim",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  // Create / Update Stage Mutation
  const saveStageMutation = useMutation({
    mutationFn: (payload: {
      id?: number
      name: string
      sequence: number
      is_starting: boolean
      is_closing: boolean
    }) => {
      if (payload.id) {
        return apiClient.put<any>("/stages", payload)
      }
      return apiClient.post<any>("/stages", payload)
    },
    onSuccess: (data: any) => {
      toast({
        title: "Berhasil",
        description: data?.message || "Tahapan tiket berhasil disimpan.",
      })
      setModalType(null)
      setEditingItem(null)
      setNameInput("")
      setIsStarting(false)
      setIsClosing(false)
      queryClient.invalidateQueries({ queryKey: ["admin-master-data"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menyimpan Tahapan",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  // Delete Stage Mutation
  const deleteStageMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete<any>(`/stages?id=${id}`),
    onSuccess: (data: any) => {
      toast({
        title: "Berhasil",
        description: data?.message || "Tahapan berhasil dihapus.",
      })
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ["admin-master-data"] })
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menghapus Tahapan",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      })
    },
  })

  const categories = masterData?.categories || []
  const teams = masterData?.teams || []
  const stages = masterData?.stages || []

  // Open Create Modals
  const openCreateCategory = () => {
    setEditingItem(null)
    setNameInput("")
    setSequenceInput((categories.length + 1) * 10)
    setModalType("category")
  }

  const openCreateTeam = () => {
    setEditingItem(null)
    setNameInput("")
    setExtraInput("")
    setModalType("team")
  }

  const openCreateStage = () => {
    setEditingItem(null)
    setNameInput("")
    setSequenceInput((stages.length + 1) * 10)
    setIsStarting(false)
    setIsClosing(false)
    setModalType("stage")
  }

  // Open Edit Modals
  const openEditCategory = (c: CategoryItem) => {
    setEditingItem({ id: c.id, type: "category" })
    setNameInput(c.name)
    setSequenceInput(c.sequence)
    setModalType("category")
  }

  const openEditTeam = (t: TeamItem) => {
    setEditingItem({ id: t.id, type: "team" })
    setNameInput(t.name)
    setExtraInput(t.email || "")
    setModalType("team")
  }

  const openEditStage = (s: StageItem) => {
    setEditingItem({ id: s.id, type: "stage" })
    setNameInput(s.name)
    setSequenceInput(s.sequence)
    setIsStarting(s.is_starting)
    setIsClosing(s.is_closing)
    setModalType("stage")
  }

  // Current team when managing members modal is active
  const currentTeam = managingTeam
    ? teams.find((t) => t.id === managingTeam.id) || managingTeam
    : null
  const currentTeamMembers = currentTeam?.members || []
  const currentMemberIds = new Set(currentTeamMembers.map((m) => m.id))
  const allEmps = (allEmployeesData as any[]) || []
  const availableEmployees = allEmps.filter((e) => !currentMemberIds.has(e.id))

  if (!isHydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="rounded-full bg-destructive/10 p-4 mb-4 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">Akses Ditolak</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Halaman Master Data hanya dapat diakses oleh Super Admin dan Admin IT Support.
        </p>
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>
          Kembali ke Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Master Data</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Konfigurasi kategori masalah, tim penangan teknisi, dan alur tahapan tiket
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            {activeTab === "categories" && (
              <Button onClick={openCreateCategory} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Kategori
              </Button>
            )}
            {activeTab === "teams" && (
              <Button onClick={openCreateTeam} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Tim
              </Button>
            )}
            {activeTab === "stages" && (
              <Button onClick={openCreateStage} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Tahapan
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === "categories"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag className="h-4 w-4" />
          Kategori Tiket ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab("teams")}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === "teams"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Tim Helpdesk ({teams.length})
        </button>

        <button
          onClick={() => setActiveTab("stages")}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === "stages"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <GitFork className="h-4 w-4" />
          Tahapan Alur / Stages ({stages.length})
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* TAB 1: Kategori */}
          {activeTab === "categories" && (
            <Card>
              <CardHeader>
                <CardTitle>Daftar Kategori Masalah</CardTitle>
                <CardDescription>
                  Kategori pengelompokan jenis gangguan atau permintaan helpdesk
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3">Urutan</th>
                        <th className="px-6 py-3">Nama Kategori</th>
                        <th className="px-6 py-3">ID Kategori</th>
                        <th className="px-6 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {categories.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30">
                          <td className="px-6 py-4 font-mono text-xs">{c.sequence}</td>
                          <td className="px-6 py-4 font-medium flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-primary/70" />
                            {c.name}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                            #{c.id}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {canManage && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCategory(c)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Kategori"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "category",
                                      id: c.id,
                                      name: c.name,
                                    })
                                  }
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Hapus Kategori"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: Tim */}
          {activeTab === "teams" && (
            <Card>
              <CardHeader>
                <CardTitle>Daftar Tim Helpdesk & Teknisi</CardTitle>
                <CardDescription>
                  Grup penanganan tiket dan dispatcher penugasan teknisi IT
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3">Nama Tim</th>
                        <th className="px-6 py-3">Email Tim</th>
                        <th className="px-6 py-3">Anggota Teknisi Terdaftar</th>
                        <th className="px-6 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {teams.map((t) => (
                        <tr key={t.id} className="hover:bg-muted/30">
                          <td className="px-6 py-4 font-medium">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary/70" />
                              <div>
                                <div>{t.name}</div>
                                <div className="text-xs text-muted-foreground font-normal">
                                  {t.member_count} Anggota
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {t.email || "-"}
                          </td>
                          <td className="px-6 py-4">
                            {t.members && t.members.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-md">
                                {t.members.map((m) => (
                                  <Badge
                                    key={m.id}
                                    variant="outline"
                                    className="bg-muted/50 text-xs font-normal"
                                  >
                                    {m.name} ({m.nik})
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Belum ada anggota
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {canManage && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setManagingTeam(t)}
                                  className="h-8 gap-1.5 text-xs font-medium"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Kelola Anggota
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditTeam(t)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Tim"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "team",
                                      id: t.id,
                                      name: t.name,
                                    })
                                  }
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Hapus Tim"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Stages */}
          {activeTab === "stages" && (
            <Card>
              <CardHeader>
                <CardTitle>Alur Tahapan Tiket (Workflow Stages)</CardTitle>
                <CardDescription>
                  Urutan proses penanganan tiket dari awal hingga selesai
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3">Urutan</th>
                        <th className="px-6 py-3">Nama Tahapan</th>
                        <th className="px-6 py-3">Sifat Alur</th>
                        <th className="px-6 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stages.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="px-6 py-4 font-mono text-xs">{s.sequence}</td>
                          <td className="px-6 py-4 font-medium">{s.name}</td>
                          <td className="px-6 py-4 flex items-center gap-2">
                            {s.is_starting && (
                              <Badge className="bg-sky-100 text-sky-800 border-sky-300">
                                Tahap Awal (New)
                              </Badge>
                            )}
                            {s.is_closing && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                Selesai / Ditutup
                              </Badge>
                            )}
                            {!s.is_starting && !s.is_closing && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Dalam Proses
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {canManage && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditStage(s)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Tahapan"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "stage",
                                      id: s.id,
                                      name: s.name,
                                    })
                                  }
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Hapus Tahapan"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal Kelola Anggota Tim */}
      {managingTeam && currentTeam && (
        <Dialog
          open={!!managingTeam}
          onOpenChange={(open) => {
            if (!open) {
              setManagingTeam(null)
              setSelectedEmpId("")
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Anggota Tim: {currentTeam.name}
              </DialogTitle>
              <DialogDescription>
                Kelola teknisi yang tergabung di tim {currentTeam.name}. Teknisi ini akan tersedia dalam daftar penugasan tiket tim ini.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Form Tambah Anggota */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  + Tambahkan Teknisi ke Tim
                </label>
                <div className="flex gap-2">
                  <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                    <SelectTrigger className="flex-1 h-9 text-xs">
                      <SelectValue placeholder="Pilih karyawan / teknisi..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees.map((emp: any) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.name} ({emp.nik})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!selectedEmpId || addMemberMutation.isPending}
                    onClick={() =>
                      addMemberMutation.mutate({
                        teamId: currentTeam.id,
                        employeeId: parseInt(selectedEmpId),
                      })
                    }
                    className="h-9 text-xs gap-1 shrink-0"
                  >
                    {addMemberMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Tambahkan
                  </Button>
                </div>
              </div>

              {/* Daftar Anggota Saat Ini */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Daftar Anggota Aktif ({currentTeamMembers.length})
                </p>
                {currentTeamMembers.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                    Belum ada anggota di tim ini. Gunakan pilihan di atas untuk menambahkan teknisi.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-md border divide-y bg-background">
                    {currentTeamMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 hover:bg-muted/30 text-sm"
                      >
                        <div>
                          <p className="font-medium text-xs">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            NIK: {m.nik} {m.department ? `· ${m.department}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removeMemberMutation.isPending}
                          onClick={() =>
                            removeMemberMutation.mutate({
                              teamId: currentTeam.id,
                              employeeId: m.id,
                            })
                          }
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Hapus dari tim"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setManagingTeam(null)
                  setSelectedEmpId("")
                }}
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Tambah / Edit Kategori */}
      <Dialog
        open={modalType === "category"}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null)
            setEditingItem(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Kategori Masalah" : "Tambah Kategori Tiket Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Perbarui nama dan urutan tampilan kategori masalah."
                : "Masukkan nama dan urutan kategori masalah helpdesk."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Kategori</label>
              <Input
                placeholder="Contoh: Printer & Scanner, SAP Network, dll."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Urutan Tampilan</label>
              <Input
                type="number"
                placeholder="10"
                value={sequenceInput}
                onChange={(e) => setSequenceInput(parseInt(e.target.value, 10) || 10)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalType(null)
                setEditingItem(null)
              }}
            >
              Batal
            </Button>
            <Button
              disabled={!nameInput.trim() || saveCategoryMutation.isPending}
              onClick={() =>
                saveCategoryMutation.mutate({
                  id: editingItem?.id,
                  name: nameInput.trim(),
                  sequence: sequenceInput,
                })
              }
            >
              {saveCategoryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Kategori"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah / Edit Tim */}
      <Dialog
        open={modalType === "team"}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null)
            setEditingItem(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Tim Helpdesk" : "Tambah Tim Helpdesk Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Perbarui data nama tim dan email kontak."
                : "Masukkan nama tim IT dan email kontak (opsional)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Tim</label>
              <Input
                placeholder="Contoh: Network Support, Hardware Specialist"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Tim (Opsional)</label>
              <Input
                placeholder="Contoh: it-network@pasindo.id"
                value={extraInput}
                onChange={(e) => setExtraInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalType(null)
                setEditingItem(null)
              }}
            >
              Batal
            </Button>
            <Button
              disabled={!nameInput.trim() || saveTeamMutation.isPending}
              onClick={() =>
                saveTeamMutation.mutate({
                  id: editingItem?.id,
                  name: nameInput.trim(),
                  email: extraInput.trim() || undefined,
                })
              }
            >
              {saveTeamMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Tim"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah / Edit Tahapan */}
      <Dialog
        open={modalType === "stage"}
        onOpenChange={(open) => {
          if (!open) {
            setModalType(null)
            setEditingItem(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Tahapan Alur Tiket" : "Tambah Tahapan Alur Tiket"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Perbarui nama, urutan proses, atau sifat penutupan tahapan tiket."
                : "Masukkan nama tahapan proses penanganan tiket."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Tahapan</label>
              <Input
                placeholder="Contoh: Menunggu Sparepart, Investigasi Vendor"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Urutan Tahapan</label>
              <Input
                type="number"
                placeholder="10"
                value={sequenceInput}
                onChange={(e) => setSequenceInput(parseInt(e.target.value, 10) || 10)}
              />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStarting}
                  onChange={(e) => setIsStarting(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Tahap Awal (New)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isClosing}
                  onChange={(e) => setIsClosing(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Tahap Selesai (Closed)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalType(null)
                setEditingItem(null)
              }}
            >
              Batal
            </Button>
            <Button
              disabled={!nameInput.trim() || saveStageMutation.isPending}
              onClick={() =>
                saveStageMutation.mutate({
                  id: editingItem?.id,
                  name: nameInput.trim(),
                  sequence: sequenceInput,
                  is_starting: isStarting,
                  is_closing: isClosing,
                })
              }
            >
              {saveStageMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Tahapan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Master Data */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Hapus{" "}
              {deleteTarget?.type === "category"
                ? "Kategori"
                : deleteTarget?.type === "team"
                ? "Tim"
                : "Tahapan"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground/80">
              Apakah Anda yakin ingin menghapus{" "}
              <strong className="text-foreground">{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            Data tiket yang terkait dengan item ini akan tetap aman dan ikatannya akan dilepaskan/dialihkan secara otomatis oleh sistem.
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={
                deleteCategoryMutation.isPending ||
                deleteTeamMutation.isPending ||
                deleteStageMutation.isPending
              }
              onClick={() => {
                if (!deleteTarget) return
                if (deleteTarget.type === "category") {
                  deleteCategoryMutation.mutate(deleteTarget.id)
                } else if (deleteTarget.type === "team") {
                  deleteTeamMutation.mutate(deleteTarget.id)
                } else if (deleteTarget.type === "stage") {
                  deleteStageMutation.mutate(deleteTarget.id)
                }
              }}
              className="gap-2"
            >
              {deleteCategoryMutation.isPending ||
              deleteTeamMutation.isPending ||
              deleteStageMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Ya, Hapus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
