const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

module.exports = (db) => {
  // Render registration page
  router.get('/register', (req, res) => {
    const error = req.session.error || null;
    req.session.error = null;
    res.render('register', { error });
  });

  // Handle registration
  router.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      req.session.error = 'All fields are required.';
      return res.redirect('/register');
    }

    if (password.length < 6) {
      req.session.error = 'Password must be at least 6 characters long.';
      return res.redirect('/register');
    }

    // Check if email already exists
    db.query('SELECT * FROM users WHERE user_email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Registration DB error:', err.message);
        req.session.error = 'Registration failed. Please try again later.';
        return res.redirect('/register');
      }

      if (results.length > 0) {
        req.session.error = 'Email already registered.';
        return res.redirect('/register');
      }

      // Hash the password and insert the new user
      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        'INSERT INTO users (user_name, user_email, user_password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        (err2) => {
          if (err2) {
            console.error('Registration DB error:', err2.message);
            req.session.error = 'Registration failed. Please try again later.';
            return res.redirect('/register');
          }
          res.redirect('/login');
        }
      );
    });
  });

  return router;
};
