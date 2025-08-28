const express = require("express");
const path = require("path");
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const session = require('express-session');

const app = express(); // ✅ Initialize app

const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);  

// 2. Database Connection:
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Ljx778945@',
  database: 'assignment',  // Use 'assignment' database
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to the database');
  }
});

// 3. Session Configuration:
app.use(session({
  secret: 'assignment', // Change this in production
  resave: false,
  saveUninitialized: false
}));

// 4. Attach db to req for global access
app.use((req, res, next) => {
  req.db = db;
  next();
});

// 5. Middleware Setup:
app.use(express.static(path.join(__dirname, "public")));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));  // For parsing application/x-www-form-urlencoded
app.use(express.json());  // For parsing application/json


// 6. View Engine Setup:
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// 7. User Session Info in Views:
app.use((req, res, next) => {
  res.locals.user_name = req.session.user_name || null;
  res.locals.loggedin = req.session.loggedin || false;
  next();
});

////////////// 8. Import Routes :
//with Database:
const loginRoutes = require('./routes/loginnn')(db); // Import login routes
const registerRoutes = require('./routes/register')(db); // Register page & logic

//without Database:
const homeRoutes = require('./routes/home'); // Import the home route
console.log('Importing homeP routes...');
const homePRoutes = require('./routes/homeP'); // Import the homeP route
console.log('HomeP routes imported successfully');
const loginjoinPRoutes = require('./routes/loginjoinP')(db); // Import the loginjoinP route with database
const registerPRoutes = require('./routes/registerP')(db); // Import the registerP route with database
const waitingroomPRoutes = require('./routes/waitingroomP')(db, io); // Import the waitingroomP route with database and socket.io
const scoretrackingPRoutes = require('./routes/scoretrackingP')(db, io); // Import the scoretrackingP route with database and socket.io
const gameeeRoutes = require('./routes/gameee'); // Import the gameee route
const endgamesessionRoutes = require('./routes/endgamesession'); // Import the endgamesession route
const leaderboardRoutes = require('./routes/leaderboard'); // Import the leaderboard route
const adminRoutes = require('./routes/admin'); // Import the admin route
const userManagementRoutes = require('./routes/user-management'); // Import the user management route
const questionManagementRoutes = require('./routes/question-management'); // Import the question management route
const gameresultRoutes = require('./routes/gameresult')(db); // Import the gameresult route with database
const rulesssRoutes = require('./routes/rulesss'); // Import the rules route



// Log out route
app.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) throw err;
      res.redirect('/home'); // Redirect back to home after logout
    });
  }
});




/////////// 9. Public Routes:
app.get("/", (req, res) => {
  res.redirect("/home"); // Redirect to home page instead of non-existent index
});

// Add the /mainpage route
app.get('/mainpage', (req, res) => {
  // Check if the user is logged in
  if (req.session.loggedin) {
    // Render the main page if logged in
    res.render('mainpage', { user_name: req.session.user_name });
  } else {
    // If not logged in, redirect to login page
    res.redirect('/login');
  }
});

app.get('/game', (req, res) => {
    if (req.session.loggedin) {
        // Get the session_id from the session
        const sessionId = req.session.session_id;

        // Perform any game start logic here (e.g., updating session state in the database)
        const sql = 'UPDATE players SET start_time = NOW() WHERE session_id = ?';
        db.query(sql, [sessionId], (err, result) => {
            if (err) {
                console.error('Failed to start game:', err);
                return res.status(500).send('Error starting game');
            }

            console.log('Game started for session:', sessionId);
            res.redirect('/game');  // Redirect to the game page (you should create this route)
        });
    } else {
        res.redirect('/login');
    }
});

/////////////////////////////////////////////////////////////////
// Session page route to render the session.pug file

