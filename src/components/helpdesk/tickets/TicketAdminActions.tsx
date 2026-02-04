"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ticketAPI, masterDataAPI } from "@/lib/api/endpoints"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { 
  UserPlus, CheckCircle, Loader2, Play, Users, 
  ClipboardList, Send, User, Settings
} from "lucide-react"
import type { Ticket } from "@/types"

interface TicketAdminActionsProps {
  ticket: Ticket
  canModify: boolean // dept_admin (same dept) or super_admin
}

export function TicketAdminActions({ ticket, canModify }: TicketAdminActionsProps) {
  const queryClient = useQueryClient()
  // Team ID dari API bisa team_id atau team.id (agar tetap ada setelah keluar dari detail)
  const teamId = ticket.team_id ?? ticket.team?.id
  const [selectedTeam, setSelectedTeam] = useState<string>(
    teamId?.toString() ?? ""
  )
  const [selectedMember, setSelectedMember] = useState<string>("")
  const [confirmMessage, setConfirmMessage] = useState("")
  const [activityContent, setActivityContent] = useState("")

  // Sinkronkan dropdown team dan member dengan data ticket terbaru (dari server)
  useEffect(() => {
    setSelectedTeam(teamId?.toString() ?? "")
  }, [teamId])
  useEffect(() => {
    if (ticket.assigned_employee?.id) {
      setSelectedMember(ticket.assigned_employee.id.toString())
    } else {
      setSelectedMember("")
    }
  }, [ticket.assigned_employee?.id])

  // Fetch teams
  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => masterDataAPI.getTeams(),
  })

  // Fetch team detail (dengan members) ketika team dipilih
  const { data: teamDetailData, isLoading: teamDetailLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => masterDataAPI.getTeam(teamId!),
    enabled: !!teamId,
  })
  // Fallback: jika getTeam mengembalikan members kosong, ambil dari endpoint /teams/:id/members
  const membersFromDetailRaw = (teamDetailData?.data as { members?: unknown[] } | undefined)?.members ?? []
  const { data: teamMembersOnlyData } = useQuery({
    queryKey: ["team", teamId, "members"],
    queryFn: () => masterDataAPI.getTeamMembers(teamId!),
    enabled: !!teamId && !!teamDetailData?.data && Array.isArray(membersFromDetailRaw) && membersFromDetailRaw.length === 0,
  })

  const teams = teamsData?.data || []
  const membersFromDetail = membersFromDetailRaw as Array<{ id: number; name?: string; user_id?: number | null; nik?: string }>
  const membersFromFallback = (teamMembersOnlyData?.data as unknown as Array<{ id: number; name?: string; user_id?: number | null; nik?: string }>) ?? []
  const teamMembers = membersFromDetail.length > 0 ? membersFromDetail : membersFromFallback
  const teamMembersLoading = teamDetailLoading

  // Check ticket status
  const isDraft = ticket.stage?.name === "Draft" || ticket.stage?.actual_name === "Draft"
  const isInProgress = ticket.stage?.name === "In Progress"
  const isClosed = ticket.stage?.name?.toLowerCase().includes("closed") || ticket.resolution_confirmed
  const isAwaitingConfirmation = ticket.waiting_user_confirmation && !ticket.resolution_confirmed

  // ============================================
  // MUTATIONS
  // ============================================

  const openTicket = useMutation({
    mutationFn: (message?: string) => ticketAPI.openTicket(ticket.id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      toast({ title: "Berhasil", description: "Ticket sedang diproses" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal membuka ticket",
        variant: "destructive",
      })
    },
  })

  const assignTeam = useMutation({
    mutationFn: (teamId: number) => ticketAPI.assignTeam(ticket.id, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      setSelectedMember("") // Reset member selection
      toast({ title: "Berhasil", description: "Team berhasil di-assign" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal assign team",
        variant: "destructive",
      })
    },
  })

  const assignUser = useMutation({
    mutationFn: (userId: number) => ticketAPI.assignUser(ticket.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      toast({ title: "Berhasil", description: "Member berhasil di-assign" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.error?.message || error.response?.data?.message || "Gagal assign member",
        variant: "destructive",
      })
    },
  })

  const assignByEmployee = useMutation({
    mutationFn: (employeeId: number) => ticketAPI.assignByEmployee(ticket.id, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      toast({ title: "Berhasil", description: "Member berhasil di-assign (nama tampil ke user)" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.error?.message || error.response?.data?.message || "Gagal assign member",
        variant: "destructive",
      })
    },
  })

  const assignToMe = useMutation({
    mutationFn: () => ticketAPI.assignToMe(ticket.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      toast({ title: "Berhasil", description: "Ticket di-assign ke Anda" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal assign ticket",
        variant: "destructive",
      })
    },
  })

  const postActivityLog = useMutation({
    mutationFn: (content: string) => ticketAPI.postActivityLog(ticket.id, content, "progress"),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id, "thread"] })
      await queryClient.refetchQueries({ queryKey: ["ticket", ticket.id, "thread"] })
      setActivityContent("")
      toast({ title: "Berhasil", description: "Activity log ditambahkan" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal menambah log",
        variant: "destructive",
      })
    },
  })

  const requestConfirmation = useMutation({
    mutationFn: (message: string) => ticketAPI.requestConfirmation(ticket.id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      setConfirmMessage("")
      toast({ title: "Berhasil", description: "Permintaan konfirmasi terkirim" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal mengirim konfirmasi",
        variant: "destructive",
      })
    },
  })

  // ============================================
  // HANDLERS
  // ============================================

  const handleOpenTicket = () => {
    if (canModify) openTicket.mutate(undefined)
  }

  const handleTeamChange = (value: string) => {
    setSelectedTeam(value)
    const tid = parseInt(value)
    if (tid && canModify) assignTeam.mutate(tid)
  }

  const handleMemberChange = (value: string) => {
    setSelectedMember(value)
    const employeeId = parseInt(value, 10)
    if (!Number.isNaN(employeeId) && canModify) {
      // Assign by employee_id - backend mendukung assign tanpa wajib user_id (nama employee tampil di ticket)
      assignByEmployee.mutate(employeeId)
    }
  }

  const handleAssignToMe = () => {
    if (canModify) assignToMe.mutate()
  }

  const handlePostActivityLog = () => {
    if (canModify && activityContent.trim()) {
      postActivityLog.mutate(activityContent.trim())
    }
  }

  const handleRequestConfirmation = () => {
    if (canModify) requestConfirmation.mutate(confirmMessage)
  }

  // ============================================
  // RENDER
  // ============================================

  if (!canModify) {
    return (
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Kelola Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ticket dari department lain. Hanya Super Admin yang dapat mengelola.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 bg-primary/5 rounded-t-lg">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Kelola Ticket (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        
        {/* Status Info */}
        {isAwaitingConfirmation && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm font-medium text-amber-800">⏳ Menunggu konfirmasi user</p>
          </div>
        )}
        
        {isClosed && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-800">✅ Ticket selesai</p>
          </div>
        )}

        {/* 1. Open/Progress Ticket */}
        {isDraft && !isClosed && (
          <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
            <Button
              onClick={handleOpenTicket}
              disabled={openTicket.isPending}
              className="w-full"
              size="lg"
            >
              {openTicket.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Proses Ticket Ini
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Klik untuk mulai memproses (Draft → In Progress)
            </p>
          </div>
        )}

        {/* 2. Assign Team & Member */}
        {!isClosed && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Assignment</span>
            </div>
            
            {/* Team Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Team</Label>
              <Select value={selectedTeam} onValueChange={handleTeamChange}>
                <SelectTrigger disabled={assignTeam.isPending} className="bg-background">
                  <SelectValue placeholder="Pilih team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      <span className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        {team.name}
                        <span className="text-xs text-muted-foreground">
                          ({team.member_count || 0})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assign ke Member</Label>
              <div className="flex gap-2">
                <Select 
                  value={selectedMember} 
                  onValueChange={handleMemberChange}
                  disabled={!teamId || teamMembersLoading}
                >
                  <SelectTrigger disabled={assignByEmployee.isPending || assignUser.isPending} className="bg-background">
                    <SelectValue placeholder={
                      !teamId
                        ? "Pilih team dulu" 
                        : teamMembersLoading 
                          ? "Loading..." 
                          : "Pilih member..."
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.length > 0 ? (
                      teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          <span className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {member.name}
                            {member.nik && <span className="text-xs text-muted-foreground">({member.nik})</span>}
                          </span>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_empty" disabled>
                        {teamId ? "Tidak ada member" : "Pilih team dulu"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {teamId && !teamMembersLoading && teamMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tidak ada member di team ini. Tambah member (Employee) di Odoo: Helpdesk → Konfigurasi → Team.
                  </p>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAssignToMe}
                  disabled={assignToMe.isPending}
                  title="Assign ke saya"
                  className="shrink-0"
                >
                  {assignToMe.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {(ticket.assigned_employee?.name || ticket.assigned_user?.name) && (
                <p className="text-xs text-green-600">
                  ✓ Ditangani: {ticket.assigned_employee?.name ?? ticket.assigned_user?.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stage tidak lagi bisa dipilih manual - hanya berubah via tombol:
            Proses Ticket → In Progress, Minta Konfirmasi User → Waiting for User, User konfirmasi → Closed */}

        {/* 3. Activity Log */}
        {!isClosed && !isDraft && (
          <div className="space-y-2 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Activity Log</span>
            </div>
            <Textarea
              placeholder="Catat progress dari manpower..."
              value={activityContent}
              onChange={(e) => setActivityContent(e.target.value)}
              rows={2}
              disabled={postActivityLog.isPending}
              className="bg-white text-sm"
            />
            <Button
              onClick={handlePostActivityLog}
              disabled={postActivityLog.isPending || !activityContent.trim()}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              {postActivityLog.isPending ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Send className="mr-2 h-3 w-3" />
              )}
              Tambah Log
            </Button>
          </div>
        )}

        {/* 4. Request Confirmation */}
        {!isClosed && !isDraft && !isAwaitingConfirmation && (
          <div className="space-y-2 pt-3 border-t">
            <Label className="text-sm font-medium">Selesaikan Ticket</Label>
            <Textarea
              placeholder="Pesan untuk user (opsional)..."
              value={confirmMessage}
              onChange={(e) => setConfirmMessage(e.target.value)}
              rows={2}
              disabled={requestConfirmation.isPending}
              className="text-sm"
            />
            <Button
              onClick={handleRequestConfirmation}
              disabled={requestConfirmation.isPending}
              className="w-full"
              variant="default"
            >
              {requestConfirmation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Minta Konfirmasi User
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
