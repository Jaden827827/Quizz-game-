// ScoretrackingP Enhanced Client-side JavaScript

class ScoreTracker {
    constructor(sessionId, currentUserId) {
        this.sessionId = sessionId;
        this.currentUserId = currentUserId;
        this.socket = io();
        this.gameStartTime = new Date();
        this.intervals = {
            timer: null,
            autoRefresh: null,
            statusCheck: null
        };
        
        this.init();
    }

    init() {
        // Join session room for real-time updates
        this.socket.emit('joinSession', this.sessionId);
        
        // Set up socket listeners
        this.setupSocketListeners();
        
        // Start intervals
        this.startGameTimer();
        this.startAutoRefresh();
        this.startStatusCheck();
        
        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('ScoreTracker initialized for session:', this.sessionId);
    }

    setupSocketListeners() {
        // Listen for score updates
        this.socket.on('scoreUpdate', (data) => {
            if (data.sessionId === this.sessionId) {
                this.updateScoreboard(data.players);
                this.showNotification(`🎯 ${data.playerName} scored!`, 'success');
                this.playNotificationSound();
            }
        });

        // Listen for player join/leave
        this.socket.on('playerUpdate', (data) => {
            if (data.sessionId === this.sessionId) {
                this.updateScoreboard(data.players);
                this.showNotification(`👋 Player activity updated`, 'info');
            }
        });

        // Listen for game end
        this.socket.on('gameEnded', (data) => {
            if (data.sessionId === this.sessionId) {
                this.handleGameEnd();
            }
        });

        // Handle connection status
        this.socket.on('connect', () => {
            this.showNotification('🔗 Connected to live updates', 'success');
        });

        this.socket.on('disconnect', () => {
            this.showNotification('⚠️ Connection lost. Trying to reconnect...', 'warning');
        });

        this.socket.on('reconnect', () => {
            this.showNotification('✅ Reconnected! Refreshing scores...', 'success');
            this.refreshScores();
        });
    }

    updateScoreboard(players) {
        const scoreboard = document.getElementById('players-scoreboard');
        if (!scoreboard) return;

        // Sort players by score (descending) then by name
        const sortedPlayers = players.sort((a, b) => {
            if (b.current_score !== a.current_score) {
                return b.current_score - a.current_score;
            }
            return a.user_name.localeCompare(b.user_name);
        });

        scoreboard.innerHTML = '';

        sortedPlayers.forEach((player, index) => {
            const row = this.createPlayerRow(player, index + 1);
            scoreboard.appendChild(row);
        });

        // Highlight position changes
        this.highlightChanges();
    }

    createPlayerRow(player, rank) {
        const row = document.createElement('div');
        row.className = `player-score-row ${player.user_id === this.currentUserId ? 'current-user' : ''}`;
        row.setAttribute('data-user-id', player.user_id);
        row.setAttribute('data-rank', rank);

        // Add rank styling
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-first';
        else if (rank === 2) rankClass = 'rank-second';
        else if (rank === 3) rankClass = 'rank-third';

        row.innerHTML = `
            <div class="rank-col ${rankClass}">
                ${this.getRankDisplay(rank)}
            </div>
            <div class="player-col">
                <span class="player-name">${this.escapeHtml(player.user_name)}</span>
                ${player.user_id === this.currentUserId ? '<span class="you-indicator">(You)</span>' : ''}
            </div>
            <div class="score-col">
                <span class="score-value" data-score="${player.current_score || 0}">
                    ${player.current_score || 0}
                </span>
            </div>
            <div class="status-col">
                <span class="status-badge ${player.game_started === 2 ? 'finished' : 'playing'}">
                    ${player.game_started === 2 ? '✅ Finished' : '🎮 Playing'}
                </span>
            </div>
        `;

        return row;
    }

    getRankDisplay(rank) {
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        return medals[rank] || rank;
    }

    highlightChanges() {
        // Add animation to score changes
        const scoreElements = document.querySelectorAll('.score-value');
        scoreElements.forEach(element => {
            const currentScore = parseInt(element.dataset.score);
            const displayedScore = parseInt(element.textContent);
            
            if (currentScore !== displayedScore) {
                element.classList.add('score-updated');
                setTimeout(() => {
                    element.classList.remove('score-updated');
                }, 1000);
            }
        });
    }

    async copySessionId() {
        const sessionIdElement = document.getElementById('session-id');
        const copyBtn = sessionIdElement.parentElement.querySelector('.copy-btn');
        
        try {
            await navigator.clipboard.writeText(this.sessionId);
            this.updateCopyButton(copyBtn, true);
            this.showNotification('📋 Session ID copied to clipboard!', 'success');
        } catch (error) {
            // Fallback for older browsers
            this.fallbackCopy(this.sessionId);
            this.updateCopyButton(copyBtn, true);
        }
    }