app.get('/session', (req, res) => {
    if (req.session.loggedin) {
        const userName = req.session.user_name;
        
        // Function to check game_started status for current user
        const checkGameStatus = () => {
            return new Promise((resolve, reject) => {
                if (!req.session.session_id) {
                    // No session ID exists, need to generate new one
                    resolve(true);
                    return;
                }
                
                const sql = `
                    SELECT p.game_started FROM players p
                    JOIN users u ON p.user_id = u.user_id
                    WHERE u.user_name = ? AND p.session_id = ?
                    ORDER BY p.start_time DESC
                    LIMIT 1`;
                
                db.query(sql, [userName, req.session.session_id], (err, results) => {
                    if (err) {
                        console.error('Error checking game status:', err);
                        resolve(true); // Generate new session on error
                        return;
                    }
                    
                    if (results.length === 0) {
                        // No player record found, generate new session
                        resolve(true);
                    } else {
                        const gameStarted = results[0].game_started;
                        console.log(`Current game_started status: ${gameStarted}`);
                        
                        // If game_started is 2 (finished), generate new session ID
                        // If game_started is 0 or 1 (waiting/in progress), keep existing session ID
                        resolve(gameStarted === 2);
                    }
                });
            });
        };
        
        // Check game status and decide whether to generate new session ID
        checkGameStatus()
            .then((shouldGenerateNew) => {
                if (shouldGenerateNew) {
                    req.session.session_id = Math.floor(100000 + Math.random() * 900000);
                    console.log('Generated new session ID:', req.session.session_id);
                } else {
                    console.log('Using existing session ID:', req.session.session_id);
                }
                
                const sessionId = req.session.session_id;
                const currentTime = new Date();  // Get current date and time

                if (userName && sessionId) {
                    // Fetch user_id from the users table based on user_name
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

                    // Check if the user already has a session in the players table
                    const checkExistingSession = (userId) => {
                        return new Promise((resolve, reject) => {
                            const sql = 'SELECT * FROM players WHERE user_id = ? AND session_id = ?';
                            db.query(sql, [userId, sessionId], (err, results) => {
                                if (err) {
                                    return reject('Error checking existing session');
                                }
                                resolve(results.length > 0);  // If there's any record, the user already has a session
                            });
                        });
            };

            // Check if the session already has 4 players
            const checkMaxPlayers = (sessionId) => {
                return new Promise((resolve, reject) => {
                    const sql = 'SELECT COUNT(*) AS playerCount FROM players WHERE session_id = ?';
                    db.query(sql, [sessionId], (err, results) => {
                        if (err) {
                            return reject('Error checking player count');
                        }
                        const playerCount = results[0].playerCount;
                        if (playerCount >= 4) {
                            reject('Session is full. Cannot join the session.');
                        } else {
                            resolve(); // Allow the user to join if there’s space
                        }
                    });
                });
            };

            // Insert player into the session if not already present
            const insertPlayer = (userId, sessionId) => {
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

                    // Fetch all players in the session
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

                    // Main logic: Fetch user_id, check if the user already has a session, check if session is full, and insert new player if possible
                    getUserId()
                        .then((userId) => {
                            checkExistingSession(userId)
                                .then((sessionExists) => {
                                    if (sessionExists) {
                                        // User already in the session, no need to insert again, just render the session page
                                        console.log('User already in the session');

                                        getPlayersInSession(sessionId)
                                            .then((players) => {
                                                res.render('session', {
                                                    session_id: sessionId,
                                                    user_name: userName,
                                                    players: players  // Show players who are part of the session
                                                });
                                            })
                                            .catch((err) => {
                                                console.error('Error fetching players:', err);
                                                res.status(500).send('Error fetching players');
                                            });
                                    } else {
                                        // User doesn't have a session, check if the session is full
                                        checkMaxPlayers(sessionId)
                                            .then(() => {
                                                // Session isn't full, insert the new player
                                                insertPlayer(userId, sessionId)
                                                    .then(() => {
                                                        console.log('New player inserted');
                                                        getPlayersInSession(sessionId)
                                                            .then((players) => {
                                                                res.render('session', {
                                                                    session_id: sessionId,
                                                                    user_name: userName,
                                                                    players: players
                                                                });
                                                            })
                                                            .catch((err) => {
                                                                console.error('Error fetching players:', err);
                                                                res.status(500).send('Error fetching players');
                                                            });
                                                    })
                                                    .catch((err) => {
                                                        console.error('Failed to insert player:', err);
                                                        res.status(500).send('Error inserting player');
                                                    });
                                            })
                                            .catch((err) => {
                                                // Session is full, send an error message
                                                console.error(err);
                                                res.render('session', {
                                            session_id: sessionId,
                                            user_name: userName,
                                            message: 'Session is full. You cannot join this session.'
                                        });
                                    });
                            }
                        })
                        .catch((err) => {
                            console.error('Error checking existing session:', err);
                            res.status(500).send('Error checking existing session');
                        });
                })
                .catch((err) => {
                    console.error('Error fetching user_id:', err);
                    console.error('Error fetching user_id:', err);
                    res.status(500).send('Error fetching user_id');
                });
            } else {
                res.redirect('/login');
            }
        })
        .catch((err) => {
            console.error('Error checking game status:', err);
            res.status(500).send('Error checking game status');
        });
    } else {
        res.redirect('/login');
    }
});

// Session participants API route for AJAX updates
app.get('/session-participants', (req, res) => {
    const sessionId = req.query.session_id;
    
    if (!sessionId) {
        return res.json({ success: false, message: 'Session ID is required' });
    }
    
    // Fetch all players in the session
    const sql = `
        SELECT u.user_name FROM players p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.session_id = ?`;
    
    db.query(sql, [sessionId], (err, results) => {
        if (err) {
            console.error('Error fetching session participants:', err);
            return res.json({ success: false, message: 'Error fetching participants' });
        }
        
        res.json({ 
            success: true, 
            players: results,
            playerCount: results.length 
        });
    });
});


/////////////////////////////////////////////////////////////////
//////join game/////
app.get('/joingame', (req, res) => {
    if (req.session.loggedin) {
        // Check if session_id is provided via QR code scan
        const qrSessionId = req.query.session_id;
        
        // Fetch available sessions from the players table where there are fewer than 4 players
        const sql = `
            SELECT session_id,
                   (SELECT COUNT(*) FROM players WHERE session_id = players.session_id) AS player_count
            FROM players
            GROUP BY session_id
            HAVING player_count < 4`;

        db.query(sql, (err, results) => {
            if (err) {
                console.error('Error fetching available sessions:', err.message);
                return res.status(500).send('Error fetching available sessions');
            }

            // Log results for debugging
            console.log('Available sessions:', results);

            res.render('joingame', { 
                sessions: results, 
                qrSessionId: qrSessionId || null 
            });
        });
    } else {
        res.redirect('/login');
    }
});
app.post('/joingame', (req, res) => {
    if (req.session.loggedin) {
        const sessionId = req.body.session_id;  // The 6-digit session ID entered by the user
        const userName = req.session.user_name; // The logged-in user's username

        // Get user_id based on user_name
        const getUserId = () => {
            return new Promise((resolve, reject) => {
                const sql = 'SELECT user_id FROM users WHERE user_name = ?';
                db.query(sql, [userName], (err, results) => {
                    if (err) {
                        return reject('Error fetching user_id');
                    }
                    if (results.length > 0) {
                        resolve(results[0].user_id);  // Return user_id
                    } else {
                        reject('User not found');
                    }
                });
            });
        };

        // Check if the session_id exists in the players table and if the session is full
        const checkSessionExistenceAndFull = () => {
            return new Promise((resolve, reject) => {
                const sql = 'SELECT COUNT(*) AS playerCount FROM players WHERE session_id = ?';
                db.query(sql, [sessionId], (err, results) => {
                    if (err) {
                        return reject('Error checking session existence or player count');
                    }

                    const playerCount = results[0].playerCount;
                    if (playerCount >= 4) {
                        reject('Session is full');
                    } else {
                        resolve();  // Session exists and is not full
                    }
                });
            });
        };

        // Insert the player into the players table
        const insertPlayer = (userId, sessionId) => {
            return new Promise((resolve, reject) => {
                const sql = 'INSERT INTO players (user_id, session_id, start_time) VALUES (?, ?, ?)';
                db.query(sql, [userId, sessionId, new Date()], (err, result) => {
                    if (err) {
                        return reject('Error inserting player');
                    }
                    resolve(); // Player successfully inserted
                });
            });
        };

        // Main logic: Get user_id, check if session exists and is not full, then insert player into session
        getUserId()
            .then((userId) => {
                checkSessionExistenceAndFull()
                    .then(() => {
                        // Session is not full, insert the player
                        insertPlayer(userId, sessionId)
                            .then(() => {
                                res.redirect('/waitingroom'); // Redirect to waiting room after joining
                            })
                            .catch((err) => {
                                console.error('Error inserting player:', err);
                                res.status(500).send('Error inserting player');
                            });
                    })
                    .catch((err) => {
                        res.status(400).send(err);  // Session is full
                    });
            })
            .catch((err) => {
                console.error('Error fetching user_id:', err);
                res.status(500).send('Error fetching user_id');
            });
    } else {
        res.redirect('/login');
    }
});
////////////////////////////WAITING ROOM ROUTE///////////////////////////////////////////
// Waiting Room Route
app.get('/waitingroom', (req, res) => {
    if (req.session.loggedin) {
        const sessionId = req.query.session_id;
        const userName = req.session.user_name;
        const currentTime = new Date();

        if (!sessionId) {
            console.error('No session_id provided.');
            return res.status(400).send('Session ID is required.');
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

        // Main logic
        getUserId()
            .then((userId) => {
                checkExistingSession(userId, sessionId)
                    .then((sessionExists) => {
                        if (sessionExists) {
                            // User is already in the session, render waiting room
                            console.log('User already in the session');

                            getPlayersInSession(sessionId)
                                .then((players) => {
                                    res.render('waitingroom', {
                                        session_id: sessionId,
                                        user_name: userName,
                                        players: players
                                    });

                                    // Emit event to the session room for real-time update
                                    io.to(sessionId).emit('updatePlayers', players);
                                })
                                .catch((err) => {
                                    console.error('Error fetching players in session:', err);
                                    res.status(500).send('Error fetching players');
                                });
                        } else {
                            // Insert the new player into the session
                            insertPlayer(userId, sessionId)
                                .then(() => {
                                    console.log('New player inserted');
                                    getPlayersInSession(sessionId)
                                        .then((players) => {
                                            res.render('waitingroom', {
                                                session_id: sessionId,
                                                user_name: userName,
                                                players: players
                                            });

                                            // Emit event to update players list
                                            io.to(sessionId).emit('updatePlayers', players);
                                        })
                                        .catch((err) => {
                                            console.error('Error fetching players in session:', err);
                                            res.status(500).send('Error fetching players');
                                        });
                                })
                                .catch((err) => {
                                    console.error('Failed to insert player:', err);
                                    res.status(500).send('Error inserting player');
                                });
                        }
                    })
                    .catch((err) => {
                        console.error('Error checking existing session:', err);
                        res.status(500).send('Error checking existing session');
                    });
            })
            .catch((err) => {
                console.error('Error fetching user_id:', err);
                res.status(500).send('Error fetching user_id');
            });
    } else {
        res.redirect('/login');
    }
});


//////////////////////////////////////////////////////////////////////////////
app.get('/start-game', (req, res) => {
    const sessionId = req.query.session_id;  // Get session_id from the query string

    if (!sessionId) {
        return res.status(400).send('Session ID is required');
    }

    // Start the game for the session, check if the session is valid
    const startGame = () => {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE sessions SET game_started = 1 WHERE session_id = ?';
            db.query(sql, [sessionId], (err, result) => {
                if (err) {
                    return reject('Error starting game');
                }
                resolve();
            });
        });
    };

    startGame()
        .then(() => {
            // Redirect users in this session to the game page
            res.redirect(`/game?session_id=${sessionId}`);
        })
        .catch((err) => {
            console.error('Error starting the game:', err);
            res.status(500).send('Error starting the game');
        });
});




