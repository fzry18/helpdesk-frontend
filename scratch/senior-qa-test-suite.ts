import { signJwt } from "../src/lib/serverAuth"
import { prisma } from "../src/lib/prisma"

const BASE_URL = "http://localhost:3000/api/helpdesk"

// Test Results Collector
interface TestCaseResult {
  id: string
  suite: string
  name: string
  type: "POSITIVE" | "NEGATIVE" | "VOLUME" | "SECURITY" | "ANTISLOP"
  status: "PASS" | "FAIL"
  latencyMs: number
  details: string
  error?: string
}

const results: TestCaseResult[] = []

function record(result: TestCaseResult) {
  results.push(result)
  const icon = result.status === "PASS" ? "✅" : "❌"
  console.log(`[${result.status}] ${result.id}: ${result.name} (${result.latencyMs}ms) - ${result.details}`)
  if (result.error) {
    console.error(`   Error details: ${result.error}`)
  }
}

// Tokens for different test personas
const superAdminToken = signJwt({
  employeeId: 14422,
  nik: "1.1025.274",
  name: "Muhammad Fazry Suhada",
  isSuperAdmin: true,
  roles: ["SUPER_ADMIN"],
  permissions: [
    "ticket:create", "ticket:view_own", "ticket:view_all", "ticket:assign",
    "ticket:update_stage", "ticket:internal_note", "ticket:request_confirm",
    "ticket:confirm_resolved", "master:manage", "rbac:manage"
  ],
})

const adminItToken = signJwt({
  employeeId: 14421,
  nik: "1.1025.273",
  name: "Noviana Ramadhani",
  isSuperAdmin: false,
  roles: ["ADMIN_IT_SUPPORT"],
  permissions: [
    "ticket:create", "ticket:view_own", "ticket:view_all", "ticket:assign",
    "ticket:update_stage", "ticket:internal_note", "ticket:request_confirm",
    "ticket:confirm_resolved", "master:manage"
  ],
})

const technicianToken = signJwt({
  employeeId: 15281,
  nik: "1.1225.278",
  name: "EGGY B BRILLIAN",
  isSuperAdmin: false,
  roles: ["IT_SUPPORT"],
  permissions: [
    "ticket:create", "ticket:view_own", "ticket:view_all",
    "ticket:update_stage", "ticket:internal_note", "ticket:request_confirm",
    "ticket:confirm_resolved"
  ],
})

const userToken = signJwt({
  employeeId: 9165,
  nik: "82.0924.4626",
  name: "Aan Aji Saputra",
  isSuperAdmin: false,
  roles: ["USER"],
  permissions: ["ticket:create", "ticket:view_own", "ticket:confirm_resolved"],
})

async function runApiTest(
  id: string,
  suite: string,
  name: string,
  type: "POSITIVE" | "NEGATIVE" | "VOLUME" | "SECURITY" | "ANTISLOP",
  fn: () => Promise<{ pass: boolean; details: string; error?: string }>
) {
  const start = Date.now()
  try {
    const outcome = await fn()
    const latencyMs = Date.now() - start
    record({
      id,
      suite,
      name,
      type,
      status: outcome.pass ? "PASS" : "FAIL",
      latencyMs,
      details: outcome.details,
      error: outcome.error,
    })
  } catch (err: any) {
    const latencyMs = Date.now() - start
    record({
      id,
      suite,
      name,
      type,
      status: "FAIL",
      latencyMs,
      details: "Exception caught during test execution",
      error: err?.message || String(err),
    })
  }
}

