import express from 'express';
import con from '../utils/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';

const router = express.Router();


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/images'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });


router.post('/adminlogin', (req, res) => {
  const sql = 'SELECT * FROM admin WHERE email=?';
  con.query(sql, [req.body.email], (err, result) => {
    if (err) return res.json({ loginStatus: false, Error: 'DB Error' });
    if (result.length === 0)
      return res.json({ loginStatus: false, Error: 'Wrong Email' });

    const admin = result[0];
    bcrypt.compare(req.body.password, admin.password, (err, isMatch) => {
      if (err) return res.json({ loginStatus: false, Error: 'Server Error' });
      if (!isMatch)
        return res.json({ loginStatus: false, Error: 'Wrong Password' });

      const token = jwt.sign(
        { role: 'admin', email: admin.email, id: admin.id },
        'jwt_secret_key',
        { expiresIn: '1d' }
      );

      res.cookie('token', token, { httpOnly: true });
      res.json({ loginStatus: true });

     
      console.log(`Admin logged in: ${admin.name} (ID: ${admin.id})`);
    });
  });
});


router.get('/dashboard/summary', (req, res) => {
  const summary = {
    totalAdmins: 0,
    totalEmployees: 0,
    totalSalary: 0,
    adminList: [],
  };

  con.query('SELECT id,email FROM admin', (err, admins) => {
    if (err) return res.json({ Status: false, Error: err.message });
    summary.totalAdmins = admins.length;
    summary.adminList = admins;

    con.query(
      'SELECT COUNT(*) AS totalEmp, IFNULL(SUM(salary),0) AS totalSal FROM employee',
      (err2, empResult) => {
        if (err2) return res.json({ Status: false, Error: err2.message });
        summary.totalEmployees = empResult[0].totalEmp;
        summary.totalSalary = empResult[0].totalSal;

        res.json({ Status: true, Result: summary });
      }
    );
  });
});


router.get('/admin_profile', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ Status: false, Error: 'Not logged in' });

  jwt.verify(token, 'jwt_secret_key', (err, decoded) => {
    if (err) return res.json({ Status: false, Error: 'Invalid token' });

    const sql =
      'SELECT id, name AS fullname, email, image, created_at FROM admin WHERE id=?';
    con.query(sql, [decoded.id], (err2, result) => {
      if (err2) return res.json({ Status: false, Error: err2.message });
      if (result.length === 0)
        return res.json({ Status: false, Error: 'Admin not found' });

      res.json({ Status: true, Result: result[0] });
    });
  });
});

router.put('/update-admin', (req, res) => {
  const { admin_id, fullname, email, password, image } = req.body;

  let updateSql = `
    UPDATE admin 
    SET fullname = ?, email = ?, image = ?
    WHERE id = ?
  `;

  const updateValues = [fullname, email, image, admin_id];

 
  if (password && password !== '') {
    const hashedPassword = bcrypt.hashSync(password, 10);
    updateSql = `
      UPDATE admin 
      SET fullname = ?, email = ?, image = ?, password = ?
      WHERE id = ?
    `;
    updateValues.splice(3, 0, hashedPassword); // Insert password
  }

  con.query(updateSql, updateValues, (err, result) => {
    if (err) return res.json({ Status: 'Error', Error: err });

    return res.json({
      Status: 'Success',
      message: 'Profile updated successfully',
    });
  });
});

router.put('/update_admin_profile', upload.single('image'), (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ Status: false, Error: 'Not logged in' });

  jwt.verify(token, 'jwt_secret_key', async (err, decoded) => {
    if (err) return res.json({ Status: false, Error: 'Invalid token' });

    const adminId = decoded.id;
    const { fullname, email, password } = req.body;
    const image = req.file ? req.file.filename : null;

    // Prepare the fields to update
    const updates = ['name = ?', 'email = ?'];
    const values = [fullname, email];

    if (password && password.trim() !== '') {
      const hashed = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashed);
    }

    if (image) {
      updates.push('image = ?');
      values.push(image);
    }

    values.push(adminId);

    const sqlUpdate = `UPDATE admin SET ${updates.join(', ')} WHERE id = ?`;

    con.query(sqlUpdate, values, (err2) => {
      if (err2) return res.json({ Status: false, Error: err2 });

      const sqlSelect =
        'SELECT id, name AS fullname, email, image, created_at FROM admin WHERE id = ?';
      con.query(sqlSelect, [adminId], (err3, result) => {
        if (err3) return res.json({ Status: false, Error: err3 });
        res.json({ Status: true, Result: result[0] });
      });
    });
  });
});


