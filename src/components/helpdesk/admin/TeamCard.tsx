"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Building2,
  Power,
  PowerOff,
  Pencil,
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface TeamMember {
  id: number
  employee_id: number
  name: string
  nik: string
  email: string | null
  phone: string | null
  department: string | null
  department_id: number | null
  job_title: string | null
}

interface TeamCardProps {
  team: {
    id: number
    name: string
    description: string | null
    department_id: number | null
    department_name: string | null
    is_active: boolean
    member_count: number
    members: TeamMember[]
  }
  onAddMember: (teamId: number) => void
  onRemoveMember: (teamId: number, memberId: number, memberName: string) => void
  onToggleActive: (teamId: number, isActive: boolean, teamName: string) => void
  onRename: (teamId: number, newName: string, newDescription: string) => void
  isUpdating: boolean
}

export function TeamCard({
  team,
  onAddMember,
  onRemoveMember,
  onToggleActive,
  onRename,
  isUpdating,
}: TeamCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(team.name)
  const [editDescription, setEditDescription] = useState(team.description || "")

  const handleSaveEdit = () => {
    if (editName.trim() && editName.trim() !== team.name || editDescription.trim() !== (team.description || "")) {
      onRename(team.id, editName.trim(), editDescription.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditName(team.name)
    setEditDescription(team.description || "")
    setIsEditing(false)
  }

  return (
    <Card className={`transition-colors ${!team.is_active ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-sm font-medium"
                  autoFocus
                />
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Deskripsi..."
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="default" onClick={handleSaveEdit} className="h-7 text-xs">
                    Simpan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 text-xs">
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{team.name}</p>
                  {!team.is_active && (
                    <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">
                      Nonaktif
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {team.department_name && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {team.department_name}
                    </span>
                  )}
                  <span>{team.member_count} anggota</span>
                </div>
                {team.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{team.description}</p>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {!isEditing && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsEditing(true)}
                  title="Edit nama tim"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onAddMember(team.id)}
                  title="Tambah anggota"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-8 w-8 ${team.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
                  onClick={() => onToggleActive(team.id, !team.is_active, team.name)}
                  disabled={isUpdating}
                  title={team.is_active ? "Nonaktifkan tim" : "Aktifkan tim"}
                >
                  {team.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Members list (expanded) */}
        {expanded && (
          <div className="mt-3 border-t pt-3 space-y-1">
            {team.members.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Belum ada anggota. Klik + untuk menambahkan.
              </p>
            ) : (
              team.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                    {member.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{member.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      NIK: {member.nik}
                      {member.job_title && ` · ${member.job_title}`}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onRemoveMember(team.id, member.id, member.name)}
                    disabled={isUpdating}
                    title={`Hapus ${member.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
