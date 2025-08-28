// homeP.js

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  
  // Enhanced button functionality
  if (startBtn) {
    startBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Add loading effect
      startBtn.textContent = 'Loading...';
      startBtn.disabled = true;
      
      // Simulate loading then redirect
      setTimeout(() => {
        window.location.href = '/loginjoinP';
      }, 500);
    });
    
    // Add ripple effect on click
    startBtn.addEventListener('click', function(e) {
      const rect = startBtn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple-effect');
      
      startBtn.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  }
  
  // Optional: Add background music functionality
  const audioElement = document.getElementById('background-music');
  const toggleButton = document.getElementById('toggle-bgm-btn');

  // Function to start the background music
  function startBGM() {
    if (audioElement && audioElement.paused) {
      audioElement.play().catch(e => console.log('Audio play failed:', e));
    }
  }

  // Function to stop the background music
  function stopBGM() {
    if (audioElement && !audioElement.paused) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
  }

  // Toggle play/pause
  function toggleBGM() {
    if (audioElement) {
      if (audioElement.paused) {
        audioElement.play().catch(e => console.log('Audio play failed:', e));
      } else {
        audioElement.pause();
      }
    }
  }

  // Start BGM when the page loads (if audio element exists)
  if (audioElement) {
    startBGM();
  }

  // Toggle button functionality (if button exists)
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleBGM);
  }
});