router.get('/admin_records', (req, res) => {
  con.query('SELECT id,email FROM admin', (err, result) =>
    res.json({ Status: !err, Result: result || [] })
  );
});
router.get('/admin_count', (req, res) => {
  con.query('SELECT COUNT(*) AS admin FROM admin', (err, result) =>
    res.json({ Status: !err, Result: result || [] })
  );
});
router.get('/employee_count', (req, res) => {
  con.query('SELECT COUNT(*) AS employee FROM employee', (err, result) =>
    res.json({ Status: !err, Result: result || [] })
  );
});
router.get('/salary_count', (req, res) => {
  con.query(
    'SELECT IFNULL(SUM(salary),0) AS salaryOFEmp FROM employee',
    (err, result) => res.json({ Status: !err, Result: result || [] })
  );
});


router.get('/employee', (req, res) => {
  const sql = `
    SELECT e.*, c.name AS category_name
    FROM employee e
    LEFT JOIN category c ON e.category_id = c.id
  `;
  con.query(sql, (err, result) =>
    res.json({ Status: !err, Result: result || [] })
  );
});

router.get('/employee/:id', (req, res) => {
  const sql = `
    SELECT e.*, c.name AS category_name
    FROM employee e
    LEFT JOIN category c ON e.category_id = c.id
    WHERE e.id=?
  `;
  con.query(sql, [req.params.id], (err, result) => {
    if (err || result.length === 0)
      return res.json({ Status: false, Error: 'Not found' });
    res.json({ Status: true, Result: result[0] });
  });
});

router.post('/add_employee', upload.single('image'), (req, res) => {
  const { name, email, password, salary, address, category_id } = req.body;
  const image = req.file?.filename || null;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.json({ Status: false });
    const sql =
      'INSERT INTO employee(name,email,password,salary,address,category_id,image) VALUES(?,?,?,?,?,?,?)';
    con.query(
      sql,
      [name, email, hash, salary, address, category_id, image],
      (err) => res.json({ Status: !err })
    );
  });
});

router.post('/edit_employee/:id', upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { name, email, salary, address, category_id, password } = req.body;
  const image = req.file?.filename || null;

  const updates = [];
  const params = [];

  if (name) updates.push('name=?'), params.push(name);
  if (email) updates.push('email=?'), params.push(email);
  if (salary) updates.push('salary=?'), params.push(salary);
  if (address) updates.push('address=?'), params.push(address);
  updates.push('category_id=?'), params.push(category_id || null);
  if (image) updates.push('image=?'), params.push(image);

  const finalize = (hash = null) => {
    if (hash) updates.push('password=?'), params.push(hash);
    const sql = `UPDATE employee SET ${updates.join(', ')} WHERE id=?`;
    params.push(id);
    con.query(sql, params, (err) =>
      res.json({
        Status: !err,
        Message: err ? err.message : 'Employee updated',
      })
    );
  };

  if (password)
    bcrypt.hash(password, 10, (err, hash) =>
      err ? res.json({ Status: false }) : finalize(hash)
    );
  else finalize();
});

router.delete('/delete_employee/:id', (req, res) => {
  con.query('DELETE FROM employee WHERE id=?', [req.params.id], (err) =>
    res.json({ Status: !err })
  );
});


router.get('/category', (req, res) => {
  con.query('SELECT * FROM category', (err, result) =>
    res.json({ Status: !err, Result: result || [] })
  );
});
router.post('/add_category', (req, res) => {
  const { category } = req.body;
  if (!category) return res.json({ Status: false, Error: 'Category required' });
  con.query('INSERT INTO category(name) VALUES(?)', [category], (err) =>
    res.json({ Status: !err })
  );
});
router.delete('/delete_category/:id', (req, res) => {
  con.query('DELETE FROM category WHERE id=?', [req.params.id], (err) =>
    res.json({ Status: !err })
  );
});



router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ Status: true });
});





router.get('/salary_history', (req, res) => {
  const sql = `
    SELECT sh.id, e.name AS employee_name, sh.amount, sh.payment_date
    FROM salary_history sh
    LEFT JOIN employee e ON sh.employee_id = e.id
    ORDER BY sh.payment_date DESC
  `;
  con.query(sql, (err, result) =>
    res.json({ Status: !err, Result: result || [] })
  );
});

router.get('/attendance_records', (req, res) => {
  const sql = `
    SELECT a.id, e.name AS employee_name, a.date, a.status
    FROM attendance a
    LEFT JOIN employee e ON a.employee_id = e.id
    ORDER BY a.date DESC
  `;
  con.query(sql, (err, result) =>
    res.json({ Status: !err, Result: result || [] })
  );
});

router.get('/dashboard/attendance_count', (req, res) => {
  const sql = 'SELECT COUNT(*) AS totalAttendance FROM attendance';
  con.query(sql, (err, result) => {
    if (err) return res.json({ Status: false, Error: err.message });
    res.json({ Status: true, Result: result[0] });
  });
});

export default router;
