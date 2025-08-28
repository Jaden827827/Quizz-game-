// routes/gameee.js
const express = require('express');
const router = express.Router();

// Route for /gameee - simplified to just show "hello"
router.get('/', (req, res) => {
    console.log('=== GAMEEE ROUTE ACCESSED ===');
    
    // Get database connection from req.db (set up in main app)
    const db = req.db;
    
    if (!db) {
        console.log('No database connection found!');
        return res.render('gameee', { message: 'hello' });
    }

    console.log('Database connection exists, updating game_started...');
    
    // Create questionattempts table if it doesn't exist
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS questionattempts (
            attempt_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            player_id INT,
            question_id INT,
            session_id VARCHAR(50),
            answer_chosen VARCHAR(1),
            is_correct TINYINT(1),
            response_time_second DECIMAL(8,3)
        )
    `;
    
    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating questionattempts table:', err);
        } else {
            console.log('questionattempts table checked/created successfully');
        }
    });    // Get session_id from query parameters (passed from previous page)
    const sessionId = req.query.session_id;
    console.log('Session ID from previous page:', sessionId);
    
    if (!sessionId) {
        console.log('No session ID provided!');
        return res.render('gameee', { message: 'hello' });
    }
    
    // Update game_started from 0 to 1 ONLY for players in this specific session
    db.query('UPDATE players SET game_started = 1 WHERE session_id = ? AND game_started = 0', [sessionId], (err, result) => {
        if (err) {
            console.error('Error updating game_started:', err);
        } else {
            console.log('=== GAME_STARTED UPDATED ===');
            console.log('Session ID:', sessionId);
            console.log('Rows affected:', result.affectedRows);
        }
        
        // Show users table
        db.query('SELECT * FROM users', (err, users) => {
            if (err) {
                console.error('Error fetching users:', err);
            } else {
                console.log('=== USERS TABLE ===');
                console.log(users);
            }
        });
        
        // Show players table after update
        db.query('SELECT * FROM players', (err, players) => {
            if (err) {
                console.error('Error fetching players:', err);
            } else {
                console.log('=== PLAYERS TABLE (AFTER UPDATE) ===');
                console.log(players);
            }
            
            // Get players in this specific session to display on the page
            db.query(`
                SELECT p.player_id, p.user_id, u.user_name FROM players p
                JOIN users u ON p.user_id = u.user_id
                WHERE p.session_id = ?`, [sessionId], (err, sessionPlayers) => {
                if (err) {
                    console.error('Error fetching session players:', err);
                    // Render with basic info if error
                    res.render('gameee', { 
                        message: 'hello',
                        session_id: sessionId,
                        players: [],
                        questions: []
                    });
                } else {
                    console.log('=== PLAYERS IN THIS SESSION ===');
                    console.log(sessionPlayers);
                    
                        // Get all questions from database for random selection
                        db.query('SELECT * FROM question ORDER BY RAND()', (err, questions) => {
                            if (err) {
                                console.error('Error fetching questions:', err);
                                // Render with basic info if error
                                res.render('gameee', { 
                                    message: 'hello',
                                    session_id: sessionId,
                                    players: sessionPlayers,
                                    questions: []
                                });
                            } else {
                                console.log('=== QUESTIONS FROM DATABASE ===');
                                console.log(questions);
                                
                                // Show all tables
                                db.query('SHOW TABLES', (err, tables) => {
                                    if (err) {
                                        console.error('Error showing tables:', err);
                                    } else {
                                        console.log('=== ALL TABLES ===');
                                        console.log(tables);
                                    }
                                    console.log('=== END DATABASE LOGGING ===');
                                    
                                    // Render the page with session data, players, and questions
                                    res.render('gameee', { 
                                        message: 'hello',
                                        session_id: sessionId,
                                        players: sessionPlayers,
                                        questions: questions
                                    });
                                });
                            }
                        });
                }
            });
        });
    });
    
    // Note: res.render is now called inside the database callback above
});

// POST route to save question attempt
router.post('/save-attempt', (req, res) => {
    console.log('=== SAVING QUESTION ATTEMPT ===');
    
    const db = req.db;
    const { username, question_id, session_id, answer_chosen, is_correct, response_time_seconds } = req.body;
    
    console.log('Attempt data received:', req.body);
    
    if (!db) {
        console.log('No database connection found!');
        return res.status(500).json({ error: 'Database connection error' });
    }
    
    // First, look up the user_id using the username
    db.query('SELECT user_id FROM users WHERE user_name = ?', [username], (err, userResults) => {
        if (err) {
            console.error('Error looking up user:', err);
            return res.status(500).json({ error: 'Failed to lookup user' });
        }
        
        if (userResults.length === 0) {
            console.error('User not found:', username);
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user_id = userResults[0].user_id;
        console.log('Found user_id for username', username, ':', user_id);
        
        // Now look up the player_id using the username and session_id
        db.query(`
            SELECT p.player_id FROM players p
            JOIN users u ON p.user_id = u.user_id
            WHERE u.user_name = ? AND p.session_id = ?
        `, [username, session_id], (err, playerResults) => {
            if (err) {
                console.error('Error looking up player:', err);
                return res.status(500).json({ error: 'Failed to lookup player' });
            }
            
            if (playerResults.length === 0) {
                console.error('Player not found for username:', username, 'in session:', session_id);
                return res.status(404).json({ error: 'Player not found in session' });
            }
            
            const player_id = playerResults[0].player_id;
            console.log('Found player_id for username', username, 'in session', session_id, ':', player_id);
            
            // Insert the question attempt with both user_id and player_id (attempt_id will auto-increment)
            const insertQuery = `
                INSERT INTO questionattempts 
                (user_id, player_id, question_id, session_id, answer_chosen, is_correct, response_time_second) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.query(insertQuery, [
                user_id,
                player_id,
                question_id,
                session_id,
                answer_chosen,
                is_correct,
                response_time_seconds
            ], (err, result) => {
                if (err) {
                    console.error('Error saving question attempt:', err);
                    return res.status(500).json({ error: 'Failed to save attempt' });
                }
                
                const generatedAttemptId = result.insertId; // Get the auto-generated ID
                
                console.log('Question attempt saved successfully!');
                console.log('Username:', username, '-> User ID:', user_id, '-> Player ID:', player_id);
                console.log('Auto-generated Attempt ID:', generatedAttemptId);
                console.log('Rows affected:', result.affectedRows);
                    
                    // Show questionattempts table
                    db.query('SELECT * FROM questionattempts', (err, attempts) => {
                        if (err) {
                            console.error('Error fetching attempts:', err);
                        } else {
                            console.log('=== QUESTION ATTEMPTS TABLE ===');
                            console.log(attempts);
                        }
                        
                        res.json({ 
                            success: true, 
                            attempt_id: generatedAttemptId,
                            user_id: user_id,
                            player_id: player_id,
                            username: username,
                            message: 'Question attempt saved successfully'
                        });
                    });
                });
            });
        });
    });

