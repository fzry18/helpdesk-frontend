# MASTER ARCHITECTURE BLUEPRINT
## helpdesk-frontend — Next.js Production Architecture Redesign

> **Versi**: 2.0 (Unified)  
> **Tanggal**: 12 Maret 2026  
> **Sumber**: Sintesis dari *Antigravity Blueprint v1.0* + *Copilot Blueprint v1.0*  
> **Stack**: Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · Prisma 7 · PostgreSQL  
> **Tujuan**: Merancang ulang pondasi codebase agar scalable, maintainable, dan mengikuti best practices modern.

---

## BAGIAN A — AUDIT ARSITEKTUR SAAT INI (AS-IS)

### A1. Ringkasan Masalah

| # | Masalah | Dampak | Prioritas |
<!-- |---|---------|--------|-----------| -->
| 1 | **Tidak ada `middleware.ts`** — Auth hanya client-side via localStorage + Zustand persist | Rute bisa diakses tanpa auth di server-side; rentan redirect loop; flash of unauthenticated content | 🔴 Critical |
| 2 | **API Route explosion** — `/api/helpdesk/tickets/[id]/` memiliki 13 sub-folder (open, close, reject, assign, assign-team, priority, stage, dll.) | Sulit maintain; business logic tersebar di banyak route handler; tidak bisa di-reuse/unit-test | 🔴 Critical |
| 3 | **Tidak ada Service Layer** — Business logic langsung di route handler | Tidak testable, tidak reusable, coupling tinggi | 🔴 Critical |
| 4 | **Monolithic type file** — Semua types di `src/types/index.ts` (~200+ lines: Employee, Ticket, Message, MasterData, ApiResponse, dll.) | Sulit navigate; circular dependency risk; tidak bisa tree-shake | 🟡 High |
| 5 | **Duplikasi mutation hooks** — `useTicketActions.ts` dan `use-ticket-queries.ts` keduanya berisi mutations | Inkonsistensi cache invalidation; developer bingung mau pakai yang mana | 🟡 High |
| 6 | **Dashboard Layout = Client Component** — `(dashboard)/layout.tsx` full `"use client"` dengan auth logic, hydration state, dan event listener | Tidak memanfaatkan Server Component; zero SSR benefit; flash of unauthenticated content | 🟡 High |
| 7 | **Tidak ada `loading.tsx`, `error.tsx`, `not-found.tsx`** — Missing Next.js file conventions | Tidak ada loading/error boundary per route; UX buruk saat navigasi | 🟡 High |
| 8 | **WebSocket tanpa connection manager** — Reconnect logic manual di setiap hook (`use-ticket-websocket.ts`, `use-websocket.ts`) | Rentan memory leak; tidak ada heartbeat; tidak bisa di-mock | 🟡 High |
| 9 | **Inkonsistensi store location** — `src/store/authStore.ts` di root, tapi ticket stores di `src/features/tickets/stores/` | Membingungkan developer; melanggar FSD convention | 🟡 High |
| 10 | **`src/pages/api/` kosong** — Sisa migrasi dari Pages Router | Membingungkan developer baru; potensi konflik routing | 🟢 Low |
| 11 | **`src/lib/` tanpa hierarki** — Campuran API client, query config, socket, dan server-side code | Coupling tinggi; sulit tes unit; import paths tidak intuitif | 🟡 High |
| 12 | **`src/components/` tidak terstruktur FSD** — Bercampur antara UI primitives, domain components, dan layout | Tidak scalable; business logic bocor ke UI layer | 🟡 High |
| 13 | **Hanya satu path alias** — `@/*` → `./src/*` saja di tsconfig | Kurang ekspresif; tidak enforce dependency boundaries | 🟢 Low |

### A2. Kondisi Saat Ini Per Direktori

```
src/
├── app/                  # ✅ App Router aktif, tapi pages/ masih ada
│   ├── (auth)/login/     # ✅ Login route
│   ├── (dashboard)/      # ⚠️  Layout = Client Component (harus Server)
│   │   ├── admin/        # ⚠️  Tidak ada role guard server-side
│   │   ├── dashboard/    # ⚠️  Tidak ada loading.tsx/error.tsx
│   │   └── tickets/      # ⚠️  13 sub-folders di [id]/
│   └── api/helpdesk/     # ⚠️  Business logic langsung di route handlers
│
├── components/           # ⚠️  Bercampur: ui/ + layout/ + helpdesk/ + dashboard/ + lazy/
├── features/             # ✅ Sudah ada: auth/ tickets/ dashboard/ realtime/
├── hooks/                # ⚠️  9 hooks — campuran generic + domain-specific
├── lib/                  # ⚠️  Flat tanpa sub-hierarki yang jelas
├── pages/api/            # ❌ Kosong — legacy Pages Router
├── store/                # ⚠️  Hanya authStore.ts — tidak konsisten
├── types/                # ⚠️  Monolithic index.ts
└── generated/prisma/     # ✅ Auto-generated (harus gitignore)
```

---

## BAGIAN B — ARSITEKTUR TARGET (TO-BE)

### B1. Filosofi Desain

Proyek ini mengadopsi **Feature-Sliced Design (FSD)** yang dikombinasikan dengan **Next.js App Router conventions**:

1. **Separation of Concerns**: Business logic ≠ UI ≠ State ≠ Transport
2. **Dependency Direction**: `app` → `features` → `shared` → `components` → `lib` — tidak boleh dibalik
3. **Server-first**: Semua komponen adalah Server Components secara default; `'use client'` hanya ketika mutlak diperlukan
4. **Colocation**: Setiap fitur memiliki komponen, hooks, types, services, dan stores sendiri
5. **Single Source of Truth**: Satu store per domain, satu type-file per entity