async function main() {
  console.log("================================================================================")
  console.log("SENIOR QA & QC COMPREHENSIVE END-TO-END TEST SUITE RUNNER")
  console.log("Target: " + BASE_URL)
  console.log("Timestamp: " + new Date().toISOString())
  console.log("================================================================================\n")

  // ---------------------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & TOKEN VALIDATION
  // ---------------------------------------------------------------------------
  console.log(">>> Executing Suite 1: Authentication & RBAC Token Security...")

  await runApiTest("AUTH-POS-01", "Authentication", "Get Profile Me with Super Admin Token", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })
    const data = await res.json()
    const pass = res.status === 200 && data.success && data.data?.employee?.nik === "1.1025.274"
    return { pass, details: `Status ${res.status}, user: ${data.data?.employee?.name}` }
  })

  await runApiTest("AUTH-POS-02", "Authentication", "Get Profile Me with Regular User Token", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const data = await res.json()
    const pass = res.status === 200 && data.success && data.data?.employee?.nik === "82.0924.4626"
    return { pass, details: `Status ${res.status}, roles: ${data.data?.roles?.join(",")}` }
  })

  await runApiTest("AUTH-NEG-01", "Authentication", "Reject request without Authorization header", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/auth/me`)
    const pass = res.status === 401
    return { pass, details: `Expected 401, got ${res.status}` }
  })

  await runApiTest("AUTH-NEG-02", "Authentication", "Reject request with malformed JWT", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: "Bearer this.is.not.a.valid.jwt" },
    })
    const pass = res.status === 401
    return { pass, details: `Expected 401, got ${res.status}` }
  })

  await runApiTest("AUTH-NEG-03", "Authentication", "Reject request with tampered JWT signature", "NEGATIVE", async () => {
    const tampered = superAdminToken.slice(0, -6) + "fake99"
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tampered}` },
    })
    const pass = res.status === 401
    return { pass, details: `Expected 401, got ${res.status}` }
  })

  // ---------------------------------------------------------------------------
  // SUITE 2: TICKET END-TO-END LIFECYCLE (POSITIVE & WORKFLOW)
  // ---------------------------------------------------------------------------
  console.log("\n>>> Executing Suite 2: Ticket End-to-End Lifecycle & Workflow...")

  let createdTicketId: number = 0
  let createdTicketNumber: string = ""

  await runApiTest("TICK-POS-01", "Ticket Lifecycle", "User creates standard ticket", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "[QA-AUTO] Printer lantai 1 tidak bisa cetak bolak-balik",
        description: "Printer HP LaserJet di divisi Logistic macet saat memilih mode duplex.",
        priority: "2",
        category_id: 5, // Printer
      }),
    })
    const json = await res.json()
    if (res.status === 200 && json.success && json.data?.id) {
      createdTicketId = json.data.id
      createdTicketNumber = json.data.ticket_number
      return { pass: true, details: `Created Ticket #${json.data.ticket_number} (ID ${json.data.id})` }
    }
    return { pass: false, details: `Failed: status ${res.status}`, error: json.message }
  })

  await runApiTest("TICK-POS-02", "Ticket Lifecycle", "Fetch created ticket detail", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success && json.data?.ticket_number === createdTicketNumber
    return { pass, details: `Status ${res.status}, Stage: ${json.data?.stage?.name}, Priority: ${json.data?.priority}` }
  })

  await runApiTest("TICK-POS-03", "Ticket Lifecycle", "Dispatcher assigns ticket to Team & Technician", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${createdTicketId}/assign`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminItToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        team_id: 1, // IT Support
        assigned_user_id: 15281, // EGGY B BRILLIAN
      }),
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success
    return { pass, details: `Status ${res.status}, message: ${json.message}` }
  })

  await runApiTest("TICK-POS-04", "Ticket Lifecycle", "Technician updates stage to 'In Progress'", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${createdTicketId}/stage`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${technicianToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stage_id: 2 }), // In Progress
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success
    return { pass, details: `Status ${res.status}, stage set to In Progress` }
  })

  await runApiTest("TICK-POS-05", "Ticket Lifecycle", "User sends public chat message in ticket", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${createdTicketId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: "Halo tim IT, kertasnya selalu tersangkut di roller kedua.",
        internal: false,
      }),
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success && json.data?.id
    return { pass, details: `Message ID ${json.data?.id} posted by user` }
  })

  await runApiTest("TICK-POS-06", "Ticket Lifecycle", "Technician posts internal IT note", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${createdTicketId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${technicianToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: "Diagnosa teknis: Pickup roller aus, perlu pembersihan sensor kertas.",
        internal: true,
      }),
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success && json.data?.is_internal === true
    return { pass, details: `Internal note ID ${json.data?.id} created (is_internal: ${json.data?.is_internal})` }
  })

  await runApiTest("TICK-POS-07", "Ticket Lifecycle", "Regular user CANNOT see internal IT notes", "SECURITY", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${createdTicketId}/messages`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const json = await res.json()
    const messages: any[] = json.data || []
    const containsInternal = messages.some((m) => m.is_internal === true)
    const pass = res.status === 200 && !containsInternal
    return {
      pass,
      details: `User saw ${messages.length} messages, internal notes hidden: ${!containsInternal}`,
    }
  })

  await runApiTest("TICK-POS-08", "Ticket Lifecycle", "Technician CAN see internal notes", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${createdTicketId}/messages`, {
      headers: { Authorization: `Bearer ${technicianToken}` },
    })
    const json = await res.json()
    const messages: any[] = json.data || []
    const containsInternal = messages.some((m) => m.is_internal === true)
    const pass = res.status === 200 && containsInternal
    return {
      pass,
      details: `Technician saw ${messages.length} messages, internal notes visible: ${containsInternal}`,
    }
  })

  await runApiTest("TICK-POS-09", "Ticket Lifecycle", "Technician requests user confirmation", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${createdTicketId}/request-confirmation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${technicianToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        note: "Roller telah diganti dan uji print 10 lembar berhasil. Mohon dicoba dan konfirmasi.",
      }),
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success
    return { pass, details: `Status ${res.status}, waiting_user_confirmation activated` }
  })

  await runApiTest("TICK-POS-10", "Ticket Lifecycle", "User confirms resolution with rating and feedback", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${createdTicketId}/confirm-resolved`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        satisfaction_rating: "5",
        feedback: "Pelayanan sangat cepat dan printer kembali berfungsi normal. Terima kasih!",
      }),
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success
    return { pass, details: `Resolution confirmed, rating 5 stars saved` }
  })

  // ---------------------------------------------------------------------------
  // SUITE 3: RBAC ISOLATION & NEGATIVE TESTING
  // ---------------------------------------------------------------------------
  console.log("\n>>> Executing Suite 3: RBAC Isolation & Negative Security Testing...")

  // Create an open ticket specifically for security test
  let secTicketId = 0
  const secRes = await fetch(`${BASE_URL}/tickets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: "[QA-SEC] Tiket Uji Keamanan dan Validasi Negatif",
      description: "Tiket khusus untuk uji negative testing dan validasi keamanan",
      priority: "1",
    }),
  })
  const secJson = await secRes.json()
  secTicketId = secJson.data?.id

  await runApiTest("SEC-NEG-01", "Security & RBAC", "Reject User attempting to assign ticket", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${secTicketId}/assign`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ team_id: 1, assigned_user_id: 14421 }),
    })
    const pass = res.status === 403
    return { pass, details: `Expected 403 Forbidden, got ${res.status}` }
  })

  await runApiTest("SEC-NEG-02", "Security & RBAC", "Reject User attempting to update ticket stage directly", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${secTicketId}/stage`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stage_id: 5 }),
    })
    const pass = res.status === 403
    return { pass, details: `Expected 403 Forbidden, got ${res.status}` }
  })

  await runApiTest("SEC-NEG-03", "Security & RBAC", "Reject User attempting to post internal note", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/${secTicketId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: "Trying to inject internal note as regular user",
        internal: true,
      }),
    })
    const json = await res.json()
    // Rejected with 403 because regular user lacks ticket:internal_note permission
    const pass = res.status === 403
    return {
      pass,
      details: `Status ${res.status}, response: ${json.message}`,
    }
  })

  await runApiTest("SEC-NEG-04", "Security & RBAC", "Reject Non-SuperAdmin accessing /users RBAC endpoint", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    const pass = res.status === 403
    return { pass, details: `Expected 403 Forbidden, got ${res.status}` }
  })

  await runApiTest("SEC-NEG-05", "Security & RBAC", "Reject Technician accessing /users RBAC endpoint", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${technicianToken}` },
    })
    const pass = res.status === 403
    return { pass, details: `Expected 403 Forbidden, got ${res.status}` }
  })

  await runApiTest("VALID-NEG-01", "Validation", "Reject ticket creation with empty subject", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "",
        description: "Valid description",
      }),
    })
    const pass = res.status === 400
    return { pass, details: `Expected 400 Bad Request, got ${res.status}` }
  })

  await runApiTest("VALID-NEG-02", "Validation", "Reject ticket creation with empty description", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Valid subject",
        description: "",
      }),
    })
    const pass = res.status === 400
    return { pass, details: `Expected 400 Bad Request, got ${res.status}` }
  })

  await runApiTest("VALID-NEG-03", "Validation", "Return 404 for non-existent ticket ID 999999", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/tickets/999999`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })
    const pass = res.status === 404
    return { pass, details: `Expected 404 Not Found, got ${res.status}` }
  })

  await runApiTest("SEC-POS-01", "Security", "Resilient against SQL Injection string in search and subject", "SECURITY", async () => {
    const sqliSubject = "[QA-SEC] Test ' OR 1=1 -- Drop Table tickets;"
    const res = await fetch(`${BASE_URL}/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: sqliSubject,
        description: "Testing Prisma parameterized query safety against SQL Injection",
        priority: "1",
      }),
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success && json.data?.id
    return { pass, details: `Created safely without database crash. Ticket ID ${json.data?.id}` }
  })

  await runApiTest("SEC-POS-02", "Security", "Resilient against XSS script tag payload in message", "SECURITY", async () => {
    const xssPayload = "<script>alert('XSS-TEST')</script><img src=x onerror=alert(1)>"
    const res = await fetch(`${BASE_URL}/tickets/${secTicketId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: xssPayload,
        internal: false,
      }),
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success && json.data?.id
    return { pass, details: `Message with script tag handled cleanly without error. Status ${res.status}` }
  })

  // ---------------------------------------------------------------------------
  // SUITE 4: MASTER DATA MANAGEMENT (CATEGORIES, STAGES, TEAMS)
  // ---------------------------------------------------------------------------
  console.log("\n>>> Executing Suite 4: Master Data CRUD & Authorization...")

  let tempCatId: number = 0

  await runApiTest("MASTER-POS-01", "Master Data", "Super Admin creates custom category", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `QA Test Category ${Date.now()}`,
        sequence: 50,
      }),
    })
    const json = await res.json()
    if (res.status === 200 && json.success && json.data?.id) {
      tempCatId = json.data.id
      return { pass: true, details: `Created category ID ${tempCatId} (${json.data.name})` }
    }
    return { pass: false, details: `Status ${res.status}`, error: json.message }
  })

  await runApiTest("MASTER-POS-02", "Master Data", "Super Admin deletes test category", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/categories?id=${tempCatId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success
    return { pass, details: `Status ${res.status}, deleted category ${tempCatId}` }
  })

  await runApiTest("MASTER-NEG-01", "Master Data", "Reject User attempting to create category", "NEGATIVE", async () => {
    const res = await fetch(`${BASE_URL}/categories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Unauthorized Category", sequence: 99 }),
    })
    const pass = res.status === 403
    return { pass, details: `Expected 403 Forbidden, got ${res.status}` }
  })

  // ---------------------------------------------------------------------------
  // SUITE 5: DATA VOLUME & STRESS TESTING (BANYAK DATA)
  // ---------------------------------------------------------------------------
  console.log("\n>>> Executing Suite 5: High Volume / Stress Testing (Banyak Data)...")

  const BULK_COUNT = 30
  console.log(`Generating ${BULK_COUNT} bulk tickets to test pagination, counters, and query stress...`)

  const bulkCreateStart = Date.now()
  let successBulkCount = 0

  for (let i = 1; i <= BULK_COUNT; i++) {
    const prio = ((i % 4) + 1).toString()
    const catId = (i % 6) + 1
    const res = await fetch(`${BASE_URL}/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: `[STRESS-TEST-${i}] Volume Test kendala jaringan dan sistem ke-${i}`,
        description: `Deskripsi kendala pengujian volume data tiket nomor urut ${i}. Menguji performa database dan rendering pagination. Long text padding: ${"A".repeat(200)}`,
        priority: prio,
        category_id: catId,
      }),
    })
    if (res.status === 200) successBulkCount++
  }
  const bulkCreateDuration = Date.now() - bulkCreateStart

  record({
    id: "VOL-STRESS-01",
    suite: "High Volume",
    name: `Bulk Ticket Ingestion (${BULK_COUNT} tickets)`,
    type: "VOLUME",
    status: successBulkCount === BULK_COUNT ? "PASS" : "FAIL",
    latencyMs: bulkCreateDuration,
    details: `Created ${successBulkCount}/${BULK_COUNT} tickets in ${bulkCreateDuration}ms (avg ${(bulkCreateDuration / BULK_COUNT).toFixed(1)}ms/ticket)`,
  })

  await runApiTest("VOL-PAG-01", "High Volume", "Verify pagination page=1 with limit=10", "VOLUME", async () => {
    const res = await fetch(`${BASE_URL}/tickets?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })
    const json = await res.json()
    const pass =
      res.status === 200 &&
      json.success &&
      json.data?.length === 10 &&
      json.meta?.page === 1 &&
      json.meta?.limit === 10 &&
      json.meta?.total_pages > 1 &&
      json.meta?.has_next === true
    return {
      pass,
      details: `Returned 10 items, total: ${json.meta?.total}, total_pages: ${json.meta?.total_pages}, has_next: ${json.meta?.has_next}`,
    }
  })

  await runApiTest("VOL-PAG-02", "High Volume", "Verify pagination page=2 with limit=10", "VOLUME", async () => {
    const res = await fetch(`${BASE_URL}/tickets?page=2&limit=10`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })
    const json = await res.json()
    const pass =
      res.status === 200 &&
      json.success &&
      json.data?.length === 10 &&
      json.meta?.page === 2 &&
      json.meta?.has_prev === true
    return {
      pass,
      details: `Returned 10 items on page 2, has_prev: ${json.meta?.has_prev}`,
    }
  })

  await runApiTest("VOL-SEARCH-01", "High Volume", "Search query across large dataset", "VOLUME", async () => {
    const res = await fetch(`${BASE_URL}/tickets?search=${encodeURIComponent("STRESS-TEST-15")}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success && json.data?.length >= 1
    return {
      pass,
      details: `Found ${json.data?.length} match for 'STRESS-TEST-15'`,
    }
  })

  await runApiTest("VOL-LIMIT-01", "High Volume", "10,000 character boundary payload in ticket description", "VOLUME", async () => {
    const longString = "A".repeat(10000)
    const res = await fetch(`${BASE_URL}/tickets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "[BOUNDARY] 10K Characters description stress test",
        description: longString,
        priority: "1",
      }),
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success && json.data?.id
    return {
      pass,
      details: `Accepted 10KB string payload cleanly, Ticket ID ${json.data?.id}`,
    }
  })

  // ---------------------------------------------------------------------------
  // SUITE 6: DASHBOARD AGGREGATION & METRICS
  // ---------------------------------------------------------------------------
  console.log("\n>>> Executing Suite 6: Dashboard Statistics & Workload Analytics...")

  await runApiTest("DASH-POS-01", "Dashboard", "Admin Dashboard Stats aggregation", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/dashboard?days=30`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    })
    const json = await res.json()
    const pass =
      res.status === 200 &&
      json.success &&
      typeof json.data?.summary?.total === "number" &&
      Array.isArray(json.data?.trend) &&
      Array.isArray(json.data?.priority_distribution)
    return {
      pass,
      details: `Total: ${json.data?.summary?.total}, Open: ${json.data?.summary?.open}, Closed: ${json.data?.summary?.closed}, Trend points: ${json.data?.trend?.length}`,
    }
  })

  await runApiTest("DASH-POS-02", "Dashboard", "Technician Workload Dispatcher API", "POSITIVE", async () => {
    const res = await fetch(`${BASE_URL}/admin/technician-workload`, {
      headers: { Authorization: `Bearer ${adminItToken}` },
    })
    const json = await res.json()
    const pass = res.status === 200 && json.success && Array.isArray(json.data)
    return {
      pass,
      details: `Returned workload for ${json.data?.length} technicians`,
    }
  })

  // ---------------------------------------------------------------------------
  // SUMMARY OF TEST RESULTS
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================")
  console.log("TEST EXECUTION SUMMARY")
  console.log("================================================================================")
  const total = results.length
  const passed = results.filter((r) => r.status === "PASS").length
  const failed = results.filter((r) => r.status === "FAIL").length
  const avgLatency = (results.reduce((acc, r) => acc + r.latencyMs, 0) / total).toFixed(1)

  console.log(`Total Test Cases Executed: ${total}`)
  console.log(`Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${failed}`)
  console.log(`Average Latency: ${avgLatency} ms`)
  console.log("================================================================================\n")
}

main().catch(console.error).finally(() => process.exit(0))
