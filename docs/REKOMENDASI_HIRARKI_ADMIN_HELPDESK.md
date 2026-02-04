# Rekomendasi: Hirarki Admin Helpdesk (3 Tier)

Dokumen ini berisi rekomendasi untuk mendesain sisi admin helpdesk dengan hirarki 3 tingkat (User → Admin per Dept → Super Admin), selaras dengan basis data **Odoo** (`odoo_development`) dan arsitektur yang sudah ada.

---

## 1. Ringkasan Konsep Anda vs Rekomendasi

| Aspek | Pemikiran Anda | Rekomendasi |
|--------|----------------|-------------|
| **Tier 1 – User** | Buat tiket, tanya lewat chat, lihat status | ✅ **Sama** – User hanya buat tiket, chat, dan lihat status. |
| **Tier 2 – Admin per Dept** | Manage tiket user di dept sendiri: approve/reject, assign ke tim, ubah state, komunikasi | ✅ **Sama** + disarankan **satu stage “Pending Approval”** sebelum assign, dan **rejection reason** untuk audit. |
| **Tier 3 – Super Admin** | Sama seperti admin tapi untuk semua dept, role lebih superior | ✅ **Sama** – disarankan nama **“Helpdesk Manager”** agar konsisten dengan Odoo. |
| **Identifikasi role** | – | Pakai **department + group Odoo**: Dept Admin = bisa akses helpdesk + scope per department; Super Admin = group yang bisa akses semua ticket (mis. `helpdesk_manager`). |

---

## 2. Definisi Role (Rekomendasi Final)

### 2.1 User (Requester / End User)

- **Siapa:** Semua employee yang login lewat frontend (NIK + password).
- **Akses data:**
  - Hanya tiket **milik sendiri** (filter `my_tickets` / `customer_id` = partner atau employee).
- **Aksi:**
  - Buat tiket.
  - Lihat detail tiket sendiri.
  - Chat/balas pesan.
  - Konfirmasi selesai (jika diminta admin).
- **Tidak boleh:** Approve/reject, assign tim, ubah stage (kecuali konfirmasi selesai), lihat tiket orang lain.

### 2.2 Admin per Department (Dept Admin)

- **Keputusan:** Pakai **Opsi A**.
- **Siapa:** Employee yang diberi wewenang mengurus tiket **untuk departemennya saja** (department manager).
- **Cara identifikasi di Odoo:** Pakai `hr.department.manager_id` → employee yang `department_id.manager_id == employee` dianggap Dept Admin untuk dept tersebut.
- **Akses data:**
  - Hanya tiket yang **`department_id` = departemen admin yang login** (requester dari dept tersebut).
- **Aksi:**
  - Approve / Reject tiket (dengan alasan reject opsional).
  - Assign tiket ke **Team** (dan bila perlu ke **User** dalam tim).
  - Ubah **Stage** (Draft → Pending Approval → In Progress → Done/Closed, dll.).
  - Kirim pesan/chat ke pembuat tiket.
  - Minta konfirmasi selesai ke user.
- **Tidak boleh:** Lihat/mengubah tiket dari departemen lain.

### 2.3 Super Admin (Helpdesk Manager)

- **Siapa:** Role tertinggi helpdesk; bisa mengurus **semua** tiket dari **semua** departemen.
- **Cara identifikasi di Odoo:**
  - Group `helpdesk_manager` (sudah ada di `odoo_website_helpdesk`) atau flag khusus di employee/user (mis. `is_helpdesk_super_admin`).
- **Akses data:**
  - **Semua** tiket (tanpa filter department).
- **Aksi:**
  - Sama seperti Dept Admin (approve, reject, assign, ubah stage, chat, minta konfirmasi), tapi untuk seluruh data.
- **Tambahan (opsional):** Konfigurasi stage, tim, kategori; laporan cross-department.

---

## 3. Alur Kerja Tiket (Workflow) – Rekomendasi

### 3.1 Stage dan Approval

