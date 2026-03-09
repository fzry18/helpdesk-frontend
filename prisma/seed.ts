/**
 * Database seed script
 * Run with: npx tsx prisma/seed.ts
 */
import pg from "pg"

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://admin:admin123@localhost:5435/helpdesk_db"

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log("🌱 Seeding database...")

  // Stages
  const stages = [
    { name: "Draft", sequence: 1, is_starting: true, is_closing: false, fold: false },
    { name: "In Progress", sequence: 2, is_starting: false, is_closing: false, fold: false },
    { name: "Waiting Confirmation", sequence: 3, is_starting: false, is_closing: false, fold: false },
    { name: "Resolved", sequence: 4, is_starting: false, is_closing: true, fold: false },
    { name: "Closed", sequence: 5, is_starting: false, is_closing: true, fold: true },
  ]
  for (const s of stages) {
    await client.query(
      `INSERT INTO stages (name, sequence, is_starting, is_closing, fold, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       ON CONFLICT (name) DO UPDATE SET sequence=$2, is_starting=$3, is_closing=$4, fold=$5`,
      [s.name, s.sequence, s.is_starting, s.is_closing, s.fold]
    )
  }
  console.log(`✅ ${stages.length} stages created`)

  // Categories
  const categories = [
    { name: "Hardware", sequence: 1 },
    { name: "Software", sequence: 2 },
    { name: "Network", sequence: 3 },
    { name: "Account & Access", sequence: 4 },
    { name: "Email", sequence: 5 },
    { name: "Printer", sequence: 6 },
    { name: "ERP / Odoo", sequence: 7 },
    { name: "Other", sequence: 99 },
  ]
  for (const c of categories) {
    await client.query(
      `INSERT INTO categories (name, sequence, is_active, created_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (name) DO UPDATE SET sequence=$2`,
      [c.name, c.sequence]
    )
  }
  console.log(`✅ ${categories.length} categories created`)

  // Teams
  const teams = [
    { name: "IT Support", description: "Tim support IT umum" },
    { name: "IT Infrastructure", description: "Tim infrastruktur dan jaringan" },
    { name: "IT Development", description: "Tim pengembangan aplikasi" },
  ]
  for (const t of teams) {
    await client.query(
      `INSERT INTO teams (name, description, is_active, created_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (name) DO UPDATE SET description=$2`,
      [t.name, t.description]
    )
  }
  console.log(`✅ ${teams.length} teams created`)

  // Tags
  const tags = [
    { name: "Urgent", color: 1 },
    { name: "Bug", color: 2 },
    { name: "Feature Request", color: 3 },
    { name: "Maintenance", color: 4 },
    { name: "Security", color: 5 },
  ]
  for (const t of tags) {
    await client.query(
      `INSERT INTO tags (name, color, is_active, created_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (name) DO UPDATE SET color=$2`,
      [t.name, t.color]
    )
  }
  console.log(`✅ ${tags.length} tags created`)

  console.log("🎉 Seeding completed!")
  await client.end()
}

main().catch((e) => {
  console.error("❌ Seeding failed:", e)
  process.exit(1)
})
