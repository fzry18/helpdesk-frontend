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
  ClipboardList, Send, User, Settings, XCircle, AlertTriangle
} from "lucide-react"
import type { Ticket } from "@/types"

// Priority options
const PRIORITY_OPTIONS = [
  { value: "0", label: "Very Low", color: "text-gray-600" },
  { value: "1", label: "Low", color: "text-green-600" },
  { value: "2", label: "Normal", color: "text-yellow-600" },
  { value: "3", label: "High", color: "text-orange-600" },
  { value: "4", label: "Urgent", color: "text-red-600" },
]

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
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<string>(
    typeof ticket.priority === 'string' ? ticket.priority : "2"
  )

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

  // Sync priority with ticket data
  useEffect(() => {
    const priorityValue = typeof ticket.priority === 'string' ? ticket.priority : "2"
    setSelectedPriority(priorityValue)
  }, [ticket.priority])

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

  // Check ticket status - also handle null/missing stage as Draft (new tickets)
  const stageName = ticket.stage?.name?.toLowerCase() || ""
  const stageActualName = ticket.stage?.actual_name?.toLowerCase() || ""
  
  // isDraft: stage is Draft, Sent, or null/missing (new tickets from system)
  const isDraft = 
    !ticket.stage || 
    !ticket.stage.name ||
    stageName === "draft" || 
    stageName === "sent" || 
    stageActualName === "draft"
  
  const isInProgress = 
    stageName.includes("progress") || 
    stageActualName.includes("progress")
  
  const isClosed = 
    stageName.includes("closed") || 
    stageActualName.includes("closed") || 
    ticket.resolution_confirmed
  
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

  const closeTicket = useMutation({
    mutationFn: (message: string) => ticketAPI.closeTicket(ticket.id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      setConfirmMessage("")
      toast({ title: "Berhasil", description: "Ticket telah diselesaikan" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal menutup ticket",
        variant: "destructive",
      })
    },
  })

  // Reject ticket mutation
  const rejectTicket = useMutation({
    mutationFn: (reason: string) => ticketAPI.rejectTicket(ticket.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      setRejectReason("")
      setShowRejectForm(false)
      toast({ title: "Berhasil", description: "Ticket telah ditolak" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal menolak ticket",
        variant: "destructive",
      })
    },
  })

  // Set priority mutation
  const setPriority = useMutation({
    mutationFn: (priority: string) => ticketAPI.setPriority(ticket.id, priority),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      toast({ 
        title: "Berhasil", 
        description: `Priority diubah ke ${data?.data?.priority_label || selectedPriority}` 
      })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal mengubah priority",
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

  const handleCloseTicket = () => {
    if (canModify) closeTicket.mutate(confirmMessage)
  }

  const handleRejectTicket = () => {
    if (canModify && rejectReason.trim()) {
      rejectTicket.mutate(rejectReason.trim())
    }
  }

  const handlePriorityChange = (value: string) => {
    setSelectedPriority(value)
    if (canModify) {
      setPriority.mutate(value)
    }
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
        {isClosed && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-800">✅ Ticket selesai</p>
          </div>
        )}

        {/* 1. Open/Progress Ticket */}
        {isDraft && !isClosed && !ticket.is_rejected && (
          <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
            <Button
              onClick={handleOpenTicket}
              disabled={openTicket.isPending}
              className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
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

        {/* Set Priority - untuk ticket yang belum diproses */}
        {isDraft && !isClosed && !ticket.is_rejected && (
          <div className="space-y-2 p-3 rounded-lg bg-amber-50/50 border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">Set Priority</span>
            </div>
            <p className="text-xs text-amber-700">
              Tentukan tingkat prioritas sebelum memproses ticket
            </p>
            <Select value={selectedPriority} onValueChange={handlePriorityChange}>
              <SelectTrigger disabled={setPriority.isPending} className="bg-white">
                <SelectValue placeholder="Pilih priority..." />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={`flex items-center gap-2 ${opt.color}`}>
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Reject Ticket - untuk ticket yang belum diproses */}
        {isDraft && !isClosed && !ticket.is_rejected && (
          <div className="space-y-2 p-3 rounded-lg bg-red-50/50 border border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Tolak Ticket</span>
              </div>
              {!showRejectForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRejectForm(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-100"
                >
                  Tolak
                </Button>
              )}
            </div>
            
            {showRejectForm && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Alasan penolakan (wajib diisi)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  disabled={rejectTicket.isPending}
                  className="bg-white text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleRejectTicket}
                    disabled={rejectTicket.isPending || !rejectReason.trim()}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    {rejectTicket.isPending ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-3 w-3" />
                    )}
                    Konfirmasi Tolak
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowRejectForm(false)
                      setRejectReason("")
                    }}
                    disabled={rejectTicket.isPending}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ticket Rejected Info */}
        {ticket.is_rejected && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">Ticket Ditolak</span>
            </div>
            {ticket.rejection_reason && (
              <p className="text-sm text-red-700">
                <strong>Alasan:</strong> {ticket.rejection_reason}
              </p>
            )}
            {ticket.rejected_date && (
              <p className="text-xs text-red-600 mt-1">
                Ditolak pada: {new Date(ticket.rejected_date).toLocaleString('id-ID')}
              </p>
            )}
          </div>
        )}

        {/* 2. Assign Team & Member */}
        {!isClosed && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Assignment</span>
            </div>
            
            {/* Info: Disabled when Draft */}
            {isDraft && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                ⚠️ Proses ticket terlebih dahulu untuk mengatur assignment
              </p>
            )}
            
            {/* Team Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Team</Label>
              <Select value={selectedTeam} onValueChange={handleTeamChange} disabled={isDraft}>
                <SelectTrigger disabled={isDraft || assignTeam.isPending} className="bg-background">
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
                  disabled={isDraft || !teamId || teamMembersLoading}
                >
                  <SelectTrigger disabled={isDraft || assignByEmployee.isPending || assignUser.isPending} className="bg-background">
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
                  disabled={isDraft || assignToMe.isPending}
                  title={isDraft ? "Proses ticket dulu" : "Assign ke saya"}
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
              className="w-full transition-all duration-200 hover:bg-blue-100 hover:text-blue-700 active:scale-[0.98]"
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

        {/* 4. Close/Complete Ticket */}
        {!isClosed && !isDraft && (
          <div className="space-y-2 pt-3 border-t">
            <Label className="text-sm font-medium">Selesaikan Ticket</Label>
            <Textarea
              placeholder="Catatan penutupan (opsional, bisa juga tulis di Obrolan)..."
              value={confirmMessage}
              onChange={(e) => setConfirmMessage(e.target.value)}
              rows={2}
              disabled={closeTicket.isPending}
              className="text-sm"
            />
            <Button
              onClick={handleCloseTicket}
              disabled={closeTicket.isPending}
              className="w-full bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
              variant="default"
            >
              {closeTicket.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Selesaikan Ticket
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Ticket akan langsung ditutup tanpa konfirmasi user
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
