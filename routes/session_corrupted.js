// session.js

// Function to get user_id from user_name
const getUserId = (userName) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT user_id FROM users WHERE user_name = ?';
        db.query(sql, [userName], (err, results) => {
            if (err) {
                return reject('Error fetching user_id');
            }
            if (results.length > 0) {
                resolve(results[0].user_id);
            } else {
                reject('User not found');
            }
        });
    });
};

// Function to check if the user already has an active session
const checkExistingSession = (userId, sessionId) => {
    return new Promise((resolve, reject) => {
        // Modified: Only check for active sessions (game_started = 0 or 1), not finished sessions (game_started = 2)
        // This allows users to join new sessions after their previous sessions have ended
        const sql = 'SELECT * FROM players WHERE user_id = ? AND session_id = ? AND (game_started = 0 OR game_started = 1)';
        db.query(sql, [userId, sessionId], (err, results) => {
            if (err) {
                return reject('Error checking existing session');
            }
            // Only return true if there's an active session, not a finished one
            resolve(results.length > 0);  // If there's any active record, the user already has an active session
        });
    });
};

// Function to check if the session is full (only count active players)
const checkMaxPlayers = (sessionId) => {
    return new Promise((resolve, reject) => {
        // Modified: Only count active players (game_started = 0 or 1), not finished players (game_started = 2)
        // This allows new players to join sessions even if there are finished player records
        const sql = 'SELECT COUNT(*) AS playerCount FROM players WHERE session_id = ? AND (game_started = 0 OR game_started = 1)';
        db.query(sql, [sessionId], (err, results) => {
            if (err) {
                return reject('Error checking player count');
            }
            const playerCount = results[0].playerCount;
            if (playerCount >= 4) {
                reject('Session is full. Cannot join the session.');
            } else {
                resolve(); // Allow the user to join if there's space
            }
        });
    });
};

// Function to insert a new player into the session
const insertPlayer = (userId, sessionId, currentTime) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO players (user_id, session_id, start_time) VALUES (?, ?, ?)';
        db.query(sql, [userId, sessionId, currentTime], (err, result) => {
            if (err) {
                return reject('Error inserting player');
            }
            resolve();  // Player inserted successfully
        });
    });
};

// Function to fetch all players in a session
const getPlayersInSession = (sessionId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT u.user_name FROM players p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.session_id = ?`;
        db.query(sql, [sessionId], (err, results) => {
            if (err) {
                return reject('Error fetching players in session');
            }
            resolve(results);  // List of user names
        });
    });
};

// Export all functions to be used in your main routing file
module.exports = {
    getUserId,
    checkExistingSession,
    checkMaxPlayers,
    insertPlayer,
    getPlayersInSession
};