**Keputusan:** Pakai **Alternatif** (field approval, tanpa stage baru). **Urutan implementasi:** bikin **workflow inti dulu** (Draft → In Progress → Done/Closed; assign, ubah stage, chat, minta konfirmasi), baru nanti tambah **approval** (approve/reject + field `approval_state` / `rejection_reason`) sebagai fitur minor.

**Alternatif (untuk fase berikutnya):**

- Tetap pakai stage yang ada: **Draft → In Progress → Done → Closed**.
- Tambah **field** di model `ticket.helpdesk`:
  - `approval_state`: `draft` | `pending_approval` | `approved` | `rejected`
  - `rejection_reason`: Char/Text, diisi saat reject.
- Dept Admin / Super Admin: aksi “Approve” set `approval_state = approved` (dan boleh pindah stage ke In Progress); “Reject” set `rejection_reason` + `approval_state = rejected` (dan boleh pindah ke Closed/Canceled).

### 3.2 Alur Singkat

1. **User** buat tiket → stage **Draft** (dan bila pakai field: `approval_state = draft`).
2. User **submit** (aksi di frontend) → pindah ke **Pending Approval** (atau `approval_state = pending_approval`).
3. **Dept Admin / Super Admin**:
   - **Approve** → pindah ke **In Progress** (atau stage “Approved” dulu), lalu admin **assign ke team** (dan optional assign ke user).
   - **Reject** → isi alasan (opsional), pindah ke **Rejected/Canceled**.
4. Setelah assign, tim/user mengerjakan; admin bisa ubah stage (In Progress → Done → Closed) dan **minta konfirmasi user** (fitur yang sudah ada).
5. **User** hanya lihat status dan chat; bila diminta, klik “Konfirmasi selesai”.

---

## 4. Basis Data & Odoo

### 4.1 Yang Sudah Ada dan Dipakai

- **`ticket.helpdesk`**: `department_id` (departemen peminta), `team_id`, `assigned_user_id`, `stage_id`, `customer_id`, dll.
- **`hr.employee`**: `department_id`, `user_id`; manager departemen = `department.manager_id`.
- **Auth API**: Login NIK → token → `auth/me` mengembalikan employee + `department_id` + `is_manager` (manager dept).
- **Group Odoo**: `helpdesk_user`, `helpdesk_team_leader`, `helpdesk_manager` (di modul `odoo_website_helpdesk`).

### 4.2 Yang Perlu Ditambah (Rekomendasi)

| Item | Lokasi | Keterangan |
|------|--------|------------|
| **Approval state** | Model `ticket.helpdesk` (bisa di modul API atau extended) | Field `approval_state` (selection: draft / pending_approval / approved / rejected) dan `rejection_reason` (Char/Text). |
| **Stage (opsional)** | Data stage Odoo | Stage “Pending Approval” (dan bila perlu “Approved” / “Rejected”) jika ingin full pakai stage, bukan hanya field. |
| **Role di response /me** | API `auth/me` | Tambah field mis. `helpdesk_role`: `user` \| `dept_admin` \| `super_admin` agar frontend tidak hanya mengandalkan `is_manager`. |
| **Super Admin flag** | Odoo | Pakai group `helpdesk_manager` untuk “Super Admin”, atau tambah field/group khusus `is_helpdesk_super_admin` jika ingin pisah dari “manager” umum. |

### 4.3 Record Rule (Keamanan Odoo)

- **User (requester):** Hanya lihat tiket yang `customer_id` = partner-nya (atau aturan “my tickets” yang sudah ada).
- **Dept Admin:** Hanya lihat tiket yang `department_id` = `employee.department_id` (perlu rule baru jika belum ada).
- **Super Admin (helpdesk_manager):** Bisa lihat semua (domain `[(1, '=', 1)]` – sudah ada di modul).

API bisa mengikuti aturan yang sama: filter list ticket berdasarkan role (user → my_tickets; dept_admin → by department_id; super_admin → no filter).

---

