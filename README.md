# Galeri Harmonisasi Fummy

Aplikasi toko kue sederhana untuk localhost. Frontend memakai HTML, CSS, dan JavaScript; server memakai Node.js dan SQLite bawaan Node. Tidak perlu npm install.

## Menjalankan

```powershell
node server.js
```

Buka http://127.0.0.1:3000. Untuk port lain: `$env:PORT=3001; node server.js`.

Panel admin: http://127.0.0.1:3000/admin/login. Kata sandi awal **admin123**. Ganti sebelum digunakan bersama orang lain:

```powershell
$env:ADMIN_PASSWORD='kata-sandi-baru-yang-panjang'
node server.js
```

Data otomatis tersimpan di `data/fummy.sqlite`. Produk, kategori, galeri, pesanan, dan pesan kontak dapat diubah melalui aplikasi. Pesanan memakai metode transfer, dompet digital, atau bayar di tempat sebagai **simulasi**; tidak ada pembayaran riil atau payment gateway.

## Halaman

Beranda, katalog, galeri, favorit, promo, keranjang, checkout, pesanan, 6 halaman kategori, 12 halaman produk, tentang, kontak, FAQ, cara pesan, pengiriman, pembayaran, retur, privasi, syarat, serta 10 halaman admin. Semua tautan internal dibangun dari rute yang ditangani server.
