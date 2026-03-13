/**
 * DeptResolutionChart — Feature-slice wrapper for the department KPI chart.
 *
 * Re-exports the existing `DepartmentKPIChart` from the legacy components dir
 * so that feature-slice consumers reference only this path. When the legacy
 * component is eventually moved here (Step 7 cleanup), only this file changes.
 *
 * Admin only: should not be rendered for `dept_admin` or `user` roles.
 */

export { DepartmentKPIChart as DeptResolutionChart } from "@/components/helpdesk/dashboard/DepartmentKPIChart"
