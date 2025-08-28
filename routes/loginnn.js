const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // ✅ Import bcrypt
const mysql = require('mysql2/promise');  // Import mysql2 promise API

// Create a connection pool directly in this file
const db = mysql.createPool({
  host: 'localhost',          // Your MySQL host (use 'localhost' if running locally)
  user: 'root',               // MySQL username
  password: 'Ljx778945@',     // MySQL password
  database: 'assignment'      // Your MySQL database name
});

// Test the database connection
async function testConnection() {
  try {
    await db.getConnection();  // Test if the connection works
    console.log('Database connection successful!');
  } catch (error) {
    console.error('Database connection error:', error.message);
  }
}

testConnection();  // Ensure that the connection is successful

module.exports = () => {
  // Render login page
  router.get('/login', (req, res) => {
    const error = req.session.error;
    req.session.error = null;
    res.render('login', { error });
  });

  // Handle login
  router.post('/login', async (req, res) => {
    const { user_email, user_password } = req.body;

    if (user_email === 'admin@gmail.com' && user_password === 'admin') {
      req.session.loggedin = true;
      req.session.user_name = 'admin';
      return res.redirect('/admin');
    }

    if (!user_email || !user_password) {
      return res.render('login', { error: 'Please enter Email and Password!' });
    }

    try {
      // Fetch user by email only
      const [results] = await db.execute('SELECT * FROM users WHERE user_email = ?', [user_email]);

      if (results.length === 0) {
        return res.render('login', { error: 'Incorrect Email or Password!' });
      }

      const user = results[0];

      // Compare password using bcrypt
      const passwordMatch = await bcrypt.compare(user_password, user.user_password);
      if (passwordMatch) {
        req.session.loggedin = true;
        req.session.user_email = user_email;
        req.session.user_id = user.user_id;
        req.session.user_name = user.user_name;
        return res.redirect('/mainpage');
      } else {
        return res.render('login', { error: 'Incorrect Email or Password!' });
      }
    } catch (err) {
      console.error('Database query error:', err.message);
      return res.render('login', { error: 'An error occurred during login. Please try again later.' });
    }
  });

  // Logout
  router.get('/logout', (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/login');
      });
    }
  });

  return router;
};
