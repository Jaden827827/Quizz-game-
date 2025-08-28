const express = require('express');
const router = express.Router();

router.get('/admin', (req, res) => {
    if (req.session.loggedin && req.session.user_name === 'admin') {
        res.render('admin');
    } else {
        res.redirect('/login');
    }
});

module.exports = router;