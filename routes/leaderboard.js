// routes/leaderboard.js
const express = require('express');
const router = express.Router();

// Route for leaderboard page
router.get('/', (req, res) => {
    console.log('=== LEADERBOARD ROUTE ACCESSED ===');
    
    const db = req.db;
    
    if (!db) {
        console.log('No database connection found!');
        return res.render('leaderboard', { 
            error: 'Database connection error',
            sessions: [],
            current_user: req.session.user || null
        });
    }
    
    // Get all ended sessions (game_started = 2) with their players and total question attempts
    const sessionsQuery = `
        SELECT DISTINCT 
            p.session_id,
            p.end_time,
            (SELECT COUNT(*) FROM questionattempts qa WHERE qa.session_id = p.session_id) as total_questions_answered
        FROM players p 
        WHERE p.game_started = 2 
        GROUP BY p.session_id, p.end_time
        ORDER BY p.end_time DESC
    `;
    
    db.query(sessionsQuery, (err, sessions) => {
        if (err) {
            console.error('Error fetching ended sessions:', err);
            return res.render('leaderboard', { 
                error: 'Failed to fetch sessions',
                sessions: [],
                current_user: req.session.user || null
            });
        }
        
        console.log('Found ended sessions:', sessions.length);
        
        if (sessions.length === 0) {
            return res.render('leaderboard', {
                sessions: [],
                current_user: req.session.user || null,
                error: null
            });
        }
        
        // For each session, get all players
        const getPlayersForSessions = async () => {
            const sessionsWithPlayers = [];
            
            for (const session of sessions) {
                const playersQuery = `
                    SELECT DISTINCT 
                        u.user_name,
                        COALESCE(stats.correct_answers, 0) as correct_answers,
                        CASE 
                            WHEN ? > 0 
                            THEN ROUND((COALESCE(stats.correct_answers, 0) / ?) * 100, 1)
                            ELSE 0 
                        END as session_percentage
                    FROM players p
                    JOIN users u ON p.user_id = u.user_id
                    LEFT JOIN (
                        SELECT 
                            user_id,
                            SUM(is_correct) as correct_answers
                        FROM questionattempts 
                        WHERE session_id = ?
                        GROUP BY user_id
                    ) stats ON u.user_id = stats.user_id
                    WHERE p.session_id = ? AND p.game_started = 2
                    ORDER BY session_percentage DESC, u.user_name
                `;
                
                try {
                    const players = await new Promise((resolve, reject) => {
                        db.query(playersQuery, [
                            session.total_questions_answered, 
                            session.total_questions_answered, 
                            session.session_id, 
                            session.session_id
                        ], (err, results) => {
                            if (err) reject(err);
                            else resolve(results);
                        });
                    });
                    
                    sessionsWithPlayers.push({
                        ...session,
                        players: players
                    });
                } catch (playerErr) {
                    console.error(`Error fetching players for session ${session.session_id}:`, playerErr);
                    sessionsWithPlayers.push({
                        ...session,
                        players: []
                    });
                }
            }
            
            return sessionsWithPlayers;
        };
        
        getPlayersForSessions()
            .then(sessionsWithPlayers => {
                console.log('=== SESSIONS WITH PLAYERS ===');
                console.log('Total sessions:', sessionsWithPlayers.length);
                sessionsWithPlayers.forEach(session => {
                    console.log(`Session ${session.session_id}: ${session.players.length} players, ${session.total_questions_answered} questions`);
                });
                
                res.render('leaderboard', {
                    sessions: sessionsWithPlayers,
                    current_user: req.session.user || null,
                    error: null
                });
            })
            .catch(err => {
                console.error('Error processing sessions:', err);
                res.render('leaderboard', {
                    error: 'Failed to process session data',
                    sessions: [],
                    current_user: req.session.user || null
                });
            });
    });
});

// New route to fetch session questions via AJAX
router.get('/session/:sessionId/questions', (req, res) => {
    console.log('=== FETCH SESSION QUESTIONS ROUTE ===');
    
    const db = req.db;
    const sessionId = req.params.sessionId;
    
    if (!db) {
        console.log('No database connection found!');
        return res.json({ 
            error: 'Database connection error',
            questions: []
        });
    }
    
    // Get all questions answered in this session with details from question table
    const questionsQuery = `
        SELECT 
            q.question_id,
            q.question_text,
            q.option_a,
            q.option_b,
            q.option_c,
            q.option_d,
            q.correct_option,
            q.explanation,
            qa.answer_chosen as user_answer,
            qa.is_correct,
            qa.response_time_second,
            u.user_name,
            qa.attempt_id
        FROM questionattempts qa
        JOIN users u ON qa.user_id = u.user_id
        JOIN question q ON qa.question_id = q.question_id
        WHERE qa.session_id = ?
        ORDER BY q.question_id ASC, qa.response_time_second ASC
    `;
    
    db.query(questionsQuery, [sessionId], (err, questions) => {
        if (err) {
            console.error('Error fetching session questions:', err);
            return res.json({
                error: 'Failed to fetch session questions',
                questions: []
            });
        }
        
        console.log(`Found ${questions.length} question attempts for session ${sessionId}`);
        console.log('Question attempts details:');
        questions.forEach((q, index) => {
            console.log(`${index + 1}. Question ID: ${q.question_id}, User: ${q.user_name}, Answer: ${q.user_answer}, Correct: ${q.is_correct}`);
        });
        
        res.json({
            success: true,
            questions: questions,
            sessionId: sessionId
        });
    });
});

module.exports = router;