//////////////////////////////////////////////
 app.get('/game', (req, res) => {
    const sessionId = req.query.session_id;  // The session_id passed from the start game page
    if (!sessionId) {
        return res.status(400).send('Session ID is required.');
    }

    // Fetch the players for the given session_id
    const getPlayersInGame = () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT u.user_name FROM players p
                JOIN users u ON p.user_id = u.user_id
                WHERE p.session_id = ?`;
            db.query(sql, [sessionId], (err, results) => {
                if (err) {
                    return reject('Error fetching players in the game');
                }
                resolve(results);  // List of user names in the game
            });
        });
    };

    // Fetch players and render the game page
    getPlayersInGame()
        .then((players) => {
            res.render('game', {
                session_id: sessionId,
                players: players  // List of participants in the game
            });
        })
        .catch((err) => {
            console.error('Error fetching players in game:', err);
            res.status(500).send('Error fetching players in game');
        });
});



app.get('/check-game-status', (req, res) => {
    const sessionId = req.query.session_id;
    
    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    // Query to check if the game has started
    const sql = 'SELECT game_started FROM players WHERE session_id = ? LIMIT 1';
    db.query(sql, [sessionId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error checking game status' });
        }

        if (results.length > 0 && results[0].game_started === 1) {
            res.json({ game_started: true });
        } else {
            res.json({ game_started: false });
        }
    });
});




app.get('/get-players', (req, res) => {
    const sessionId = req.query.session_id;

    if (!sessionId) {
        return res.status(400).send('Session ID is required');
    }

    // Fetch all players for the session
    const sql = 'SELECT u.user_name FROM players p JOIN users u ON p.user_id = u.user_id WHERE p.session_id = ?';
    db.query(sql, [sessionId], (err, results) => {
        if (err) {
            return res.status(500).send('Error fetching players');
        }

        // Return the list of players
        res.json({ players: results });
    });
});



/////////////////////////////////////////////////////////////////////////////////


// 10. Public Routes for Login:
// Root route - redirect to home page
app.get('/', (req, res) => {
  res.redirect('/home');
});

app.use('/', loginRoutes);  // Login page & logic
app.use('/', registerRoutes);  // Register page & logic

app.use('/home', homeRoutes);  // Home page route (main/first page)
app.use('/gameee', gameeeRoutes);  // Gameee page route
app.use('/endgamesession', endgamesessionRoutes);  // End game session page route
app.use('/leaderboard', leaderboardRoutes);  // Leaderboard page route
app.use('/', adminRoutes);
app.use('/', userManagementRoutes);
app.use('/', questionManagementRoutes);
app.use('/css', express.static(questionManagementRoutes + '/public/css'));
// In your app.js or server.js:
app.use('/uploads', express.static('/mnt/data'));



// Additional routes
console.log('Setting up homeP route...');
app.use('/homeP', homePRoutes);  // HomeP page route (accessible via localhost:3002/homeP)
console.log('HomeP route set up successfully');

console.log('Setting up loginjoinP route...');
app.use('/loginjoinP', loginjoinPRoutes);  // LoginjoinP page route (login & join session)
console.log('LoginjoinP route set up successfully');

console.log('Setting up registerP route...');
app.use('/registerP', registerPRoutes);  // RegisterP page route (registration for loginjoinP)
console.log('RegisterP route set up successfully');

console.log('Setting up waitingroomP route...');
app.use('/waitingroomP', waitingroomPRoutes);  // WaitingroomP page route (waiting room for loginjoinP)
console.log('WaitingroomP route set up successfully');

console.log('Setting up scoretrackingP route...');
app.use('/scoretrackingP', scoretrackingPRoutes);  // ScoretrackingP page route (score tracking for active games)
console.log('ScoretrackingP route set up successfully');

console.log('Setting up gameresult route...');
app.use('/gameresult', gameresultRoutes);  // GameResult page route (final game results)
console.log('GameResult route set up successfully');

console.log('Setting up rules route...');
app.use('/rulesss', rulesssRoutes);
console.log('Rules route set up successfully');


console.log('Setting up question management route...');
app.use('/question-management', questionManagementRoutes);
console.log('Question management route set up successfully.');

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle joining a session room
  socket.on('joinSession', (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined session: ${sessionId}`);
  });

  // Handle starting a game
  socket.on('startGame', (sessionId) => {
    console.log(`Starting game for session: ${sessionId}`);
    
    // Update game_started to 1 for all players in this session
    const updateQuery = 'UPDATE players SET game_started = 1 WHERE session_id = ? AND game_started = 0';
    
    db.query(updateQuery, [sessionId], (err, result) => {
      if (err) {
        console.error('Error updating game_started:', err);
        return;
      }
      
      console.log('=== GAME STARTED ===');
      console.log('Session ID:', sessionId);
      console.log('Rows affected:', result.affectedRows);
      
      // Emit game started event to all clients in the session
      io.to(sessionId).emit('gameStarted', {
        sessionId: sessionId,
        message: 'Game has started!'
      });
      
      console.log(`Game started event emitted to session: ${sessionId}`);
    });
  });

  // Handle score updates
  socket.on('scoreUpdate', (data) => {
    const { sessionId, userId, newScore, playerName } = data;
    console.log(`Score update for session ${sessionId}: ${playerName} - ${newScore}`);
    
    // Update the score in the database
    const updateScoreQuery = 'UPDATE players SET score = ? WHERE session_id = ? AND user_id = ?';
    
    db.query(updateScoreQuery, [newScore, sessionId, userId], (err, result) => {
      if (err) {
        console.error('Error updating score:', err);
        return;
      }
      
      // Get updated player list for the session
      const getPlayersQuery = `
        SELECT p.user_id, u.user_name, p.score, p.game_started, COALESCE(p.score, 0) as current_score
        FROM players p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.session_id = ?
        ORDER BY p.score DESC, u.user_name ASC
      `;
      
      db.query(getPlayersQuery, [sessionId], (err2, players) => {
        if (err2) {
          console.error('Error fetching updated players:', err2);
          return;
        }
        
        // Emit score update to all clients in the session
        io.to(sessionId).emit('scoreUpdate', {
          sessionId: sessionId,
          players: players,
          playerName: playerName
        });
      });
    });
  });

  // Handle game end
  socket.on('endGame', (sessionId) => {
    console.log(`Ending game for session: ${sessionId}`);
    
    // Update game_started to 2 for all players in this session
    const endGameQuery = 'UPDATE players SET game_started = 2, end_time = ? WHERE session_id = ? AND game_started = 1';
    const currentTime = new Date();
    
    db.query(endGameQuery, [currentTime, sessionId], (err, result) => {
      if (err) {
        console.error('Error ending game:', err);
        return;
      }
      
      console.log('=== GAME ENDED ===');
      console.log('Session ID:', sessionId);
      console.log('End time:', currentTime);
      console.log('Rows affected:', result.affectedRows);
      
      // Emit game ended event to all clients in the session
      io.to(sessionId).emit('gameEnded', {
        sessionId: sessionId,
        message: 'Game has ended!'
      });
    });
  });

  // Handle player updates
  socket.on('updatePlayers', (sessionId) => {
    // Get current players in the session
    const getPlayersQuery = `
      SELECT u.user_name FROM players p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.session_id = ?
    `;
    
    db.query(getPlayersQuery, [sessionId], (err, players) => {
      if (err) {
        console.error('Error fetching players for update:', err);
        return;
      }
      
      // Emit updated player list to all clients in the session
      io.to(sessionId).emit('updatePlayers', players);
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

console.log('Socket.IO event handlers set up successfully');


// 11. Start Server:
server.listen(3002, () => {
  console.log("Example app listening on port 3002!");
  console.log("Socket.IO server is ready for real-time communication");
});
 