// At the top of your file (only once)
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Ljx778945@',
  database: 'assignment'
});

// --- User Management Routes ---
router.get('/user-management', async (req, res) => {
  if (req.session.loggedin && req.session.user_name === 'admin') {
    try {
      const [rows] = await db.execute('SELECT * FROM users');
      res.render('user-management', { users: rows });
    } catch (err) {
      console.error('Error fetching users:', err.message);
      res.render('user-management', { error: 'Error fetching users.' });
    }
  } else {
    res.redirect('/login');
  }
});

router.post('/user-management/delete/:id', async (req, res) => {
  if (req.session.loggedin && req.session.user_name === 'admin') {
    const { id } = req.params;

    try {
      const connection = await db.getConnection(); // Get one connection from pool

      try {
        await connection.beginTransaction();

        // Step 1: Delete all players linked to the user
        await connection.execute('DELETE FROM players WHERE user_id = ?', [id]);

        // Step 2: Delete the user
        await connection.execute('DELETE FROM users WHERE user_id = ?', [id]);

        await connection.commit();
        res.redirect('/user-management');
      } catch (err) {
        await connection.rollback();
        console.error('Error during deletion transaction:', err.message);
        res.redirect('/user-management?error=Error deleting user. Make sure the user is not linked to any players.');
      } finally {
        connection.release();
      }
    } catch (err) {
      console.error('DB connection error:', err.message);
      res.redirect('/user-management?error=Database connection error.');
    }
  } else {
    res.redirect('/login');
  }
});

// --- Question Management Routes ---
router.get('/question-management', async (req, res) => {
  if (req.session.loggedin && req.session.user_name === 'admin') {
    try {
      const [rows] = await db.execute('SELECT * FROM question');
      res.render('question-management', { questions: rows });
    } catch (err) {
      console.error('Error fetching questions:', err.message);
      res.render('question-management', { error: 'Error fetching questions.' });
    }
  } else {
    res.redirect('/login');
  }
});

router.post('/question-management/delete/:id', async (req, res) => {
  if (req.session.loggedin && req.session.user_name === 'admin') {
    try {
      const { id } = req.params;
      await db.execute('DELETE FROM question WHERE question_id = ?', [id]);
      res.redirect('/question-management');
    } catch (err) {
      console.error('Error deleting question:', err.message);
      res.redirect('/question-management?error=Error deleting question.');
    }
  } else {
    res.redirect('/login');
  }
});

module.exports = router;
