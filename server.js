const Database = require("better-sqlite3");
const path = require("path");
const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");
require("dotenv").config();

const app = express();

// Middleware agar server bisa diakses dari domain frontend (CORS)
// dan bisa membaca data berformat JSON dari request body
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Server Midtrans jalan!");
});

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
   Ambil server key dari environment variable agar tidak tersimpan di repo
   Windows (CMD/PS): set MIDTRANS_SERVER_KEY=YOUR_KEY
   ========================================================================== */
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

console.log("SERVER KEY:", SERVER_KEY);

if (!SERVER_KEY) {
  console.error("MIDTRANS SERVER KEY BELUM ADA!");
  process.exit(1);
}

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: SERVER_KEY,
});

// Debug singkat biar jelas kenapa Midtrans 500
function midtransAmountToNumber(value) {
  const n = typeof value === "string" ? Number(value.replace(/[^0-9.]/g, "")) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

const CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;

if (!CLIENT_KEY) {
  console.warn("WARNING: MIDTRANS_CLIENT_KEY belum diset (hanya untuk debug frontend). Pastikan MIDTRANS_SERVER_KEY benar.");
}



/* ==========================================================================
   ROUTE LOGIN
   ========================================================================== */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Data tidak boleh kosong" });
  }

  try {
    const user = db.prepare("SELECT id, username, password FROM users WHERE username = ?").get(username);
    if (!user) {
      return res.status(401).json({ success: false, message: "Username atau password salah!" });
    }

    // Password disimpan plaintext sesuai codingan awal
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Username atau password salah!" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Gagal memproses login" });
  }
});

/* ==========================================================================
   ROUTE TOKEN MIDTRANS
   ========================================================================== */
app.post("/token", async (req, res) => {
  try {
    const { total } = req.body;

    const amount = midtransAmountToNumber(total);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Total belanja tidak valid!" });
    }

    const parameter = {
      transaction_details: {
        order_id: "ORDER-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        gross_amount: Math.round(amount),
      },
    };

    console.log("MIDTRANS /token body:", req.body);
    console.log("MIDTRANS /token parameter:", parameter);

    const transaction = await snap.createTransaction(parameter);
    return res.json({ token: transaction.token });
  } catch (error) {
    console.error("Error Midtrans detail:", error);
    console.error("Error Midtrans message:", error?.message);
    console.error("Error Midtrans apiResponse:", error?.ApiResponse);
    return res.status(500).json({
      error: error?.message || "Gagal memproses transaksi ke Midtrans!",
      apiResponse: error?.ApiResponse || null,
      details:
        typeof error === "string"
          ? error
          : JSON.stringify(
              error,
              Object.getOwnPropertyNames(error || {}),
              2
            ),
    });
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