## 5. API (Backend) – Referensi Lengkap untuk Frontend

### 5.1 Daftar Endpoint (untuk integrasi frontend)

| Method | Endpoint | Role | Query/Body | Keterangan |
|--------|----------|------|------------|------------|
| POST | `/api/helpdesk/auth/login` | - | Body: `{ "login": "6049", "password": "..." }` | Login: 4 digit NIK + password helpdesk. |
| GET | `/api/helpdesk/auth/me` | Auth | - | Profil + **helpdesk_role**: user / dept_admin / super_admin. |
| POST | `/api/helpdesk/auth/logout` | Auth | - | Logout, revoke token. |
| GET | `/api/helpdesk/tickets` | Auth | page, limit, search, stage_id, team_id, priority, status, my_tickets, department_id | User: sarankan my_tickets=true. Dept Admin: otomatis filter dept. Super Admin: semua. |
| GET | `/api/helpdesk/tickets/:id` | Auth | - | Detail tiket; cek akses by role. |
| POST | `/api/helpdesk/tickets` | Auth | Body: subject, description, dll. | Buat tiket. |
| PATCH | `/api/helpdesk/tickets/:id` | Admin | Body: partial update | Update tiket (dept_admin/super_admin + scope). |
| PUT | `/api/helpdesk/tickets/:id/stage` | Admin | Body: `{ "stage_id": 123 }` | Ubah stage. |
| PUT | `/api/helpdesk/tickets/:id/assign` | Admin | Body: team_id, user_id, atau assign_to_me | Assign ke tim/user. |
| POST | `/api/helpdesk/tickets/:id/messages` | Auth | Body: body, internal | Kirim pesan/chat. |
| GET | `/api/helpdesk/tickets/:id/thread` | Auth | - | Daftar pesan tiket. |
| POST | `/api/helpdesk/tickets/:id/request-confirmation` | Admin | Body opsional | Minta konfirmasi selesai ke user. |
| POST | `/api/helpdesk/tickets/:id/confirm-resolved` | Auth | Body opsional | User konfirmasi selesai. |
| GET | `/api/helpdesk/dashboard` | Auth | - | Statistik dashboard. |
| GET | `/api/helpdesk/stages` | Auth | - | Daftar stage. |
| GET | `/api/helpdesk/teams` | Auth | - | Daftar tim. |
| GET | `/api/helpdesk/departments` | Auth | - | Daftar departemen. |
| GET | `/api/helpdesk/master-data` | Auth | - | Gabungan stages, teams, categories, departments. |

*(Approve/reject ditambah nanti setelah workflow inti.)*

### 5.2 Response GET /auth/me (untuk frontend)

Contoh: `data.helpdesk_role` = `user` | `dept_admin` | `super_admin`. Frontend pakai untuk menu, tombol Assign/Ubah stage, dan filter list ticket.

### 5.3 Logika Role di API

- **helpdesk_role:** super_admin = user dalam group helpdesk_manager; dept_admin = Opsi A (department_id.manager_id == employee); else user.
- Endpoint admin (stage, assign, request-confirmation): cek role + scope (dept_admin hanya tiket department_id = employee.department_id).

---

## 6. Frontend – Rekomendasi

### 6.1 Per Role

| Role | Halaman / Fitur |
|------|-------------------|
| **User** | Dashboard “Tiket saya”, list ticket (my tickets), buat tiket, detail + chat, konfirmasi selesai. **Tidak ada** menu “Semua tiket dept” / Approve / Reject / Assign. |
| **Dept Admin** | Dashboard ringkasan tiket **departemennya**; list ticket (filter by department-nya); di detail: tombol **Approve**, **Reject**, **Assign ke tim**, **Ubah stage**, chat, minta konfirmasi. |
| **Super Admin** | Sama seperti Dept Admin, tapi list ticket **semua departemen** (bisa tetap ada filter department opsional); aksi sama. |

### 6.2 Tampilan Umum

