
import express from 'express';
import cors from 'cors';
import { EmployeeRouter } from './Routes/EmployeeRoute.js';
import adminRouter from './Routes/AdminRoute.js';
import Jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:5173',                               // local development
      'https://employee-management-projectpro.netlify.app'  // production frontend (Netlify)
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', adminRouter);
app.use('/admin', adminRouter);
app.use('/employee', EmployeeRouter);

app.use('/Images', express.static(path.join(process.cwd(), 'Public/Images')));

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    Jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.json({ Status: false, Error: 'Wrong Token' });
      req.id = decoded.id;
      req.role = decoded.role;
      next();
    });
  } else {
    return res.json({ Status: false, Error: 'Not authenticated' });
  }
};

app.get('/verify', verifyUser, (req, res) => {
  return res.json({ Status: true, role: req.role, id: req.id });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
