"use client"

import React, { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { adminTeamAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DebouncedSearch } from "@/components/ui/debounced-search"
import { Skeleton } from "@/components/ui/skeleton"
import { TeamCard } from "@/components/helpdesk/admin/TeamCard"
import { CreateTeamDialog } from "@/components/helpdesk/admin/CreateTeamDialog"
import { AddTeamMemberDialog } from "@/components/helpdesk/admin/AddTeamMemberDialog"
import { Users, Shield } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function AdminTeamsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const employee = useAuthStore((s) => s.employee)
  const [search, setSearch] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [addMemberTeamId, setAddMemberTeamId] = useState<number | null>(null)

  const isSuperAdmin = employee?.helpdesk_role === "super_admin"

  // Fetch teams
  const { data: teamsRes, isLoading } = useQuery({
    queryKey: ["admin-teams", search],
    queryFn: () => adminTeamAPI.getTeams({ search: search || undefined, show_inactive: true }),
    enabled: isSuperAdmin,
  })

  const teams = teamsRes?.data || []
  const addMemberTeam = teams.find((t) => t.id === addMemberTeamId)

  // Create team
  const createMutation = useMutation({
    mutationFn: (data: { name: string; department_id?: number; department_name?: string; description?: string }) =>
      adminTeamAPI.createTeam(data),
    onSuccess: (res) => {
      toast({ title: "Berhasil", description: res.message || "Tim berhasil dibuat" })
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] })
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Gagal",
        description: err.response?.data?.message || "Gagal membuat tim",
        variant: "destructive",
      })
    },
  })

  // Update team (rename, toggle active)
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; name?: string; description?: string; is_active?: boolean }) => {
      const { id, ...rest } = data
      return adminTeamAPI.updateTeam(id, rest)
    },
    onSuccess: (res) => {
      toast({ title: "Berhasil", description: res.message || "Tim berhasil diperbarui" })
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] })
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Gagal",
        description: err.response?.data?.message || "Gagal memperbarui tim",
        variant: "destructive",
      })
    },
  })

  // Add member
  const addMemberMutation = useMutation({
    mutationFn: (data: { teamId: number; nik: string }) =>
      adminTeamAPI.addMember(data.teamId, data.nik),
    onSuccess: (res) => {
      toast({ title: "Berhasil", description: res.message || "Anggota berhasil ditambahkan" })
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] })
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Gagal",
        description: err.response?.data?.message || "Gagal menambahkan anggota",
        variant: "destructive",
      })
    },
  })

  // Remove member
  const removeMemberMutation = useMutation({
    mutationFn: (data: { teamId: number; memberId: number }) =>
      adminTeamAPI.removeMember(data.teamId, data.memberId),
    onSuccess: (res) => {
      toast({ title: "Berhasil", description: res.message || "Anggota berhasil dihapus" })
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] })
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Gagal",
        description: err.response?.data?.message || "Gagal menghapus anggota",
        variant: "destructive",
      })
    },
  })

  // Delete team (hard delete)
  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminTeamAPI.deleteTeam(id),
    onSuccess: (res) => {
      toast({ title: "Berhasil", description: res.message || "Tim berhasil dihapus" })
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] })
      queryClient.invalidateQueries({ queryKey: ["teams"] })
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Gagal",
        description: err.response?.data?.message || "Gagal menghapus tim",
        variant: "destructive",
      })
    },
  })

  const handleCreateTeam = useCallback(
    async (data: { name: string; department_id?: number; department_name?: string; description?: string }) => {
      await createMutation.mutateAsync(data)
    },
    [createMutation]
  )

  const handleAddMember = useCallback(
    async (nik: string) => {
      if (!addMemberTeamId) return
      await addMemberMutation.mutateAsync({ teamId: addMemberTeamId, nik })
    },
    [addMemberTeamId, addMemberMutation]
  )

  const handleRemoveMember = useCallback(
    (teamId: number, memberId: number, memberName: string) => {
      if (!confirm(`Yakin ingin menghapus ${memberName} dari tim ini?`)) return
      removeMemberMutation.mutate({ teamId, memberId })
    },
    [removeMemberMutation]
  )

  const handleToggleActive = useCallback(
    (teamId: number, isActive: boolean, teamName: string) => {
      const action = isActive ? "mengaktifkan" : "menonaktifkan"
      if (!confirm(`Yakin ingin ${action} tim "${teamName}"?`)) return
      updateMutation.mutate({ id: teamId, is_active: isActive })
    },
    [updateMutation]
  )

  const handleDeleteTeam = useCallback(
    (teamId: number, teamName: string) => {
      if (!confirm(`Hapus permanen tim "${teamName}"? Tindakan ini tidak dapat dibatalkan.`)) return
      deleteMutation.mutate(teamId)
    },
    [deleteMutation]
  )

  const handleRename = useCallback(
    (teamId: number, newName: string, newDescription: string) => {
      updateMutation.mutate({ id: teamId, name: newName, description: newDescription })
    },
    [updateMutation]
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

  // Group teams by department
  const groupedTeams = teams.reduce<Record<string, typeof teams>>((acc, team) => {
    const key = team.department_name || "Tanpa Department"
    if (!acc[key]) acc[key] = []
    acc[key].push(team)
    return acc
  }, {})
  const sortedGroups = Object.entries(groupedTeams).sort(([a], [b]) => {
    if (a === "Tanpa Department") return 1
    if (b === "Tanpa Department") return -1
    return a.localeCompare(b)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Tim</h1>
          <p className="text-sm text-muted-foreground">
            Atur tim helpdesk per departemen dan anggotanya
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Users className="h-4 w-4" />
          Buat Tim Baru
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Daftar Tim Helpdesk</CardTitle>
              <CardDescription>
                {!isLoading && `${teams.length} tim terdaftar`}
              </CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <DebouncedSearch
                onSearch={handleSearch}
                placeholder="Cari tim atau department..."
                debounceMs={300}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Belum ada tim yang dibuat</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setCreateDialogOpen(true)}
              >
                Buat Tim Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedGroups.map(([deptName, deptTeams]) => (
                <div key={deptName}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {deptName}
                    <span className="text-xs font-normal">({deptTeams.length} tim)</span>
                  </h3>
                  <div className="space-y-2">
                    {deptTeams.map((team) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        onAddMember={(id) => setAddMemberTeamId(id)}
                        onRemoveMember={handleRemoveMember}
                        onToggleActive={handleToggleActive}
                        onDelete={handleDeleteTeam}
                        onRename={handleRename}
                        isUpdating={updateMutation.isPending || removeMemberMutation.isPending || deleteMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create team dialog */}
      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateTeam}
        isCreating={createMutation.isPending}
      />

      {/* Add member dialog */}
      {addMemberTeam && (
        <AddTeamMemberDialog
          open={!!addMemberTeamId}
          onOpenChange={(open) => { if (!open) setAddMemberTeamId(null) }}
          teamName={addMemberTeam.name}
          existingNiks={addMemberTeam.members.map((m) => m.nik)}
          onAdd={handleAddMember}
          isAdding={addMemberMutation.isPending}
        />
      )}
    </div>
  )
}
