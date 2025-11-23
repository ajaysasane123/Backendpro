import bcrypt from 'bcrypt';

const password = 'admin123'; 
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('New hashed password:', hash);
});
