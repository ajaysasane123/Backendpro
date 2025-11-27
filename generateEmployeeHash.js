import con from './utils/db.js';
import bcrypt from 'bcryptjs';

const fixPasswords = async () => {
  con.query('SELECT id, password FROM employee', async (err, result) => {
    if (err) {
      console.log('Error fetching employees:', err);
      return;
    }

    for (const emp of result) {
      const pass = emp.password;

      if (pass.startsWith('$2b$')) {
        console.log(`Already hashed: ID ${emp.id}`);
        continue;
      }

      try {
        const hashed = await bcrypt.hash(pass, 10);

        await new Promise((resolve, reject) => {
          con.query(
            'UPDATE employee SET password = ? WHERE id = ?',
            [hashed, emp.id],
            (err) => {
              if (err) {
                console.log(`Update error for ID ${emp.id}:`, err);
                reject(err);
              } else {
                console.log(`Password fixed for employee ID: ${emp.id}`);
                resolve();
              }
            }
          );
        });
      } catch (error) {
        console.log('Hashing error:', error);
      }
    }

    console.log('All passwords processed.');
  });
};

fixPasswords();
