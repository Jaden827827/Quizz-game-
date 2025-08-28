const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

module.exports = (db) => {
  // GET route - Render loginjoinP page9
  router.get('/', (req, res) => {
    console.log('LoginjoinP route accessed!');
    const error = req.session.error;
    req.session.error = null;
    const isLoggedIn = req.query.logged_in === 'true';
    const fromEndGame = req.query.from_endgame === 'true';
    const userId = req.query.user_id;
    
    // Check if coming from endgame with user_id - auto-authenticate the user
    if (fromEndGame && userId) {
      console.log(`Auto-authenticating user from endgame with user_id: ${userId}`);
      
      // Fetch user information from database
      const userQuery = 'SELECT * FROM users WHERE user_id = ?';
      db.query(userQuery, [userId], (err, results) => {
        if (err) {
          console.error('Error fetching user for auto-auth:', err);
          return res.render('loginjoinP', { 
            title: 'Login & Join Game - Python Pop-Out Challenge',
            error: 'Error retrieving user information',
            isLoggedIn: false,
            fromEndGame: false
          });
        }
        
        if (results.length === 0) {
          console.log('User not found for auto-auth');
          return res.render('loginjoinP', { 
            title: 'Login & Join Game - Python Pop-Out Challenge',
            error: 'User not found',
            isLoggedIn: false,
            fromEndGame: false
          });
        }
        
        const user = results[0];
        
        // Set session data for auto-authenticated user
        req.session.user = {
          user_id: user.user_id,
          user_name: user.user_name,
          user_email: user.user_email
        };
        req.session.loggedin = true;
        req.session.user_name = user.user_name;
        
        console.log(`Auto-authentication successful for user: ${user.user_name}`);
        
        // Render with logged in state
        res.render('loginjoinP', { 
          title: 'Login & Join Game - Python Pop-Out Challenge',
          error: null,
          isLoggedIn: true,
          fromEndGame: true,
          autoUser: user
        });
      });
    } else {
      // Normal rendering
      res.render('loginjoinP', { 
        title: 'Login & Join Game - Python Pop-Out Challenge',
        error: error,
        isLoggedIn: isLoggedIn,
        fromEndGame: false
      });
    }
  });

  // POST route - Handle login
  router.post('/login', async (req, res) => {
    const { user_email, user_password } = req.body;

    if (!user_email || !user_password) {
      req.session.error = 'Please enter Email and Password!';
      return res.redirect('/loginjoinP');
    }

    try {
      const query = 'SELECT * FROM users WHERE user_email = ?';
      
      // Use the passed db connection
      db.query(query, [user_email], async (err, results) => {
        if (err) {
          console.error('Database query error:', err);
          req.session.error = 'Database error occurred!';
          return res.redirect('/loginjoinP');
        }

        if (results.length === 0) {
          req.session.error = 'Invalid email or password!';
          return res.redirect('/loginjoinP');
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(user_password, user.user_password);

        if (!isPasswordValid) {
          req.session.error = 'Invalid email or password!';
          return res.redirect('/loginjoinP');
        }

        // Store user data in session
        req.session.user = {
          user_id: user.user_id,
          user_name: user.user_name,
          user_email: user.user_email
        };
        req.session.loggedin = true;
        req.session.user_name = user.user_name;

        console.log('Login successful for user:', user.user_name);
        // After successful login, stay on the same page to show session join form
        res.redirect('/loginjoinP?logged_in=true');
      });

    } catch (error) {
      console.error('Login error:', error);
      req.session.error = 'Error occurred during login!';
      res.redirect('/loginjoinP');
    }
  });

  // POST route - Handle joining game session
  router.post('/joinsession', async (req, res) => {
    const { session_id } = req.body;

    // Check if user is logged in
    if (!req.session.loggedin || !req.session.user) {
      req.session.error = 'Please login first before joining a session!';
      return res.redirect('/loginjoinP');
    }

    if (!session_id) {
      req.session.error = 'Please enter a Session ID!';
      return res.redirect('/loginjoinP?logged_in=true');
    }

    try {
        // FIRST: Check if user is already in this session (priority check)
        const participantQuery = 'SELECT game_started FROM players WHERE session_id = ? AND user_id = ?';
        
        db.query(participantQuery, [session_id, req.session.user.user_id], (err, participantResults) => {
          if (err) {
            console.error('Error checking participant:', err);
            req.session.error = 'Database error occurred!';
            return res.redirect('/loginjoinP?logged_in=true');
          }

          if (participantResults.length > 0) {
            // User is already in this session, check game_started status for smart redirection
            const gameStarted = participantResults[0].game_started;
            
            if (gameStarted === 1) {
              // Game is in progress, redirect to scoretracking page
              console.log(`User ${req.session.user.user_name} rejoining active session ${session_id} - redirecting to scoretracking`);
              req.session.session_id = session_id;
              return res.redirect(`/scoretrackingP?session_id=${session_id}`);
            } else if (gameStarted === 2) {
              // Game has ended
              req.session.error = 'This session has already ended. Please join a different session.';
              return res.redirect('/loginjoinP?logged_in=true');
            } else {
              // Game hasn't started yet (game_started = 0), redirect to waiting room
              console.log(`User ${req.session.user.user_name} rejoining waiting session ${session_id} - redirecting to waiting room`);
              req.session.session_id = session_id;
              return res.redirect(`/waitingroomP?session_id=${session_id}`);
            }
          }

          // SECOND: If user is NOT already in session, check session status and availability
          const sessionQuery = `
            SELECT session_id, 
                   COUNT(*) as session_count,
                   MIN(game_started) as min_game_status,
                   MAX(game_started) as max_game_status
            FROM players 
            WHERE session_id = ?
            GROUP BY session_id`;
        
          db.query(sessionQuery, [session_id], (err, sessionResults) => {
            if (err) {
              console.error('Error checking session:', err);
              req.session.error = 'Database error occurred!';
              return res.redirect('/loginjoinP?logged_in=true');
            }

            if (sessionResults.length === 0) {
              req.session.error = 'Invalid Session ID! Session does not exist.';
              return res.redirect('/loginjoinP?logged_in=true');
            }

            const sessionInfo = sessionResults[0];
            const maxGameStatus = sessionInfo.max_game_status;

            // Check session status for NEW players trying to join
            if (maxGameStatus === 2) {
              req.session.error = 'This session has already ended. Please join a different session.';
              return res.redirect('/loginjoinP?logged_in=true');
            } else if (maxGameStatus === 1) {
              req.session.error = 'This session is currently in progress. You cannot join a game that has already started.';
              return res.redirect('/loginjoinP?logged_in=true');
            }

            const participantCount = sessionInfo.session_count;

            if (participantCount >= 4) {
              req.session.error = 'Session is full! Maximum 4 players allowed.';
              return res.redirect('/loginjoinP?logged_in=true');
            }

            // Add user to session
            const insertQuery = 'INSERT INTO players (user_id, session_id, start_time) VALUES (?, ?, NOW())';
            
            db.query(insertQuery, [req.session.user.user_id, session_id], (err, insertResult) => {
              if (err) {
                console.error('Error joining session:', err);
                req.session.error = 'Error joining session!';
                return res.redirect('/loginjoinP?logged_in=true');
              }

              // Store session info in user session
              req.session.session_id = session_id;

              console.log(`User ${req.session.user.user_name} joined session ${session_id}`);
              
              // Redirect to waitingroomP
              res.redirect(`/waitingroomP?session_id=${session_id}`);
            });
          });
        });

    } catch (error) {
      console.error('Join session error:', error);
      req.session.error = 'Error joining session!';
      res.redirect('/loginjoinP?logged_in=true');
    }
  });

  return router;
};
