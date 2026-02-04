# Workflow Helpdesk — Panduan Lengkap

Dokumen ini menjelaskan alur kerja (workflow) dari sisi **User** dan sisi **Admin**, serta cara reset data. Spesifikasi teknis backend (stages, helpdesk team pakai employee, API) ada di **BACKEND_SPEC_WORKFLOW.md**.

---

## 1. Role dan Akses

| Role          | Siapa                    | Akses Ticket                          | Aksi yang Bisa Dilakukan |
|---------------|--------------------------|----------------------------------------|---------------------------|
| **User**      | Pembuat ticket / karyawan biasa | Hanya ticket milik sendiri            | Buat ticket, lihat detail, tanya progress, cek progress (obrolan + on progress), **Konfirmasi Selesai** (jika diminta admin) |
| **Super Admin** | Admin helpdesk (mis. fazry) | Semua ticket                           | Lihat semua ticket, approve/progress ticket, assign team, tambah activity log, konfirmasi selesai ke user |

**Catatan:** Pemilihan **team** dan penentuan **prioritas/kondisi** ticket (perlu cepat / critical / low) dilakukan oleh **admin**. User hanya mengajukan ticket; admin yang mengelola dan meng-assign manpower.

---

## 2. Tampilan Stage: User vs Admin

Stage yang sama di backend bisa **tampil berbeda** untuk user dan admin:

| Backend (stage_id) | Tampilan untuk **User** | Tampilan untuk **Admin** |
|--------------------|-------------------------|---------------------------|
| Draft              | **Sent**                | **Draft**                 |
| In Progress        | In Progress             | In Progress               |
| Resolved - Awaiting Confirmation | Waiting for User / Menunggu konfirmasi Anda | Resolved - Awaiting Confirmation |
| Closed             | Closed                  | Closed                    |

- **User** saat mengirim ticket: di daftar/detail dia melihat stage **Sent** (backend tetap Draft).
- **Admin** melihat ticket baru sebagai **Draft**, lalu mengklik **Progress / Open ticket** → stage jadi **In Progress** (sama untuk user dan admin).

---

## 3. Workflow dari Sisi User

1. **Membuat ticket** → Submit → Di backend stage = Draft; di tampilan user = **Sent**.
2. **Melihat detail ticket** → Buka halaman detail ticket.
3. **Menanyakan progress** → Via **obrolan** (kirim pesan).
4. **Mengecek progress ticket** → Di halaman detail ticket.  
   **Permintaan:** Bagian **Obrolan** dan **On Progress** dipisah jadi **2 section**:  
   - **Obrolan** — riwayat pesan (chat) dengan admin.  
   - **On Progress** — riwayat activity/log progress dari manpower/admin.
5. **Mengkonfirmasi selesai** → Setelah admin menandai selesai dan minta konfirmasi, user klik **Konfirmasi Selesai** (Ya, Sudah Teratasi) → status ticket **Closed**.

---

## 4. Workflow dari Sisi Admin

1. **Melihat semua ticket** yang diajukan user → Daftar ticket (semua / filter).
2. **Masuk ke detail ticket** → Buka salah satu ticket.
3. **Menyetujui ticket untuk diproses** → Klik tombol **Progress** / **Open ticket** → Stage pindah ke **In Progress**.
4. **Assign team helpdesk** sesuai permintaan user (pilih team dari dropdown).
5. **Saat ticket in progress:** **Menambahkan activity log** berdasarkan laporan dari manpower yang mengerjakan ticket.
6. **Saat sudah selesai:** Klik **Konfirmasi** (untuk memberitahu user) → Status ticket = **Resolved - Awaiting Confirmation** / **Waiting for User**.
7. **Saat user sudah konfirmasi** → Status ticket = **Closed**; ticket tidak bisa diubah lagi.

---

## 5. Ringkas Alur (End-to-End)

```
[User] Buat ticket                    → Stage backend: Draft | User lihat: Sent
[User] Lihat detail, tanya progress   → Obrolan + On Progress (2 section terpisah)
[Admin] Buka ticket, klik Progress    → Stage: In Progress (user & admin sama)
[Admin] Assign team, isi activity log → Progress tercatat di "On Progress"
[Admin] Klik Konfirmasi selesai       → Stage: Resolved - Awaiting Confirmation / Waiting for User
[User] Klik Konfirmasi Selesai        → Stage: Closed (ticket tidak bisa diubah lagi)
```

