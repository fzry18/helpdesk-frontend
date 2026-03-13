# Helpdesk System — Architecture Redesign Blueprint

> **Versi**: 1.0  
> **Tanggal**: 11 Maret 2026  
> **Tujuan**: Merancang ulang pondasi codebase agar scalable, maintainable, dan mengikuti best practices Next.js App Router + React + TypeScript modern.

---

## BAGIAN A — AUDIT ARSITEKTUR SAAT INI

### Masalah yang Ditemukan

| # | Masalah | Dampak | Prioritas |
|---|---------|--------|-----------|
| 1 | **Tidak ada `middleware.ts`** — Auth hanya client-side via localStorage + Zustand persist | Rute bisa diakses tanpa auth di server-side; rentan redirect loop | 🔴 Critical |
| 2 | **API Route explosion** — `/api/helpdesk/tickets/[id]/` memiliki 13+ sub-folder | Sulit maintain; business logic tersebar di banyak route handler | 🔴 Critical |
| 3 | **Tidak ada Service Layer** — Business logic langsung di route handler | Tidak bisa di-reuse; sulit unit test | 🔴 Critical |
| 4 | **Monolithic type file** — Semua type di `src/types/index.ts` (~200+ lines) | Sulit navigate; circular dependency risk | 🟡 High |
| 5 | **Duplikasi mutation hooks** — `useTicketActions.ts` dan `use-ticket-queries.ts` keduanya berisi mutations | Inkonsistensi cache invalidation | 🟡 High |
| 6 | **Dashboard Layout = Client Component** — Auth logic di `(dashboard)/layout.tsx` semua client-side | Tidak memanfaatkan Server Component; flash of unauthenticated content | 🟡 High |
| 7 | **Folder `pages/api` kosong** — Sisa migrasi dari Pages Router | Membingungkan developer baru | 🟢 Low |
| 8 | **Tidak ada `loading.tsx`, `error.tsx`, `not-found.tsx`** — Missing Next.js file conventions | Tidak ada loading/error boundary per route | 🟡 High |
| 9 | **WebSocket tanpa connection manager** — Reconnect logic manual di setiap hook | Rentan memory leak; tidak ada heartbeat | 🟡 High |
| 10 | **Generated Prisma di `src/generated/`** — Tercampur dengan application code | Harus di-gitignore; pollution di IDE autocomplete | 🟢 Low |

---

## BAGIAN B — VISUALISASI STRUKTUR FOLDER BARU

