const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");

const app = express();

app.use(cors());
app.use(express.json());

/* MYSQL */
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "legendfour"
});

db.connect((err) => {

    if(err){

        console.log("MYSQL ERROR");
        console.log(err);

    }else{

        console.log("MySQL Connected");

    }

});

/* REGISTER */
app.post("/register", (req, res) => {

    const { username, password } = req.body;

    if(!username || !password){

        return res.json({
            success: false,
            message: "Data kosong"
        });

    }

    const checkSql =
    "SELECT * FROM users WHERE username=?";

    db.query(checkSql,[username],(err,result)=>{

        if(err){

            console.log(err);

            return res.json({
                success:false
            });

        }

        if(result.length > 0){

            return res.json({
                success:false,
                message:"Username sudah ada"
            });

        }

        const sql =
        "INSERT INTO users(username,password) VALUES(?,?)";

        db.query(sql,[username,password],(err,result)=>{

            if(err){

                console.log(err);

                res.json({
                    success:false
                });

            }else{

                res.json({
                    success:true
                });

            }

        });

    });

});

/* LOGIN */
app.post("/login",(req,res)=>{

    const { username,password } = req.body;

    const sql =
    "SELECT * FROM users WHERE username=? AND password=?";

    db.query(sql,[username,password],(err,result)=>{

        if(err){

            console.log(err);

            res.json({
                success:false
            });

        }else{

            if(result.length > 0){

                res.json({
                    success:true
                });

            }else{

                res.json({
                    success:false
                });

            }

        }

    });

});

let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY
});

/* TOKEN */
app.post("/token", async (req, res) => {

    const { total } = req.body;

    const parameter = {
        transaction_details: {
            order_id: "ORDER-" + Date.now(),
            gross_amount: total
        }
    };

    try {

        const transaction =
        await snap.createTransaction(parameter);

        res.json({
            token: transaction.token
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            error: error.message
        });

    }

});

/* SERVER */
app.listen(3000, () => {

    console.log("Server jalan di port 3000");

});