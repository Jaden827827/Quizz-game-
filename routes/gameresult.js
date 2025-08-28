const express = require('express');
const router = express.Router();

module.exports = function(db) {

// Game Result page route
router.get('/', (req, res) => {
    const sessionId = req.query.session_id;
    
    if (!sessionId) {
        return res.redirect('/mainpage');
    }
    
    // Query to get all players in the session with their final scores
    const query = `
        SELECT 
            u.user_id,
            u.user_name,
            p.current_score,
            p.game_started,
            p.session_id
        FROM users u
        INNER JOIN players p ON u.user_id = p.user_id
        WHERE p.session_id = ?
        ORDER BY p.current_score DESC, u.user_name ASC
    `;
    
    db.query(query, [sessionId], (err, results) => {
        if (err) {
            console.error('Error fetching game results:', err);
            return res.redirect('/mainpage');
        }
        
        if (results.length === 0) {
            console.log('No players found for session:', sessionId);
            return res.redirect('/mainpage');
        }
        
        // Check if all players have finished the game (game_started = 2)
        const allPlayersFinished = results.every(player => player.game_started === 2);
        
        if (!allPlayersFinished) {
            // If not all players finished, redirect back to score tracking
            console.log('Game not completed yet, redirecting to score tracking');
            return res.redirect(`/scoretrackingP?session_id=${sessionId}`);
        }
        
        console.log('Game completed! Showing results for session:', sessionId);
        console.log('Players:', results);
        
        res.render('gameresult', {
            title: 'Game Results',
            sessionId: sessionId,
            players: results,
            currentUserName: req.session.user_name || 'Guest'
        });
    });
});

// API endpoint to get game completion status
router.get('/api/status/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    
    const query = `
        SELECT 
            COUNT(*) as total_players,
            SUM(CASE WHEN game_started = 2 THEN 1 ELSE 0 END) as finished_players
        FROM players 
        WHERE session_id = ?
    `;
    
    db.query(query, [sessionId], (err, results) => {
        if (err) {
            console.error('Error checking game status:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const stats = results[0];
        const gameCompleted = stats.total_players > 0 && stats.finished_players === stats.total_players;
        
        res.json({
            gameCompleted: gameCompleted,
            totalPlayers: stats.total_players,
            finishedPlayers: stats.finished_players
        });
    });
});

return router;
};
