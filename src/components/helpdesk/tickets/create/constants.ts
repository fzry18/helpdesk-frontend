import * as z from "zod"

export const HELPER_CATEGORIES = [
  { value: "elektronik", label: "Elektronik (AC, TV, Proyektor, dll)" },
  { value: "komputer", label: "Komputer & Laptop" },
  { value: "printer", label: "Printer & Scanner" },
  { value: "jaringan", label: "Jaringan & Internet" },
  { value: "listrik", label: "Listrik & Kelistrikan" },
  { value: "pipa", label: "Pipa / Plumbing" },
  { value: "furniture", label: "Furniture & Perabotan" },
  { value: "cleaning", label: "Kebersihan / Cleaning" },
  { value: "keamanan", label: "Keamanan / Security" },
  { value: "lainnya", label: "Lainnya" },
] as const

export const SYSTEM_CATEGORIES = [
  { value: "odoo", label: "Odoo ERP" },
  { value: "p2h", label: "Web P2H" },
  { value: "job_portal", label: "Job Portal" },
  { value: "other", label: "Sistem Lainnya" },
] as const

export const TICKET_TYPES = [
  { value: "question", label: "Pertanyaan / Question" },
  { value: "bug", label: "Bug / Error" },
  { value: "feature", label: "Permintaan Fitur" },
  { value: "access", label: "Akses / Permission" },
] as const

export const createTicketSchema = z.object({
  ticket_category_type: z.enum(["helper", "system"]).default("helper"),
  helper_category: z.string().optional(),
  system_category: z.enum(["odoo", "p2h", "job_portal", "other"]).optional(),
  ticket_type: z.string().optional(),
  subject: z
    .string()
    .min(5, "Subject minimal 5 karakter")
    .max(200, "Subject maksimal 200 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  captured_url: z.string().optional(),
  captured_module: z.string().optional(),
  captured_model: z.string().optional(),
  captured_view_type: z.string().optional(),
  captured_record_id: z.string().optional(),
  captured_record_ref: z.string().optional(),
  captured_menu_path: z.string().optional(),
  captured_browser: z.string().optional(),
}).refine(
  (data) => {
    if (data.ticket_category_type === "helper") {
      return !!data.helper_category && data.helper_category.trim() !== ""
    }
    return true
  },
  {
    message: "Kategori masalah wajib diisi untuk tiket helper",
    path: ["helper_category"],
  }
).refine(
  (data) => {
    if (data.ticket_category_type === "system") {
      return !!data.system_category
    }
    return true
  },
  {
    message: "Sistem wajib dipilih untuk tiket system",
    path: ["system_category"],
  }
)

export type CreateTicketForm = z.infer<typeof createTicketSchema>
