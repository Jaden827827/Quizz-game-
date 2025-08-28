# Quizz Game

A multiplayer quiz game web application built with Node.js, Express, MySQL, Socket.IO, and Pug. Players can join or create game sessions, compete in real time, and track scores. Includes admin and question management features.

## Features
- User registration and login
- Create or join game sessions (up to 4 players per session)
- Real-time waiting room and game updates (Socket.IO)
- Score tracking and leaderboard
- Admin panel for user and question management
- QR code support for joining sessions
- Secure sessions and HTTPS support

## Technologies Used
- Node.js, Express.js
- MySQL (mysql2)
- Socket.IO
- Pug (template engine)
- Express-session for session management
- bcryptjs for password hashing
- QR code libraries

## Getting Started

### Prerequisites
- Node.js and npm installed
- MySQL server running

### Installation
1. Clone the repository:
   ```sh
   git clone <repo-url>
   cd Quizz-game-
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up your MySQL database and update credentials in `assignment.js` if needed.
4. (Optional) Set up SSL certificates in the `ssl/` directory for HTTPS.

### Running the Application
```sh
node assignment.js
```
The server will start on [http://localhost:3002](http://localhost:3002).

### Folder Structure
- `assignment.js` - Main server file
- `routes/` - Express route handlers
- `views/` - Pug templates
- `public/` - Static assets (CSS, JS, images, music)
- `ssl/` - SSL certificates

## Usage
- Register or log in as a user
- Create or join a game session
- Wait for other players in the waiting room
- Start the game and answer questions
- View scores and leaderboard
- Admins can manage users and questions

## License
This project is licensed under the ISC License.