### B2. Layer Architecture

```
┌────────────────────────────────────────────────────────┐
│                    app/ (Routing)                       │
│  Next.js file conventions: page.tsx, layout.tsx,       │
│  loading.tsx, error.tsx, not-found.tsx                  │
│  → Server Components default, thin routing layer       │
├────────────────────────────────────────────────────────┤
│                 features/ (Domain Logic)                │
│  auth/ │ tickets/ │ dashboard/ │ admin/ │ realtime/    │
│  → Hooks, components, types, services, stores          │
│  → Setiap feature mandiri (self-contained)             │
├────────────────────────────────────────────────────────┤
│             shared/ (Cross-Feature Utilities)           │
│  types/ │ hooks/ │ constants/ │ utils/                  │
│  → Shared types (Employee, MasterData, ApiResponse)    │
│  → Generic hooks (useDebounce, useLazyLoad, useToast)  │
│  → TIDAK BOLEH import dari features/                   │
├────────────────────────────────────────────────────────┤
│             components/ (Design System)                 │
│  ui/ │ layout/ │ data-display/ │ forms/                │
│  → UI primitives (shadcn/ui), zero business logic      │
├────────────────────────────────────────────────────────┤
│              lib/ (Infrastructure Layer)                │
│  api/ │ query/ │ server/ │ providers/                  │
│  → Axios client, QueryClient, Prisma, Odoo client      │
│  → Framework adapters & external service integrations   │
└────────────────────────────────────────────────────────┘
     ↑ Import hanya SEARAH ke bawah (Dependency Rule)
```

**Aturan Import (Dependency Rule):**

```
✅ app/       → features/, shared/, components/, lib/
✅ features/  → shared/, components/, lib/
✅ shared/    → components/, lib/
✅ components/ → lib/

❌ features/ TIDAK BOLEH import features/ lain secara langsung
❌ shared/ TIDAK BOLEH import features/
❌ components/ TIDAK BOLEH import features/ atau shared/
❌ lib/ TIDAK BOLEH import dari layer manapun di atas
```

### B3. Folder Tree Target

