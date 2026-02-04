# Spesifikasi Backend: Workflow Helpdesk & Penyesuaian

Dokumen ini berisi spesifikasi rinci untuk perubahan **backend (Odoo addons)** agar sesuai dengan workflow admin vs user yang diminta: pemilihan team/ticket oleh admin (bukan user), stage berbeda tampilan user vs admin, dan member helpdesk team memakai **employee** (bukan `res.users`).

---

## 1. Ringkasan Perubahan

| Area | Perubahan |
|------|-----------|
| **Helpdesk Team** | Member pakai **hr.employee** (bukan res.users). Tetap 3 team untuk sekarang. |
| **Stages** | Disederhanakan; stage tampil berbeda untuk user vs admin (lihat tabel stage mapping). |
| **User flow** | User: buat ticket → lihat detail → tanya progress → cek progress (obrolan terpisah dari on progress) → konfirmasi selesai → Closed. |
| **Admin flow** | Admin: lihat semua ticket → detail → approve/progress (button) → assign team → activity log dari manpower → konfirmasi selesai → Resolved/Waiting User → saat user konfirmasi → Closed. |

---

## 2. Helpdesk Team: Member Pakai Employee

### 2.1 Yang Diubah

- **Saat ini:** Model helpdesk team memakai relasi ke `res.users` untuk member (mis. field `member_ids` → Many2many ke `res.users`).
- **Target:** Member team adalah **employee** saja, agar selaras dengan frontend (semua progress/auth pakai employee).

### 2.2 Implementasi di Odoo

1. **Model helpdesk.team (atau setara di modul helpdesk Anda)**
   - Ganti field member dari `res.users` ke `hr.employee`.
   - Contoh:
     - **Nama field:** `member_ids` (atau `member_employee_ids` agar eksplisit).
     - **Tipe:** `Many2many('hr.employee', ...)`.
   - **Team Leader:** Bisa tetap pakai `user_id` (res.users) untuk integrasi Odoo, **atau** ganti ke `leader_employee_id` (Many2one ke `hr.employee`) jika ingin konsisten full employee. Jika tetap `user_id`, pastikan ada computed/related dari employee yang punya `user_id` tersebut.

2. **View form/kanban helpdesk team**
   - Di form "Add: Members", datasource/domain untuk memilih **hr.employee** (bukan res.users).
   - Kolom tampilan: Name, NIK (atau badge), Department, Company (jika multi-company). **Jangan** tampilkan Login, Latest authentication, Status (karena itu milik res.users).

3. **API (helpdesk_api)**
   - Endpoint yang mengembalikan team + members: kembalikan daftar **employee** (id, name, nik, department_id, dll sesuai kebutuhan frontend).
   - Contoh response:
     ```json
     "team": { "id": 1, "name": "IT Support", "members": [{"id": 10, "name": "John Doe", "employee_id": 10, "nik": "6050"}] }
     ```

4. **Constraint / validasi**
   - Satu employee boleh masuk beberapa team (boleh Many2many).
   - Pastikan modul `hr` (hr.employee) tergantung oleh modul helpdesk yang mendefinisikan team.

### 2.3 Data Awal (3 Team)

- Tetap 3 team seperti yang ada sekarang (mis. IT Support, IT Support Team, Development Team).
- Member diisi dengan **employee** yang relevan (bukan user). Jika sebelumnya sudah ada member res.users, migrasi: untuk tiap user, cari `hr.employee` dengan `user_id = user.id`, lalu tambahkan employee tersebut ke `member_ids` (Many2many ke hr.employee).

---

## 3. Stages: Disederhanakan & Tampilan Berbeda User vs Admin

### 3.1 Daftar Stage yang Dipertahankan (Backend)

Hapus stage yang tidak dipakai. Gunakan **hanya** stage berikut (nama bisa disesuaikan dengan label Odoo):

| Sequence | Technical name / Name (contoh) | Untuk | Closing stage? |
|----------|--------------------------------|-------|----------------|
| 0 | **Draft** | Admin saja (user tidak lihat stage ini) | No |
| 1 | **Sent** | User saja (saat user kirim ticket, di sisi user = Sent) | No |
| 2 | **In Progress** | User & Admin | No |
| 3 | **Resolved - Awaiting Confirmation** / **Waiting for User** | User & Admin | No |
| 4 | **Closed** | User & Admin | Yes |