---

## 6. Di Halaman Detail Ticket

### Untuk Admin (Super Admin)

- **Kelola Ticket (Progress)** (sidebar/area aksi):
  - Tombol **Progress** / **Open ticket** (Draft → In Progress).
  - **Assign team** helpdesk (dropdown team; member team pakai data **employee**, bukan res.user).
  - **Tambah activity log** (laporan dari manpower).
  - **Konfirmasi selesai** (kirim permintaan konfirmasi ke user) → stage Resolved - Awaiting Confirmation.
- **Informasi Ticket**: Status, Team, Department, Category, Customer, Assigned, Created, Updated.
- **Obrolan** (section sendiri): riwayat pesan + form kirim pesan (opsional: pesan internal).
- **On Progress** (section terpisah): riwayat activity log dari manpower/admin.

### Untuk User

- **Konfirmasi Selesai** (jika admin sudah minta konfirmasi): card di atas dengan tombol **Ya, Sudah Teratasi**.
- **Deskripsi**, **Informasi Ticket**.
- **Obrolan** (section sendiri): riwayat pesan + kirim pesan.
- **On Progress** (section terpisah): melihat progress/activity yang ditambah admin/manpower.

---

## 7. Reset Data (Frontend + Backend)

### Frontend (clear state & cache)

1. **Logout** dari aplikasi (Keluar).
2. Di browser: F12 → Application → Storage → **Clear site data** (atau hapus localStorage).
   Atau buka tab **Incognito/Private** dan akses aplikasi lagi.
3. Login ulang dengan akun yang ingin dipakai.

### Backend (Odoo) — hapus ticket untuk percobaan ulang

- **Opsi A — Manual di Odoo**  
  Buka Odoo → modul Helpdesk → hapus atau archive ticket yang ingin di-reset.

- **Opsi B — Script (development only)**  
  Jalankan di environment Odoo yang sama (database `odoo_development`):

  ```python
  # Hapus semua ticket helpdesk (development only!)
  tickets = env['ticket.helpdesk'].search([])
  count = len(tickets)
  tickets.unlink()
  _logger.info("Deleted %d tickets", count)
  ```

  Jalankan hanya jika Anda yakin ingin mengosongkan semua ticket. Setelah reset, **refresh** daftar ticket di frontend (atau logout/login lagi).

---

## 8. Akun untuk Testing

| Role          | Keterangan |
|---------------|------------|
| **Super Admin** | Gunakan **fazry** (NIK 6050 / login sesuai konfigurasi) yang sudah masuk group **Helpdesk Manager** di Odoo. Demo user 1001/1002 dari modul helpdesk_api **tidak dipakai** (lihat SETUP_SUPER_ADMIN_FAZRY.md). |
| **User**      | Employee lain yang punya akses helpdesk (NIK + password helpdesk di kartu employee). |

---

## 9. Troubleshooting

- **Admin tidak bisa ubah stage / assign**  
  Pastikan user login sebagai Super Admin (group Helpdesk Manager). Cek response `/auth/me`: `helpdesk_role` harus `super_admin`.

- **User tidak melihat "Konfirmasi Selesai"**  
  Pastikan admin sudah klik **Konfirmasi selesai** (request confirmation) untuk ticket tersebut, dan Anda login sebagai **User** (pembuat ticket).

- **403 saat buka ticket**  
  Pastikan token valid dan header `Authorization` terkirim. User hanya ticket sendiri; Super Admin bisa akses semua ticket.

- **Daftar ticket kosong**  
  Cek filter (Tiket Saya / status / stage). Untuk admin, matikan filter "Tiket Saya" agar melihat semua ticket.

- **Stage user vs admin beda**  
  Backend mengembalikan `stage` / `stage_display_name` sesuai role: user lihat "Sent" untuk stage Draft; admin lihat "Draft". Detail di **BACKEND_SPEC_WORKFLOW.md**.

---

## 10. Dokumen Terkait

- **BACKEND_SPEC_WORKFLOW.md** — Spesifikasi backend: helpdesk team (member = employee), stages disederhanakan, mapping stage user vs admin, API, pemisahan obrolan vs activity log.
- **SETUP_SUPER_ADMIN_FAZRY.md** — Cara set fazry sebagai Super Admin dan nonaktifkan demo user.
- **REKOMENDASI_HIRARKI_ADMIN_HELPDESK.md** — Rekomendasi hirarki admin dan integrasi Odoo.
