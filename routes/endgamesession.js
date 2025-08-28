// routes/endgamesession.js
const express = require('express');
const router = express.Router();

// Route for /endgamesession - show session ID from gameee page
router.get('/', (req, res) => {
    console.log('=== END GAME SESSION ROUTE ACCESSED ===');
    
    const db = req.db;
    const sessionId = req.query.session_id;
    
    console.log('Session ID from gameee page:', sessionId);
    
    if (!sessionId) {
        console.log('No session ID provided!');
        return res.render('endgamesession', { 
            session_id: 'Unknown',
            error: 'No session ID provided',
            players: []
        });
    }
    
    if (!db) {
        console.log('No database connection found!');
        return res.render('endgamesession', { 
            session_id: sessionId,
            error: 'Database connection error',
            players: []
        });
    }
    
    // Get total question attempts for the entire session first
    const totalAttemptsQuery = `
        SELECT COUNT(*) as total_session_attempts 
        FROM questionattempts 
        WHERE session_id = ?
    `;
    
    // Execute total attempts query first
    db.query(totalAttemptsQuery, [sessionId], (err, totalResult) => {
        if (err) {
            console.error('Error fetching total question attempts:', err);
            return res.render('endgamesession', { 
                session_id: sessionId,
                error: 'Failed to fetch total question attempts',
                players: [],
                total_session_attempts: 0
            });
        }
        
        const totalSessionAttempts = totalResult[0].total_session_attempts;
        console.log('Total session attempts:', totalSessionAttempts);
        
        // Get all players in this session with their combined scores (questionattempts + players table)
        // Calculate accuracy percentage based on total session attempts, not individual attempts
        const playersQuery = `
            SELECT DISTINCT 
                u.user_name, 
                p.player_id,
                p.score as players_table_score,
                COALESCE(stats.total_questions, 0) as total_questions,
                COALESCE(stats.correct_answers, 0) as correct_answers,
                (COALESCE(p.score, 0) + COALESCE(stats.correct_answers, 0)) as final_score,
                CASE 
                    WHEN ? > 0 
                    THEN ROUND((COALESCE(stats.correct_answers, 0) / ?) * 100, 1)
                    ELSE 0 
                END as accuracy_percentage
            FROM players p
            JOIN users u ON p.user_id = u.user_id
            LEFT JOIN (
                SELECT 
                    user_id,
                    COUNT(*) as total_questions,
                    SUM(is_correct) as correct_answers
                FROM questionattempts 
                WHERE session_id = ?
                GROUP BY user_id
            ) stats ON u.user_id = stats.user_id
            WHERE p.session_id = ?
            ORDER BY (COALESCE(p.score, 0) + COALESCE(stats.correct_answers, 0)) DESC, u.user_name ASC
        `;
        
        db.query(playersQuery, [totalSessionAttempts, totalSessionAttempts, sessionId, sessionId], (err, players) => {
            if (err) {
                console.error('Error fetching session players:', err);
                return res.render('endgamesession', { 
                    session_id: sessionId,
                    error: 'Failed to fetch session players',
                    players: [],
                    total_session_attempts: totalSessionAttempts,
                    questions: []
                });
            }
            
            console.log('=== PLAYERS IN SESSION ===');
            console.log('Session ID:', sessionId);
            console.log('Total session attempts:', totalSessionAttempts);
            console.log('Players found:', players);
            
            // Get all questions answered in this session
            const questionsQuery = `
                SELECT DISTINCT 
                    q.question_id,
                    q.question_text,
                    q.correct_option,
                    q.option_a,
                    q.option_b,
                    q.option_c,
                    q.option_d,
                    q.explanation
                FROM questionattempts qa
                JOIN question q ON qa.question_id = q.question_id
                WHERE qa.session_id = ?
                ORDER BY q.question_id ASC
            `;
            
            db.query(questionsQuery, [sessionId], (err, questions) => {
                if (err) {
                    console.error('Error fetching session questions:', err);
                    return res.render('endgamesession', { 
                        session_id: sessionId,
                        error: 'Failed to fetch session questions',
                        players: players,
                        total_session_attempts: totalSessionAttempts,
                        questions: []
                    });
                }
                
                console.log('=== QUESTIONS IN SESSION ===');
                console.log('Questions found:', questions);
                
                // Get player attempts for each question
                const attemptsQuery = `
                    SELECT 
                        qa.question_id,
                        qa.answer_chosen,
                        qa.is_correct,
                        qa.response_time_second,
                        u.user_name,
                        q.correct_option
                    FROM questionattempts qa
                    JOIN users u ON qa.user_id = u.user_id
                    JOIN question q ON qa.question_id = q.question_id
                    WHERE qa.session_id = ?
                    ORDER BY qa.question_id ASC, qa.attempt_id ASC
                `;
                
                db.query(attemptsQuery, [sessionId], (err, attempts) => {
                    if (err) {
                        console.error('Error fetching question attempts:', err);
                        return res.render('endgamesession', { 
                            session_id: sessionId,
                            error: 'Failed to fetch question attempts',
                            players: players,
                            total_session_attempts: totalSessionAttempts,
                            questions: questions,
                            attempts: []
                        });
                    }
                    
                    console.log('=== QUESTION ATTEMPTS ===');
                    console.log('Attempts found:', attempts);
                    
                    // Group attempts by question_id
                    const attemptsByQuestion = {};
                    attempts.forEach(attempt => {
                        if (!attemptsByQuestion[attempt.question_id]) {
                            attemptsByQuestion[attempt.question_id] = [];
                        }
                        attemptsByQuestion[attempt.question_id].push(attempt);
                    });
                    
                    // Render the page with all data
                    res.render('endgamesession', {
                        session_id: sessionId,
                        players: players,
                        total_session_attempts: totalSessionAttempts,
                        questions: questions,
                        attempts: attemptsByQuestion,
                        current_user: req.session.user || null,
                        error: null
                    });
                });
            });
        });
    });
});

module.exports = router;
