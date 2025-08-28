// scoretrackingBGM.js - BGM System for ScoreTracking → Leaderboard using music3.mp3

// Global music system for scoretracking and leaderboard pages
window.scoreLeaderboardMusicSystem = window.scoreLeaderboardMusicSystem || {
    audio: null,
    isPlaying: false,
    volume: 0.5,
    currentTime: 0,
    autoStartEnabled: true,
    initialized: false
};

document.addEventListener('DOMContentLoaded', function() {
    const slms = window.scoreLeaderboardMusicSystem;
    
    // Initialize scoretracking BGM if not already initialized
    if (!slms.initialized) {
        slms.audio = new Audio('/music/music3.mp3');
        slms.audio.loop = true;
        slms.audio.volume = slms.volume;
        
        // Load saved settings for scoretracking BGM
        const savedVolume = localStorage.getItem('scoretracking-bgm-volume');
        const savedState = localStorage.getItem('scoretracking-bgm-playing');
        const savedTime = localStorage.getItem('scoretracking-bgm-current-time');
        
        if (savedVolume) {
            slms.volume = parseFloat(savedVolume);
            slms.audio.volume = slms.volume;
        }
        
        if (savedTime) {
            slms.currentTime = parseFloat(savedTime);
            slms.audio.currentTime = slms.currentTime;
        }
        
        // Audio event listeners for scoretracking BGM
        slms.audio.addEventListener('timeupdate', function() {
            slms.currentTime = this.currentTime;
            localStorage.setItem('scoretracking-bgm-current-time', slms.currentTime);
        });
        
        slms.audio.addEventListener('play', function() {
            slms.isPlaying = true;
            localStorage.setItem('scoretracking-bgm-playing', 'true');
        });
        
        slms.audio.addEventListener('pause', function() {
            slms.isPlaying = false;
            localStorage.setItem('scoretracking-bgm-playing', 'false');
        });
        
        slms.audio.addEventListener('loadeddata', () => {
            console.log('ScoreTracking BGM (music3.mp3) loaded successfully');
            if (slms.autoStartEnabled) {
                setTimeout(attemptAutoPlay, 100);
            }
        });
        
        slms.audio.addEventListener('error', (e) => {
            console.error('ScoreTracking BGM failed to load:', e);
        });
        
        slms.initialized = true;
    }
    
    // Page-specific UI controls for scoretracking
    const toggleButton = document.getElementById('toggle-bgm-btn-scoretracking');
    const volumeSlider = document.getElementById('volume-slider-scoretracking');
    const volumePercent = document.getElementById('volume-percent-scoretracking');
    const autoClickTrigger = document.getElementById('auto-click-trigger-scoretracking');
    
    // Also check for leaderboard controls
    const leaderboardToggleButton = document.getElementById('toggle-bgm-btn-leaderboard');
    const leaderboardVolumeSlider = document.getElementById('volume-slider-leaderboard');
    const leaderboardVolumePercent = document.getElementById('volume-percent-leaderboard');
    const leaderboardAutoClickTrigger = document.getElementById('auto-click-trigger-leaderboard');
    
    // Update UI if scoretracking controls exist on this page
    if (toggleButton) {
        updateToggleButton(toggleButton);
        toggleButton.addEventListener('click', toggleBGM);
    }
    
    if (volumeSlider && volumePercent) {
        volumeSlider.value = Math.round(slms.volume * 100);
        volumePercent.textContent = Math.round(slms.volume * 100) + '%';
        
        volumeSlider.addEventListener('input', function() {
            const volume = this.value / 100;
            slms.volume = volume;
            slms.audio.volume = volume;
            volumePercent.textContent = this.value + '%';
            localStorage.setItem('scoretracking-bgm-volume', volume);
        });
    }
    
    // Update UI if leaderboard controls exist on this page
    if (leaderboardToggleButton) {
        updateToggleButton(leaderboardToggleButton);
        leaderboardToggleButton.addEventListener('click', toggleBGM);
    }
    
    if (leaderboardVolumeSlider && leaderboardVolumePercent) {
        leaderboardVolumeSlider.value = Math.round(slms.volume * 100);
        leaderboardVolumePercent.textContent = Math.round(slms.volume * 100) + '%';
        
        leaderboardVolumeSlider.addEventListener('input', function() {
            const volume = this.value / 100;
            slms.volume = volume;
            slms.audio.volume = volume;
            leaderboardVolumePercent.textContent = this.value + '%';
            localStorage.setItem('scoretracking-bgm-volume', volume);
        });
    }
    
    // Automatic music start with click simulation
    function autoStartMusic() {
        if (!slms.isPlaying) {
            // Try to restore previous position
            if (slms.currentTime > 0) {
                slms.audio.currentTime = slms.currentTime;
            }
            
            // Try to play immediately
            slms.audio.play().then(() => {
                console.log('🎵 ScoreTracking music3.mp3 started automatically');
            }).catch(() => {
                // If autoplay is blocked, simulate a click
                setTimeout(() => {
                    simulateClick();
                }, 100);
            });
        }
    }
    
    // Simulate click to bypass autoplay restrictions
    function simulateClick() {
        const autoClickBtn = autoClickTrigger || leaderboardAutoClickTrigger;
        if (autoClickBtn) {
            console.log('🎵 Attempting auto-click to start scoretracking music...');
            
            // Add click listener to auto trigger
            const clickHandler = function() {
                slms.audio.play().then(() => {
                    console.log('🎵 Music3.mp3 started via auto-click');
                }).catch(console.log);
                
                // Remove listener after use
                autoClickBtn.removeEventListener('click', clickHandler);
            };
            
            autoClickBtn.addEventListener('click', clickHandler);
            
            // Simulate the click automatically
            setTimeout(() => {
                autoClickBtn.click();
            }, 50);
        }
    }
    
    // Try multiple methods to start music
    function attemptAutoPlay() {
        // Method 1: Direct play
        autoStartMusic();
        
        // Method 2: Delayed attempt
        setTimeout(() => {
            if (!slms.isPlaying) {
                autoStartMusic();
            }
        }, 500);
        
        // Method 3: Auto-click after page interaction
        setTimeout(() => {
            if (!slms.isPlaying && (autoClickTrigger || leaderboardAutoClickTrigger)) {
                console.log('🎵 Triggering auto-click for scoretracking music...');
                simulateClick();
            }
        }, 1000);
        
        // Method 4: User interaction detection
        const userInteractionEvents = ['click', 'mousedown', 'keydown', 'touchstart'];
        const startOnInteraction = function() {
            if (!slms.isPlaying) {
                slms.audio.play().catch(console.log);
            }
            // Remove listeners after first interaction
            userInteractionEvents.forEach(event => {
                document.removeEventListener(event, startOnInteraction);
            });
        };
        
        userInteractionEvents.forEach(event => {
            document.addEventListener(event, startOnInteraction, { once: true });
        });
    }
    
    function toggleBGM() {
        if (slms.isPlaying) {
            slms.audio.pause();
        } else {
            slms.audio.play().catch(console.log);
        }
        updateAllToggleButtons();
    }
    
    function updateToggleButton(button) {
        if (button) {
            button.textContent = slms.isPlaying ? '⏸️ Pause Music' : '▶️ Play Music';
        }
    }
    
    function updateAllToggleButtons() {
        updateToggleButton(toggleButton);
        updateToggleButton(leaderboardToggleButton);
    }
    
    // Auto-click trigger event listeners
    if (autoClickTrigger) {
        autoClickTrigger.addEventListener('click', () => {
            console.log('Auto-click triggered for scoretracking BGM');
        });
    }
    
    if (leaderboardAutoClickTrigger) {
        leaderboardAutoClickTrigger.addEventListener('click', () => {
            console.log('Auto-click triggered for leaderboard BGM');
        });
    }
    
    // Start auto-play attempts if music should be playing
    const savedState = localStorage.getItem('scoretracking-bgm-playing');
    if (savedState === 'true' || !savedState) { // Start by default if no saved state
        setTimeout(attemptAutoPlay, 200);
    }
    
    // Ensure audio continues playing when loaded
    if (slms.isPlaying && slms.audio.paused) {
        slms.audio.play().catch(console.log);
    }
    
    // Also try when the page becomes visible (if user switched tabs)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && slms.isPlaying && slms.audio.paused) {
            setTimeout(() => autoStartMusic(), 200);
        }
    });
    
    // Save current time before page unload
    window.addEventListener('beforeunload', () => {
        if (slms.audio && slms.isPlaying) {
            slms.currentTime = slms.audio.currentTime;
            localStorage.setItem('scoretracking-bgm-current-time', slms.currentTime);
        }
    });
});