```
helpdesk-frontend/
├── prisma/                           # Database schema & migrations (tidak berubah)
├── public/                           # Static assets
├── scripts/                          # Utility scripts (DB seed, migrate, dll.)
├── server.ts                         # Custom Node.js server (Socket.IO mounting)
├── docs/                             # Dokumentasi proyek
│
└── src/
    │
    ├── middleware.ts                  # [BARU] Next.js Edge Middleware — auth guard
    │
    ├── app/                          # ════════ ROUTING LAYER ════════
    │   ├── globals.css
    │   ├── layout.tsx               # Root layout (Server Component)
    │   ├── page.tsx                  # Landing redirect
    │   ├── not-found.tsx            # [BARU] Global 404
    │   │
    │   ├── (auth)/
    │   │   └── login/page.tsx
    │   │
    │   ├── (dashboard)/
    │   │   ├── layout.tsx           # [REFACTOR] Server Component + DashboardShell client
    │   │   ├── loading.tsx          # [BARU] Dashboard loading skeleton
    │   │   ├── error.tsx            # [BARU] Error boundary
    │   │   │
    │   │   ├── dashboard/
    │   │   │   ├── page.tsx         # Server Component
    │   │   │   └── loading.tsx      # [BARU]
    │   │   │
    │   │   ├── tickets/
    │   │   │   ├── page.tsx         # Server Component
    │   │   │   ├── loading.tsx      # [BARU]
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx     # Server Component
    │   │   │       ├── loading.tsx  # [BARU]
    │   │   │       └── not-found.tsx # [BARU]
    │   │   │
    │   │   └── admin/
    │   │       └── layout.tsx       # [BARU] Server Component role guard
    │   │
    │   └── api/helpdesk/
    │       ├── auth/
    │       │   ├── login/route.ts
    │       │   └── force-change-password/route.ts
    │       │
    │       └── tickets/
    │           ├── route.ts         # GET (list), POST (create)
    │           └── [id]/
    │               ├── route.ts     # GET, PATCH, DELETE
    │               ├── messages/route.ts   # GET, POST
    │               ├── thread/route.ts     # GET
    │               ├── attachments/route.ts # GET, POST
    │               ├── activity-log/route.ts # GET
    │               └── actions/route.ts    # [BARU] POST unified action endpoint
    │
    ├── features/                     # ════════ DOMAIN LOGIC ════════
    │   │
    │   ├── auth/
    │   │   ├── index.ts             # Public API
    │   │   ├── types.ts             # Employee, LoginRequest, LoginResponse
    │   │   ├── stores/
    │   │   │   └── auth.store.ts    # [PINDAH] dari src/store/authStore.ts
    │   │   ├── hooks/
    │   │   │   └── use-auth.ts
    │   │   ├── services/
    │   │   │   └── auth.service.ts  # [BARU] login(), logout(), refreshToken()
    │   │   └── components/
    │   │       ├── LoginForm.tsx
    │   │       └── DashboardShell.tsx  # [BARU] Client wrapper untuk layout
    │   │
    │   ├── tickets/
    │   │   ├── index.ts
    │   │   ├── types.ts             # Ticket, Message, Attachment, CreateTicketPayload
    │   │   ├── schemas/
    │   │   │   └── ticket.schema.ts # [BARU] Zod schemas
    │   │   ├── stores/
    │   │   │   └── ticket-filter.store.ts
    │   │   ├── hooks/
    │   │   │   ├── use-ticket-list.ts     # [REFACTOR] Queries only
    │   │   │   ├── use-ticket-detail.ts   # [BARU] Detail + messages query
    │   │   │   ├── use-ticket-actions.ts  # [KONSOLIDASI] Semua mutations
    │   │   │   └── use-attachments.ts     # [PINDAH] dari src/hooks/
    │   │   ├── services/
    │   │   │   └── ticket.service.ts  # [BARU] Pure API call functions
    │   │   └── components/
    │   │       ├── TicketList.tsx
    │   │       ├── TicketFilters.tsx
    │   │       ├── TicketFormDialog.tsx
    │   │       └── detail/
    │   │           ├── TicketDetail.tsx
    │   │           └── MessageForm.tsx
    │   │
    │   ├── dashboard/
    │   │   ├── index.ts
    │   │   ├── types.ts             # DashboardStats, TrendData
    │   │   ├── hooks/
    │   │   │   └── use-dashboard.ts
    │   │   └── components/
    │   │       └── DashboardView.tsx
    │   │
    │   ├── admin/
    │   │   ├── index.ts
    │   │   ├── types.ts
    │   │   ├── hooks/
    │   │   └── components/
    │   │
    │   └── realtime/
    │       ├── index.ts
    │       ├── types.ts             # WSEvent, ServerToClientEvents, ClientToServerEvents
    │       ├── constants.ts         # WS_URL, reconnect config
    │       ├── ws-manager.ts        # [REFACTOR] Singleton + typed interface
    │       ├── providers/
    │       │   └── RealtimeProvider.tsx
    │       └── hooks/
    │           ├── use-ws-connection.ts   # Lifecycle hook
    │           └── use-ticket-ws.ts       # Domain-specific ticket events
    │
    ├── shared/                       # ════════ CROSS-FEATURE UTILITIES ════════
    │   ├── types/
    │   │   ├── api.ts               # ApiResponse<T>, PaginationMeta
    │   │   └── master-data.ts       # Category, Team, Stage, Tag, Priority, Department
    │   ├── hooks/
    │   │   ├── use-debounce.ts      # [PINDAH] dari src/hooks/
    │   │   ├── use-lazy-load.ts     # [PINDAH]
    │   │   ├── use-performance.ts   # [PINDAH]
    │   │   └── use-toast.ts         # [PINDAH]
    │   ├── constants/
    │   │   └── error-messages.ts
    │   └── utils/
    │       ├── cn.ts                # Tailwind class merge utility
    │       ├── format.ts            # Date, number formatting
    │       └── validation.ts        # Reusable Zod schemas
    │
    ├── components/                   # ════════ DESIGN SYSTEM ════════
    │   ├── ui/                      # Radix-based primitives (shadcn/ui)
    │   │   ├── avatar.tsx
    │   │   ├── badge.tsx
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── select.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── stat-card.tsx
    │   │   ├── textarea.tsx
    │   │   ├── toast.tsx
    │   │   └── toaster.tsx
    │   │
    │   ├── layout/                  # Shell components
    │   │   ├── Sidebar.tsx
    │   │   ├── Navbar.tsx
    │   │   └── PageHeader.tsx       # [BARU] Reusable page header
    │   │
    │   ├── data-display/            # [BARU] Generic display components
    │   │   ├── EmptyState.tsx       # [PINDAH] dari ui/empty-state.tsx
    │   │   ├── VirtualList.tsx      # [PINDAH] dari ui/virtual-list.tsx
    │   │   └── LazyRender.tsx       # [PINDAH] dari ui/lazy-render.tsx
    │   │
    │   └── forms/                   # [BARU] Reusable form components
    │       ├── DebouncedSearch.tsx   # [PINDAH] dari ui/debounced-search.tsx
    │       ├── FileUploader.tsx     # [PINDAH] dari ui/file-uploader.tsx
    │       └── SearchInput.tsx      # [PINDAH] dari ui/search-input.tsx
    │
    ├── lib/                          # ════════ INFRASTRUCTURE LAYER ════════
    │   ├── api/
    │   │   ├── client.ts            # Axios instance + interceptors
    │   │   └── endpoints.ts         # API endpoint definitions
    │   ├── query/
    │   │   ├── client.ts            # createQueryClient()
    │   │   ├── keys.ts              # [BARU] Query key factory (extracted)
    │   │   └── cache-config.ts      # [BARU] Cache time constants (extracted)
    │   ├── server/                  # Server-only code
    │   │   ├── auth.ts              # Token verification, getServerSession()
    │   │   ├── prisma.ts            # Prisma client singleton
    │   │   ├── odoo-client.ts       # Odoo API integration
    │   │   ├── services/            # [BARU] Server-side business logic
    │   │   │   ├── ticket.service.ts
    │   │   │   ├── ticket-action.service.ts
    │   │   │   ├── message.service.ts
    │   │   │   ├── dashboard.service.ts
    │   │   │   └── admin.service.ts
    │   │   └── repositories/        # [BARU] Prisma query abstraction
    │   │       ├── ticket.repository.ts
    │   │       ├── employee.repository.ts
    │   │       ├── message.repository.ts
    │   │       └── team.repository.ts
    │   ├── providers/
    │   │   └── Providers.tsx        # QueryClientProvider + Toaster
    │   └── utils/
    │       └── cn.ts                # (backward compat, re-export dari shared/)
    │
    └── generated/                   # Auto-generated (gitignored)
        └── prisma/
```

---

## BAGIAN C — DESIGN PATTERNS

### C1. Server Component vs Client Component Boundary

