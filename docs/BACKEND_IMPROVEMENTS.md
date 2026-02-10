# Saran Perbaikan Backend (Helpdesk API)

Dokumen ini merangkum saran perbaikan backend agar selaras dengan frontend setelah refactor (error handling, tipe data, dan kontrak API).

---

## 1. Format Error Response (Konsisten)

Frontend memakai `getErrorMessage(error)` yang membaca:

- `response.data.error` → **string** (kode error) atau **object** `{ message: string }`
- `response.data.message` → string fallback

**Saran:** Standarisasi response error di semua endpoint.

**Format yang didukung frontend:**

```json
// Opsi A: error code (direkomendasikan untuk i18n)
{
  "error": "NIK_NOT_FOUND"
}

// Opsi B: pesan langsung
{
  "message": "NIK tidak ditemukan."
}

// Opsi C: error object
{
  "error": {
    "message": "Detail error dari validasi."
  }
}
```

**Kode error yang sudah dipetakan di frontend (`ERROR_MESSAGES`):**

| Kode | Penggunaan |
|------|------------|
| `INVALID_LOGIN_FORMAT` | Login: format NIK tidak valid |
| `NIK_NOT_FOUND` | Login: NIK tidak ditemukan |
| `INVALID_HELPDESK_PASSWORD` | Login: password salah |
| `NO_HELPDESK_PASSWORD` | Login: user belum punya password helpdesk |
| `ACCOUNT_LOCKED` | Login: akun dikunci |
| `NETWORK_ERROR` | (Frontend detect `message === "Network Error"`) |
| `SERVER_ERROR` | Fallback server |
| `TICKET_NOT_FOUND` | GET ticket by id |
| `TICKET_CREATE_FAILED` | POST create ticket |
| `UNKNOWN_ERROR` | Fallback umum |

**Action:** Di backend, untuk auth (login, change password) dan ticket (create, update, dll) kembalikan `error` dengan kode di atas (atau `message`) agar pesan di UI konsisten.

---

## 2. Tipe Data Ticket

### 2.1 Priority

Frontend mengharapkan **string** Odoo: `"0"` (Very Low) s/d `"4"` (Very High).

- **Perbaikan:** Pastikan response ticket mengembalikan `priority` sebagai **string** (bukan number/boolean).
- **Opsional:** Sertakan `priority_label` (contoh: `"High"`, `"Normal"`) untuk tampilan.

### 2.2 Stage

Frontend mendukung:

- `stage: { id: number, name: string }` (bisa plus `actual_name`)
- Atau `stage_name: string` jika object stage tidak ada (misal ticket system)

**Action:** Untuk ticket yang punya stage, selalu isi `stage` atau `stage_name` agar status tampil benar.

### 2.3 Assigned employee

Frontend menampilkan "Ditangani oleh" dari:

- `assigned_employee?.name` (prioritas) atau
- `assigned_user?.name`

**Action:** Jika assign by employee (bukan user Odoo), pastikan response menyertakan `assigned_employee: { id, name }`.

---

## 3. Message / Thread API

Endpoint: `GET /tickets/:id/thread` (atau setara).

Frontend memisahkan:

- **Obrolan (chat):** pesan yang **bukan** system status dan **bukan** activity log.
- **On Progress (activity log):** pesan dengan activity log / progress update.

**Field yang dipakai:**

| Field | Tipe | Kegunaan |
|-------|------|-----------|
| `id` | number | Key |
| `body` | string | HTML/isi pesan |
| `body_plain` | string? | Teks plain (lebih aman untuk label/parsing) |
| `author` | `{ id, name, email? } \| null` | Pengirim |
| `date` / `create_date` | string | Waktu |
| `is_internal` | boolean? | Pesan internal |
| `is_system_status` | boolean? | **True** = sembunyikan dari Obrolan & On Progress (mis. "Stage changed", "IT Activity") |
| `is_activity_log` | boolean? | **True** = tampilkan di On Progress (progress update, assign, dll) |
| `subtype_xmlid` | string? | Contoh `mail.mt_note` → frontend anggap activity log |

**Action:**

