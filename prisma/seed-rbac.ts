import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ROLES = [
  {
    name: "Super Admin",
    slug: "SUPER_ADMIN",
    description:
      "Akses mutlak sistem. Ditentukan otomatis dari Odoo app-access.",
  },
  {
    name: "Admin IT Support",
    slug: "ADMIN_IT_SUPPORT",
    description:
      "Koordinator/Dispatcher Tim IT. Memantau, assign tiket, kelola Master Data.",
  },
  {
    name: "IT Support",
    slug: "IT_SUPPORT",
    description:
      "Teknisi pelaksana. Menangani tiket, update stage, internal notes.",
  },
  {
    name: "User",
    slug: "USER",
    description:
      "Karyawan umum / Requestor. Membuat tiket dan konfirmasi penyelesaian.",
  },
]

const PERMISSIONS = [
  { name: "Create Ticket", slug: "ticket:create" },
  { name: "View Own Tickets", slug: "ticket:view_own" },
  { name: "View All Tickets", slug: "ticket:view_all" },
  { name: "Assign Ticket", slug: "ticket:assign" },
  { name: "Update Ticket Stage", slug: "ticket:update_stage" },
  { name: "Internal Note", slug: "ticket:internal_note" },
  { name: "Request Confirmation", slug: "ticket:request_confirm" },
  { name: "Confirm Resolved", slug: "ticket:confirm_resolved" },
  { name: "Manage Master Data", slug: "master:manage" },
  { name: "Manage RBAC", slug: "rbac:manage" },
]

// Role -> Permission slugs mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "ticket:create",
    "ticket:view_own",
    "ticket:view_all",
    "ticket:assign",
    "ticket:update_stage",
    "ticket:internal_note",
    "ticket:request_confirm",
    "ticket:confirm_resolved",
    "master:manage",
    "rbac:manage",
  ],
  ADMIN_IT_SUPPORT: [
    "ticket:create",
    "ticket:view_own",
    "ticket:view_all",
    "ticket:assign",
    "ticket:update_stage",
    "ticket:internal_note",
    "ticket:request_confirm",
    "ticket:confirm_resolved",
    "master:manage",
  ],
  IT_SUPPORT: [
    "ticket:create",
    "ticket:view_own",
    "ticket:view_all",
    "ticket:update_stage",
    "ticket:internal_note",
    "ticket:request_confirm",
  ],
  USER: [
    "ticket:create",
    "ticket:view_own",
    "ticket:confirm_resolved",
  ],
}

async function main() {
  console.log("🌱 Seeding RBAC roles & permissions...")

  // Upsert permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      update: { name: p.name },
      create: { name: p.name, slug: p.slug },
    })
  }
  console.log(`  ✅ ${PERMISSIONS.length} permissions seeded.`)

  // Upsert roles
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { slug: r.slug },
      update: { name: r.name, description: r.description },
      create: { name: r.name, slug: r.slug, description: r.description },
    })
  }
  console.log(`  ✅ ${ROLES.length} roles seeded.`)

  // Link role <-> permissions
  for (const [roleSlug, permSlugs] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { slug: roleSlug } })
    if (!role) continue

    for (const permSlug of permSlugs) {
      const perm = await prisma.permission.findUnique({
        where: { slug: permSlug },
      })
      if (!perm) continue

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      })
    }
  }
  console.log("  ✅ Role-permission mappings linked.")

  console.log("🎉 RBAC seed complete!")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