```
┌───────────────────────────────────────────────────────────┐
│  SERVER COMPONENTS (Default di App Router)                 │
│                                                           │
│  ✅ middleware.ts          → Edge auth guard               │
│  ✅ (dashboard)/layout.tsx → Cookie check, redirect        │
│  ✅ dashboard/page.tsx     → Fetch stats via server        │
│  ✅ tickets/page.tsx       → Fetch list, pass to client    │
│  ✅ tickets/[id]/page.tsx  → Fetch detail                  │
│  ✅ admin/layout.tsx       → Role guard                    │
│                                                           │
│  📦 Benefit: Zero JS shipped, direct DB access, SEO       │
└────────────────────┬──────────────────────────────────────┘
                     │ renders
┌────────────────────▼──────────────────────────────────────┐
│  CLIENT COMPONENTS ("use client" — Interactive Islands)   │
│                                                           │
│  🟡 features/tickets/components/TicketList.tsx            │
│     → Filters, pagination, real-time updates              │
│  🟡 features/tickets/components/detail/MessageForm.tsx    │
│     → Form input, optimistic updates                      │
│  🟡 features/auth/components/LoginForm.tsx                │
│     → Form state, validation                              │
│  🟡 features/auth/components/DashboardShell.tsx           │
│     → Sidebar, Navbar, auth-error listener                │
│  🟡 features/realtime/hooks/use-ws-connection.ts          │
│     → WebSocket lifecycle                                 │
│  🟡 components/layout/Sidebar.tsx                         │
│     → Mobile menu toggle, active state                    │
│                                                           │
│  📦 Benefit: Interactivity, state, event handlers         │
└───────────────────────────────────────────────────────────┘
```

**Pattern: Server Shell + Client Island**

```tsx
// app/(dashboard)/tickets/page.tsx — SERVER COMPONENT
import { TicketListClient } from '@/features/tickets/components/TicketList'

export default async function TicketsPage() {
  return (
    <div>
      <h1>Tickets</h1>
      <TicketListClient />
    </div>
  )
}
```

### C2. Unified Ticket Action Pattern

**Sebelum (13 sub-folder route handler):**
```
api/helpdesk/tickets/[id]/
  ├── open/route.ts
  ├── close/route.ts
  ├── reject/route.ts
  ├── assign/route.ts
  ├── assign-team/route.ts
  ├── confirm-resolved/route.ts
  ├── request-confirmation/route.ts
  ├── priority/route.ts
  ├── stage/route.ts
  └── ... (terus bertambah)
```

**Sesudah (Unified Action Endpoint + Service Layer):**
```
api/helpdesk/tickets/[id]/
  ├── route.ts              # GET, PATCH, DELETE
  ├── messages/route.ts     # GET, POST
  ├── thread/route.ts       # GET
  ├── attachments/route.ts  # GET, POST
  ├── activity-log/route.ts # GET
  └── actions/route.ts      # [BARU] POST { action: "open"|"close"|"reject"|... }
```

```typescript
// src/app/api/helpdesk/tickets/[id]/actions/route.ts
import { TicketActionService } from '@/lib/server/services/ticket-action.service'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { action, ...payload } = await req.json()
  const service = new TicketActionService()

  switch (action) {
    case 'open':        return service.openTicket(+params.id, payload)
    case 'close':       return service.closeTicket(+params.id, payload)
    case 'reject':      return service.rejectTicket(+params.id, payload)
    case 'assign':      return service.assignTicket(+params.id, payload)
    case 'assign-team': return service.assignTeam(+params.id, payload)
    case 'priority':    return service.setPriority(+params.id, payload)
    case 'stage':       return service.setStage(+params.id, payload)
    case 'confirm-resolved': return service.confirmResolved(+params.id, payload)
    case 'request-confirmation': return service.requestConfirmation(+params.id, payload)
    default:            return Response.json({ error: 'Unknown action' }, { status: 400 })
  }
}
```

### C3. Service Layer Pattern

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Route Handler   │ ──▶ │   Service Layer       │ ──▶ │  Repository      │
│  (API Route)     │     │   (Business Logic)    │     │  (Prisma Access) │
│                  │     │                       │     │                  │
│ • Parse request  │     │ • Validate rules      │     │ • CRUD operations│
│ • Auth check     │     │ • Orchestrate flow    │     │ • Query building │
│ • Return response│     │ • Emit WS events      │     │ • Transaction    │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
```

**Template Route Handler:**
```typescript
// app/api/helpdesk/tickets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server/auth'
import { getTicketList } from '@/lib/server/services/ticket.service'
import { ticketListSchema } from '@/features/tickets/schemas/ticket.schema'
import { ZodError } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const params = ticketListSchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    const data = await getTicketList(params, session.userId)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

### C4. Store Architecture (Zustand)

**Satu store per domain**, bukan satu store global:

```typescript
// features/auth/stores/auth.store.ts       — Auth state (employee, token, role)
// features/tickets/stores/ticket-filter.store.ts  — UI filter state
```

**Wajib menggunakan selector untuk mencegah excessive re-render:**
```typescript
// ✅ Spesifik selector
const isAdmin = useAuthStore(selectIsAdmin)

// ❌ Subscribe seluruh store
const { employee, isAdmin, logout, ... } = useAuthStore()
```

### C5. Query Key Factory Pattern (Sudah Digunakan — Pertahankan)

```typescript
// lib/query/keys.ts
export const queryKeys = {
  tickets: {
    all: ['tickets'] as const,
    lists: () => [...queryKeys.tickets.all, 'list'] as const,
    list: (filters: TicketFilters) => [...queryKeys.tickets.lists(), filters] as const,
    details: () => [...queryKeys.tickets.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.tickets.details(), id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    recent: () => [...queryKeys.dashboard.all, 'recent'] as const,
  },
  master: {
    all: ['master'] as const,
    data: () => [...queryKeys.master.all, 'data'] as const,
  },
}
```

### C6. WebSocket Connection Manager Pattern

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