- **Closing stage:** Hanya **Closed** yang `is_closing = True` (ticket tidak bisa diubah lagi setelah Closed).

### 3.2 Mapping Tampilan User vs Admin

- **Saat ticket baru dibuat (submit dari user):**
  - **Backend:** Simpan dengan stage = **Draft** (atau stage pertama yang Anda definisikan untuk "baru masuk").
  - **API response untuk USER:** Tampilkan stage sebagai **"Sent"** (boleh field computed `stage_name_for_requester` = "Sent" atau mapping di API).
  - **API response untuk ADMIN:** Tampilkan stage **"Draft"**.

- **Saat admin klik "Proses" / "Open ticket":**
  - Pindah stage ke **In Progress**.
  - **User & Admin:** Sama-sama lihat **In Progress**.

- **Saat admin klik "Konfirmasi selesai" (untuk user):**
  - Pindah stage ke **Resolved - Awaiting Confirmation** (atau **Waiting for User**).
  - **User:** Lihat status "Menunggu konfirmasi Anda" dan tombol **Konfirmasi Selesai**.

- **Saat user klik "Konfirmasi Selesai":**
  - Pindah stage ke **Closed**.
  - Ticket tidak bisa diubah lagi (validasi di backend: jika stage = Closed, tidak boleh ubah stage/assign/message kecuali kebijakan Anda mengizinkan).

### 3.3 Implementasi di Backend

1. **Data stage (XML/data)**  
   Hapus stage lama yang tidak dipakai. Buat/pertahankan hanya:
   - Draft (sequence 0, fold optional)
   - Sent (sequence 1) — *opsional di backend jika Anda pakai "Draft" saja dan mapping nama di API*
   - In Progress (sequence 2)
   - Resolved - Awaiting Confirmation / Waiting for User (sequence 3)
   - Closed (sequence 4, **closing_stage = True**)

   **Catatan:** Jika Anda ingin satu stage backend "Draft" untuk dua tampilan (user: "Sent", admin: "Draft"), tidak perlu duplikat stage; cukup di API saat serialize ticket, untuk **requester/customer** tampilkan `stage_display_name = "Sent"` bila `stage_id.name == "Draft"`.

2. **Model ticket (ticket.helpdesk atau setara)**  
   - Field `stage_id` → Many2one ke stage.
   - Validasi: dari stage **Closed** tidak boleh pindah ke stage lain (kecuali kebijakan khusus).
   - Method untuk pindah stage: mis. `action_open_ticket()` → set stage = In Progress; `action_request_user_confirmation()` → set stage = Resolved - Awaiting Confirmation; `action_close()` atau konfirmasi user → set stage = Closed.

3. **API (helpdesk_api)**  
   - Di serializer ticket, tambah logic role-based:
     - Jika pemanggil = **requester (customer_id)** → gunakan `stage_display_name` untuk user (Draft → "Sent", sisanya sama).
     - Jika pemanggil = **admin** → gunakan nama stage asli (Draft, In Progress, …).
   - Endpoint list ticket: filter stage sesuai role; untuk user hanya ticket sendiri dan stage tampil pakai mapping di atas.

---

## 4. Workflow: User vs Admin (Detail)

### 4.1 Dari Sisi User

1. **Membuat ticket** → Submit → Di backend stage = Draft; di tampilan user = **Sent**.
2. **Melihat detail ticket** → Halaman detail ticket.
3. **Menanyakan progress** → Via obrolan (pesan).
4. **Mengecek progress** → Di detail ticket. **Permintaan:** Bagian **obrolan** dan **on progress** dipisah jadi 2 (obrolan sendiri, on progress sendiri).
5. **Mengkonfirmasi selesai** → Setelah admin menandai selesai dan minta konfirmasi, user klik konfirmasi → status ticket **Closed**.

### 4.2 Dari Sisi Admin

