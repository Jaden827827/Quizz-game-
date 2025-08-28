// bgm.js - Global Background Music System

// Global music system attached to window for persistence
window.globalMusicSystem = window.globalMusicSystem || {
    audio: null,
    isPlaying: false,
    currentVolume: 0.5,
    currentTime: 0,
    initialized: false
};

document.addEventListener('DOMContentLoaded', function() {
    const gms = window.globalMusicSystem;
    
    // Initialize global audio if not exists
    if (!gms.initialized) {
        gms.audio = new Audio('/music/music1.mp3');
        gms.audio.loop = true;
        gms.audio.volume = gms.currentVolume;
        
        // Load saved settings
        const savedVolume = localStorage.getItem('bgm-volume');
        const savedState = localStorage.getItem('bgm-playing');
        const savedTime = localStorage.getItem('bgm-current-time');
        
        if (savedVolume) {
            gms.currentVolume = parseFloat(savedVolume);
            gms.audio.volume = gms.currentVolume;
        }
        
        if (savedTime) {
            gms.currentTime = parseFloat(savedTime);
            gms.audio.currentTime = gms.currentTime;
        }
        
        // Audio event listeners for global system
        gms.audio.addEventListener('timeupdate', function() {
            gms.currentTime = this.currentTime;
            localStorage.setItem('bgm-current-time', gms.currentTime);
        });
        
        gms.audio.addEventListener('play', function() {
            gms.isPlaying = true;
            localStorage.setItem('bgm-playing', 'true');
        });
        
        gms.audio.addEventListener('pause', function() {
            gms.isPlaying = false;
            localStorage.setItem('bgm-playing', 'false');
        });
        
        gms.initialized = true;
    }
    
    // Page-specific UI controls
    const toggleButton = document.getElementById('toggle-bgm-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const volumePercent = document.getElementById('volume-percent');
    const autoClickTrigger = document.getElementById('auto-click-trigger');
    
    // Update UI if controls exist on this page
    if (toggleButton) {
        updateToggleButton();
        toggleButton.addEventListener('click', toggleBGM);
    }
    
    if (volumeSlider && volumePercent) {
        volumeSlider.value = Math.round(gms.currentVolume * 100);
        volumePercent.textContent = Math.round(gms.currentVolume * 100) + '%';
        
        volumeSlider.addEventListener('input', function() {
            const volume = this.value / 100;
            gms.currentVolume = volume;
            gms.audio.volume = volume;
            volumePercent.textContent = this.value + '%';
            localStorage.setItem('bgm-volume', volume);
        });
    }
    
    // Automatic music start with click simulation
    function autoStartMusic() {
        if (!gms.isPlaying) {
            // Try to play immediately
            gms.audio.play().then(() => {
                console.log('🎵 Global music1.mp3 started automatically');
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
        if (autoClickTrigger) {
            console.log('🎵 Attempting auto-click to start global music...');
            
            // Add click listener to auto trigger
            const clickHandler = function() {
                gms.audio.play().then(() => {
                    console.log('🎵 Music1.mp3 started via auto-click');
                }).catch(console.log);
                
                // Remove listener after use
                autoClickTrigger.removeEventListener('click', clickHandler);
            };
            
            autoClickTrigger.addEventListener('click', clickHandler);
            
            // Simulate the click automatically
            setTimeout(() => {
                autoClickTrigger.click();
            }, 50);
        }
    }
    
    // Try multiple methods to start music
    function attemptAutoPlay() {
        // Method 1: Direct play
        autoStartMusic();
        
        // Method 2: Delayed attempt
        setTimeout(() => {
            if (!gms.isPlaying) {
                autoStartMusic();
            }
        }, 500);
        
        // Method 3: Auto-click after page interaction
        setTimeout(() => {
            if (!gms.isPlaying && autoClickTrigger) {
                console.log('🎵 Triggering auto-click for global music...');
                simulateClick();
            }
        }, 1000);
        
        // Method 4: User interaction detection
        const userInteractionEvents = ['click', 'mousedown', 'keydown', 'touchstart'];
        const startOnInteraction = function() {
            if (!gms.isPlaying) {
                gms.audio.play().catch(console.log);
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
        if (gms.isPlaying) {
            gms.audio.pause();
        } else {
            gms.audio.play().catch(console.log);
        }
        updateToggleButton();
    }
    
    function updateToggleButton() {
        if (toggleButton) {
            toggleButton.textContent = gms.isPlaying ? '⏸️ Pause' : '▶️ Play';
        }
    }
    
    // Start auto-play attempts if music should be playing
    const savedState = localStorage.getItem('bgm-playing');
    if (savedState === 'true' || !savedState) { // Start by default if no saved state
        attemptAutoPlay();
    }
    
    // Ensure audio continues playing when loaded
    if (gms.isPlaying && gms.audio.paused) {
        gms.audio.play().catch(console.log);
    }
    
    // Also try when the page becomes visible (if user switched tabs)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && gms.isPlaying && gms.audio.paused) {
            setTimeout(() => autoStartMusic(), 200);
        }
    });
});