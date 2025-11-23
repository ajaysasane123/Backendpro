import con from "./utils/db.js";
import bcrypt from "bcrypt";

const employeesToFix = [
  { email: "ajaysasane141@gmail.com", newPass: "Password123" },
  { email: "viju22@gmail.com", newPass: "Password123" },
  { email: "ravi@example.com", newPass: "Password123" }
];

const resetPasswords = async () => {
  for (let emp of employeesToFix) {
    const hashed = await bcrypt.hash(emp.newPass, 10);

    con.query(
      "UPDATE employee SET password = ? WHERE email = ?",
      [hashed, emp.email],
      (err) => {
        if (err) console.log("❌ Error:", err);
        else console.log(`✅ Password reset for ${emp.email}`);
      }
    );
  }
};

resetPasswords();