**Typed Events Interface:**
```typescript
// features/realtime/types.ts
export interface ServerToClientEvents {
  'ticket:created': (ticket: Ticket) => void
  'ticket:updated': (ticket: Partial<Ticket> & { id: number }) => void
  'ticket:message': (message: Message) => void
  'ticket:status-changed': (data: { id: number; status: string }) => void
}
export interface ClientToServerEvents {
  'ticket:subscribe': (ticketId: number) => void
  'ticket:unsubscribe': (ticketId: number) => void
}
```

### C7. State Management Separation

| Layer | Tool | Contoh |
|-------|------|--------|
| **Server State** (remote data) | TanStack React Query | Ticket list, detail, messages, dashboard stats, master data |
| **Client State** (UI + auth) | Zustand + persist + immer | Auth state (employee, token, role), sidebar toggle |
| **Form State** | React Hook Form + Zod | Create ticket form, login form, filters |
| **URL State** | Next.js searchParams | Ticket filters, pagination, tab state |
| **Real-Time State** | WebSocket → React Query cache | Ticket status change, new messages |

### C8. Middleware Auth Flow

```
Browser Request
      │
      ▼
┌─────────────────┐
│  middleware.ts   │  ← Next.js Edge Middleware
│                  │
│  1. Check path   │
│     (public?)    │
│                  │
│  2. Read cookie  │
│     or Bearer    │
│     token        │
│                  │
│  3. If no token  │
│     & protected: │
│     → redirect   │
│     /login       │
│                  │
│  4. If valid:    │
│     set header   │
│     x-access-    │
│     token        │
└────────┬────────┘
         │
         ▼
  Server Component / API Route
  (baca token dari header/cookie)
```

---

## BAGIAN D — CONSTRUCTION BLUEPRINT (Step-by-Step)

> Setiap langkah di bawah ini **mandiri** — seorang developer baru bisa memulai dari step manapun dengan membaca instruksi di step itu. Kerjakan secara **BERURUTAN** kecuali disebutkan dapat paralel.

---

### 📋 STEP 0: Persiapan & Baseline

**Objective**: Setup branch dan pastikan semua test/build hijau sebelum mulai refactor.  
**Risiko**: 🟢 Rendah

**Instructions**:
1. Buat branch `refactor/architecture-v2` dari `main`
2. Jalankan verifikasi baseline:
   ```bash
   pnpm type-check
   pnpm lint
   pnpm build
   ```
3. Commit baseline: `chore: baseline before architecture refactor`

**Verification**: `pnpm build` sukses, zero errors.

---

### 📋 STEP 1: Tambahkan `middleware.ts` untuk Auth Guard

**Objective**: Proteksi semua route `(dashboard)` di server-side agar user tidak bisa akses tanpa auth.  
**Risiko**: 🟡 Sedang

**Context Brief**:
- Saat ini: Auth hanya client-side (Zustand + localStorage check di `(dashboard)/layout.tsx`)
- Target: Edge middleware membaca cookie/token, redirect ke `/login` jika invalid
- File auth utilities: `src/lib/server/auth.ts` (sudah ada JWT verify logic)

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
2. Update login flow untuk set cookie `access_token` saat login berhasil (selain localStorage)
3. Update logout flow untuk clear cookie

**Verification**:
- Akses `/dashboard` tanpa login → redirect ke `/login`
- Login → bisa akses `/dashboard`
- `pnpm build` sukses

---

### 📋 STEP 2: Hapus Legacy `src/pages/` dan Konsolidasi `src/store/`

**Objective**: Remove dead code dan konsistenkan store location.  
**Risiko**: 🟢 Rendah

**Context Brief**:
- `src/pages/api/` — folder kosong, sisa Pages Router migration
- `src/store/authStore.ts` — tidak konsisten dengan pattern `features/*/stores/`

**Instructions**:
1. Hapus seluruh `src/pages/` directory (hanya berisi `api/` yang kosong)
2. Pindahkan `src/store/authStore.ts` → `src/features/auth/stores/auth.store.ts`
3. Update semua import `@/store/authStore` → `@/features/auth/stores/auth.store`
4. Hapus `src/store/` directory

**Verification**:
```bash
pnpm type-check
pnpm lint
```

---

### 📋 STEP 3: Buat Folder Structure & Update Path Aliases

**Objective**: Scaffold skeleton folder baru dan tambah path aliases.  
**Risiko**: 🟢 Rendah  
**Paralel**: Dapat dikerjakan bersamaan dengan Step 2

**Instructions**:
1. Buat folder structure:
   ```
   mkdir -p src/shared/{types,hooks,constants,utils}
   mkdir -p src/components/{data-display,forms}
   mkdir -p src/lib/providers
   mkdir -p src/lib/server/{services,repositories}
   mkdir -p src/features/auth/{hooks,components,services}
   mkdir -p src/features/tickets/{hooks,components/detail,services,schemas}
   mkdir -p src/features/dashboard/{hooks,components}
   mkdir -p src/features/admin/{hooks,components}
   mkdir -p src/features/realtime/{hooks,providers}
   ```