```
helpdesk-frontend/
├── .env.example
├── .env.local                        # ← Git-ignored
├── docker-compose.yml
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── public/
│   └── favicon.ico
│
├── docs/                             # Dokumentasi proyek
│
└── src/
    │
    ├── middleware.ts                  # 🛡️ [BARU] Auth guard server-side
    │
    ├── app/                          # ════════ ROUTING LAYER ════════
    │   ├── globals.css
    │   ├── layout.tsx                # Root Layout (Server Component)
    │   ├── not-found.tsx             # [BARU] Global 404
    │   │
    │   ├── (auth)/                   # Route Group: Autentikasi
    │   │   ├── layout.tsx            # Auth layout (centered, no sidebar)
    │   │   └── login/
    │   │       └── page.tsx
    │   │
    │   ├── (dashboard)/              # Route Group: Authenticated Area
    │   │   ├── layout.tsx            # [REFACTOR] Server Component + auth check
    │   │   ├── loading.tsx           # [BARU] Skeleton dashboard
    │   │   ├── error.tsx             # [BARU] Error boundary
    │   │   │
    │   │   ├── dashboard/
    │   │   │   ├── page.tsx          # Server Component: fetch stats
    │   │   │   └── loading.tsx
    │   │   │
    │   │   ├── tickets/
    │   │   │   ├── page.tsx          # Server Component shell + Client island
    │   │   │   ├── loading.tsx       # [BARU]
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx      # Server Component: fetch ticket detail
    │   │   │       ├── loading.tsx   # [BARU]
    │   │   │       └── not-found.tsx # [BARU]
    │   │   │
    │   │   └── admin/
    │   │       ├── layout.tsx        # [BARU] Admin role guard (Server Component)
    │   │       ├── employees/
    │   │       │   └── page.tsx
    │   │       └── teams/
    │   │           └── page.tsx
    │   │
    │   └── api/                      # ════════ API LAYER ════════
    │       └── helpdesk/
    │           ├── auth/
    │           │   ├── login/route.ts
    │           │   ├── logout/route.ts
    │           │   ├── me/route.ts
    │           │   ├── change-password/route.ts
    │           │   └── force-change-password/route.ts
    │           │
    │           ├── tickets/
    │           │   ├── route.ts              # GET (list) + POST (create)
    │           │   ├── helpers.ts
    │           │   └── [id]/
    │           │       ├── route.ts          # GET + PATCH + DELETE (single ticket)
    │           │       ├── messages/route.ts  # GET + POST messages
    │           │       ├── thread/route.ts
    │           │       ├── attachments/route.ts
    │           │       └── actions/route.ts  # ← [BARU] Unified action endpoint
    │           │           # POST { action: "open"|"close"|"reject"|"assign-team"|
    │           │           #        "request-confirmation"|"confirm-resolved"|
    │           │           #        "priority"|"stage"|"assign"|"activity-log" }
    │           │
    │           ├── dashboard/
    │           │   ├── route.ts              # GET stats
    │           │   ├── recent/route.ts
    │           │   ├── my-tickets/route.ts
    │           │   └── trends/route.ts
    │           │
    │           ├── admin/
    │           │   ├── employees/route.ts
    │           │   └── teams/route.ts
    │           │
    │           └── master-data/
    │               ├── route.ts              # GET all master data
    │               ├── categories/route.ts
    │               ├── teams/route.ts
    │               ├── stages/route.ts
    │               ├── tags/route.ts
    │               └── priorities/route.ts
    │
    ├── features/                     # ════════ FEATURE LAYER ════════
    │   │                             # (Feature-Sliced Architecture)
    │   │
    │   ├── auth/
    │   │   ├── types.ts              # LoginRequest, LoginResponse, Employee
    │   │   ├── store.ts              # Zustand auth store
    │   │   ├── hooks/
    │   │   │   └── use-auth.ts       # useLogin, useLogout, useSession
    │   │   └── components/
    │   │       ├── LoginForm.tsx
    │   │       └── AuthGuard.tsx     # Client-side guard fallback
    │   │
    │   ├── tickets/
    │   │   ├── types.ts              # Ticket, CreateTicketPayload, TicketFilters
    │   │   ├── constants.ts          # Priority maps, status maps
    │   │   ├── helpers.ts            # getTicketStatusGroup, isTicketDraft, dll
    │   │   ├── hooks/
    │   │   │   ├── use-ticket-list.ts     # useQuery: ticket list + pagination
    │   │   │   ├── use-ticket-detail.ts   # useQuery: single ticket + messages
    │   │   │   └── use-ticket-actions.ts  # useMutation: semua ticket actions
    │   │   └── components/
    │   │       ├── TicketList.tsx
    │   │       ├── TicketCard.tsx
    │   │       ├── TicketFilters.tsx
    │   │       ├── TicketAdminActions.tsx
    │   │       ├── create/
    │   │       │   └── CreateTicketDialog.tsx
    │   │       └── detail/
    │   │           ├── TicketHeader.tsx
    │   │           ├── TicketDescription.tsx
    │   │           ├── TicketMetadata.tsx
    │   │           ├── MessageThread.tsx
    │   │           ├── MessageForm.tsx
    │   │           ├── MessageItem.tsx
    │   │           ├── ActivityLogCard.tsx
    │   │           ├── ConfirmationBanner.tsx
    │   │           └── AttachmentList.tsx
    │   │
    │   ├── dashboard/
    │   │   ├── types.ts              # DashboardStats, TrendData
    │   │   ├── hooks/
    │   │   │   └── use-dashboard.ts  # useQuery: stats, recent, trends
    │   │   └── components/
    │   │       ├── DashboardStats.tsx
    │   │       └── StatCard.tsx
    │   │
    │   ├── admin/
    │   │   ├── types.ts              # AdminEmployee, TeamManagement
    │   │   ├── hooks/
    │   │   │   ├── use-employees.ts
    │   │   │   └── use-teams.ts
    │   │   └── components/
    │   │       ├── AdminEmployeeTable.tsx
    │   │       ├── AddAdminDialog.tsx
    │   │       ├── TeamCard.tsx
    │   │       ├── CreateTeamDialog.tsx
    │   │       └── AddTeamMemberDialog.tsx
    │   │
    │   └── realtime/                 # ← [BARU] WebSocket sebagai feature terpisah
    │       ├── types.ts              # WSEvent, WSEventType
    │       ├── ws-manager.ts         # Singleton WebSocket connection manager
    │       ├── hooks/
    │       │   ├── use-ws-connection.ts    # Connect/disconnect lifecycle
    │       │   └── use-ticket-ws.ts        # Ticket-specific WS events → cache update
    │       └── constants.ts          # WS_URL, reconnect config
    │
    ├── shared/                       # ════════ SHARED LAYER ════════
    │   │                             # (Cross-feature reusable code)
    │   │
    │   ├── types/
    │   │   ├── api.ts                # ApiResponse<T>, PaginationMeta
    │   │   └── master-data.ts        # Category, Team, Stage, Tag, Priority
    │   │
    │   ├── hooks/
    │   │   ├── use-debounce.ts
    │   │   ├── use-lazy-load.ts
    │   │   ├── use-performance.ts
    │   │   └── use-toast.ts
    │   │
    │   ├── constants/
    │   │   └── error-messages.ts
    │   │
    │   └── utils/
    │       ├── cn.ts                 # Tailwind class merge utility
    │       ├── format.ts             # Date, number formatting
    │       └── validation.ts         # Zod schemas reusable
    │
    ├── components/                   # ════════ UI COMPONENT LIBRARY ════════
    │   │                             # (Design system primitives, zero business logic)
    │   │
    │   ├── ui/                       # Radix-based primitives (shadcn/ui)
    │   │   ├── avatar.tsx
    │   │   ├── badge.tsx
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── select.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── textarea.tsx
    │   │   ├── toast.tsx
    │   │   ├── toaster.tsx
    │   │   └── ...
    │   │
    │   ├── layout/                   # Shell components
    │   │   ├── Sidebar.tsx
    │   │   ├── Navbar.tsx
    │   │   └── PageHeader.tsx        # [BARU] Reusable page header
    │   │
    │   ├── data-display/             # [BARU] Generic display components
    │   │   ├── EmptyState.tsx
    │   │   ├── VirtualList.tsx
    │   │   └── LazyRender.tsx
    │   │
    │   └── forms/                    # [BARU] Reusable form components
    │       ├── DebouncedSearch.tsx
    │       ├── FileUploader.tsx
    │       └── SearchInput.tsx
    │
    ├── lib/                          # ════════ INFRASTRUCTURE LAYER ════════
    │   │                             # (Framework adapters, external integrations)
    │   │
    │   ├── api/
    │   │   ├── client.ts             # Axios instance + interceptors
    │   │   └── endpoints.ts          # API endpoint definitions
    │   │
    │   ├── query/
    │   │   ├── client.ts             # [RENAME] createQueryClient()
    │   │   ├── keys.ts              # [BARU] Query key factory (extracted)
    │   │   └── cache-config.ts       # [BARU] Cache time constants (extracted)
    │   │
    │   ├── server/                   # Server-only code
    │   │   ├── auth.ts               # Token verification, session management
    │   │   ├── prisma.ts             # Prisma client singleton
    │   │   └── odoo-client.ts        # Odoo API integration
    │   │
    │   └── providers/
    │       └── Providers.tsx          # QueryClientProvider + Toaster
    │
    └── generated/                    # Auto-generated (gitignored ideally)
        └── prisma/
```

