const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('rules', { title: 'Game Rules' });
});


module.exports = router;
