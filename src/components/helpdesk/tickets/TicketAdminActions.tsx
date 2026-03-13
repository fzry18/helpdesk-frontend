"use client"

import { useState, useEffect, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ticketAPI, masterDataAPI } from "@/lib/api/endpoints"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/constants/error-messages"
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
  canModify: boolean // dept_admin (same dept) or super_admin — for Assign, Reject, Change Stage
  isTicketOwner?: boolean // assigned employee (PIC) — can Close even if !canModify
}

export function TicketAdminActions({ ticket, canModify, isTicketOwner = false }: TicketAdminActionsProps) {
  const canClose = canModify || isTicketOwner
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
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showProcessDialog, setShowProcessDialog] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [showAssignTeamDialog, setShowAssignTeamDialog] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<string>(
    ticket.priority ?? ""
  )
  // State untuk team/member di dialog proses (Draft stage)
  const [processDialogTeam, setProcessDialogTeam] = useState<string>("")
  const [processDialogMember, setProcessDialogMember] = useState<string>("")

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
    setSelectedPriority(ticket.priority ?? "")
  }, [ticket.priority])

  // Fetch all teams (cross-department assignment supported)
  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => masterDataAPI.getTeams(),
  })

  const teams = teamsData?.data || []

  // Group teams by department for dropdown display
  const teamsByDept = useMemo(() => {
    const groups: Record<string, typeof teams> = {}
    for (const team of teams) {
      const dept = team.department_name || "Lainnya"
      if (!groups[dept]) groups[dept] = []
      groups[dept].push(team)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [teams])

  // Auto-select team when dept_admin has only 1 team available
  useEffect(() => {
    if (teams.length === 1 && !teamId) {
      const singleTeam = teams[0].id.toString()
      setSelectedTeam(singleTeam)
      setProcessDialogTeam(singleTeam)
    }
  }, [teams, teamId])

  // Get members from the already-fetched teams list (teams response includes members)
  type TeamMemberInfo = { id: number; employee_id?: number; name?: string; user_id?: number | null; nik?: string }
  const getTeamMembers = (tId: number | null): TeamMemberInfo[] => {
    if (!tId) return []
    const team = teams.find((t) => t.id === tId) as (typeof teams)[number] & { members?: TeamMemberInfo[] } | undefined
    return team?.members || []
  }

  const teamMembers = getTeamMembers(teamId ?? null)
  const teamMembersLoading = false

  // Get members for process dialog
  const processDialogTeamId = processDialogTeam ? parseInt(processDialogTeam) : null
  const processDialogTeamMembers = getTeamMembers(processDialogTeamId)
  const processDialogTeamMembersLoading = false

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

  // ====== WORKFLOW GUARDS ======
  const canDraftAction = isDraft && !isClosed && !ticket.is_rejected && !isInProgress
  const hasTeam = !!teamId
  const hasAssignee = !!(ticket.assigned_employee?.id || ticket.assigned_user?.id)
  const canCloseTicket = !isClosed && !isDraft && !ticket.is_rejected && hasTeam && hasAssignee
  // Syarat yang belum terpenuhi untuk close
  const closeMissingItems: string[] = []
  if (!hasTeam) closeMissingItems.push("Team belum di-assign")
  if (!hasAssignee) closeMissingItems.push("Member/PIC belum di-assign")

  // Auto-close dialogs jika ticket berubah state
  useEffect(() => {
    if (!isDraft || ticket.is_rejected) {
      setShowRejectDialog(false)
      setShowProcessDialog(false)
      setProcessDialogTeam("")
      setProcessDialogMember("")
    }
    if (isClosed || ticket.is_rejected) {
      setShowCloseDialog(false)
    }
  }, [isDraft, isClosed, ticket.is_rejected])

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
        description: getErrorMessage(error),
        variant: "destructive",
      })
    },
  })

  const assignTeam = useMutation({
    mutationFn: (args: number | { teamId: number; employeeId?: number }) => {
      if (typeof args === "number") {
        return ticketAPI.assignTeam(ticket.id, args)
      }
      return ticketAPI.assignTeam(ticket.id, args.teamId, args.employeeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      setSelectedMember("") // Reset member selection
      toast({ title: "Berhasil", description: "Team berhasil di-assign" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: getErrorMessage(error),
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
        description: getErrorMessage(error),
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
        description: getErrorMessage(error),
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
        description: getErrorMessage(error),
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
        description: getErrorMessage(error),
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
        description: getErrorMessage(error),
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
      setShowRejectDialog(false)
      toast({ title: "Berhasil", description: "Ticket telah ditolak" })
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: getErrorMessage(error),
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
        description: getErrorMessage(error),
        variant: "destructive",
      })
    },
  })

  // ============================================
  // HANDLERS
  // ============================================

  const handleOpenTicket = () => {
    if (canModify) {
      // Pre-fill dialog with current sidebar selections (or auto-selected values)
      setProcessDialogTeam(selectedTeam || (teams.length === 1 ? teams[0].id.toString() : ""))
      setProcessDialogMember(selectedMember || "")
      setShowProcessDialog(true)
    }
  }

  // Handler untuk proses ticket dengan team/member assignment
  const handleProcessTicketWithAssignment = async () => {
    if (!processDialogTeam) {
      toast({
        title: "Gagal",
        description: "Pilih team terlebih dahulu",
        variant: "destructive",
      })
      return
    }
    if (!processDialogMember) {
      toast({
        title: "Gagal",
        description: "Pilih member terlebih dahulu",
        variant: "destructive",
      })
      return
    }

    const teamIdNum = parseInt(processDialogTeam)
    const employeeIdNum = parseInt(processDialogMember, 10)

    if (Number.isNaN(teamIdNum) || Number.isNaN(employeeIdNum)) {
      toast({
        title: "Gagal",
        description: "Team atau member tidak valid",
        variant: "destructive",
      })
      return
    }

    try {
      // Combined: Assign team + member in one call (also sets status to IN_PROGRESS)
      await assignTeam.mutateAsync({ teamId: teamIdNum, employeeId: employeeIdNum })
      setShowProcessDialog(false)
      setProcessDialogTeam("")
      setProcessDialogMember("")
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    }
  }

  const handleTeamChange = (value: string) => {
    // Di tahap Draft, tidak langsung mutate - tunggu konfirmasi di dialog
    if (isDraft) {
      // Tidak ada aksi langsung di Draft
      return
    }
    // Di In Progress, set selectedTeam dulu lalu tampilkan popup konfirmasi
    if (isInProgress && canModify) {
      setSelectedTeam(value)
      setShowAssignTeamDialog(true)
    } else if (!isDraft && canModify) {
      // Fallback: jika bukan draft dan bukan in progress, langsung assign (untuk safety)
      const tid = parseInt(value)
      if (tid) {
        setSelectedTeam(value)
        assignTeam.mutate(tid)
      }
    }
  }

  const handleMemberChange = (value: string) => {
    setSelectedMember(value)
    // Di tahap Draft, tidak langsung mutate - tunggu konfirmasi di dialog
    // Di tahap In Progress, tampilkan popup konfirmasi jika team sudah dipilih
    if (isDraft) {
      // Tidak ada aksi langsung di Draft
      return
    }
    // Di In Progress, jika team sudah dipilih, langsung assign (atau bisa juga pakai popup)
    // Untuk konsistensi, kita pakai popup juga
    if (isInProgress && canModify && teamId) {
      const employeeId = parseInt(value, 10)
      if (!Number.isNaN(employeeId)) {
        assignByEmployee.mutate(employeeId)
      }
    }
  }

  // Handler untuk konfirmasi assign team di In Progress
  const handleConfirmAssignTeam = () => {
    const tid = parseInt(selectedTeam)
    if (tid && canModify) {
      assignTeam.mutate(tid, {
        onSuccess: () => {
          setShowAssignTeamDialog(false)
        },
        onError: () => {
          // Keep dialog open on error so user can retry or cancel
        }
      })
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
    if (canClose) closeTicket.mutate(confirmMessage)
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

        {/* Status ringkas — detail sudah di TicketHeader */}
        {(isClosed || ticket.is_rejected) && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {ticket.is_rejected
              ? "Ticket ini sudah ditolak. Tidak ada aksi tersedia."
              : "Ticket ini sudah selesai. Tidak ada aksi tersedia."
            }
          </p>
        )}

        {/* 1. Set Priority - hanya dept_admin/super_admin */}
        {canModify && canDraftAction && (
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
                <SelectValue placeholder="Belum di-set (wajib)" />
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

        {/* 2. Tolak Ticket - hanya dept_admin/super_admin */}
        {canModify && canDraftAction && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 border border-red-200">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">Tolak Ticket</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRejectDialog(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-100"
            >
              Tolak
            </Button>
          </div>
        )}

        {/* 3. Proses Ticket - hanya dept_admin/super_admin */}
        {canModify && canDraftAction && (
          <div className="p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
            <Button
              onClick={() => setShowProcessDialog(true)}
              disabled={openTicket.isPending || !selectedPriority}
              className="w-full transition-all"
              size="lg"
            >
              <Play className="mr-2 h-4 w-4" />
              Proses Ticket Ini
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Draft → In Progress
            </p>
            {!selectedPriority && (
              <p className="text-xs text-center text-amber-600 mt-1">
                ⚠️ Set priority terlebih dahulu
              </p>
            )}
          </div>
        )}

        {/* Assign Team & Member - hanya dept_admin/super_admin */}
        {canModify && !isClosed && !ticket.is_rejected && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Assignment</span>
            </div>

            {/* Info: Disabled when Draft */}
            {isDraft && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                ⚠️ Assignment akan dilakukan saat proses ticket (di popup konfirmasi)
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
                  {teamsByDept.map(([dept, deptTeams]) => (
                    <SelectGroup key={dept}>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground">{dept}</SelectLabel>
                      {deptTeams.map((team) => (
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
                    </SelectGroup>
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
                        <SelectItem key={member.employee_id || member.id} value={(member.employee_id || member.id).toString()}>
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
              </div>
              {teamId && !teamMembersLoading && teamMembers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tidak ada member di team ini. Tambah member (Employee) di Odoo: Helpdesk → Konfigurasi → Team.
                </p>
              )}
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

        {/* Activity Log - hanya dept_admin/super_admin */}
        {canModify && !isClosed && !isDraft && (
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

        {/* Close/Complete Ticket - admin atau ticket owner (assigned PIC) */}
        {canClose && !isClosed && !isDraft && !ticket.is_rejected && (
          <div className="space-y-2 pt-3 border-t">
            <Label className="text-sm font-medium">Selesaikan Ticket</Label>

            {/* Warning syarat belum terpenuhi */}
            {closeMissingItems.length > 0 && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs font-medium text-amber-800 mb-1">⚠️ Syarat belum terpenuhi:</p>
                <ul className="text-xs text-amber-700 list-disc list-inside">
                  {closeMissingItems.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}

            <Textarea
              placeholder="Catatan penutupan (opsional)..."
              value={confirmMessage}
              onChange={(e) => setConfirmMessage(e.target.value)}
              rows={2}
              disabled={closeTicket.isPending || !canCloseTicket}
              className="text-sm"
            />
            <Button
              onClick={() => setShowCloseDialog(true)}
              disabled={closeTicket.isPending || !canCloseTicket}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              variant="default"
            >
              {closeTicket.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Selesaikan Ticket
            </Button>
            {canCloseTicket && (
              <p className="text-xs text-center text-muted-foreground">
                Ticket akan langsung ditutup tanpa konfirmasi user
              </p>
            )}
          </div>
        )}

      </CardContent>

      {/* Dialog: Tolak Ticket */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Tolak Ticket
            </DialogTitle>
            <DialogDescription>
              Ticket #{ticket.ticket_number} — {ticket.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-medium">Alasan Penolakan (wajib)</Label>
            <Textarea
              placeholder="Jelaskan alasan penolakan..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              disabled={rejectTicket.isPending}
              className="text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowRejectDialog(false); setRejectReason("") }}
              disabled={rejectTicket.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectTicket}
              disabled={rejectTicket.isPending || !rejectReason.trim()}
            >
              {rejectTicket.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Konfirmasi Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Proses Ticket */}
      <Dialog open={showProcessDialog} onOpenChange={(open) => {
        setShowProcessDialog(open)
        if (!open) {
          // Reset dialog state when closed
          setProcessDialogTeam("")
          setProcessDialogMember("")
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Proses Ticket
            </DialogTitle>
            <DialogDescription>
              Ticket #{ticket.ticket_number} — {ticket.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Status akan berubah: <strong>Draft → In Progress</strong>
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Priority: <strong>{PRIORITY_OPTIONS.find(o => o.value === selectedPriority)?.label ?? "-"}</strong>
              </p>
            </div>

            {/* Team Selection - Wajib di Draft */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Pilih Team <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={processDialogTeam} 
                onValueChange={setProcessDialogTeam}
                disabled={openTicket.isPending || assignTeam.isPending || assignByEmployee.isPending}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Pilih team..." />
                </SelectTrigger>
                <SelectContent>
                  {teamsByDept.map(([dept, deptTeams]) => (
                    <SelectGroup key={dept}>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground">{dept}</SelectLabel>
                      {deptTeams.map((team) => (
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
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member Selection - Wajib di Draft */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Pilih Member <span className="text-destructive">*</span>
              </Label>
              <Select
                value={processDialogMember}
                onValueChange={setProcessDialogMember}
                disabled={!processDialogTeam || openTicket.isPending || assignTeam.isPending || assignByEmployee.isPending || processDialogTeamMembersLoading}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={
                    !processDialogTeam
                      ? "Pilih team dulu"
                      : processDialogTeamMembersLoading
                        ? "Loading..."
                        : "Pilih member..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {processDialogTeamMembers.length > 0 ? (
                    processDialogTeamMembers.map((member) => (
                      <SelectItem key={member.employee_id || member.id} value={(member.employee_id || member.id).toString()}>
                        <span className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {member.name}
                          {member.nik && <span className="text-xs text-muted-foreground">({member.nik})</span>}
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_empty" disabled>
                      {processDialogTeam ? "Tidak ada member" : "Pilih team dulu"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {processDialogTeam && !processDialogTeamMembersLoading && processDialogTeamMembers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Tidak ada member di team ini. Tambah member (Employee) di Odoo: Helpdesk → Konfigurasi → Team.
                </p>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Pastikan team dan member sudah dipilih sebelum memproses ticket.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowProcessDialog(false)
              setProcessDialogTeam("")
              setProcessDialogMember("")
            }} disabled={openTicket.isPending || assignTeam.isPending || assignByEmployee.isPending}>
              Batal
            </Button>
            <Button
              onClick={handleProcessTicketWithAssignment}
              disabled={openTicket.isPending || assignTeam.isPending || assignByEmployee.isPending || !processDialogTeam || !processDialogMember}
            >
              {(openTicket.isPending || assignTeam.isPending || assignByEmployee.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Ya, Proses Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Konfirmasi Assign Team (In Progress stage) */}
      <Dialog open={showAssignTeamDialog} onOpenChange={setShowAssignTeamDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Ubah Team Assignment
            </DialogTitle>
            <DialogDescription>
              Ticket #{ticket.ticket_number} — {ticket.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                Team saat ini: <strong>{ticket.team?.name ?? "-"}</strong>
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Team baru: <strong>{teams.find(t => t.id.toString() === selectedTeam)?.name ?? "-"}</strong>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Yakin ingin mengubah team assignment? Perubahan ini akan tercatat di activity log.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              // Reset selectedTeam ke team yang sekarang sebelum close
              setSelectedTeam(teamId?.toString() ?? "")
              setShowAssignTeamDialog(false)
            }} disabled={assignTeam.isPending}>
              Batal
            </Button>
            <Button
              onClick={handleConfirmAssignTeam}
              disabled={assignTeam.isPending}
            >
              {assignTeam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
              Ya, Ubah Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Selesaikan Ticket */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Selesaikan Ticket
            </DialogTitle>
            <DialogDescription>
              Ticket #{ticket.ticket_number} — {ticket.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-1">
              <p className="text-sm text-green-800">Status: <strong>In Progress → Closed</strong></p>
              <p className="text-sm text-green-700">Tim: <strong>{ticket.team?.name ?? "-"}</strong></p>
              <p className="text-sm text-green-700">
                Ditangani: <strong>{ticket.assigned_employee?.name ?? ticket.assigned_user?.name ?? "-"}</strong>
              </p>
            </div>
            {confirmMessage && (
              <div className="p-2 bg-muted/50 rounded text-sm">
                <p className="text-xs text-muted-foreground mb-1">Catatan:</p>
                <p>{confirmMessage}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Yakin ingin menyelesaikan ticket ini? Aksi ini tidak dapat dibatalkan.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCloseDialog(false)} disabled={closeTicket.isPending}>
              Batal
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => { handleCloseTicket(); setShowCloseDialog(false) }}
              disabled={closeTicket.isPending}
            >
              {closeTicket.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Ya, Selesaikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
