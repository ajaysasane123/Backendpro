import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,   // ✅ YAHI FINAL FIX HAI
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

con.connect((err) => {
  if (err) {
    console.log('❌ Connection Error:', err);
  } else {
    console.log('✅ Connected to MySQL Database');
  }
});

export default con;
