/**
 * `cn()` — class name utility yang menggabungkan clsx dan tailwind-merge.
 *
 * Gunakan `cn()` di semua komponen untuk menggabungkan kelas Tailwind secara aman,
 * terutama saat ada class yang bisa konflik (mis. `px-2` + `px-4`).
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-blue-500", className)
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