---

## BAGIAN C — DESIGN PATTERNS & PENJELASAN ARSITEKTUR

### C1. Feature-Sliced Architecture (FSA)

```
┌─────────────────────────────────────────────────┐
│                   app/ (Routing)                │  ← Thin routing layer
│  Hanya file conventions Next.js:                │     Server Components default
│  page.tsx, layout.tsx, loading.tsx, error.tsx    │     Minimal logic, delegate ke features
└──────────────────┬──────────────────────────────┘
                   │ imports
┌──────────────────▼──────────────────────────────┐
│              features/ (Domain Logic)            │  ← Business logic per domain
│  auth/ │ tickets/ │ dashboard/ │ admin/          │     Hooks, components, types
│  realtime/                                       │     Setiap feature mandiri
└──────────────────┬──────────────────────────────┘
                   │ imports
┌──────────────────▼──────────────────────────────┐
│        shared/ (Cross-Feature Utilities)         │  ← Shared types, hooks, utils
│  types/ │ hooks/ │ constants/ │ utils/           │     Tidak boleh import features/
└──────────────────┬──────────────────────────────┘
                   │ imports
┌──────────────────▼──────────────────────────────┐
│          components/ (Design System)             │  ← UI primitives
│  ui/ │ layout/ │ data-display/ │ forms/          │     Zero business logic
└──────────────────┬──────────────────────────────┘
                   │ imports
┌──────────────────▼──────────────────────────────┐
│            lib/ (Infrastructure)                 │  ← Framework adapters
│  api/ │ query/ │ server/ │ providers/            │     External service integrations
└─────────────────────────────────────────────────┘
```

**Aturan Import (Dependency Rule):**
```
app/ → features/ → shared/ → components/ → lib/
         ↓              ↓           ↓
    (boleh impor     (boleh      (boleh
     shared,          impor       impor
     components,      components,  lib/)
     lib/)            lib/)

❌ features/ TIDAK BOLEH impor features/ lain secara langsung
❌ shared/ TIDAK BOLEH impor features/
❌ components/ TIDAK BOLEH impor features/ atau shared/
```

### C2. Server Component vs Client Component Boundary

```
┌──────────────────────────────────────────────────────────┐
│  SERVER COMPONENTS (Default di App Router)                │
│                                                          │
│  ✅ app/(dashboard)/layout.tsx    → Auth check via       │
│                                     middleware/cookies    │
│  ✅ app/(dashboard)/dashboard/page.tsx → Fetch stats     │
│  ✅ app/(dashboard)/tickets/page.tsx   → Fetch list      │
│  ✅ app/(dashboard)/tickets/[id]/page.tsx → Fetch detail │
│  ✅ app/(dashboard)/admin/layout.tsx   → Role guard      │
│                                                          │
│  📦 Benefit: Zero JS shipped, direct DB access possible  │
└────────────────────┬─────────────────────────────────────┘
                     │ renders
┌────────────────────▼─────────────────────────────────────┐
│  CLIENT COMPONENTS ("use client" — Interactive Islands)  │
│                                                          │
│  🟡 features/tickets/components/TicketList.tsx           │
│     → Filters, pagination, real-time updates             │
│  🟡 features/tickets/components/detail/MessageForm.tsx   │
│     → Form input, optimistic updates                     │
│  🟡 features/auth/components/LoginForm.tsx               │
│     → Form state, validation                             │
│  🟡 features/realtime/hooks/use-ws-connection.ts         │
│     → WebSocket lifecycle                                │
│  🟡 components/layout/Sidebar.tsx                        │
│     → Mobile menu toggle, active state                   │
│                                                          │
│  📦 Benefit: Interactivity, state, event handlers        │
└──────────────────────────────────────────────────────────┘
```

