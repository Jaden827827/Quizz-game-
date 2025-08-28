app.get('/game/:session_id', (req, res) => {
    const sessionId = req.params.session_id;

    // Check if the session exists and the user is logged in
    if (req.session.loggedin) {
        // Here you can fetch more session data or game data if needed
        console.log(`Starting game for session ID: ${sessionId}`);
        
        // Render the game page or handle game logic
        res.render('game', { session_id: sessionId });
    } else {
        // If not logged in, redirect to login page
        res.redirect('/login');
    }
});
