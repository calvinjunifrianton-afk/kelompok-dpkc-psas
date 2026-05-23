const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");

const app = express();

app.use(cors());
app.use(express.json());

/* 1. KONEKSI MYSQL */
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "legendfour"
});

db.connect((err) => {
    if (err) {
        console.log("MYSQL ERROR:");
        console.log(err);
    } else {
        console.log("MySQL Connected... (Database Siap)");
    }
});

/* 2. ROUTE REGISTER */
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({
            success: false,
            message: "Data tidak boleh kosong"
        });
    }

    const checkSql = "SELECT * FROM users WHERE username = ?";
    db.query(checkSql, [username], (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ success: false, message: "Database error" });
        }

        if (result.length > 0) {
            return res.json({
                success: false,
                message: "Username sudah terdaftar"
            });
        }

        const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
        db.query(sql, [username, password], (err, result) => {
            if (err) {
                console.log(err);
                return res.json({ success: false, message: "Gagal menyimpan user" });
            } else {
                return res.json({ success: true });
            }
        });
    });
});

/* 3. ROUTE LOGIN */
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(sql, [username, password], (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ success: false, message: "Database error" });
        } else {
            if (result.length > 0) {
                return res.json({ success: true });
            } else {
                return res.json({ success: false, message: "Username atau password salah" });
            }
        }
    });
});

/* 4. KONFIGURASI MIDTRANS SANDBOX */
let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: "Mid-server-JVMEZONd-HQ5g3TKs2opTtu7"
});

/* 5. ROUTE BUAT TOKEN MIDTRANS */
app.post("/token", async (req, res) => {
    const { total } = req.body;

    if (!total || isNaN(total)) {
        return res.status(400).json({ error: "Total harga tidak valid" });
    }

    const parameter = {
        transaction_details: {
            order_id: "ORDER-" + Date.now(),
            gross_amount: Math.round(total)
        }
    };

    try {
        const transaction = await snap.createTransaction(parameter);
        return res.json({
            token: transaction.token
        });
    } catch (error) {
        console.log("Midtrans Error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
});

/* 6. JALANKAN SERVER */
app.listen(3000, () => {
    console.log("Server Legend Four berjalan lancar di port 3000");
});