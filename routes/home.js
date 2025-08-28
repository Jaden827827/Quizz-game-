// routes/home.js
const express = require('express');
const router = express.Router();

// Route for Home page
router.get('/', (req, res) => {
  res.render('home', { title: 'Python Pop-Out Challenge: Fast-Answer Pirate Duel' });
});

// Add a route to handle the redirect
router.post('/start', (req, res) => {
  res.redirect('/loginnn'); // Redirect to the login page
});

module.exports = router;