1. Set `is_system_status: true` untuk pesan sistem (stage changed, automatic notification) agar tidak muncul di Obrolan.
2. Set `is_activity_log: true` untuk progress update / assign / catatan admin agar masuk ke "On Progress".
3. Sediakan `body_plain` (teks tanpa HTML) agar parsing label (Progress Update, Team Assignment, dll) konsisten dan aman dari XSS.

---

## 4. Auth / Login

### 4.1 Request & response

- **Request:** `POST /auth/login` body `{ login: string, password: string }` (login = 4 digit terakhir NIK).
- **Response sukses:**  
  `{ success: true, data: { access_token, token_type, expires_in, employee } }`  
  dengan `employee` sesuai tipe Employee (id, name, nik, helpdesk_username, department_id, department, job_title, email, phone, helpdesk_role, dll).

### 4.2 Error login

Kembalikan **HTTP 4xx** dengan body berisi **satu** kode error yang sudah dipetakan frontend:

- Format login salah (bukan 4 digit) → `{ "error": "INVALID_LOGIN_FORMAT" }`
- NIK tidak ketemu → `{ "error": "NIK_NOT_FOUND" }`
- Password salah → `{ "error": "INVALID_HELPDESK_PASSWORD" }`
- User belum punya password helpdesk → `{ "error": "NO_HELPDESK_PASSWORD" }`
- Akun terkunci → `{ "error": "ACCOUNT_LOCKED" }`

**Action:** Pastikan tiap kasus gagal login mengembalikan kode yang sesuai agar pesan dan fokus field (NIK vs password) di frontend benar.

---

## 5. CORS & Proxy

- Frontend dev: Next.js bisa proxy `/api/*` ke `http://localhost:8072/api/*` (rewrite).
- Jika frontend memanggil backend **langsung** (origin lain), backend harus mengizinkan origin frontend di CORS.

**Action:** Konfigurasi CORS di backend untuk origin frontend (dan pastikan preflight OPTIONS di-handle).

---

## 6. WebSocket (Opsional)

CSP frontend mengizinkan `ws://localhost:8072`.

**Action:** Jika nanti ada fitur real-time (notifikasi ticket, update status), pastikan WebSocket listen di port/path yang konsisten dan (jika pakai auth) kirim token saat connect/subscribe.

---

## 7. Create Ticket Payload

Frontend mengirim payload sesuai `CreateTicketPayload`:

- Wajib: `subject`, `description`, `ticket_category_type` (`"helper"` | `"system"`).
- Helper: subject bisa berisi prefix kategori (frontend yang menambah).
- System: `system_category`, optional `ticket_type`, dan untuk Odoo: `captured_url`, `captured_module`, `captured_model`, `captured_view_type`, `captured_record_id`, `captured_record_ref`, `captured_menu_path`, `captured_browser`.
- Attachments: `attachments: [{ filename, file_data }]` dengan `file_data` base64.

**Action:** Validasi wajib (subject, description, ticket_category_type); terima field Odoo dan attachments sesuai kontrak; pada error validasi/create kembalikan `error` atau `message` yang konsisten (lihat poin 1).

---

## 8. Ringkasan Checklist Backend

- [ ] Semua error response pakai format konsisten: `error` (kode string atau `{ message }`) dan/atau `message`.
- [ ] Auth error pakai kode: `INVALID_LOGIN_FORMAT`, `NIK_NOT_FOUND`, `INVALID_HELPDESK_PASSWORD`, `NO_HELPDESK_PASSWORD`, `ACCOUNT_LOCKED`.
- [ ] Ticket response: `priority` string `"0"`–`"4"`, optional `priority_label`; `stage` atau `stage_name`; `assigned_employee` jika assign by employee.
- [ ] Thread/messages: sediakan `body_plain`, `is_system_status`, `is_activity_log` (dan/atau `subtype_xmlid`) agar Obrolan vs On Progress benar.
- [ ] CORS dikonfigurasi jika frontend memanggil backend langsung.
- [ ] (Opsional) WebSocket siap jika akan dipakai untuk real-time.

Dengan ini, backend selaras dengan frontend dan error handling serta tipe data tetap konsisten di kedua sisi.
