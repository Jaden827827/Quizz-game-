// /public/js/waitingroomP.js - Client-side functionality for WaitingroomP

document.addEventListener('DOMContentLoaded', function() {
    console.log('WaitingroomP page loaded');

    // Initialize page elements
    const sessionId = document.getElementById('sessionId')?.textContent;
    const startBtn = document.getElementById('start-game-btn');
    const copyBtn = document.getElementById('copy-session-btn');
    const playersList = document.getElementById('playersList');

    // Auto-refresh player list every 30 seconds
    setInterval(() => {
        refreshPlayersList();
    }, 30000);

    // Add visual feedback for buttons
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add loading state
            this.textContent = 'Starting Game...';
            this.disabled = true;
            this.style.backgroundColor = '#ccc';
            
            // Create loading animation
            const loader = document.createElement('div');
            loader.className = 'button-loader';
            loader.style.cssText = `
                width: 20px;
                height: 20px;
                border: 2px solid #fff;
                border-top: 2px solid transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                display: inline-block;
                margin-left: 10px;
            `;
            this.appendChild(loader);
            
            // Call the startGame function from the Pug template
            if (typeof startGame === 'function') {
                startGame();
            }
        });
    }

    // Enhanced copy functionality
    if (copyBtn) {
        copyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            copySessionIdEnhanced();
        });
    }

    // Add player count monitoring
    monitorPlayerCount();

    // Add sound effects (optional)
    initializeSoundEffects();

    // Auto-scroll to new players
    observePlayerListChanges();
});

// Enhanced copy session ID function
function copySessionIdEnhanced() {
    const sessionIdElement = document.getElementById('sessionId');
    const copyBtn = document.getElementById('copy-session-btn');
    
    if (!sessionIdElement || !copyBtn) return;
    
    const sessionIdText = sessionIdElement.textContent.trim();
    
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(sessionIdText).then(() => {
            showCopySuccess(copyBtn);
        }).catch(() => {
            fallbackCopyToClipboard(sessionIdText, copyBtn);
        });
    } else {
        fallbackCopyToClipboard(sessionIdText, copyBtn);
    }
}

// Fallback copy method for older browsers
function fallbackCopyToClipboard(text, button) {
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
        showCopySuccess(button);
    } catch (err) {
        console.error('Failed to copy: ', err);
        showCopyError(button);
    } finally {
        document.body.removeChild(textArea);
    }
}

// Show copy success feedback
function showCopySuccess(button) {
    const originalText = button.textContent;
    const originalColor = button.style.backgroundColor;
    
    button.textContent = 'Copied!';
    button.style.backgroundColor = '#28a745';
    button.classList.add('copied');
    
    // Add checkmark animation
    const checkmark = document.createElement('span');
    checkmark.innerHTML = ' ✓';
    checkmark.style.animation = 'fadeIn 0.3s ease-in';
    button.appendChild(checkmark);
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = originalColor;
        button.classList.remove('copied');
    }, 2000);
}

// Show copy error feedback
function showCopyError(button) {
    const originalText = button.textContent;
    button.textContent = 'Failed';
    button.style.backgroundColor = '#dc3545';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
    }, 2000);
}

// Refresh players list function
function refreshPlayersList() {
    const sessionId = document.getElementById('sessionId')?.textContent;
    if (!sessionId) return;
    
    fetch(`/get-players?session_id=${sessionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.players) {
                updatePlayersListEnhanced(data.players);
            }
        })
        .catch(error => {
            console.error('Error refreshing players list:', error);
        });
}

// Enhanced update players list with animations
function updatePlayersListEnhanced(players) {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    const currentPlayers = Array.from(playersList.children).map(li => li.textContent);
    const newPlayerNames = players.map(player => player.user_name);
    
    // Find new players
    const newPlayers = newPlayerNames.filter(name => !currentPlayers.includes(name));
    
    // Clear and rebuild list
    playersList.innerHTML = '';
    
    players.forEach((player, index) => {
        const li = document.createElement('li');
        li.className = 'player-item';
        li.textContent = player.user_name;
        
        // Add animation for new players
        if (newPlayers.includes(player.user_name)) {
            li.classList.add('new-player');
        }
        
        // Stagger animations
        li.style.animationDelay = `${index * 0.1}s`;
        
        playersList.appendChild(li);
    });
    
    // Update player count
    updatePlayerCount(players.length);
    
    // Show notification for new players
    if (newPlayers.length > 0) {
        showNewPlayerNotification(newPlayers);
    }
}

// Monitor player count and show status
function monitorPlayerCount() {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    // Create player count display
    const countDisplay = document.createElement('div');
    countDisplay.id = 'player-count';
    countDisplay.style.cssText = `
        text-align: center;
        margin: 1rem 0;
        font-weight: bold;
        color: #666;
        font-size: 1.1rem;
    `;
    
    const participantsSection = document.querySelector('.participants-section');
    if (participantsSection) {
        participantsSection.insertBefore(countDisplay, participantsSection.querySelector('.players-container'));
    }
    
    // Initial count
    updatePlayerCount(playersList.children.length);
}

// Update player count display
function updatePlayerCount(count) {
    const countDisplay = document.getElementById('player-count');
    if (!countDisplay) return;
    
    const maxPlayers = 4;
    countDisplay.innerHTML = `
        <span style="color: #4CAF50;">${count}</span> / ${maxPlayers} Players
        ${count >= maxPlayers ? '<span style="color: #ff6b6b;"> (Room Full)</span>' : ''}
    `;
}

// Show notification for new players
function showNewPlayerNotification(newPlayers) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideInRight 0.5s ease-out;
    `;
    
    notification.innerHTML = `
        <strong>New Player${newPlayers.length > 1 ? 's' : ''} Joined!</strong><br>
        ${newPlayers.join(', ')}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Initialize sound effects (optional)
function initializeSoundEffects() {
    // Add subtle sound effects for better UX
    const audioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) return;
    
    // Create simple beep for notifications
    window.playNotificationSound = function() {
        try {
            const ctx = new audioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.3);
        } catch (e) {
            console.log('Audio not supported');
        }
    };
}

// Observe player list changes for auto-scroll
function observePlayerListChanges() {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Auto-scroll to new player
                const newPlayer = Array.from(mutation.addedNodes).find(node => 
                    node.nodeType === 1 && node.classList.contains('new-player')
                );
                
                if (newPlayer) {
                    setTimeout(() => {
                        newPlayer.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                    }, 100);
                    
                    // Play notification sound
                    if (window.playNotificationSound) {
                        window.playNotificationSound();
                    }
                }
            }
        });
    });
    
    observer.observe(playersList, { childList: true, subtree: true });
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .button-loader {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
