"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Building2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { adminTeamAPI } from "@/lib/api/endpoints"

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; department_id?: number; department_name?: string; description?: string }) => Promise<void>
  isCreating: boolean
}

export function CreateTeamDialog({ open, onOpenChange, onCreate, isCreating }: CreateTeamDialogProps) {
  const [selectedDeptId, setSelectedDeptId] = useState<string>("")
  const [teamName, setTeamName] = useState("")
  const [description, setDescription] = useState("")

  const { data: deptsRes, isLoading: deptsLoading } = useQuery({
    queryKey: ["admin-departments"],
    queryFn: () => adminTeamAPI.getDepartments(),
    enabled: open,
  })

  const departments = deptsRes?.data || []
  const selectedDept = departments.find((d) => d.id.toString() === selectedDeptId)

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedDeptId("")
      setTeamName("")
      setDescription("")
    }
  }, [open])

  const handleDeptChange = (value: string) => {
    setSelectedDeptId(value)
    // Pre-fill team name with department name if empty
    const dept = departments.find((d) => d.id.toString() === value)
    if (dept && !teamName) {
      setTeamName(dept.name)
    }
  }

  const handleCreate = async () => {
    if (!teamName.trim()) return
    await onCreate({
      name: teamName.trim(),
      department_id: selectedDeptId ? parseInt(selectedDeptId) : undefined,
      department_name: selectedDept?.name,
      description: description.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Buat Tim Baru
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pilih department lalu tentukan nama tim
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Department selector */}
          <div className="space-y-2">
            <Label>Department</Label>
            {deptsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedDeptId} onValueChange={handleDeptChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{dept.name}</span>
                        {dept.team_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({dept.team_count} tim)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Team name */}
          <div className="space-y-2">
            <Label>Nama Tim</Label>
            <Input
              placeholder="Contoh: IT Support, Logistic Team A..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          {/* Description (optional) */}
          <div className="space-y-2">
            <Label>Deskripsi (opsional)</Label>
            <Input
              placeholder="Deskripsi singkat tim..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Info */}
          {selectedDept && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                <Building2 className="mr-1 inline h-3.5 w-3.5" />
                Tim akan terhubung ke department:{" "}
                <strong>{selectedDept.name}</strong>
                {selectedDept.team_count > 0 && (
                  <span> (sudah ada {selectedDept.team_count} tim)</span>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Batal
          </Button>
          <Button onClick={handleCreate} disabled={!teamName.trim() || isCreating}>
            {isCreating ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Membuat...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Buat Tim
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
