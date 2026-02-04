# Setup: Fazry sebagai Satu-Satunya Super Admin

Panduan ini menjelaskan cara menjadikan **fazry** (employee + user Odoo yang sudah ada) sebagai **satu-satunya Super Admin** helpdesk, dan menonaktifkan/menghapus demo Dept Admin & Super Admin agar semua pengelolaan tiket bisa dilakukan dari akun fazry.

---

## 1. Ringkasan

| Sebelum | Sesudah |
|--------|--------|
| Demo Super Admin (NIK 1002) dan Dept Admin (NIK 1001) dari modul helpdesk_api | **Dihapus atau tidak dipakai** |
| Role Super Admin ditentukan oleh group Odoo `helpdesk_manager` | **User "fazry" (res.users) ditambahkan ke group Helpdesk Manager** |
| Login frontend pakai NIK 4 digit + password helpdesk | **Login fazry: NIK `6050` + Password Helpdesk yang di-set di employee fazry** |

Setelah setup:
- **fazry** login di frontend dengan NIK **6050** dan password helpdesk → dapat akses **semua tiket** (list + detail), ubah stage, assign, minta konfirmasi.
- Demo user 1001 / 1002 tidak dipakai (bisa dihapus dari group di Odoo atau dinonaktifkan di backend).

---

## 2. Di Odoo: Jadikan User "fazry" Super Admin (Helpdesk Manager)

Super Admin di API helpdesk ditentukan oleh **group Odoo** `Helpdesk Manager` (biasanya dari modul `odoo_website_helpdesk` atau modul API). User yang masuk group ini akan mendapat `helpdesk_role: super_admin` di response `/auth/me` dan bisa akses semua tiket.

### Langkah (rinci)

1. **Login ke Odoo** sebagai admin (biasanya user yang punya hak "Settings"), database **odoo_development**.
2. **Buka menu Pengaturan (Settings)**.
3. **Users & Companies → Users** (atau cari "Users").
4. **Cari dan buka user "fazry"** (user yang terhubung ke employee fazry).
5. Di form user, cari bagian **"Other"** atau **"Access Rights"** / **"Application access"** (tergantung versi Odoo).
6. **Centang / tambah group "Helpdesk / Manager"** (Helpdesk Manager):
   - Bisa di section **Helpdesk** → pilih **Helpdesk Manager**, atau
   - Di "Application access" cari aplikasi **Helpdesk** dan set **Manager**.
7. **Simpan** user fazry.

Sekarang **res.users "fazry"** punya hak Helpdesk Manager → backend API akan mengembalikan `helpdesk_role: "super_admin"` untuk login dengan NIK 6050 (employee fazry).

---

## 3. Di Odoo: Pastikan Employee "fazry" Bisa Login dari Frontend

Login frontend memakai **NIK (4 digit)** + **Password Helpdesk** yang di-set di **hr.employee**.

### 3.1 NIK dan Username Helpdesk

- Dari screenshot Anda:
  - **NIK (Nomor Induk Karyawan):** `81.0525.6050`
  - **Username Helpdesk (Auto):** `6050` → ini yang dipakai untuk **login** di frontend (4 digit terakhir / bagian yang dipakai API).
- **Login frontend:** gunakan **6050** (bukan 81.0525.6050 penuh) + password helpdesk.

### 3.2 Password Helpdesk

1. Di Odoo, buka **Employees** → pilih **fazry** (employee).
2. Buka tab / section **"PENGATURAN HELPDESK"** (atau "Helpdesk Settings").
3. Isi **Password Helpdesk** dengan password yang ingin dipakai untuk login frontend (misalnya `123` atau `fazry123`).
4. **Simpan** employee.

Catatan: Beberapa implementasi menyimpan password helpdesk terenkripsi di employee; pastikan modul helpdesk_api Anda memakai field yang sama untuk validasi login (NIK 6050 + password ini).

---

## 4. (Opsional) Menghapus / Menonaktifkan Demo Super Admin & Dept Admin

Agar hanya fazry yang jadi Super Admin:

### Opsi A: Hapus dari group di Odoo (tanpa ubah kode backend)