    updateCopyButton(button, success) {
        const originalText = button.textContent;
        button.textContent = success ? '✅ Copied!' : '❌ Failed';
        button.style.backgroundColor = success ? '#28a745' : '#dc3545';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '';
        }, 2000);
    }

    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (error) {
            console.error('Fallback copy failed:', error);
        }
        
        document.body.removeChild(textArea);
    }

    async refreshScores() {
        try {
            const response = await fetch(`/scoretrackingP/api/scores/${this.sessionId}`);
            if (!response.ok) throw new Error('Failed to fetch scores');
            
            const data = await response.json();
            this.updateScoreboard(data.players);
            this.showNotification('🔄 Scores refreshed!', 'success');
            
        } catch (error) {
            console.error('Error refreshing scores:', error);
            this.showNotification('❌ Failed to refresh scores', 'error');
        }
    }

    startGameTimer() {
        const timerElement = document.getElementById('game-timer');
        if (!timerElement) return;

        this.intervals.timer = setInterval(() => {
            const now = new Date();
            const elapsed = Math.floor((now - this.gameStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    startAutoRefresh() {
        // Auto-refresh scores every 15 seconds
        this.intervals.autoRefresh = setInterval(() => {
            this.refreshScores();
        }, 15000);
    }

    startStatusCheck() {
        // Check game status every 10 seconds
        this.intervals.statusCheck = setInterval(async () => {
            try {
                const response = await fetch(`/scoretrackingP/api/game-status/${this.sessionId}`);
                if (!response.ok) return;
                
                const data = await response.json();
                if (data.gameEnded) {
                    this.handleGameEnd();
                }
            } catch (error) {
                console.error('Error checking game status:', error);
            }
        }, 10000);
    }

    handleGameEnd() {
        this.updateGameStatus('🏁 Game Finished');
        this.clearIntervals();
        this.showNotification('🎉 Game has ended! Redirecting to leaderboard...', 'success');
        
        // Add confetti effect
        this.showConfetti();
        
        setTimeout(() => {
            this.goToLeaderboard();
        }, 5000);
    }

    updateGameStatus(status) {
        const statusElement = document.getElementById('game-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.classList.add('game-ended');
        }
    }

    clearIntervals() {
        Object.values(this.intervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });
    }

    showConfetti() {
        // Simple confetti effect
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = this.getRandomColor();
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confettiContainer.appendChild(confetti);
        }

        setTimeout(() => {
            document.body.removeChild(confettiContainer);
        }, 5000);
    }

    getRandomColor() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f39c12', '#9b59b6', '#e74c3c'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    goToLeaderboard() {
        window.location.href = '/leaderboard';
    }

    backToWaiting() {
        window.location.href = `/waitingroomP?session_id=${this.sessionId}`;
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('score-notification');
        if (!notification) return;

        const text = notification.querySelector('.notification-text');
        text.textContent = message;
        
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.closeNotification();
        }, 5000);
    }

    closeNotification() {
        const notification = document.getElementById('score-notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    playNotificationSound() {
        // Create a simple notification sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Ignore audio errors
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // R key to refresh
            if (event.key === 'r' || event.key === 'R') {
                event.preventDefault();
                this.refreshScores();
            }
            
            // C key to copy session ID
            if (event.key === 'c' || event.key === 'C') {
                event.preventDefault();
                this.copySessionId();
            }
            
            // L key to go to leaderboard
            if (event.key === 'l' || event.key === 'L') {
                event.preventDefault();
                this.goToLeaderboard();
            }
            
            // B key to go back
            if (event.key === 'b' || event.key === 'B') {
                event.preventDefault();
                this.backToWaiting();
            }
        });
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Cleanup when page unloads
    destroy() {
        this.clearIntervals();
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Global functions for template compatibility
let scoreTracker;

function initializeScoreTracker(sessionId, currentUserId, initialPlayers) {
    scoreTracker = new ScoreTracker(sessionId, currentUserId);
    scoreTracker.updateScoreboard(initialPlayers);
}

function copySessionId() {
    if (scoreTracker) {
        scoreTracker.copySessionId();
    }
}

function refreshScores() {
    if (scoreTracker) {
        scoreTracker.refreshScores();
    }
}

function goToLeaderboard() {
    if (scoreTracker) {
        scoreTracker.goToLeaderboard();
    }
}

function backToWaiting() {
    if (scoreTracker) {
        scoreTracker.backToWaiting();
    }
}

function closeNotification() {
    if (scoreTracker) {
        scoreTracker.closeNotification();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (scoreTracker) {
        scoreTracker.destroy();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScoreTracker;
}
