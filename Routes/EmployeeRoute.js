import express from 'express';
import con from '../utils/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';

const router = express.Router();


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Public/Images');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  },
});

const upload = multer({ storage: storage });


router.post('/employee_login', (req, res) => {
  const sql = 'SELECT * from employee Where email = ?';

  con.query(sql, [req.body.email], (err, result) => {
    if (err) return res.json({ loginStatus: false, Error: 'Query error' });

    if (result.length > 0) {
      bcrypt.compare(req.body.password, result[0].password, (err, response) => {
        if (err)
          return res.json({ loginStatus: false, Error: 'Wrong Password' });

        if (response) {
          const email = result[0].email;
          const token = jwt.sign(
            { role: 'employee', email: email, id: result[0].id },
            'jwt_secret_key',
            { expiresIn: '1d' }
          );

          res.cookie('token', token);


          console.log(
            `Employee logged in: ${result[0].name} (ID: ${result[0].id})`
          );

          return res.json({ loginStatus: true, id: result[0].id });
        }
      });
    } else {
      return res.json({ loginStatus: false, Error: 'wrong email or password' });
    }
  });
});

router.get('/admin-profile/:id', (req, res) => {
  const sql = 'SELECT * FROM admin WHERE id = ?';
  con.query(sql, [req.params.id], (err, result) => {
    if (err) return res.json({ Error: err });
    return res.json(result[0]);
  });
});


router.get('/detail/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM employee where id = ?';

  con.query(sql, [id], (err, result) => {
    if (err) return res.json({ Status: false });
    return res.json(result);
  });
});


router.get('/attendance_records', (req, res) => {
  const sql = `
        SELECT attendance.id, employee.name AS employee_name, attendance.date, attendance.status
        FROM attendance
        JOIN employee ON attendance.employee_id = employee.id
        ORDER BY attendance.date DESC
    `;
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});


router.post('/attendance', (req, res) => {
  const { employee_id, date, status } = req.body;

  const checkSql =
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ?';

  con.query(checkSql, [employee_id, date], (err, result) => {
    if (err) return res.json({ Status: false, Error: err });

    if (result.length > 0) {
      const updateSql =
        'UPDATE attendance SET status = ? WHERE employee_id = ? AND date = ?';
      con.query(updateSql, [status, employee_id, date], (err2) => {
        if (err2) return res.json({ Status: false, Error: err2 });
        return res.json({
          Status: true,
          Message: 'Attendance updated successfully',
        });
      });
    } else {
      const insertSql =
        'INSERT INTO attendance (employee_id, date, status) VALUES (?, ?, ?)';
      con.query(insertSql, [employee_id, date, status], (err3) => {
        if (err3) return res.json({ Status: false, Error: err3 });
        return res.json({
          Status: true,
          Message: 'Attendance added successfully',
        });
      });
    }
  });
});


router.get('/employee_list', (req, res) => {
  const sql = 'SELECT id, name FROM employee';

  con.query(sql, (err, result) => {
    if (err) {
      console.log('Employee list fetch error:', err);
      return res.json({ Status: false, Error: err });
    }
    return res.json(result || []);
  });
});



router.get('/salary_history', (req, res) => {
  let sql = `
        SELECT sh.id, e.name AS employee_name, sh.amount, sh.month, sh.year, sh.paid_on
        FROM salary_history sh
        JOIN employee e ON sh.employee_id = e.id
    `;

  const params = [];

  if (req.query.employee_id) {
    sql += ' WHERE sh.employee_id = ?';
    params.push(req.query.employee_id);
  }

  sql += ' ORDER BY sh.paid_on DESC';

  con.query(sql, params, (err, result) => {
    if (err) return res.json({ Status: false, Error: err });
    return res.json({ Status: true, Result: result });
  });
});


router.get('/logout', (req, res) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, 'jwt_secret_key', (err, decoded) => {
      if (!err) {
        console.log(
          `Employee logged out: ${decoded.email} (ID: ${decoded.id})`
        );
      } else {
        f;
        console.log('Employee logged out (invalid token)');
      }
    });
  } else {
    console.log('Employee logged out (no token)');
  }

  res.clearCookie('token');
  return res.json({ Status: true });
});

router.post(
  '/update_profile/:id',
  upload.single('profileImage'),
  async (req, res) => {
    try {
      const id = req.params.id;
      const { fullname, password } = req.body;

      let profileImage = null;
      if (req.file) {
        profileImage = '/Images/' + req.file.filename;
      }

      let fields = [];
      let values = [];

      if (fullname) {
        fields.push('name = ?');
        values.push(fullname);
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        fields.push('password = ?');
        values.push(hashedPassword);
      }

      if (profileImage) {
        fields.push('profileImage = ?');
        values.push(profileImage);
      }

      if (fields.length === 0) {
        return res.json({ Status: false, Error: 'No fields to update' });
      }

      values.push(id);

      const sql = `UPDATE employee SET ${fields.join(', ')} WHERE id = ?`;

      con.query(sql, values, (err) => {
        if (err) return res.json({ Status: false, Error: err });

     
        let updatedFields = [];
        if (fullname) updatedFields.push('name');
        if (password) updatedFields.push('password');
        if (profileImage) updatedFields.push('profileImage');
        console.log(`Employee (ID: ${id}) updated profile fields: ${updatedFields.join(', ')}`);

        return res.json({
          Status: true,
          Message: 'Profile updated successfully',
        });
      });
    } catch (error) {
      return res.json({ Status: false, Error: error.message });
    }
  }
);


router.post(
  '/update_admin/:id',
  upload.single('profileImage'),
  async (req, res) => {
    try {
      const id = req.params.id;
      const { fullname, email, password } = req.body;

      let profileImage = req.file ? '/Images/' + req.file.filename : null;

      let fields = [];
      let values = [];

      if (fullname) {
        fields.push('name = ?');
        values.push(fullname);
      }

      if (email) {
        fields.push('email = ?');
        values.push(email);
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        fields.push('password = ?');
        values.push(hashedPassword);
      }

      if (profileImage) {
        fields.push('profileImage = ?');
        values.push(profileImage);
      }

      if (fields.length === 0) {
        return res.json({ Status: false, Error: 'No fields to update' });
      }

      values.push(id);
      const sql = `UPDATE admin SET ${fields.join(', ')} WHERE id = ?`;

      con.query(sql, values, (err) => {
        if (err) return res.json({ Status: false, Error: err });

        // 🔥 Log admin profile update in terminal
        let updatedFields = [];
        if (fullname) updatedFields.push('name');
        if (email) updatedFields.push('email');
        if (password) updatedFields.push('password');
        if (profileImage) updatedFields.push('profileImage');
        console.log(`Admin (ID: ${id}) updated profile fields: ${updatedFields.join(', ')}`);

        return res.json({
          Status: true,
          Message: 'Admin profile updated successfully',
        });
      });
    } catch (error) {
      return res.json({ Status: false, Error: error.message });
    }
  }
);





router.put('/update_profile/:id', upload.single('image'), (req, res) => {
  const id = req.params.id;

  const fullname = req.body.fullname;
  const password = req.body.password;

  let imagePath = req.file
    ? `/Images/${req.file.filename}`
    : req.body.existingImage;

  const sql = `
      UPDATE employee 
      SET fullname = ?, password = ?, image = ?
      WHERE id = ?
  `;

  con.query(sql, [fullname, password, imagePath, id], (err, result) => {
    if (err) return res.json({ Status: false, Error: 'Update failed', err });
    return res.json({
      Status: true,
      Message: 'Profile updated',
      path: imagePath,
    });
  });
});

export { router as EmployeeRouter }