1. **Users** → cari user yang dipakai demo **Super Admin** (biasanya employee dengan NIK 1002).
2. Buka user tersebut → **hapus** akses group **Helpdesk Manager** (uncheck).
3. **Users** → cari user demo **Dept Admin** (NIK 1001) → bila perlu, hapus dari group Helpdesk Manager / Dept Admin sesuai aturan addon Anda.

Setelah itu hanya **fazry** (yang masih dalam group Helpdesk Manager) yang dapat `helpdesk_role: super_admin`.

### Opsi B: Nonaktifkan pembuatan demo user di backend (addon helpdesk_api)

Jika Anda punya akses ke kode addon **helpdesk_api** (biasanya di folder addons/Odoo):

1. Cari tempat demo user dibuat (mis. `post_init_hook`, migration script, atau data XML).
2. **Nonaktifkan** atau **hapus** pembuatan employee/user demo Super Admin (1002) dan Dept Admin (1001), atau
3. Jangan assign mereka ke group Helpdesk Manager.

Setelah upgrade/restart Odoo, demo user tidak lagi punya role admin; tetap pakai **fazry** yang sudah Anda set ke group Helpdesk Manager.

---

## 5. Postman: Agar GET /tickets/34 Tidak 403 (Authentication required)

403 dengan pesan **"Authentication required"** artinya request **tanpa token valid** sampai ke backend. Untuk **GET single ticket** (dan endpoint lain yang butuh auth), token **harus** dikirim di header.

### Langkah rinci di Postman

1. **Login dulu (ambil token)**  
   - **Method:** POST  
   - **URL:** `http://localhost:8072/api/helpdesk/auth/login`  
   - **Body (raw JSON):**
     ```json
     {
       "login": "6050",
       "password": "123"
     }
     ```
     (Ganti `"123"` dengan password helpdesk yang Anda set di employee fazry.)
   - **Send** → dari response, **copy** nilai `access_token` (atau `token`).

2. **GET ticket 34 (dengan token)**  
   - **Method:** GET  
   - **URL:** `http://localhost:8072/api/helpdesk/tickets/34`  
   - **Headers:** tambah header:
     - **Key:** `Authorization`  
     - **Value:** `Bearer <access_token>`  
     (Ganti `<access_token>` dengan token yang di-copy dari langkah 1.)
   - **Send** → harusnya **200** dan isi detail tiket, bukan 403.

3. **Cek di Postman**  
   - Tab **Headers** request GET /tickets/34 harus ada: `Authorization: Bearer ...`.  
   - Jika header ini tidak ada, backend akan mengembalikan 403 "Authentication required".

### Ringkasan

- **Tanpa token** → 403 Authentication required (normal).  
- **Dengan token** (Bearer dari login 6050) → 200 (jika user fazry sudah Super Admin dan tiket 34 ada).

---

## 6. Frontend: Login dan Akses Semua Tiket

1. Buka `http://localhost:3000/login`.
2. **NIK:** `6050`  
3. **Password:** (password helpdesk yang di-set di employee fazry).
4. Login → sidebar harus menampilkan **Super Admin** (atau role tertinggi).
5. **Dashboard** dan **Tickets** → harus bisa lihat semua tiket; klik tiket 34 → **detail** harus terbuka tanpa error "You do not have access to this ticket".

Jika masih 403 di frontend:
- Pastikan proxy API Next.js jalan (request ke `localhost:3000/api/helpdesk/...` diteruskan ke backend dengan **header Authorization**).
- Pastikan setelah login, token tersimpan (localStorage `access_token`) dan dikirim di setiap request (client.ts sudah menambah `Authorization: Bearer ...`).

---

## 7. Checklist Singkat

- [ ] User **fazry** (res.users) ditambahkan ke group **Helpdesk Manager** di Odoo.
- [ ] Employee **fazry** punya **NIK** dan **Username Helpdesk** 6050, serta **Password Helpdesk** diisi dan disimpan.
- [ ] (Opsional) Demo Super Admin / Dept Admin dihapus dari group atau dinonaktifkan di backend.
- [ ] Postman: login dengan 6050 + password → copy token → GET /tickets/34 dengan header `Authorization: Bearer <token>` → dapat 200.
- [ ] Frontend: login 6050 + password → buka daftar tiket dan detail tiket 34 tanpa 403.

Jika semua checklist terpenuhi, **fazry** sudah menjadi satu-satunya Super Admin dan bisa mengelola semua tiket dari frontend dan API.