2. Update `tsconfig.json` path aliases:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"],
         "@features/*": ["./src/features/*"],
         "@shared/*": ["./src/shared/*"]
       }
     }
   }
   ```
3. Buat `index.ts` placeholder di setiap feature folder

**Verification**: `pnpm type-check` sukses.

---

### 📋 STEP 4: Migrasi Type Definitions → Domain-Scoped Types

**Objective**: Pecah `src/types/index.ts` (monolithic) menjadi domain-scoped type files.  
**Risiko**: 🟡 Sedang  
**Paralel**: Dapat dikerjakan bersamaan dengan Step 5

**Context Brief**:
- `src/types/index.ts` berisi ~200+ lines: Employee, Ticket, Message, ApiResponse, MasterData, Category, Team, Stage, Tag, Department, dll.

**Instructions**:
1. Buat `src/features/auth/types.ts` — pindahkan: `Employee`, `LoginRequest`, `LoginResponse`
2. Buat `src/features/tickets/types.ts` — pindahkan: `Ticket`, `Message`, `Attachment`, `CreateTicketPayload`
3. Buat `src/features/dashboard/types.ts` — buat: `DashboardStats`, `TrendData`
4. Buat `src/shared/types/api.ts` — pindahkan: `ApiResponse<T>`, `PaginationMeta`
5. Buat `src/shared/types/master-data.ts` — pindahkan: `Category`, `TicketType`, `Team`, `TeamMember`, `Stage`, `Tag`, `Priority`, `Department`, `MasterData`
6. Update `src/types/index.ts` menjadi re-export hub (backward compatible):
   ```typescript
   export * from '@/features/auth/types'
   export * from '@/features/tickets/types'
   export * from '@/shared/types/api'
   export * from '@/shared/types/master-data'
   ```

**Verification**: `pnpm type-check` sukses; semua import masih resolve.

---

### 📋 STEP 5: Extract Query Configuration → Terpisah

**Objective**: Pecah `src/lib/query/config.ts` menjadi 3 file fokus.  
**Risiko**: 🟢 Rendah  
**Paralel**: Dapat dikerjakan bersamaan dengan Step 4

**Context Brief**:
- `src/lib/query/config.ts` berisi cache config, query keys, DAN createQueryClient() — semua dalam 1 file

**Instructions**:
1. Buat `src/lib/query/cache-config.ts` — extract `CACHE_TIME` constants
2. Buat `src/lib/query/keys.ts` — extract `queryKeys` factory
3. Buat `src/lib/query/client.ts` — extract `createQueryClient()` + invalidation helpers
4. Update `src/lib/query/config.ts` sebagai re-export hub:
   ```typescript
   export { CACHE_TIME } from './cache-config'
   export { queryKeys } from './keys'
   export { createQueryClient, invalidation } from './client'
   ```

**Verification**: `pnpm type-check` sukses; tidak ada breaking import.

---

### 📋 STEP 6: Migrasi Hooks ke Feature Domains

**Objective**: Pindahkan hooks dari `src/hooks/` ke domain masing-masing.  
**Risiko**: 🟡 Sedang  
**Depends on**: Step 4 (types harus sudah dipecah)

**Instructions**:
1. **Auth**: Buat `src/features/auth/hooks/use-auth.ts` — extract auth actions
2. **Tickets**:
   - `use-ticket-queries.ts` → `src/features/tickets/hooks/use-ticket-list.ts` (queries only)
   - Buat `src/features/tickets/hooks/use-ticket-detail.ts` (detail + messages query)
   - Konsolidasi `useTicketActions.ts` + mutations → `src/features/tickets/hooks/use-ticket-actions.ts`
   - `use-attachments.ts` → `src/features/tickets/hooks/use-attachments.ts`
3. **Dashboard**: Buat `src/features/dashboard/hooks/use-dashboard.ts`
4. **Realtime**: `use-ticket-websocket.ts` → `src/features/realtime/hooks/use-ticket-ws.ts`
5. **Shared**: `use-debounce.ts`, `use-lazy-load.ts`, `use-performance.ts`, `use-toast.ts` → `src/shared/hooks/`
6. Update `src/hooks/` as re-export hub (backward compatible)

**Verification**: `pnpm type-check` sukses.

---

### 📋 STEP 7: Migrasi Components ke Feature Domains

**Objective**: Pindahkan business components dari `src/components/helpdesk/` ke `src/features/`.  
**Risiko**: 🟡 Sedang  
**Depends on**: Step 6

**Instructions**:
1. `src/components/helpdesk/tickets/` → `src/features/tickets/components/`
2. `src/components/helpdesk/admin/` → `src/features/admin/components/`
3. `src/components/helpdesk/dashboard/` + `src/components/dashboard/` → `src/features/dashboard/components/`
4. Reorganize generic components:
   - `src/components/ui/empty-state.tsx` → `src/components/data-display/EmptyState.tsx`
   - `src/components/ui/virtual-list.tsx` → `src/components/data-display/VirtualList.tsx`
   - `src/components/ui/lazy-render.tsx` → `src/components/data-display/LazyRender.tsx`
   - `src/components/ui/debounced-search.tsx` → `src/components/forms/DebouncedSearch.tsx`
   - `src/components/ui/file-uploader.tsx` → `src/components/forms/FileUploader.tsx`
   - `src/components/ui/search-input.tsx` → `src/components/forms/SearchInput.tsx`
5. Hapus `src/components/helpdesk/` dan `src/components/lazy/`

**Verification**: `pnpm build` sukses.

---

### 📋 STEP 8: Tambahkan Next.js File Conventions (loading, error, not-found)

**Objective**: UX boundaries per route segment.  
**Risiko**: 🟢 Rendah  
**Paralel**: Dapat dikerjakan bersamaan dengan Step 9, 10, 11

**Instructions**:
1. `src/app/not-found.tsx` — Global 404 page
2. `src/app/(dashboard)/loading.tsx` — Dashboard skeleton
3. `src/app/(dashboard)/error.tsx` — Error boundary with retry button
4. `src/app/(dashboard)/dashboard/loading.tsx` — Stats skeleton cards
5. `src/app/(dashboard)/tickets/loading.tsx` — Ticket list skeleton
6. `src/app/(dashboard)/tickets/[id]/loading.tsx` — Ticket detail skeleton
7. `src/app/(dashboard)/tickets/[id]/not-found.tsx` — "Ticket not found"
8. `src/app/(dashboard)/admin/layout.tsx` — Server Component role guard (redirect non-super_admin)

**Verification**: Loading state terlihat saat navigasi; `pnpm build` sukses.

---

### 📋 STEP 9: Refactor Dashboard Layout → Server Component

**Objective**: Pisahkan auth check di layout dari client-side ke server-side.  
**Risiko**: 🟡 Sedang  
**Paralel**: Dapat dikerjakan bersamaan dengan Step 8, 10, 11

**Context Brief**:
- Saat ini: `(dashboard)/layout.tsx` = full `"use client"` dengan localStorage check, hydration state, auth-error listener
- Target: Server Component shell + `DashboardShell` client component

**Instructions**:
1. Refactor `src/app/(dashboard)/layout.tsx`:
   ```tsx
   // Server Component (NO "use client")
   import { cookies } from 'next/headers'
   import { redirect } from 'next/navigation'
   import { DashboardShell } from '@/features/auth/components/DashboardShell'

   export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
     const cookieStore = await cookies()
     const token = cookieStore.get('access_token')?.value
     if (!token) redirect('/login')
     return <DashboardShell>{children}</DashboardShell>
   }
   ```
2. Buat `src/features/auth/components/DashboardShell.tsx` (`"use client"`):
   - Berisi Sidebar, Navbar, auth-error listener
   - Menggunakan Zustand store yang sudah ada

**Verification**: Halaman dashboard render tanpa flash of unauthenticated content; `pnpm build` sukses.

---

### 📋 STEP 10: Consolidate Ticket API Routes (Unified Action Endpoint)

**Objective**: Kurangi 13 sub-folders menjadi pattern yang maintainable.  
**Risiko**: 🔴 Tinggi (core functionality)  
**Paralel**: Dapat dikerjakan bersamaan dengan Step 8, 9, 11

**Instructions**:
1. Buat `src/lib/server/services/ticket-action.service.ts`:
   - Method per action: `openTicket()`, `closeTicket()`, `rejectTicket()`, `assignTeam()`, dll.
   - Setiap method: validate input → execute logic → return response
2. Buat `src/app/api/helpdesk/tickets/[id]/actions/route.ts`:
   - Single POST endpoint; dispatch ke service berdasarkan `action` field
3. Update `src/lib/api/endpoints.ts`:
   - Tambahkan `ticketAPI.performAction(id, action, payload)`
   - Pertahankan method lama sebagai wrapper (backward compatible):
     ```typescript
     openTicket: (id, msg) => performAction(id, 'open', { message: msg }),
     closeTicket: (id, msg) => performAction(id, 'close', { message: msg }),
     ```
4. **Setelah verified**, hapus sub-folder lama secara bertahap

**Verification**: Semua ticket actions masih berfungsi; `pnpm build` sukses.

---

### 📋 STEP 11: Refactor WebSocket Manager & Realtime Feature

**Objective**: Refactor WebSocket dari hook monolitik menjadi connection manager + feature hooks.  
**Risiko**: 🟡 Sedang  
**Paralel**: Dapat dikerjakan bersamaan dengan Step 8, 9, 10

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
4. Buat `src/features/realtime/types.ts` — ServerToClientEvents, ClientToServerEvents
5. Buat `src/features/realtime/constants.ts` — WS_URL, reconnect config

**Verification**: WebSocket connects, React Query cache updates on events; `pnpm build` sukses.

---

### 📋 STEP 12: Feature Services & Zod Schemas

**Objective**: Tambahkan service layer dan validasi di setiap feature.  
**Risiko**: 🟡 Sedang  
**Depends on**: Step 6, 7

**Instructions**:
1. **Auth Service** — `src/features/auth/services/auth.service.ts`:
   ```typescript
   export const authService = {
     login: (nik: string, password: string) => apiClient.post('/api/helpdesk/auth/login', { nik, password }),
     me: () => apiClient.get('/api/helpdesk/auth/me'),
     logout: () => { /* clear cookie + store */ },
   }
   ```
2. **Ticket Service** — `src/features/tickets/services/ticket.service.ts`:
   ```typescript
   export const ticketService = {
     list: (filters: TicketFilters) => apiClient.get('/api/helpdesk/tickets', { params: filters }),
     get: (id: number) => apiClient.get(`/api/helpdesk/tickets/${id}`),
     create: (data: CreateTicketInput) => apiClient.post('/api/helpdesk/tickets', data),
     update: (id: number, data: UpdateTicketInput) => apiClient.put(`/api/helpdesk/tickets/${id}`, data),
     performAction: (id: number, action: string, payload?: object) =>
       apiClient.post(`/api/helpdesk/tickets/${id}/actions`, { action, ...payload }),
   }
   ```
3. **Zod Schemas** — `src/features/tickets/schemas/ticket.schema.ts`:
   ```typescript
   export const createTicketSchema = z.object({
     title: z.string().min(5, 'Minimal 5 karakter'),
     description: z.string().min(20),
     priority: z.enum(['low', 'medium', 'high', 'urgent']),
     category_id: z.number().positive(),
   })
   ```
4. Refactor hooks to consume services instead of calling API directly

**Verification**: `pnpm dev` — Login, create/update/delete ticket semua berjalan.

---

### 📋 STEP 13: Server-Side Services & Repositories

**Objective**: Extract business logic dari API route handlers ke testable services.  
**Risiko**: 🔴 Tinggi (core functionality)  
**Depends on**: Step 10

**Instructions**:
1. Buat `src/lib/server/services/`:
   - `ticket.service.ts` — CRUD logic
   - `ticket-action.service.ts` — Workflow actions (open, close, assign, dll.)
   - `message.service.ts` — Message CRUD
   - `dashboard.service.ts` — Stats aggregation
   - `admin.service.ts` — Employee/Team management
2. Buat `src/lib/server/repositories/`:
   - `ticket.repository.ts` — Prisma ticket queries
   - `employee.repository.ts` — Prisma employee queries
   - `message.repository.ts` — Prisma message queries
   - `team.repository.ts` — Prisma team queries
3. Refactor route handlers → thin controllers: auth check → call service → return response

**Verification**: Semua API endpoints masih berfungsi; `pnpm build` sukses.

---

### 📋 STEP 14: Final Cleanup & Finalisasi

**Objective**: Bersihkan sisa backward-compatibility bridges dan dead code.  
**Risiko**: 🟢 Rendah

**Instructions**:
1. Setiap feature wajib memiliki `index.ts` public API:
   ```typescript
   // features/tickets/index.ts
   export { TicketList } from './components/TicketList'
   export { TicketFormDialog } from './components/TicketFormDialog'
   export { useTicketList } from './hooks/use-ticket-list'
   export { useTicketActions } from './hooks/use-ticket-actions'
   export type { Ticket, TicketFilter } from './types'
   ```
2. Pindahkan `src/app/providers.tsx` → `src/lib/providers/Providers.tsx`
3. Bersihkan re-export bridges di `src/types/index.ts` dan `src/hooks/` jika semua consumer sudah diupdate
4. Hapus file/folder yang sudah tidak digunakan:
   - `src/components/helpdesk/` (sudah pindah ke features)
   - `src/components/lazy/` (sudah pindah ke data-display)
   - `src/store/` (sudah pindah ke features/auth)
   - `src/pages/` (sudah dihapus di Step 2)
5. Full regression test:
   ```bash
   pnpm lint
   pnpm type-check
   pnpm build
   ```
6. Manual test: login → dashboard → ticket list → ticket detail → create ticket → admin panel

**Verification**: All green. Architecture migration complete.

---

## BAGIAN E — DEPENDENCY GRAPH & PARALLELISM

```
STEP 0 (Baseline)
  │
  ▼
