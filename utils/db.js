import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const con = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQLPORT,
});

con.connect((err) => {
  if (err) {
    console.log('❌ Connection Error:', err);
  } else {
    console.log('✅ Connected to MySQL Database');
  }
});

export default con;
