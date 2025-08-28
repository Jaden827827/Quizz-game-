const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Ljx778945@',
  database: 'assignment'
});

router.get('/', async (req, res) => {
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

router.post('/delete/:id', async (req, res) => {
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