**Pattern: Server Shell + Client Island**

```tsx
// app/(dashboard)/tickets/page.tsx — SERVER COMPONENT
import { TicketListClient } from '@/features/tickets/components/TicketList'

export default async function TicketsPage() {
  // Pre-fetch bisa dilakukan di server jika diperlukan
  return (
    <div>
      <h1>Tickets</h1>
      {/* Client island untuk interactivity */}
      <TicketListClient />
    </div>
  )
}
```

### C3. Unified Ticket Action Pattern

**Sebelum (13 sub-folder route handler):**
```
api/helpdesk/tickets/[id]/
  ├── open/route.ts
  ├── close/route.ts
  ├── reject/route.ts
  ├── assign/route.ts
  ├── assign-team/route.ts
  ├── activity-log/route.ts
  ├── confirm-resolved/route.ts
  ├── request-confirmation/route.ts
  ├── priority/route.ts
  ├── stage/route.ts
  └── ... (terus bertambah)
```

**Sesudah (Unified Action Endpoint + Service Layer):**
```
api/helpdesk/tickets/[id]/
  ├── route.ts           # GET, PATCH, DELETE
  ├── messages/route.ts  # GET, POST
  ├── thread/route.ts    # GET
  ├── attachments/route.ts # GET, POST
  └── actions/route.ts   # POST { action: "open"|"close"|"reject"|... }
```

```typescript
// src/app/api/helpdesk/tickets/[id]/actions/route.ts
import { TicketActionService } from '@/lib/server/services/ticket-action.service'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { action, ...payload } = await req.json()
  
  const service = new TicketActionService()
  
  switch (action) {
    case 'open':       return service.openTicket(+params.id, payload)
    case 'close':      return service.closeTicket(+params.id, payload)
    case 'reject':     return service.rejectTicket(+params.id, payload)
    case 'assign-team': return service.assignTeam(+params.id, payload)
    case 'priority':   return service.setPriority(+params.id, payload)
    // ... dll
    default:           return Response.json({ error: 'Unknown action' }, { status: 400 })
  }
}
```

### C4. Service Layer Pattern

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Route Handler   │ ──▶ │   Service Layer      │ ──▶ │  Repository      │
│  (API Route)     │     │   (Business Logic)   │     │  (Prisma Access) │
│                  │     │                      │     │                  │
│ • Parse request  │     │ • Validate rules     │     │ • CRUD operations│
│ • Auth check     │     │ • Orchestrate flow   │     │ • Query building │
│ • Return response│     │ • Emit events        │     │ • Transaction    │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
```

File structure untuk Service Layer (tambahan di `lib/server/`):
```
lib/server/
  ├── auth.ts                       # Auth utilities
  ├── prisma.ts                     # Prisma client
  ├── odoo-client.ts                # Odoo integration
  ├── services/
  │   ├── ticket.service.ts         # CRUD ticket
  │   ├── ticket-action.service.ts  # Workflow actions
  │   ├── message.service.ts        # Messaging
  │   ├── dashboard.service.ts      # Statistics
  │   └── admin.service.ts          # Employee/Team management
  └── repositories/
      ├── ticket.repository.ts      # Prisma ticket queries
      ├── employee.repository.ts
      ├── message.repository.ts
      └── team.repository.ts
```

### C5. WebSocket Connection Manager Pattern

```
┌──────────────────────────────────────────────────────┐
│                 WSManager (Singleton)                  │
│                                                       │
│  • Single connection per client                       │
│  • Automatic reconnect (exponential backoff)          │
│  • Heartbeat ping/pong setiap 30 detik               │
│  • Room subscription: join(ticketId) / leave()        │
│  • Event bus: on(event, callback) / off()             │
│                                                       │
│  ┌─────────────────────────────────────────────┐     │
│  │ Event Flow:                                  │     │
│  │                                              │     │
│  │ WS Message → WSManager.dispatch()            │     │
│  │    → use-ticket-ws.ts                        │     │
│  │       → queryClient.setQueryData() (cache)   │     │
│  │       → UI auto-updates via React Query      │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### C6. State Management Separation

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT MAP                       │
├─────────────────┬───────────────────┬───────────────────────┤
│ Layer           │ Tool              │ Contoh                │
├─────────────────┼───────────────────┼───────────────────────┤
│ Server State    │ React Query       │ Ticket list, detail,  │
│ (remote data)   │ (TanStack Query)  │ messages, dashboard   │
│                 │                   │ stats, master data    │
├─────────────────┼───────────────────┼───────────────────────┤
│ Client State    │ Zustand           │ Auth state (employee, │
│ (UI + auth)     │ + persist         │ token, role), sidebar │
│                 │ + immer           │ toggle, theme         │
├─────────────────┼───────────────────┼───────────────────────┤
│ Form State      │ React Hook Form   │ Create ticket form,   │
│                 │ + Zod resolver    │ login form, filters   │
├─────────────────┼───────────────────┼───────────────────────┤
│ URL State       │ Next.js           │ Ticket filters,       │
│                 │ searchParams      │ pagination, tab state │
├─────────────────┼───────────────────┼───────────────────────┤
│ Real-Time State │ WebSocket →       │ Ticket status change, │
│                 │ React Query cache │ new messages          │
└─────────────────┴───────────────────┴───────────────────────┘
```

### C7. Middleware Auth Flow

```
Browser Request
      │
      ▼
