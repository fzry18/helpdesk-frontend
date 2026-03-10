/**
 * One-time migration script: Move attachment files from local filesystem into the DB.
 * Run with: node scripts/migrate-attachments.mjs
 */
import pg from "pg"
import fs from "fs"

const client = new pg.Client({
  host: "localhost",
  port: 5435,
  database: "helpdesk_db",
  user: "admin",
  password: "admin123",
})

async function main() {
  await client.connect()
  console.log("Connected to DB")

  const { rows } = await client.query(
    "SELECT id, file_path FROM attachments WHERE file_data IS NULL AND file_path IS NOT NULL"
  )

  console.log(`Found ${rows.length} attachments to migrate`)

  for (const row of rows) {
    const filePath = row.file_path
    if (!fs.existsSync(filePath)) {
      console.warn(`  [SKIP] ID ${row.id}: file not found at ${filePath}`)
      continue
    }

    const buffer = fs.readFileSync(filePath)
    await client.query("UPDATE attachments SET file_data = $1 WHERE id = $2", [
      buffer,
      row.id,
    ])
    console.log(`  [OK] ID ${row.id}: migrated ${buffer.length} bytes`)
  }

  console.log("Migration complete")
  await client.end()
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
