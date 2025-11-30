
import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const con = mysql.createConnection({
  host: process.env.DB_HOST || process.env.MYSQL_HOST,
  user: process.env.DB_USER || process.env.MYSQLUSER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
  port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
});

con.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Error:", err);
  } else {
    console.log("✅ Connected to MySQL Database");
  }
});

export default con;