┌─────────────────┐
│  middleware.ts   │  ← Next.js Edge Middleware
│                  │
│  1. Baca cookie  │
│     "session"    │
│                  │
│  2. Verify JWT   │
│     (lightweight)│
│                  │
│  3. Jika invalid:│
│     redirect     │
│     → /login     │
│                  │
│  4. Jika valid:  │
│     set header   │
│     x-employee-id│
│     lanjut       │
└────────┬────────┘
         │
         ▼
  Server Component / API Route
  (baca x-employee-id dari header)
```

---

## BAGIAN D — CONSTRUCTION BLUEPRINT (Step-by-Step)

> Setiap langkah di bawah ini **mandiri** — seorang developer baru bisa langkah ke step manapun dengan membaca instruksi di step itu tanpa harus membaca step sebelumnya.

---

### 📋 STEP 0: Persiapan & Branch Strategy

**Objective**: Setup branch dan pastikan semua test/build hijau sebelum mulai refactor.

**Context Brief**:
- Repository: `helpdesk-frontend` (Next.js 16, React 19, Prisma, PostgreSQL)
- Package manager: `pnpm`
- Build: `pnpm build`; Lint: `pnpm lint`; Type check: `pnpm type-check`

**Instructions**:
1. Buat branch `refactor/architecture-v2` dari `main`
2. Jalankan `pnpm build` dan `pnpm type-check` — pastikan hijau  
3. Commit baseline: `chore: baseline before architecture refactor`

**Verification**: `pnpm build` sukses, zero errors.

---

### 📋 STEP 1: Tambahkan `middleware.ts` untuk Auth Guard

**Objective**: Proteksi semua route `(dashboard)` di server-side agar user tidak bisa akses tanpa auth.

**Context Brief**:
- Saat ini: Auth hanya client-side (Zustand + localStorage check di `(dashboard)/layout.tsx`)
- Target: Edge middleware membaca cookie/token, redirect ke `/login` jika invalid
- File auth utilities: `src/lib/server/auth.ts` (sudah ada JWT verify logic)
- Protected routes: semua di bawah `/(dashboard)/`
- Public routes: `/login`, `/api/helpdesk/auth/login`, `/api/helpdesk/auth/force-change-password`

**Instructions**:
1. Buat `src/middleware.ts`:
   ```typescript
   import { NextResponse } from 'next/server'
   import type { NextRequest } from 'next/server'

   const PUBLIC_PATHS = ['/login', '/api/helpdesk/auth/login', '/api/helpdesk/auth/force-change-password']

   export function middleware(request: NextRequest) {
     const { pathname } = request.nextUrl
     if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname.startsWith('/_next')) {
       return NextResponse.next()
     }
     const token = request.cookies.get('access_token')?.value
                || request.headers.get('authorization')?.replace('Bearer ', '')
     if (!token && pathname !== '/login') {
       return NextResponse.redirect(new URL('/login', request.url))
     }
     const response = NextResponse.next()
     if (token) response.headers.set('x-access-token', token)
     return response
   }

   export const config = {
     matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
   }
   ```
2. Update login flow untuk set cookie saat login berhasil (selain localStorage)
3. Update logout flow untuk clear cookie

**Verification**: 
- Akses `/dashboard` tanpa login → redirect ke `/login`
- Login → bisa akses `/dashboard`
- `pnpm build` sukses

---

### 📋 STEP 2: Buat Folder Structure `features/`, `shared/`, dan Reorganisasi `components/`

**Objective**: Buat skeleton folder baru tanpa memindahkan code dulu.

**Context Brief**:
- Saat ini: semua bisnis logic ada di `src/components/helpdesk/`, `src/hooks/`, `src/store/`, `src/types/`
- Target: Feature-Sliced Architecture dengan `src/features/`, `src/shared/`, reorganisasi `src/components/`

**Instructions**:
1. Buat folder structure:
   ```
   mkdir -p src/features/auth/{hooks,components}
   mkdir -p src/features/tickets/{hooks,components/create,components/detail}
   mkdir -p src/features/dashboard/{hooks,components}
   mkdir -p src/features/admin/{hooks,components}
   mkdir -p src/features/realtime/hooks
   mkdir -p src/shared/{types,hooks,constants,utils}
   mkdir -p src/components/{data-display,forms}
   mkdir -p src/lib/providers
   mkdir -p src/lib/server/{services,repositories}
   mkdir -p src/lib/query
   ```
2. Buat file index placeholder (`index.ts` with re-exports) di setiap folder fitur utama
3. Update `tsconfig.json` path aliases:
   ```json
   {
     "paths": {
       "@/*": ["./src/*"],
       "@/features/*": ["./src/features/*"],
       "@/shared/*": ["./src/shared/*"]
     }
   }
   ```

**Verification**: `pnpm type-check` sukses (belum ada code yang dipindah).

---

### 📋 STEP 3: Migrasi Type Definitions → Domain-Scoped Types

**Objective**: Pecah `src/types/index.ts` (monolithic) menjadi domain-scoped type files.

**Context Brief**:
- Saat ini: `src/types/index.ts` berisi ~200+ lines — Employee, Ticket, Message, ApiResponse, MasterData, dll semua dalam satu file
- Target: Setiap domain punya type sendiri; shared types di `src/shared/types/`

**Instructions**:
1. Buat `src/features/auth/types.ts` — pindahkan: `Employee`, `LoginRequest`, `LoginResponse`
2. Buat `src/features/tickets/types.ts` — pindahkan: `Ticket`, `Message`, `Attachment`, `CreateTicketPayload`
3. Buat `src/features/dashboard/types.ts` — buat: `DashboardStats`, `TrendData`
4. Buat `src/features/admin/types.ts` — buat: `AdminEmployee`, `TeamManagement`
5. Buat `src/shared/types/api.ts` — pindahkan: `ApiResponse<T>`, `PaginationMeta`
6. Buat `src/shared/types/master-data.ts` — pindahkan: `Category`, `Team`, `Stage`, `Tag`, `Priority`, `MasterData`, `Department`, `TicketType`, `TeamMember`
7. Update `src/types/index.ts` menjadi re-export hub (backward compatible):
   ```typescript
   // Re-export semua untuk backward compatibility
   export * from '@/features/auth/types'
   export * from '@/features/tickets/types'
   export * from '@/shared/types/api'
   export * from '@/shared/types/master-data'
   ```
8. Gradual migration: File lama masih bisa import dari `@/types` tanpa breaking

**Verification**: `pnpm type-check` sukses; semua import masih resolve.

---

### 📋 STEP 4: Extract Query Configuration → Terpisah

**Objective**: Pecah `src/lib/query/config.ts` menjadi 3 file fokus.

**Context Brief**:
- Saat ini: `src/lib/query/config.ts` berisi cache config, query keys, DAN createQueryClient() — semua dalam 1 file (~100+ lines)
- Target: Separasi concern untuk maintainability

**Instructions**:
1. Buat `src/lib/query/cache-config.ts` — extract `CACHE_TIME` constant
2. Buat `src/lib/query/keys.ts` — extract `queryKeys` factory
3. Buat `src/lib/query/client.ts` — extract `createQueryClient()` + `invalidation` helpers
4. Update `src/lib/query/config.ts` sebagai re-export hub:
   ```typescript
   export { CACHE_TIME } from './cache-config'
   export { queryKeys } from './keys'
   export { createQueryClient, invalidation } from './client'
   ```

**Verification**: `pnpm type-check` sukses; tidak ada breaking import.

---

### 📋 STEP 5: Migrasi Hooks ke Feature Domains

**Objective**: Pindahkan hooks dari `src/hooks/` ke domain masing-masing di `src/features/`.

**Context Brief**:
- Saat ini:
  - `src/hooks/use-ticket-queries.ts` → queries + beberapa mutations
  - `src/hooks/useTicketActions.ts` → mutations (duplikat sebagian)
  - `src/hooks/use-ticket-websocket.ts` → WebSocket integration
  - `src/hooks/use-attachments.ts` → attachment upload
  - `src/hooks/use-debounce.ts`, `use-lazy-load.ts`, `use-performance.ts` → generic hooks
  - `src/hooks/use-toast.ts`, `use-websocket.ts` → utility hooks
- Target: Feature-scoped hooks + shared hooks

**Instructions**:
1. **Auth**: Buat `src/features/auth/hooks/use-auth.ts` — extract dari auth store actions
2. **Tickets**: 
   - Pindahkan `use-ticket-queries.ts` → `src/features/tickets/hooks/use-ticket-list.ts` (hanya queries list)
   - Buat `src/features/tickets/hooks/use-ticket-detail.ts` (query detail + messages)
   - Konsolidasi `useTicketActions.ts` + mutations dari `use-ticket-queries.ts` → `src/features/tickets/hooks/use-ticket-actions.ts`
   - Pindahkan `use-attachments.ts` → `src/features/tickets/hooks/use-attachments.ts`
3. **Dashboard**: Buat `src/features/dashboard/hooks/use-dashboard.ts`
4. **Realtime**: Pindahkan `use-ticket-websocket.ts` → `src/features/realtime/hooks/use-ticket-ws.ts`
5. **Shared**: Pindahkan `use-debounce.ts`, `use-lazy-load.ts`, `use-performance.ts`, `use-toast.ts` → `src/shared/hooks/`
6. Update `src/hooks/` sebagai re-export hub (backward compatible)

**Verification**: `pnpm type-check` sukses; semua consumer hooks masih resolve.

---

### 📋 STEP 6: Migrasi Components ke Feature Domains

**Objective**: Pindahkan business components dari `src/components/helpdesk/` ke `src/features/`.

**Context Brief**:
- Saat ini: `src/components/helpdesk/{admin,common,dashboard,tickets}` — flat grouping by UI area
- Target: `src/features/{admin,dashboard,tickets}/components/` — grouped by domain

**Instructions**:
1. **Tickets**: Pindahkan semua dari `src/components/helpdesk/tickets/` → `src/features/tickets/components/`
2. **Admin**: Pindahkan dari `src/components/helpdesk/admin/` → `src/features/admin/components/`
3. **Dashboard**: Pindahkan dari `src/components/helpdesk/dashboard/` + `src/components/dashboard/` → `src/features/dashboard/components/`
4. **UI primitives**: Pindahkan generic components:
   - `src/components/ui/empty-state.tsx` → `src/components/data-display/EmptyState.tsx`
   - `src/components/ui/virtual-list.tsx` → `src/components/data-display/VirtualList.tsx`
   - `src/components/ui/lazy-render.tsx` → `src/components/data-display/LazyRender.tsx`
   - `src/components/ui/debounced-search.tsx` → `src/components/forms/DebouncedSearch.tsx`
   - `src/components/ui/file-uploader.tsx` → `src/components/forms/FileUploader.tsx`
   - `src/components/ui/search-input.tsx` → `src/components/forms/SearchInput.tsx`
5. Hapus folder `src/components/helpdesk/` setelah migrasi selesai
6. Hapus folder `src/pages/api/` (kosong, sisa Pages Router)

**Verification**: `pnpm build` sukses; semua halaman render dengan benar.

---

### 📋 STEP 7: Tambahkan Next.js File Conventions (loading, error, not-found)

**Objective**: Tambahkan loading.tsx, error.tsx, dan not-found.tsx untuk UX yang lebih baik.

**Context Brief**:
- Saat ini: Tidak ada loading/error boundary per route group
- Target: Setiap route group punya loading skeleton dan error boundary

**Instructions**:
1. Buat `src/app/not-found.tsx` — Global 404 page
2. Buat `src/app/(dashboard)/loading.tsx` — Dashboard skeleton
3. Buat `src/app/(dashboard)/error.tsx` — Error boundary with retry button
4. Buat `src/app/(dashboard)/dashboard/loading.tsx` — Stats skeleton cards
5. Buat `src/app/(dashboard)/tickets/loading.tsx` — Ticket list skeleton
6. Buat `src/app/(dashboard)/tickets/[id]/loading.tsx` — Ticket detail skeleton
7. Buat `src/app/(dashboard)/tickets/[id]/not-found.tsx` — "Ticket not found"
8. Buat `src/app/(dashboard)/admin/layout.tsx` — Server Component role guard:
   ```tsx
   // Redirect non-super_admin ke /dashboard
   ```

**Verification**: 
- Navigasi ke route yang tidak ada → tampil 404
- Loading state terlihat saat navigasi
- `pnpm build` sukses

---

### 📋 STEP 8: Refactor Dashboard Layout → Server Component

**Objective**: Pisahkan auth check di layout dari client-side ke server-side.

**Context Brief**:
- Saat ini: `src/app/(dashboard)/layout.tsx` adalah Client Component (`"use client"`) yang:
  - Cek `localStorage` untuk token
  - Set state `isHydrated`
  - Listen `auth-error` event
  - Render `Sidebar` + `Navbar`
- Target: Layout menjadi Server Component; interactive parts jadi Client Component children

**Instructions**:
1. Refactor `src/app/(dashboard)/layout.tsx`:
   ```tsx
   // Server Component (NO "use client")
   import { cookies } from 'next/headers'
   import { redirect } from 'next/navigation'
   import { DashboardShell } from '@/features/auth/components/DashboardShell'

   export default async function DashboardLayout({ children }) {
     const cookieStore = await cookies()
     const token = cookieStore.get('access_token')?.value
     if (!token) redirect('/login')
     
     return <DashboardShell>{children}</DashboardShell>
   }
   ```
2. Buat `src/features/auth/components/DashboardShell.tsx` ("use client"):
   - Berisi Sidebar, Navbar, auth-error listener
   - Menggunakan Zustand store yang sudah ada

**Verification**: 
- Halaman dashboard render tanpa flash of unauthenticated content
- Auth error redirect masih berfungsi
- `pnpm build` sukses

---

### 📋 STEP 9: Consolidate Ticket API Routes (Unified Action Endpoint)

**Objective**: Kurangi jumlah route handler dari 13+ menjadi pattern yang lebih maintainable.

**Context Brief**:
- Saat ini: `src/app/api/helpdesk/tickets/[id]/` memiliki 13 sub-folder, masing-masing dengan `route.ts`
- Target: Konsolidasi action endpoints menjadi 1 route handler + service layer

**Instructions**:
1. Buat `src/lib/server/services/ticket-action.service.ts`:
   - Method per action: `openTicket()`, `closeTicket()`, `rejectTicket()`, `assignTeam()`, dll
   - Setiap method: validate input → execute logic → return response
2. Buat `src/app/api/helpdesk/tickets/[id]/actions/route.ts`:
   - Single POST endpoint yang dispatch ke service berdasarkan `action` field
3. Update `src/lib/api/endpoints.ts`:
   - Tambahkan method `ticketAPI.performAction(id, action, payload)` 
   - Pertahankan method lama sebagai wrapper (backward compatible):
     ```typescript
     openTicket: (id, msg) => performAction(id, 'open', { message: msg }),
     closeTicket: (id, msg) => performAction(id, 'close', { message: msg }),
     ```
4. Setelah verified, hapus sub-folder lama secara bertahap

**Verification**:
- Semua ticket actions masih berfungsi (open, close, reject, assign, dll)
- `pnpm build` sukses

---

### 📋 STEP 10: Build WebSocket Manager & Realtime Feature Module

**Objective**: Refactor WebSocket dari hook monolitik menjadi connection manager + feature hooks.

**Context Brief**:
- Saat ini: `src/hooks/use-ticket-websocket.ts` — single hook yang menangani connection, reconnect, event dispatch, dan cache update
- Target: `WSManager` singleton + `use-ws-connection` (lifecycle) + `use-ticket-ws` (domain-specific)

**Instructions**:
1. Buat `src/features/realtime/ws-manager.ts`:
   ```typescript
   class WSManager {
     private static instance: WSManager
     private ws: WebSocket | null = null
     private listeners: Map<string, Set<Function>> = new Map()
     
     static getInstance() { ... }
     connect(url: string, token: string) { ... }
     disconnect() { ... }
     on(event: string, callback: Function) { ... }
     off(event: string, callback: Function) { ... }
     joinRoom(roomId: string) { ... }
     leaveRoom(roomId: string) { ... }
   }
   ```
2. Buat `src/features/realtime/hooks/use-ws-connection.ts` — manage connect/disconnect lifecycle
3. Buat `src/features/realtime/hooks/use-ticket-ws.ts` — subscribe to ticket events, update React Query cache
4. Buat `src/features/realtime/types.ts` — WSEvent, WSEventType
5. Buat `src/features/realtime/constants.ts` — WS_URL, reconnect config

**Verification**:
- WebSocket connects dan receives events
- React Query cache updates saat ada ticket status change
- Reconnect berfungsi setelah disconnect
- `pnpm build` sukses

---

### 📋 STEP 11: Extract Providers & Final Cleanup

**Objective**: Pindahkan Providers ke `lib/providers/`, bersihkan sisa backward-compatibility bridges.

**Instructions**:
1. Pindahkan `src/app/providers.tsx` → `src/lib/providers/Providers.tsx`
2. Update `src/app/layout.tsx` import
3. Bersihkan re-export bridges di `src/types/index.ts` dan `src/hooks/` jika semua consumer sudah diupdate
4. Hapus `src/components/lazy/` (pindahkan ke `src/components/data-display/`)
5. Hapus `src/components/helpdesk/` (sudah pindah ke `src/features/`)
6. Full regression test:
   - `pnpm lint`
   - `pnpm type-check`
   - `pnpm build`
   - Manual test: login → dashboard → ticket list → ticket detail → admin

**Verification**: All green. Architecture migration complete.

---

## BAGIAN E — PARALLELISM & DEPENDENCY GRAPH

```
STEP 0 (Baseline)
  │
  ▼