// POST route to get session statistics
router.post('/session-stats', (req, res) => {
    console.log('=== SESSION STATS REQUEST RECEIVED ===');
    
    const db = req.db;
    const { session_id } = req.body;
    
    console.log('Session ID for statistics:', session_id);
    
    if (!db) {
        console.log('No database connection found!');
        return res.status(500).json({ error: 'Database connection error' });
    }
    
    if (!session_id) {
        console.log('No session ID provided!');
        return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // First, get total question attempts for the session
    const totalAttemptsQuery = `
        SELECT COUNT(*) as total_attempts 
        FROM questionattempts 
        WHERE session_id = ?
    `;
    
    db.query(totalAttemptsQuery, [session_id], (err, totalResult) => {
        if (err) {
            console.error('Error fetching total attempts:', err);
            return res.status(500).json({ error: 'Failed to fetch total attempts' });
        }
        
        const totalQuestionAttempts = totalResult[0].total_attempts;
        console.log('Total question attempts for session:', totalQuestionAttempts);
        
        // Get player statistics with scores
        const playerStatsQuery = `
            SELECT 
                u.user_name,
                COUNT(qa.attempt_id) as total_questions,
                SUM(qa.is_correct) as correct_answers,
                CASE 
                    WHEN ? > 0 
                    THEN ROUND((SUM(qa.is_correct) / ?) * 100, 2)
                    ELSE 0 
                END as score
            FROM questionattempts qa
            JOIN users u ON qa.user_id = u.user_id
            WHERE qa.session_id = ?
            GROUP BY qa.user_id, u.user_name
            ORDER BY score DESC, correct_answers DESC
        `;
        
        db.query(playerStatsQuery, [totalQuestionAttempts, totalQuestionAttempts, session_id], (err, playerResults) => {
            if (err) {
                console.error('Error fetching player statistics:', err);
                return res.status(500).json({ error: 'Failed to fetch player statistics' });
            }
            
            console.log('=== SESSION STATISTICS ===');
            console.log('Session ID:', session_id);
            console.log('Total Question Attempts:', totalQuestionAttempts);
            console.log('Player Statistics:', playerResults);
            
            res.json({
                success: true,
                sessionId: session_id,
                totalQuestionAttempts: totalQuestionAttempts,
                playerStats: playerResults,
                message: 'Session statistics retrieved successfully'
            });
        });
    });
});

// POST route to end game and update game_started to 2
router.post('/end-game', (req, res) => {
    console.log('=== END GAME REQUEST RECEIVED ===');
    
    const db = req.db;
    const { session_id } = req.body;
    
    console.log('Session ID for ending game:', session_id);
    
    if (!db) {
        console.log('No database connection found!');
        return res.status(500).json({ error: 'Database connection error' });
    }
    
    if (!session_id) {
        console.log('No session ID provided!');
        return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Update game_started from 1 to 2 and set end_time for all players in this session
    const currentTime = new Date();
    console.log('Setting end_time to:', currentTime);
    
    db.query('UPDATE players SET game_started = 2, end_time = ? WHERE session_id = ? AND game_started = 1', [currentTime, session_id], (err, result) => {
        if (err) {
            console.error('Error updating game_started to 2 and setting end_time:', err);
            return res.status(500).json({ error: 'Failed to update game status' });
        }
        
        console.log('=== GAME_STARTED UPDATED TO 2 AND END_TIME SET ===');
        console.log('Session ID:', session_id);
        console.log('End time set to:', currentTime);
        console.log('Rows affected:', result.affectedRows);
        
        // Show players table after update for verification
        db.query('SELECT * FROM players WHERE session_id = ?', [session_id], (err, players) => {
            if (err) {
                console.error('Error fetching players after update:', err);
            } else {
                console.log('=== PLAYERS TABLE (AFTER END GAME UPDATE) ===');
                console.log(players);
            }
            
            res.json({ 
                success: true, 
                message: 'Game ended successfully',
                session_id: session_id,
                end_time: currentTime,
                rows_affected: result.affectedRows
            });
        });
    });
});

// POST route to handle QR ability activation
router.post('/activate-ability', (req, res) => {
    console.log('=== QR ABILITY ACTIVATION REQUEST RECEIVED ===');
    
    const db = req.db;
    const { session_id, username, qr_text } = req.body;
    
    console.log('Session ID:', session_id);
    console.log('Username:', username);
    console.log('QR Text:', qr_text);
    
    if (!db) {
        console.log('No database connection found!');
        return res.status(500).json({ error: 'Database connection error' });
    }
    
    if (!session_id || !username || !qr_text) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Check if QR text is QR001 (gives 2 extra score), QR002 (gives 1 extra score), or QR004 (no luck)
    const qrTextUpper = qr_text.trim().toUpperCase();
    
    if (qrTextUpper === 'QR001' || qrTextUpper === 'QR002') {
        // Determine points to add based on QR code
        const pointsToAdd = qrTextUpper === 'QR001' ? 2 : 1;
        const qrType = qrTextUpper === 'QR001' ? 'QR001' : 'QR002';
        
        // First, get the user_id from username
        db.query('SELECT user_id FROM users WHERE user_name = ?', [username], (err, userResults) => {
            if (err) {
                console.error('Error looking up user:', err);
                return res.status(500).json({ error: 'Failed to lookup user' });
            }
            
            if (userResults.length === 0) {
                console.error('User not found:', username);
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user_id = userResults[0].user_id;
            console.log('Found user_id for username', username, ':', user_id);
            
            // Check if player exists in the session
            db.query('SELECT score FROM players WHERE user_id = ? AND session_id = ?', [user_id, session_id], (err, playerResults) => {
                if (err) {
                    console.error('Error checking player in session:', err);
                    return res.status(500).json({ error: 'Failed to check player in session' });
                }
                
                if (playerResults.length === 0) {
                    console.error('Player not found in session:', username, session_id);
                    return res.status(404).json({ error: 'Player not found in session' });
                }
                
                const currentScore = playerResults[0].score || 0;
                const newScore = currentScore + pointsToAdd;
                
                console.log('Current score:', currentScore);
                console.log(`Adding ${pointsToAdd} points (${qrType}), new score:`, newScore);
                
                // Update the player's score
                db.query('UPDATE players SET score = ? WHERE user_id = ? AND session_id = ?', [newScore, user_id, session_id], (err, result) => {
                    if (err) {
                        console.error('Error updating player score:', err);
                        return res.status(500).json({ error: 'Failed to update score' });
                    }
                    
                    console.log(`=== ${qrType} ABILITY ACTIVATED ===`);
                    console.log('Username:', username);
                    console.log('User ID:', user_id);
                    console.log('Session ID:', session_id);
                    console.log('Previous Score:', currentScore);
                    console.log('New Score:', newScore);
                    console.log('Rows affected:', result.affectedRows);
                    
                    const message = pointsToAdd === 2 
                        ? `Congratulations ${username}, you get 2 extra score!`
                        : `Congratulations ${username}, you get 1 extra score!`;
                    
                    res.json({
                        success: true,
                        message: message,
                        username: username,
                        previous_score: currentScore,
                        new_score: newScore,
                        points_added: pointsToAdd,
                        qr_text: qr_text
                    });
                });
            });
        });
    } else if (qrTextUpper === 'QR004') {
        // QR004 - No Luck message, no score change, no database modification
        console.log('=== QR004 SCANNED - NO LUCK ===');
        console.log('Username:', username);
        console.log('Session ID:', session_id);
        console.log('QR Text:', qr_text);
        console.log('QR004 - Just showing message, no database changes');
        
        // Simply return the "No Luck" message without any database operations
        res.json({
            success: true,
            message: 'No Luck',
            username: username,
            qr_text: qr_text,
            no_luck: true
        });
    } else {
        // QR code is not QR001, QR002, or QR004
        console.log('QR text is not recognized:', qrTextUpper);
        return res.status(400).json({ 
            error: 'This QR code does not provide any ability',
            qr_text: qr_text
        });
    }
});

module.exports = router;