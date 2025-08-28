const express = require('express');
const router = express.Router();

module.exports = (db, io) => {
  // GET route for scoretrackingP page
  router.get('/', (req, res) => {
    const sessionId = req.query.session_id;
    
    if (!sessionId) {
      req.session.error = 'Session ID is required.';
      return res.redirect('/waitingroomP');
    }

    // Verify user is logged in
    if (!req.session.loggedin) {
      req.session.error = 'Please login first.';
      return res.redirect('/loginjoinP');
    }

    const userName = req.session.user_name;

    // Get current user's ID
    const getCurrentUserId = () => {
      return new Promise((resolve, reject) => {
        const sql = 'SELECT user_id FROM users WHERE user_name = ?';
        db.query(sql, [userName], (err, results) => {
          if (err) {
            return reject('Error fetching current user ID');
          }
          if (results.length > 0) {
            resolve(results[0].user_id);
          } else {
            reject('Current user not found');
          }
        });
      });
    };

    // Check if all players have finished the game
    const checkAllFinishedQuery = `
      SELECT 
        COUNT(*) as total_players,
        SUM(CASE WHEN game_started = 2 THEN 1 ELSE 0 END) as finished_players,
        SUM(CASE WHEN game_started = 1 THEN 1 ELSE 0 END) as playing_players,
        SUM(CASE WHEN game_started = 0 THEN 1 ELSE 0 END) as waiting_players
      FROM players 
      WHERE session_id = ?
    `;
    
    db.query(checkAllFinishedQuery, [sessionId], (err, allPlayersResult) => {
      if (err) {
        console.error('Error checking all players status:', err);
        req.session.error = 'Failed to check game completion status.';
        return res.redirect('/waitingroomP');
      }
      
      if (allPlayersResult.length === 0) {
        req.session.error = 'No players found in this session.';
        return res.redirect('/waitingroomP');
      }
      
      const stats = allPlayersResult[0];
      const allPlayersFinished = stats.total_players > 0 && stats.finished_players === stats.total_players;
      const gameInProgress = stats.playing_players > 0;
      const gameNotStarted = stats.waiting_players === stats.total_players;
      
      console.log('Game status check for session:', sessionId);
      console.log('Total players:', stats.total_players);
      console.log('Finished players:', stats.finished_players);
      console.log('Playing players:', stats.playing_players);
      console.log('Waiting players:', stats.waiting_players);
      
      // If all players have finished, redirect to gameresult
      if (allPlayersFinished) {
        console.log('All players finished, redirecting to gameresult page for session:', sessionId);
        return res.redirect(`/gameresult?session_id=${sessionId}`);
      }
      
      // Check if game hasn't started yet - redirect to waitingroom
      if (gameNotStarted) {
        req.session.error = 'Game has not started yet.';
        return res.redirect('/waitingroomP');
      }
      
      // If game is in progress or mixed states, continue to scoretracking page
      console.log('Game in progress, showing scoretracking page for session:', sessionId);

      // Get current user ID first, then get all players
      getCurrentUserId()
        .then((currentUserId) => {
          // Get all players in this session with their scores calculated from questionattempts + players table score
          const getPlayersQuery = `
            SELECT 
              p.user_id,
              u.user_name,
              p.session_id,
              p.game_started,
              p.start_time,
              p.end_time,
              p.score as players_table_score,
              COALESCE(qa_scores.correct_answers, 0) as correct_answers_count,
              (COALESCE(p.score, 0) + COALESCE(qa_scores.correct_answers, 0)) as current_score
            FROM players p
            JOIN users u ON p.user_id = u.user_id
            LEFT JOIN (
              SELECT 
                qa.user_id,
                SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
              FROM questionattempts qa
              WHERE qa.session_id = ?
              GROUP BY qa.user_id
            ) qa_scores ON p.user_id = qa_scores.user_id
            WHERE p.session_id = ?
            ORDER BY (COALESCE(p.score, 0) + COALESCE(qa_scores.correct_answers, 0)) DESC, u.user_name ASC
          `;

          db.query(getPlayersQuery, [sessionId, sessionId], (err3, players) => {
            if (err3) {
              console.error('ScoretrackingP players DB error:', err3.message);
              req.session.error = 'Failed to load player data.';
              return res.redirect('/waitingroomP');
            }

            console.log('ScoretrackingP: Loaded players for session:', sessionId);
            console.log('ScoretrackingP: Number of players:', players.length);
            console.log('ScoretrackingP: Current user ID:', currentUserId);
            console.log('ScoretrackingP: Current user name:', userName);
            console.log('ScoretrackingP: Players with session-specific scores:', players.map(p => `${p.user_name} (ID: ${p.user_id}, Session Score: ${p.current_score})`));

            res.render('scoretrackingP', {
              title: 'Score Tracking - Python Pop-Out Challenge',
              sessionId: sessionId,
              players: players,
              currentUserId: currentUserId,
              currentUserName: userName,
              error: req.session.error || null
            });

            // Clear any error messages after rendering
            delete req.session.error;
          });
        })
        .catch((error) => {
          console.error('ScoretrackingP getCurrentUserId error:', error);
          req.session.error = 'Failed to identify current user.';
          res.redirect('/waitingroomP');
        });
    });
  });

  // API endpoint to get real-time scores
  router.get('/api/scores/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;

    if (!req.session.loggedin) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const getScoresQuery = `
      SELECT 
        p.user_id,
        u.user_name,
        p.game_started,
        p.end_time,
        p.score as players_table_score,
        COALESCE(qa_scores.correct_answers, 0) as correct_answers_count,
        (COALESCE(p.score, 0) + COALESCE(qa_scores.correct_answers, 0)) as current_score
      FROM players p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN (
        SELECT 
          qa.user_id,
          SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
        FROM questionattempts qa
        WHERE qa.session_id = ?
        GROUP BY qa.user_id
      ) qa_scores ON p.user_id = qa_scores.user_id
      WHERE p.session_id = ?
      ORDER BY (COALESCE(p.score, 0) + COALESCE(qa_scores.correct_answers, 0)) DESC, u.user_name ASC
    `;

    db.query(getScoresQuery, [sessionId, sessionId], (err, results) => {
      if (err) {
        console.error('ScoretrackingP API error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        sessionId: sessionId,
        players: results,
        gameStatus: results.length > 0 ? results[0].game_started : 0
      });
    });
  });

  // API endpoint to check if game has ended
  router.get('/api/game-status/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;

    const checkStatusQuery = 'SELECT game_started FROM players WHERE session_id = ? LIMIT 1';
    
    db.query(checkStatusQuery, [sessionId], (err, results) => {
      if (err) {
        console.error('ScoretrackingP game status error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      const gameStarted = results.length > 0 ? results[0].game_started : 0;
      
      res.json({
        sessionId: sessionId,
        gameStarted: gameStarted,
        gameEnded: gameStarted === 2
      });
    });
  });

  return router;
};