STEP 1 (Middleware Auth)
  │
  ▼
STEP 2 (Folder Structure) ─────────────────────┐
  │                                              │
  ├──▶ STEP 3 (Types) ──┐                      │
  │                       ├──▶ STEP 5 (Hooks)   │
  ├──▶ STEP 4 (Query) ──┘         │             │
  │                                ▼             │
  │                         STEP 6 (Components)  │
  │                                │             │
  │                                ▼             │
  │    ┌──── STEP 7 (File Conventions) ◀────────┘
  │    │
  │    ├──── STEP 8 (Dashboard Layout Refactor)
  │    │
  │    ├──── STEP 9 (Unified Action API)
  │    │
  │    └──── STEP 10 (WebSocket Manager)
  │                    │
  │                    ▼
  └──────────────▶ STEP 11 (Final Cleanup)
```

**Yang bisa diparalelkan:**
- STEP 3 + STEP 4 bisa dikerjakan paralel (tidak saling depend)
- STEP 7 + STEP 8 + STEP 9 + STEP 10 bisa dikerjakan paralel (setelah STEP 6 selesai)

---

## BAGIAN F — RISIKO & MITIGASI

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Import path breaking | Build gagal | Gunakan re-export bridges; migrasi gradual |
| Cookie-based auth conflict dengan localStorage | Dual auth state | Pertahankan localStorage sebagai fallback; cookie sebagai primary |
| WebSocket refactor break real-time | Notifikasi hilang | Feature flag: `USE_NEW_WS_MANAGER=true/false` |
| Route consolidation break frontend API calls | API error 404 | Pertahankan route lama + alias ke unified endpoint; hapus setelah verified |

---

## BAGIAN G — TECH STACK FINAL

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Framework | Next.js (App Router) | 16.x |
| UI Library | React | 19.x |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Tailwind CSS + tailwind-merge | 4.x |
| UI Primitives | Radix UI (shadcn/ui) | Latest |
| Server State | TanStack React Query | 5.x |
| Client State | Zustand (persist + immer) | 5.x |
| Forms | React Hook Form + Zod | 7.x + 3.x |
| Database | PostgreSQL + Prisma | 16 + 7.x |
| Real-Time | WebSocket (native) | - |
| Package Manager | pnpm | Latest |
| Linting | ESLint + Prettier | 9.x + 3.x |
| Animation | Framer Motion | 12.x |
| Charts | Recharts | 3.x |

---

*Dokumen ini siap dieksekusi step-by-step di sesi berikutnya. Setiap step bersifat mandiri (cold-start executable) dan bisa dikerjakan oleh developer/agent yang berbeda.*