STEP 1 (Middleware Auth)
  │
  ▼
STEP 2 (Legacy Cleanup) ──────── STEP 3 (Folder Structure)  [PARALEL]
  │                                 │
  └──────────┬──────────────────────┘
             ▼
  STEP 4 (Types) ──── STEP 5 (Query Config)  [PARALEL]
       │                    │
       └────────┬───────────┘
                ▼
          STEP 6 (Hooks)
                │
                ▼
          STEP 7 (Components)
                │
  ┌─────────────┼──────────────────────────────┐
  │             │                               │
  ▼             ▼                ▼              ▼
STEP 8       STEP 9          STEP 10        STEP 11      [PARALEL]
(File Conv)  (Layout SC)     (Unified API)  (WebSocket)
  │             │                │              │
  └─────────────┴────────┬───────┴──────────────┘
                         ▼
                   STEP 12 (Feature Services)
                         │
                         ▼
                   STEP 13 (Server Services)
                         │
                         ▼
                   STEP 14 (Final Cleanup)
```

---

## BAGIAN F — RISIKO & MITIGASI

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Import path breaking saat migrasi | Build gagal | Gunakan re-export bridges; migrasi gradual; backward compat di `src/types/index.ts` dan `src/hooks/` |
| Cookie-based auth conflict dengan localStorage | Dual auth state | Pertahankan localStorage sebagai fallback; cookie sebagai primary; sinkronkan di login/logout |
| WebSocket refactor break real-time | Notifikasi hilang | Feature flag: `USE_NEW_WS_MANAGER=true/false`; rollback path |
| Route consolidation break frontend API calls | API error 404 | Pertahankan route lama + alias ke unified endpoint; hapus setelah verified |
| Terlalu banyak perubahan sekaligus | Sulit debug | Branch per step; commit atomic; test setiap step sebelum lanjut |

---

## BAGIAN G — ATURAN ARSITEKTUR

Enforce via code review dan/atau ESLint rules:

```
✅ DO:
  - Import dari @shared/* di dalam features/
  - Import dari @features/[feature]/* HANYA dari app/ pages
  - Setiap feature memiliki public index.ts
  - app/*.tsx = Server Component by default
  - Gunakan selector saat consume Zustand store
  - Business logic di services/, bukan di hooks atau components
  - Validasi input dengan Zod di API boundary

❌ DON'T:
  - Import dari @features/tickets/* di dalam @features/auth/* (cross-feature)
  - Taruh business logic di komponen atau route handlers
  - Taruh Prisma calls di Client Components atau hooks
  - Gunakan 'use client' tanpa alasan yang jelas
  - Import server libraries (prisma, jsonwebtoken) di client files
  - Subscribe seluruh Zustand store (destructure semua properties)
```

---

## BAGIAN H — TECH STACK FINAL

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Framework | Next.js (App Router) | 16.x |
| UI Library | React | 19.x |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Tailwind CSS + tailwind-merge | 3.4.x |
| UI Primitives | Radix UI (shadcn/ui) | Latest |
| Server State | TanStack React Query | 5.x |
| Client State | Zustand (persist + immer) | 5.x |
| Forms | React Hook Form + Zod | 7.x + 3.x |
| Database | PostgreSQL + Prisma | 16 + 7.x |
| Real-Time | Socket.IO (client + server) | 4.8.x |
| Package Manager | pnpm | Latest |
| Linting | ESLint + Prettier | 9.x + 3.x |
| Animation | Framer Motion | 12.x |
| Charts | Recharts | 3.x |
| Custom Server | tsx (TypeScript execution) | 4.x |

---

*Dokumen ini adalah sumber kebenaran tunggal (single source of truth) untuk arsitektur helpdesk-frontend. Update setiap kali ada keputusan arsitektur baru. Setiap step bersifat mandiri (cold-start executable) dan bisa dikerjakan oleh developer/agent yang berbeda.*