1. **Melihat semua ticket** yang diajukan user → List ticket (semua / filter).
2. **Masuk ke detail ticket** → Buka ticket.
3. **Menyetujui untuk diproses** → Klik button **Progress** / **Open ticket** → Stage pindah ke **In Progress**.
4. **Assign team helpdesk** sesuai permintaan user (dropdown/pilih team).
5. **Saat in progress:** **Menambahkan activity log** berdasarkan laporan manpower yang mengerjakan ticket.
6. **Saat selesai:** Klik **Konfirmasi** → Beritahu user bahwa ticket sudah selesai → Stage = **Resolved - Awaiting Confirmation** / **Waiting for User**.
7. **Saat user sudah konfirmasi** → Status ticket = **Closed**; ticket tidak bisa diubah lagi.

### 4.3 Diagram Alur Stage (Backend)

```
[User submit] → stage = Draft  (user lihat: "Sent")
                    ↓
[Admin: Progress/Open ticket] → stage = In Progress
                    ↓
[Admin: Konfirmasi selesai]   → stage = Resolved - Awaiting Confirmation / Waiting for User
                    ↓
[User: Konfirmasi selesai]    → stage = Closed (closing, no more edits)
```

---

## 5. API yang Perlu Disediakan / Disesuaikan (Backend)

| Aksi | Method | Endpoint (contoh) | Keterangan |
|------|--------|-------------------|------------|
| List ticket | GET | `/tickets` | Admin: semua (filter optional); User: my tickets. Stage name pakai mapping user vs admin. |
| Detail ticket | GET | `/tickets/:id` | Response include stage (dengan `stage_display_name` untuk user), messages, activity log. |
| Submit ticket | POST | `/tickets` | Set stage = Draft. |
| Progress / Open ticket | POST | `/tickets/:id/action_open` atau `PATCH /tickets/:id` body `{ "stage_id": <in_progress_id> }` | Hanya admin. |
| Assign team | PATCH | `/tickets/:id` body `{ "team_id": <id> }` | Hanya admin. |
| Tambah activity log | POST | `/tickets/:id/activities` atau `/tickets/:id/messages` dengan flag internal | Admin menambah log dari laporan manpower. |
| Konfirmasi selesai (admin) | POST | `/tickets/:id/action_request_confirmation` | Stage → Resolved - Awaiting Confirmation. |
| Konfirmasi selesai (user) | POST | `/tickets/:id/confirm_resolution` | Stage → Closed; hanya requester. |
| Master data teams | GET | `/teams` atau `/master` | Teams + members sebagai **employee** (id, name, nik, …). |
| Master data stages | GET | `/stages` atau `/master` | Hanya stage yang dipakai (Draft, In Progress, Resolved - Awaiting Confirmation, Closed). |

---

## 6. Pemisahan Obrolan vs On Progress (Frontend + Backend)

- **Backend:** Pastikan endpoint detail ticket mengembalikan:
  - **Messages (obrolan):** Pesan antara user dan admin (dan internal jika ada).
  - **Activity / progress log:** Entries terpisah (mis. model `ticket.activity` atau message dengan `message_type = 'activity'` / `is_activity = True`) agar frontend bisa tampil di blok "On Progress" terpisah dari "Obrolan".
- **Frontend:** Dua section di halaman detail ticket: (1) **Obrolan** — daftar pesan; (2) **On Progress** — daftar activity log dari manpower/admin.

---

## 7. Checklist Implementasi Backend

- [ ] Ganti member helpdesk team dari `res.users` ke `hr.employee` (model + view + API).
- [ ] Migrasi data member lama (user → employee) jika ada.
- [ ] Hapus stage yang tidak dipakai; pertahankan hanya Draft, (Sent optional), In Progress, Resolved - Awaiting Confirmation, Closed.
- [ ] Set Closed sebagai satu-satunya closing stage; validasi tidak bisa edit ticket Closed.
- [ ] API ticket: mapping stage name untuk user (Draft → "Sent") vs admin (nama asli).
- [ ] Endpoint aksi: Progress/Open ticket, Assign team, Request user confirmation, User confirm resolution.
- [ ] Endpoint detail ticket: mengembalikan messages dan activity log terpisah agar frontend bisa tampil Obrolan vs On Progress.
- [ ] Master teams: members sebagai list employee (bukan res.users).

Setelah semua ini diterapkan di addons (helpdesk_api + modul helpdesk Odoo yang mengelola team/stage), workflow user dan admin akan sesuai spesifikasi di atas.
