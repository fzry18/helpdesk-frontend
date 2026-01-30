# Helpdesk Frontend

Frontend aplikasi Helpdesk yang dibangun dengan Next.js 14, TypeScript, dan Tailwind CSS. Terintegrasi dengan Odoo Helpdesk API.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# atau
pnpm install
# atau
yarn install
```

### 2. Setup Environment Variables

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8072/api/v1
NEXT_PUBLIC_APP_NAME=Helpdesk System
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**PENTING**: Ganti `http://localhost:8072` dengan URL Odoo server Anda.

### 3. Run Development Server

```bash
npm run dev
# atau
pnpm dev
# atau
yarn dev
```

Buka browser di: http://localhost:3000

## 📦 Tech Stack

- **Next.js 16** - React framework dengan App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **Zustand** - State management
- **React Query** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client

## 📁 Project Structure

```
src/
├── app/                    # Next.js pages & routes
│   ├── (auth)/            # Auth routes
│   │   └── login/         # Login page
│   ├── (dashboard)/       # Dashboard routes
│   │   ├── dashboard/     # Dashboard page
│   │   └── tickets/       # Tickets pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── providers.tsx      # React Query provider
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── helpdesk/         # Helpdesk components
│   └── layout/            # Layout components
├── lib/                   # Utilities
│   ├── api/              # API client & endpoints
│   └── utils.ts           # Utility functions
├── store/                 # Zustand stores
├── types/                 # TypeScript types
└── hooks/                 # Custom React hooks
```

## 🔐 Authentication

Aplikasi menggunakan JWT token untuk authentication. Flow:

1. User login di `/login`
2. Token disimpan di localStorage & Zustand store
3. Setiap API request otomatis include token di header
4. Jika token expired (401), user di-redirect ke login

## 📝 Features

- ✅ Login dengan validasi form
- ✅ Dashboard dengan statistik
- ✅ List tickets dengan filter & search
- ✅ Detail ticket dengan messages
- ✅ Kirim pesan ke ticket
- ✅ Responsive design
- ✅ Loading states & error handling

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code dengan Prettier
- `npm run type-check` - Check TypeScript types

## 🔗 API Integration

Aplikasi terintegrasi dengan Odoo Helpdesk API. Pastikan:

1. ✅ Odoo server sudah running
2. ✅ Module `helpdesk_api` sudah terinstall di Odoo
3. ✅ API accessible di URL yang dikonfigurasi di `.env.local`
4. ✅ CORS sudah dikonfigurasi di Odoo

### API Endpoints yang Digunakan

- `POST /api/v1/auth/login` - Login
- `GET /api/v1/helpdesk/tickets` - List tickets
- `GET /api/v1/helpdesk/tickets/:id` - Detail ticket
- `POST /api/v1/helpdesk/tickets/:id/messages` - Post message
- `GET /api/v1/helpdesk/dashboard` - Dashboard stats
- `GET /api/v1/helpdesk/master-data` - Master data

## 🐛 Troubleshooting

### CORS Error
- Pastikan Odoo server running
- Check `NEXT_PUBLIC_API_BASE_URL` di `.env.local`
- Pastikan module `helpdesk_api` terinstall di Odoo

### Port 3000 sudah digunakan
```bash
npm run dev -- -p 3001
```

### Module not found
```bash
rm -rf node_modules .next
npm install
```

## 📚 Documentation

Lihat dokumentasi lengkap di folder `helpdesk-frontend`:
- `TECH_STACK.md` - Detail tech stack
- `INSTALLATION_GUIDE.md` - Panduan instalasi lengkap
- `PROJECT_STRUCTURE.md` - Struktur project
- `QUICK_START.md` - Quick start guide

## 🎉 Selamat!

Frontend sudah siap digunakan! Login dengan kredensial Odoo Anda untuk mulai menggunakan aplikasi.
