const express = require('express');
const router = express.Router();

module.exports = (db, io) => {
  // WaitingroomP route
  router.get('/', (req, res) => {
    if (req.session.loggedin) {
      const sessionId = req.query.session_id || req.session.session_id;
      const userName = req.session.user_name;
      const currentTime = new Date();

      if (!sessionId) {
        console.error('No session_id provided for waitingroomP.');
        req.session.error = 'Session ID is required.';
        return res.redirect('/loginjoinP');
      }

      const getUserId = () => {
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

      const checkExistingSession = (userId, sessionId) => {
        return new Promise((resolve, reject) => {
          const sql = 'SELECT * FROM players WHERE user_id = ? AND session_id = ?';
          db.query(sql, [userId, sessionId], (err, results) => {
            if (err) {
              return reject('Error checking existing session');
            }
            resolve(results.length > 0);  // If user already exists in the session
          });
        });
      };

      const insertPlayer = (userId, sessionId) => {
        return new Promise((resolve, reject) => {
          const sql = 'INSERT INTO players (user_id, session_id, start_time) VALUES (?, ?, ?)';
          db.query(sql, [userId, sessionId, currentTime], (err, result) => {
            if (err) {
              return reject('Error inserting player');
            }
            resolve();
          });
        });
      };

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

      const checkIfSessionCreator = (userId, sessionId) => {
        return new Promise((resolve, reject) => {
          const sql = `
            SELECT user_id FROM players 
            WHERE session_id = ? 
            ORDER BY start_time ASC 
            LIMIT 1`;
          db.query(sql, [sessionId], (err, results) => {
            if (err) {
              return reject('Error checking session creator');
            }
            if (results.length > 0) {
              resolve(results[0].user_id === userId);
            } else {
              resolve(true); // If no players yet, this user will be the creator
            }
          });
        });
      };

      // Main logic
      getUserId()
        .then((userId) => {
          checkExistingSession(userId, sessionId)
            .then((sessionExists) => {
              if (sessionExists) {
                // User is already in the session, render waiting room
                console.log('WaitingroomP: User already in the session');

                Promise.all([getPlayersInSession(sessionId), checkIfSessionCreator(userId, sessionId)])
                  .then(([players, isCreator]) => {
                    res.render('waitingroomP', {
                      title: 'Waiting Room - Python Pop-Out Challenge',
                      session_id: sessionId,
                      user_name: userName,
                      players: players,
                      isSessionCreator: isCreator
                    });

                    // Emit event to the session room for real-time update
                    if (io) {
                      io.to(sessionId).emit('updatePlayers', players);
                    }
                  })
                  .catch((err) => {
                    console.error('WaitingroomP: Error fetching session data:', err);
                    req.session.error = 'Error fetching session data';
                    res.redirect('/loginjoinP');
                  });
              } else {
                // Insert the new player into the session
                insertPlayer(userId, sessionId)
                  .then(() => {
                    console.log('WaitingroomP: New player inserted');
                    Promise.all([getPlayersInSession(sessionId), checkIfSessionCreator(userId, sessionId)])
                      .then(([players, isCreator]) => {
                        res.render('waitingroomP', {
                          title: 'Waiting Room - Python Pop-Out Challenge',
                          session_id: sessionId,
                          user_name: userName,
                          players: players,
                          isSessionCreator: isCreator
                        });

                        // Emit event to update players list
                        if (io) {
                          io.to(sessionId).emit('updatePlayers', players);
                        }
                      })
                      .catch((err) => {
                        console.error('WaitingroomP: Error fetching session data after insert:', err);
                        req.session.error = 'Error fetching session data';
                        res.redirect('/loginjoinP');
                      });
                  })
                  .catch((err) => {
                    console.error('WaitingroomP: Failed to insert player:', err);
                    req.session.error = 'Error joining session';
                    res.redirect('/loginjoinP');
                  });
              }
            })
            .catch((err) => {
              console.error('WaitingroomP: Error checking existing session:', err);
              req.session.error = 'Error checking session';
              res.redirect('/loginjoinP');
            });
        })
        .catch((err) => {
          console.error('WaitingroomP: Error fetching user_id:', err);
          req.session.error = 'User not found';
          res.redirect('/loginjoinP');
        });
    } else {
      res.redirect('/loginjoinP');
    }
  });

  // Leave session route
  router.post('/leave-session', (req, res) => {
    if (req.session.loggedin) {
      const sessionId = req.body.session_id || req.query.session_id;
      const userName = req.session.user_name;

      if (!sessionId || !userName) {
        console.error('Missing session_id or user_name for leave session');
        return res.status(400).json({ error: 'Session ID and user name are required' });
      }

      const getUserId = () => {
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

      const removePlayerFromSession = (userId, sessionId) => {
        return new Promise((resolve, reject) => {
          const sql = 'DELETE FROM players WHERE user_id = ? AND session_id = ?';
          db.query(sql, [userId, sessionId], (err, result) => {
            if (err) {
              return reject('Error removing player from session');
            }
            console.log(`Player ${userName} (ID: ${userId}) removed from session ${sessionId}. Rows affected: ${result.affectedRows}`);
            resolve(result.affectedRows > 0);
          });
        });
      };

      const getUpdatedPlayersInSession = (sessionId) => {
        return new Promise((resolve, reject) => {
          const sql = `
            SELECT u.user_name FROM players p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.session_id = ?`;
          db.query(sql, [sessionId], (err, results) => {
            if (err) {
              return reject('Error fetching updated players in session');
            }
            resolve(results);
          });
        });
      };

      // Main logic for leaving session
      getUserId()
        .then((userId) => {
          removePlayerFromSession(userId, sessionId)
            .then((removed) => {
              if (removed) {
                console.log(`Successfully removed player ${userName} from session ${sessionId}`);
                
                // Get updated player list and notify other players
                getUpdatedPlayersInSession(sessionId)
                  .then((players) => {
                    // Emit event to update players list for remaining players
                    if (io) {
                      io.to(sessionId).emit('updatePlayers', players);
                      io.to(sessionId).emit('playerLeft', {
                        playerName: userName,
                        remainingPlayers: players
                      });
                    }
                    
                    // Clear session data
                    delete req.session.session_id;
                    
                    // Return success response
                    res.json({ success: true, message: 'Successfully left the session' });
                  })
                  .catch((err) => {
                    console.error('Error fetching updated players:', err);
                    // Still return success since player was removed
                    res.json({ success: true, message: 'Left session but could not update player list' });
                  });
              } else {
                console.log(`Player ${userName} was not found in session ${sessionId}`);
                res.json({ success: true, message: 'Player was not in the session' });
              }
            })
            .catch((err) => {
              console.error('Error removing player from session:', err);
              res.status(500).json({ error: 'Error leaving session' });
            });
        })
        .catch((err) => {
          console.error('Error fetching user_id for leave session:', err);
          res.status(500).json({ error: 'User not found' });
        });
    } else {
      res.status(401).json({ error: 'Not logged in' });
    }
  });

  return router;
};