- **Navbar/Sidebar:** Berdasarkan `helpdesk_role` dari `/auth/me`: User tidak lihat menu “Manage Tickets” / “Admin”; Dept Admin dan Super Admin lihat menu tersebut (mis. “Tickets (Dept)” vs “All Tickets” untuk super admin).
- **Detail ticket:** Tombol Approve / Reject / Assign / Ubah stage hanya muncul jika role = dept_admin atau super_admin dan akses ke tiket tersebut (sesuai scope department).

---

## 7. Urutan Implementasi yang Disarankan

1. **Odoo (database + security)**  
   - Pastikan ada group/rule untuk dept admin (scope by `department_id`) dan super admin (semua tiket).  
   - *(Fase berikutnya:)* Tambah field `approval_state` dan `rejection_reason` di `ticket.helpdesk` untuk approval.

2. **API (workflow inti dulu)**  
   - `/auth/me`: tambah `helpdesk_role` (user / dept_admin / super_admin); Opsi A untuk dept_admin.  
   - **GET /tickets:** filter by role (user = my_tickets; dept_admin = by department_id; super_admin = all).  
   - **GET /tickets/:id:** cek akses by role + department.  
   - Endpoint assign, stage, request-confirmation: validasi role + scope.  
   - *(Fase berikutnya:)* POST approve & reject.

3. **Frontend**  
   - Simpan `helpdesk_role` dari `/auth/me`.  
   - Tampilkan menu dan list ticket sesuai role.  
   - Halaman detail: tombol Assign, Ubah stage, Minta konfirmasi hanya untuk admin + cek akses.  
   - *(Fase berikutnya:)* Tombol Approve/Reject dan form alasan.

---

## 8. Demo Users & Opsi: Fazry sebagai Satu-Satunya Super Admin

### 8.1 Demo Users (dari modul helpdesk_api, opsional)

Setelah implementasi, di modul **helpdesk_api** bisa disediakan data demo:

- **1 Dept Admin:** Login **1001** / Password **admin123** (employee = manager departemen "Helpdesk Test Dept").
- **1 Super Admin:** Login **1002** / Password **admin123** (employee terhubung ke user Odoo dalam group Helpdesk Manager).

Detail dan cara set password manual jika perlu: lihat file **addons/API/helpdesk_api/DEMO_USERS.md** (jika ada).

### 8.2 Opsi: Hanya Fazry sebagai Super Admin (disarankan untuk development)

Agar **hanya user "fazry"** (employee + res.users yang sudah ada) yang jadi Super Admin dan bisa mengelola semua tiket:

1. **Di Odoo:** Tambah user **fazry** ke group **Helpdesk Manager** (Super Admin).
2. **Di Odoo:** Pastikan employee **fazry** punya **NIK** dan **Password Helpdesk** (login frontend: NIK **6050** + password tersebut).
3. **(Opsional)** Hapus demo Super Admin dan Dept Admin dari group Helpdesk Manager, atau nonaktifkan pembuatan demo user di addon helpdesk_api.

Panduan langkah demi langkah (Odoo, Postman, frontend): **lihat [SETUP_SUPER_ADMIN_FAZRY.md](./SETUP_SUPER_ADMIN_FAZRY.md)**.

---

## 9. Alternatif & Opsi Singkat

- **Tanpa stage baru:** Cukup field `approval_state` + `rejection_reason`; Approve = set approved + pindah ke In Progress; Reject = set rejected + alasan + pindah ke Closed/Canceled.
- **Dept Admin = selalu department manager:** Tidak perlu group baru; cukup `department_id.manager_id = employee` + pengecekan di API.
- **Super Admin = group helpdesk_manager:** Tidak perlu modul baru; cukup assign user/employee ke group tersebut di Odoo.

Dokumen ini bisa dipakai sebagai acuan sebelum eksekusi teknis (backend Odoo, helpdesk_api, dan frontend). Jika setuju dengan rekomendasi ini, langkah berikutnya adalah implementasi bertahap sesuai urutan di atas.
