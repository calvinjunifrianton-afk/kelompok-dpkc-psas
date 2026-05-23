const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");

const app = express();

// Middleware agar server bisa diakses dari domain frontend (CORS) 
// dan bisa membaca data berformat JSON dari request body
app.use(cors());
app.use(express.json());

/* ==========================================================================
   1. KONEKSI DATABASE MYSQL
   ========================================================================== */
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "legendfour" // Memastikan data masuk ke database bernama 'legendfour'
});

// Menghubungkan server Node.js ke database MySQL
db.connect((err) => {
    if (err) {
        console.log("MYSQL ERROR:");
        console.log(err);
    } else {
        console.log("MySQL Connected... (Database Siap)");
    }
});

/* ==========================================================================
   2. ROUTE REGISTER (Pendaftaran Akun Baru)
   ========================================================================== */
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    // Validasi dasar agar input data tidak dikirim dalam keadaan kosong
    if (!username || !password) {
        return res.json({
            success: false,
            message: "Data tidak boleh kosong"
        });
    }

    // Tahap 1: Cek apakah username yang diinput sudah dipakai orang lain atau belum
    const checkSql = "SELECT * FROM users WHERE username = ?";
    db.query(checkSql, [username], (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ success: false, message: "Database error" });
        }

        // Jika data ditemukan (> 0), hentikan proses pendaftaran
        if (result.length > 0) {
            return res.json({
                success: false,
                message: "Username sudah terdaftar"
            });
        }

        // Tahap 2: Jika lolos cek, masukkan data username & password baru ke tabel 'users'
        const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
        db.query(sql, [username, password], (err, result) => {
            if (err) {
                console.log(err);
                return res.json({ success: false, message: "Gagal menyimpan user" });
            } else {
                return res.json({ success: true }); // Mengirim respon sukses ke frontend
            }
        });
    });
});

/* ==========================================================================
   ROUTE TOKEN & DATABASE (Hasil Gabungan yang Benar)
   ========================================================================== */
app.post("/token", async (req, res) => {
    try {
        // 1. Ambil data dari request body
        // Pastikan frontend mengirimkan data ini
        const { username, nama_produk, harga, jumlah, total } = req.body;

        // Validasi dasar
        if (!total || total <= 0) {
            return res.status(400).json({ error: "Total belanja tidak valid!" });
        }

        // 2. Simpan ke Database MySQL terlebih dahulu
        const sql = "INSERT INTO transaksi (username, nama_produk, harga, jumlah, total_harga) VALUES (?, ?, ?, ?, ?)";
        
        // Kita gunakan promise agar lebih rapi dengan async/await
        db.query(sql, [username || 'Guest', nama_produk || 'Top Up Game', harga || total, jumlah || 1, total], (err, result) => {
            if (err) {
                console.error("❌ Gagal masuk database:", err);
                return res.status(500).json({ error: "Gagal menyimpan transaksi" });
            }
            console.log("✅ Data transaksi tersimpan dengan ID:", result.insertId);
        });

        // 3. Persiapan ke Midtrans
        const orderId = "ORDER-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
        
        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: Math.round(total)
            }
        };

        // 4. Meminta snap token ke Midtrans
        const transaction = await snap.createTransaction(parameter);
        
        // 5. Kirim token ke frontend
        return res.json({ token: transaction.token });

    } catch (error) {
        console.error("Error Midtrans:", error);
        return res.status(500).json({ error: "Gagal memproses transaksi ke Midtrans!" });
    }
});

// Ambil server key dari environment variable agar tidak tersimpan di repo
// Windows (CMD/PS): set MIDTRANS_SERVER_KEY=YOUR_KEY
let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY
});
/* ==========================================================================
   5. ROUTE BUAT TOKEN MIDTRANS (Proses Pembuatan Nota Pembayaran/Checkout)
   ========================================================================== */
app.post("/token", async (req, res) => {
    try {
        const { total } = req.body;

        // Validasi jika total belanja kosong atau tidak valid
        if (!total || total <= 0) {
            return res.status(400).json({ error: "Total belanja tidak valid!" });
        }

        // Menyusun parameter pesanan untuk dikirim ke API Midtrans
        const parameter = {
            transaction_details: {
                // Digabung dengan timestap dan angka acak agar Order ID selalu unik 
                order_id: "ORDER-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                gross_amount: Math.round(total)
            }
        };

        // Meminta snap token pembayaran ke server Midtrans
        const transaction = await snap.createTransaction(parameter);
        
        // Kirim token sukses ke frontend
        return res.json({ token: transaction.token });

    } catch (error) {
       console.error(error.ApiResponse);
        // Mengembalikan status 500 jika ada kendala otentikasi kunci di Midtrans
        return res.status(500).json({ error: "Gagal memproses transaksi ke Midtrans!" });
    }
});

/* ==========================================================================
   6. JALANKAN SERVER
   ========================================================================== */
app.listen(3000, () => {
    console.log("===============================================");
    console.log("  Server Legend Four Berjalan Mulus di Port 3000");
    console.log("===============================================");
});