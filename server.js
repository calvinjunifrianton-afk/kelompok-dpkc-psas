const Database = require("better-sqlite3");
const path = require("path");
const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");

const app = express();

// Middleware agar server bisa diakses dari domain frontend (CORS)
// dan bisa membaca data berformat JSON dari request body
app.use(cors());
app.use(express.json());

/* ==========================================================================
   1. KONEKSI DATABASE SQLITE
   ========================================================================== */
const dbPath = path.join(__dirname, "legendfour.sqlite");
const db = new Database(dbPath);

// Pastikan tabel users ada
// Schema: id (PK), username (unique), password (teks apa adanya seperti original)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
`);

/* ==========================================================================
   2. ROUTE REGISTER (Pendaftaran Akun Baru)
   ========================================================================== */
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  // Validasi dasar agar input data tidak dikirim dalam keadaan kosong
  if (!username || !password) {
    return res.json({
      success: false,
      message: "Data tidak boleh kosong",
    });
  }

  try {
    // Cek apakah username sudah terdaftar
    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (existing) {
      return res.json({ success: false, message: "Username sudah terdaftar" });
    }

    // Insert user baru
    db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, password);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Gagal menyimpan user" });
  }
});

/* ==========================================================================
   3. ROUTE LOGIN
   ========================================================================== */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, message: "Data tidak boleh kosong" });
  }

  try {
    const user = db
      .prepare("SELECT id FROM users WHERE username = ? AND password = ?")
      .get(username, password);

    if (user) {
      return res.json({ success: true, message: "Login berhasil" });
    }

    return res.json({ success: false, message: "Username atau password salah" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

/* ==========================================================================
   Ambil server key dari environment variable agar tidak tersimpan di repo
   Windows (CMD/PS): set MIDTRANS_SERVER_KEY=YOUR_KEY
   ========================================================================== */
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

/* ==========================================================================
   ROUTE TOKEN MIDTRANS
   ========================================================================== */
app.post("/token", async (req, res) => {
  try {
    const { total } = req.body;

    if (!total || total <= 0) {
      return res.status(400).json({ error: "Total belanja tidak valid!" });
    }

    const parameter = {
      transaction_details: {
        order_id: "ORDER-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        gross_amount: Math.round(total),
      },
    };

    const transaction = await snap.createTransaction(parameter);
    return res.json({ token: transaction.token });
  } catch (error) {
    console.error("Error Midtrans:", error);
    return res.status(500).json({ error: "Gagal memproses transaksi ke Midtrans!" });
  }
});

/* ==========================================================================
   JALANKAN SERVER
   ========================================================================== */
app.listen(3000, () => {
  console.log("===============================================");
  console.log("  Server Legend Four Berjalan Mulus di Port 3000");
  console.log("===============================================");
});

