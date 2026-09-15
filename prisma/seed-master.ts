import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const STAGES = [
  { name: "New", sequence: 1, isStarting: true, isClosing: false },
  { name: "In Progress", sequence: 2, isStarting: false, isClosing: false },
  { name: "Waiting", sequence: 3, isStarting: false, isClosing: false },
  { name: "Resolved", sequence: 4, isStarting: false, isClosing: false },
  { name: "Closed", sequence: 5, isStarting: false, isClosing: true },
]

const CATEGORIES = [
  { name: "Hardware", sequence: 1 },
  { name: "Software", sequence: 2 },
  { name: "Network", sequence: 3 },
  { name: "Account / Access", sequence: 4 },
  { name: "Printer", sequence: 5 },
  { name: "Email", sequence: 6 },
  { name: "Lainnya", sequence: 99 },
]

const TEAMS = [
  { name: "IT Support", email: "itsupport@gpe.co.id" },
]

async function main() {
  console.log("🌱 Seeding master data...")

  for (const s of STAGES) {
    await prisma.stage.upsert({
      where: { name: s.name },
      update: { sequence: s.sequence, isStarting: s.isStarting, isClosing: s.isClosing },
      create: s,
    })
  }
  console.log(`  ✅ ${STAGES.length} stages seeded.`)

  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { sequence: c.sequence },
      create: c,
    })
  }
  console.log(`  ✅ ${CATEGORIES.length} categories seeded.`)

  for (const t of TEAMS) {
    await prisma.team.upsert({
      where: { name: t.name },
      update: { email: t.email },
      create: t,
    })
  }
  console.log(`  ✅ ${TEAMS.length} teams seeded.`)

  console.log("🎉 Master data seed complete!")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
