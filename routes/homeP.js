// routes/homeP.js
const express = require('express');
const router = express.Router();

// Route for Home page
router.get('/', (req, res) => {
  console.log('HomeP route accessed!');
  try {
    res.render('homeP', { title: 'Python Pop-Out Challenge: Fast-Answer Pirate Duel' });
  } catch (error) {
    console.error('Error rendering homeP:', error);
    res.status(500).send('Error rendering homeP page');
  }
});

// Add a route to handle the redirect
router.post('/start', (req, res) => {
  res.redirect('/loginjoinP'); // Redirect to the login page
});

module.exports = router;
