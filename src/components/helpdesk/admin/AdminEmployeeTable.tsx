"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldOff, Shield, ShieldCheck, Building2 } from "lucide-react"

interface AdminEmployee {
  id: number
  nik: string
  name: string
  department: string
  department_id: number | null
  job_title: string
  email: string
  phone: string
  helpdesk_role: string
  operating_unit: string
  is_active: boolean
  last_login_at: string | null
}

interface AdminEmployeeTableProps {
  employees: AdminEmployee[]
  isLoading: boolean
  onRemoveAdmin: (employee: AdminEmployee) => void
  isRemoving: boolean
}

function RoleBadge({ role }: { role: string }) {
  if (role === "super_admin") {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldCheck className="h-3 w-3" />
        Super Admin
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Shield className="h-3 w-3" />
      Dept Admin
    </Badge>
  )
}

export function AdminEmployeeTable({
  employees,
  isLoading,
  onRemoveAdmin,
  isRemoving,
}: AdminEmployeeTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="mb-3 h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Belum ada admin yang ditambahkan</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {employees.map((emp) => (
        <div
          key={emp.id}
          className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
        >
          {/* Avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
            {emp.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{emp.name}</p>
              <RoleBadge role={emp.helpdesk_role} />
            </div>
            {/* Dept Admin: tampilkan departemen yang di-admin-kan */}
            {emp.helpdesk_role === "dept_admin" && emp.department && (
              <div className="mt-1 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-medium text-blue-600">
                  Admin untuk dept: {emp.department}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>NIK: {emp.nik}</span>
              {emp.helpdesk_role === "super_admin" && emp.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {emp.department}
                </span>
              )}
              {emp.job_title && <span>{emp.job_title}</span>}
            </div>
            {emp.email && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{emp.email}</p>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0">
            {emp.helpdesk_role === "super_admin" ? (
              <Badge variant="outline" className="text-xs">Dari Odoo</Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRemoveAdmin(emp)}
                disabled={isRemoving}
              >
                <ShieldOff className="mr-1 h-4 w-4" />
                Hapus Admin
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
