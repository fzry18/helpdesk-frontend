# PROJECT ARCHITECTURE

## 1. Executive Summary

Blueprint ini disusun dari audit langsung terhadap `package.json`, `next.config.ts`, `server.ts`, `prisma/schema.prisma`, folder `src/`, `docker-compose.yml`, serta implementasi auth, query, API route, dan realtime yang sudah ada. Fondasi proyek saat ini adalah **Next.js 16 + React 19 + TypeScript** dalam bentuk **modular monolith**: UI, API, auth, database, dan realtime hidup dalam satu repo dan satu deployment unit, dengan **Odoo** sebagai upstream authentication/employee source, **PostgreSQL + Prisma** sebagai persistence utama, dan **Socket.IO + Redis adapter** untuk live updates.

Secara struktural, proyek sudah bergerak ke arah **feature-oriented architecture**, tetapi masih bercampur dengan pola lama: ada duplikasi antara `src/components/helpdesk/*` dan `src/features/*`, ada route handler yang masih mengakses Prisma langsung, dan ada batas client/server yang belum konsisten. Blueprint ini mempertahankan stack nyata yang sudah terinstal, lalu merapikannya menjadi arsitektur produksi yang tegas.

## 2. Tech Stack Discovered

| Layer | Teknologi Final | Bukti Audit | Status Fondasi |
| --- | --- | --- | --- |
| Package manager | `pnpm` | `pnpm-lock.yaml` | Dipertahankan |
| Runtime app | `Node.js` custom server via `tsx` | `package.json`, `server.ts` | Dipertahankan |
| Framework web | `Next.js 16.1.4` App Router | `package.json`, `src/app/*`, `next.config.ts` | Fondasi utama |
| UI runtime | `React 19.2.3` + `react-dom 19.2.3` | `package.json` | Fondasi utama |
| Bahasa | `TypeScript 5` (strict mode) | `package.json`, `tsconfig.json` | Fondasi utama |
| Styling | `Tailwind CSS 3.4` + `tailwindcss-animate` | `package.json`, `tailwind.config.ts`, `postcss.config.mjs` | Fondasi utama |
| UI primitives | `Radix UI` + `class-variance-authority` + `clsx` + `tailwind-merge` | `package.json`, `src/components/ui/*` | Fondasi utama |
| Icons | `lucide-react` + `unplugin-icons` | `package.json`, `next.config.ts` | Dipertahankan |
| Motion | `framer-motion` | `package.json` | Dipertahankan |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` | `package.json`, `src/features/tickets/schemas/*` | Fondasi utama |
| HTTP client | `axios` | `package.json`, `src/lib/api/client.ts` | Dipertahankan |
| Server-state | `@tanstack/react-query` v5 | `package.json`, `src/app/providers.tsx`, `src/lib/query/*` | Fondasi utama |
| Client-state | `zustand` + `subscribeWithSelector` + `immer` + `persist` | `package.json`, `src/features/*/stores/*` | Fondasi utama |
| Database | `PostgreSQL` | `prisma/schema.prisma`, `docker-compose.yml` | Fondasi utama |
| ORM / DB access | `Prisma 7` + `@prisma/adapter-pg` + generated client | `package.json`, `src/lib/server/prisma.ts`, `src/generated/prisma/*` | Fondasi utama |
| Realtime transport | `Socket.IO 4.8` (`server` + `client`) | `package.json`, `server.ts`, `src/lib/socket/client.ts` | Fondasi utama |
| Realtime scale-out | `Redis` via `ioredis`, `@socket.io/redis-adapter`, `@socket.io/redis-emitter` | `package.json`, `src/lib/server/socket-io.ts`, `src/lib/server/socket-emitter.ts` | Fondasi utama untuk multi-instance |
| Auth/session | `jsonwebtoken` + local `Session` table + Odoo upstream auth | `package.json`, `src/lib/server/auth.ts`, `src/lib/server/odoo-client.ts`, `src/app/api/helpdesk/auth/login/route.ts` | Dipertahankan dengan hardening |
| PWA / offline | `next-pwa` + `workbox-webpack-plugin` | `package.json`, `next.config.ts` | Dipertahankan |
| Linting/format | `ESLint 9`, `eslint-config-next`, `Prettier 3` | `package.json`, `eslint.config.mjs` | Fondasi utama |
| Dev DB infra | `Docker Compose` + `postgres:16` | `docker-compose.yml` | Dipertahankan |

## 3. Current Architecture Findings

### 3.1 Arsitektur yang saat ini tertanam

1. **Monolith berbasis Next.js**  
   Aplikasi UI, route handler API, auth, query cache, dan realtime berjalan dalam satu codebase. `server.ts` menambahkan HTTP server custom agar `Socket.IO` bisa hidup berdampingan dengan App Router.

2. **Hybrid domain layout**  
   Struktur `src/features/*` sudah baik, tetapi masih hidup berdampingan dengan `src/components/helpdesk/*`, `src/hooks/*`, `src/shared/hooks/*`, dan `src/lib/*`. Ini menandakan transisi arsitektur belum selesai.

3. **Persistence lokal + integrasi eksternal**  
   Odoo dipakai untuk autentikasi dan sinkron data pegawai, tetapi semua state helpdesk inti disimpan di PostgreSQL lokal melalui Prisma.

4. **State split yang sehat, tapi belum sepenuhnya konsisten**  
   TanStack Query dipakai untuk server-state, sedangkan Zustand dipakai untuk auth/UI state. Ini sudah tepat. Namun invalidation dan cache patching masih tersebar.

5. **Realtime domain-aware**  
   Client sudah punya `ws-manager` dan hook domain `useTicketRealtime`, yang merupakan arah yang benar. Server juga sudah mendukung room-based event emission dan Redis adapter.

### 3.2 Debt arsitektural yang harus di-address

1. Route handler masih sering memanggil `prisma` langsung, sehingga service/repository layer belum menjadi boundary tunggal.
2. Batas import antara `app`, `features`, `components`, `lib`, dan `shared` belum ketat.
3. Auth browser saat ini memakai token di `localStorage` dan cookie non-HttpOnly; ini tidak ideal untuk production hardening.
4. Beberapa concern lintas domain masih berada di `src/lib/*` tanpa ownership domain yang jelas.
5. Ada duplikasi komponen dan hook lama-vs-baru, terutama di area tickets/dashboard.

## 4. Filosofi & Pola Desain

### 4.1 Pola utama yang direkomendasikan

Untuk stack ini, pola paling optimal adalah:

- **Production Modular Monolith** di atas Next.js App Router.
- **Feature-first vertical slices** untuk domain bisnis (`auth`, `tickets`, `dashboard`, `admin`, `realtime`).
- **Service Layer + Repository Layer** di sisi server untuk semua akses database dan integrasi Odoo.
- **Server-state via TanStack Query**, **client-state via Zustand**, dan **realtime sebagai event-driven cache synchronization**, bukan sumber data utama.

Ini lebih cocok dibanding memecah ke microservices sekarang, karena:

1. Stack nyata sudah menyatu dalam Next.js monolith.
2. Realtime, auth, dan CRUD masih sangat domain-coupled.
3. Prisma schema dan route handler masih satu bounded context helpdesk.
4. Biaya operasional akan naik tajam jika dipaksa split terlalu dini.

### 4.2 Pola rendering

Strategi rendering yang paling masuk akal untuk kode saat ini:

- **Server Components by default** untuk shell, layout, route segmentation, dan static metadata.
- **Client Components only for interactivity**: forms, tables, dialogs, drag/drop, websocket consumers, TanStack Query consumers.
- **Dashboard layout di route group** tetap dipertahankan melalui `src/app/(dashboard)`.
- **API access tetap lewat route handlers internal** (`/api/helpdesk/*`) agar frontend tidak bypass domain policy.

### 4.3 Pola backend dalam monolith

Target backend flow:

`Route Handler -> Auth Guard -> Zod Validation -> Application Service -> Repository -> Prisma -> PostgreSQL`

Aturan tambahannya:

- Odoo hanya boleh diakses melalui gateway/integration module.
- Emisi websocket hanya dilakukan dari service/event publisher, bukan langsung dari route handler.
- DTO/API response mapper dipisahkan dari model Prisma.

### 4.4 Pola state management

- **TanStack Query** untuk semua data yang berasal dari server/API.
- **Zustand** hanya untuk auth session client, filter state, modal/dialog state, dan view preferences.
- **Socket.IO** dipakai untuk patch/invalidate query cache, bukan untuk menggantikan fetch awal.
- **No direct Prisma type leakage to browser contracts**; gunakan DTO/response types domain.

### 4.5 Pola keamanan

- Session lokal tetap dipakai, tetapi browser auth target-nya diarahkan ke **HttpOnly secure cookie**.
- JWT secret tidak boleh punya fallback default di production.
- Semua admin action wajib menghasilkan audit log.
- Attachment, download URL, dan token propagation harus melalui policy yang konsisten.

## 5. Target Folder Structure

Struktur target di bawah ini adalah bentuk ideal yang masih selaras dengan stack dan kode yang sudah ada. Tujuannya bukan mengganti teknologi, tetapi menegaskan ownership tiap lapisan.

```text
src/
├─ app/
│  ├─ (auth)/
│  │  └─ login/
│  ├─ (dashboard)/
│  │  ├─ admin/
│  │  ├─ dashboard/
│  │  └─ tickets/
│  ├─ api/
│  │  └─ helpdesk/
│  │     ├─ auth/
│  │     ├─ tickets/
│  │     ├─ dashboard/
│  │     ├─ admin/
│  │     ├─ attachments/
│  │     └─ master-data/
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ not-found.tsx
│  └─ providers.tsx
├─ features/
│  ├─ auth/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ stores/
│  │  ├─ services/
│  │  ├─ schemas/
│  │  ├─ server/
│  │  │  ├─ auth.service.ts
│  │  │  ├─ session.repository.ts
│  │  │  ├─ auth.policy.ts
│  │  │  └─ auth.mapper.ts
│  │  ├─ types.ts
│  │  └─ index.ts
│  ├─ tickets/
│  │  ├─ components/
│  │  │  ├─ list/
│  │  │  ├─ detail/
│  │  │  └─ create/
│  │  ├─ hooks/
│  │  ├─ stores/
│  │  ├─ services/
│  │  ├─ schemas/
│  │  ├─ server/
│  │  │  ├─ ticket.service.ts
│  │  │  ├─ message.service.ts
│  │  │  ├─ activity-log.service.ts
│  │  │  ├─ ticket.repository.ts
│  │  │  ├─ message.repository.ts
│  │  │  ├─ ticket.policy.ts
│  │  │  ├─ ticket.events.ts
│  │  │  └─ ticket.mapper.ts
│  │  ├─ constants/
│  │  ├─ types.ts
│  │  └─ index.ts
│  ├─ dashboard/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ services/
│  │  ├─ server/
│  │  ├─ types/
│  │  └─ index.ts
│  ├─ admin/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ services/
│  │  ├─ server/
│  │  └─ index.ts
│  └─ realtime/
│     ├─ hooks/
│     ├─ providers/
│     ├─ ws-manager.ts
│     ├─ events.ts
│     ├─ constants.ts
│     └─ index.ts
├─ shared/
│  ├─ ui/
│  ├─ hooks/
│  ├─ types/
│  ├─ constants/
│  ├─ utils/
│  ├─ api/
│  ├─ query/
│  ├─ socket/
│  └─ config/
├─ server/
│  ├─ db/
│  │  └─ prisma.ts
│  ├─ auth/
│  │  ├─ jwt.ts
│  │  └─ session.ts
│  ├─ realtime/
│  │  ├─ socket-io.ts
│  │  └─ socket-emitter.ts
│  └─ integrations/
│     └─ odoo/
│        ├─ odoo-client.ts
│        ├─ employee.mapper.ts
│        └─ cache.ts
├─ generated/
│  └─ prisma/
└─ types/
```

### 5.1 Fungsi tiap area

| Folder | Fungsi |
| --- | --- |
| `src/app` | Routing, layout, route group, boundary framework Next.js |
| `src/app/api/helpdesk` | HTTP transport layer saja; tidak menyimpan business logic |
| `src/features/*` | Domain slices; home untuk komponen, hook, service, schema, dan server module per feature |
| `src/shared/*` | Reusable cross-domain assets: UI primitives, hooks generik, constants, utils, query helpers |
| `src/server/*` | Cross-cutting server infrastructure: Prisma singleton, JWT/session, Socket.IO infra, Odoo gateway |
| `src/generated/prisma` | Generated ORM client; read-only untuk app code |

### 5.2 Mapping dari struktur saat ini ke target

| Struktur Saat Ini | Target |
| --- | --- |
| `src/components/ui/*` | `src/shared/ui/*` |
| `src/components/layout/*` | `src/shared/ui/layout/*` atau `src/widgets/layout/*` jika menjadi composition-heavy |
| `src/components/helpdesk/tickets/*` | `src/features/tickets/components/*` |
| `src/components/helpdesk/dashboard/*` | `src/features/dashboard/components/*` |
| `src/lib/server/*` | `src/server/*` atau `src/features/*/server/*` sesuai ownership |
| `src/lib/api/*` | `src/shared/api/*` |
| `src/lib/query/*` | `src/shared/query/*` |
| `src/hooks/*` dan `src/shared/hooks/*` | Konsolidasikan ke `src/shared/hooks/*` atau feature hook masing-masing |

## 6. Step-by-Step Blueprint

Setiap langkah di bawah ditulis agar bisa dijalankan oleh agent atau engineer baru tanpa membaca percakapan ini.

| Step | Cold-Start Brief | Output | Estimasi |
| --- | --- | --- | --- |
| 1. Freeze module boundaries | Audit dan tandai folder legacy vs target. Fokus pada `src/components/helpdesk`, `src/hooks`, `src/shared/hooks`, `src/lib`, dan `src/features`. Buat daftar owner folder dan larang penambahan file baru di area legacy. | ADR singkat + daftar folder deprecated | 2-4 jam |
| 2. Normalize shared layer | Pindahkan utilitas generik yang benar-benar reusable ke `src/shared/*`: `api`, `query`, `socket`, `constants`, `utils`, `ui`. Jangan pindahkan business logic. | Shared layer bersih dengan barrel exports terbatas | 4-6 jam |
| 3. Harden server infrastructure | Pecah `src/lib/server/*` menjadi `src/server/db`, `src/server/auth`, `src/server/realtime`, `src/server/integrations/odoo`. Pastikan browser code tidak mengimpor area ini. | Cross-cutting infra server yang eksplisit | 4-6 jam |
| 4. Standardize route handler pattern | Refactor route handler agar semua endpoint memakai pola: auth -> validation -> service -> mapper -> response. Mulai dari `tickets`, lalu `auth`, `dashboard`, `admin`. | Template route handler konsisten | 8-12 jam |
| 5. Consolidate ticket domain | Jadikan `tickets` sebagai vertical slice penuh. Semua operasi tiket, message, attachment, activity log, dan policy harus hidup di `src/features/tickets/server/*`. `prisma` hanya boleh dipanggil dari repository. | Ticket module production-ready | 12-16 jam |
| 6. Consolidate auth domain | Satukan store, hook, login flow, session policy, dan Odoo mapping ke satu auth module. Hilangkan token scattering di browser sebagai target akhir. | Auth module tegas dan aman | 8-12 jam |
| 7. Realtime contract hardening | Formalkan event contract Socket.IO (`ticket_created`, `ticket_status_changed`, `message_new`, dst.) dalam satu file typed event map. Emisi event hanya dari service layer. Redis adapter wajib tested untuk multi-instance. | Realtime contract + publisher policy | 6-10 jam |
| 8. Query/cache architecture cleanup | Satu sumber query keys, cache policy, optimistic update, invalidation helpers, dan realtime cache patches. Pastikan tidak ada invalidation liar di UI component. | Asynchronous state layer konsisten | 6-10 jam |
| 9. UI/domain migration | Migrasikan semua komponen `src/components/helpdesk/*` yang masih aktif ke feature slice masing-masing. Setelah itu hapus alias/duplikasi yang tidak dipakai lagi. | Komponen legacy dieliminasi | 10-18 jam |
| 10. Security hardening pass | Terapkan HttpOnly cookie strategy, hilangkan fallback JWT secret, tambahkan Zod di seluruh endpoint, perketat CSP, validasi attachment, dan audit logging untuk admin action. | Baseline security production | 8-12 jam |
| 11. Persistence hardening | Audit index Prisma, policy file storage saat ini (`fileData` / `filePath`), migrasi select/include agar hemat query, dan rapikan repository contract. | Data layer siap scale-up | 6-8 jam |
| 12. CI and quality gates | Tambahkan pipeline minimal: lint, type-check, Prisma validate, smoke test route, dan build. Tujuannya memastikan arsitektur tidak mundur setelah refactor. | Guardrail delivery | 4-8 jam |

### 6.1 Urutan implementasi yang direkomendasikan

Urutan ideal:

`1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12`

Alasannya:

1. Boundary harus dibekukan dulu.
2. Shared/server infra harus jelas sebelum domain dipindah.
3. Ticket/auth adalah domain dengan coupling tertinggi.
4. Realtime dan query layer baru aman dirapikan setelah domain boundary mapan.

## 7. Architecture Rules

### 7.1 Strict dependency rules

1. `src/app/**` boleh mengimpor dari `src/features/**`, `src/shared/**`, dan `src/server/**` hanya pada server boundary yang sah.
2. `src/app/api/**` **tidak boleh** memanggil Prisma langsung; wajib lewat service/repository.
3. `src/features/<feature>/**` hanya boleh:
   - mengimpor dari feature yang sama,
   - mengimpor `src/shared/**`,
   - mengimpor `src/server/**` hanya untuk file di subfolder `server/`.
4. Cross-feature import hanya boleh melalui public API (`@/features/auth`, `@/features/tickets`), bukan deep import acak.
5. `src/shared/**` **tidak boleh** mengimpor `src/features/**` atau `src/app/**`.
6. `src/shared/ui/**` **tidak boleh** mengandung business logic, auth check, query invalidation, atau import store domain.
7. `src/server/**` **tidak boleh** diimpor dari Client Component.
8. `src/generated/prisma/**` hanya boleh diimpor oleh repository/server modules.
9. Query hooks domain harus memanggil `service` layer, bukan `axios` langsung.
10. Realtime hooks boleh memodifikasi cache TanStack Query, tetapi **tidak boleh** menampilkan toast atau mutasi DOM langsung.

### 7.2 Security standards

1. `JWT_SECRET` wajib di-set di production; fallback default hanya boleh untuk local dev.
2. End-state auth browser: **HttpOnly + Secure cookie**, bukan token persist di `localStorage`.
3. Semua route handler wajib memakai validation schema pada input body/query/params.
4. Semua endpoint attachment wajib memakai allowlist MIME type, batas ukuran, dan authorization check eksplisit.
5. Semua admin action wajib ditulis ke `ActivityLog` atau audit trail setara.
6. `REDIS_URL`, `DATABASE_URL`, `ODOO_API_BASE_URL`, dan secret lain hanya boleh diakses dari config/server module.
7. Prisma query harus memakai `select`/`include` minimal yang dibutuhkan; hindari overfetch.
8. Untuk deployment multi-instance, Redis adapter Socket.IO wajib aktif; fallback in-memory hanya untuk single-instance/dev.
9. CSP saat ini masih longgar (`unsafe-inline`, `unsafe-eval`); target produksi adalah menghapus keduanya secara bertahap.
10. Odoo integration harus dianggap unreliable external dependency: semua call wajib timeout, log, dan punya fallback/error mapping yang konsisten.

### 7.3 Quality rules

1. Semua feature harus punya `index.ts` sebagai public surface.
2. Semua type response API harus dipisah dari model Prisma.
3. Semua query key harus didefinisikan dari satu factory.
4. Semua store Zustand harus selector-first; hindari destructuring whole store di component.
5. Semua refactor harus menjaga App Router route groups, loading boundary, dan error boundary tetap eksplisit.

## 8. Recommended Production End-State

End-state yang direkomendasikan untuk proyek ini adalah:

- **Next.js modular monolith**
- **App Router + route groups**
- **Feature-local domain code**
- **Prisma/PostgreSQL untuk persistence inti**
- **Socket.IO + Redis untuk realtime multi-instance**
- **TanStack Query untuk server-state**
- **Zustand untuk UI/auth client state**
- **Odoo sebagai external identity + employee source, bukan source of truth untuk ticket domain**

Ini adalah arsitektur yang paling selaras dengan pustaka yang benar-benar ada di repo saat audit dilakukan.

## 9. Files Audited

Blueprint ini disusun dari pemeriksaan minimal terhadap file berikut:

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `prisma.config.ts`
- `prisma/schema.prisma`
- `docker-compose.yml`
- `server.ts`
- `src/app/providers.tsx`
- `src/app/layout.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/middleware.ts`
- `src/lib/server/prisma.ts`
- `src/lib/server/auth.ts`
- `src/lib/server/socket-io.ts`
- `src/lib/server/socket-emitter.ts`
- `src/lib/server/odoo-client.ts`
- `src/lib/api/client.ts`
- `src/lib/query/client.ts`
- `src/features/auth/stores/auth.store.ts`
- `src/features/tickets/stores/*`
- `src/features/realtime/*`
- `src/app/api/helpdesk/tickets/route.ts`
- `src/app/api/helpdesk/auth/login/route.ts`
