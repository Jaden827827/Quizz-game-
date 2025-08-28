// /public/js/loginjoinP.js - Client-side functionality for Login & Join Page

document.addEventListener('DOMContentLoaded', function() {
    console.log('LoginjoinP page loaded');

    // Form validation and enhancement
    const forms = document.querySelectorAll('form');
    const buttons = document.querySelectorAll('button[type="submit"]');
    
    // Add form submission handling
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const button = form.querySelector('button[type="submit"]');
            if (button) {
                // Add loading state
                button.textContent = 'Processing...';
                button.disabled = true;
                form.classList.add('loading');
                
                // Re-enable after a delay if needed (fallback)
                setTimeout(() => {
                    button.disabled = false;
                    form.classList.remove('loading');
                    if (button.classList.contains('login-btn')) {
                        button.textContent = 'Login';
                    } else if (button.classList.contains('join-btn')) {
                        button.textContent = 'Join Session';
                    }
                }, 5000);
            }
        });
    });

    // Input field enhancements
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        // Add focus/blur effects
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });

        // Real-time validation
        input.addEventListener('input', function() {
            validateInput(this);
        });
    });

    // Session ID input formatting
    const sessionIdInput = document.getElementById('session_id');
    if (sessionIdInput) {
        sessionIdInput.addEventListener('input', function(e) {
            // Convert to uppercase and limit length
            let value = e.target.value.toUpperCase();
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            e.target.value = value;
        });

        sessionIdInput.addEventListener('keypress', function(e) {
            // Only allow alphanumeric characters
            if (!/[A-Za-z0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                e.preventDefault();
            }
        });
    }

    // Password visibility toggle (if needed in future)
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        const container = input.parentElement;
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'password-toggle';
        toggleBtn.innerHTML = '👁️';
        toggleBtn.style.cssText = `
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.2rem;
        `;
        
        container.style.position = 'relative';
        container.appendChild(toggleBtn);
        
        toggleBtn.addEventListener('click', function() {
            if (input.type === 'password') {
                input.type = 'text';
                toggleBtn.innerHTML = '🙈';
            } else {
                input.type = 'password';
                toggleBtn.innerHTML = '👁️';
            }
        });
    });

    // Auto-focus first input
    const firstInput = document.querySelector('input');
    if (firstInput) {
        firstInput.focus();
    }

    // Handle URL parameters to show appropriate form
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logged_in') === 'true') {
        console.log('User logged in, showing session join form');
        // Could add additional UI enhancements here
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Enter key to submit forms
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
            const form = e.target.closest('form');
            if (form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.click();
                }
            }
        }
    });

    // Add ripple effect to buttons
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            createRipple(e, this);
        });
    });

    // Animate error messages
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.style.animation = 'shake 0.5s ease-in-out';
    }
});

// Input validation function
function validateInput(input) {
    const value = input.value.trim();
    const type = input.type;
    const name = input.name;
    
    // Remove previous validation classes
    input.classList.remove('valid', 'invalid');
    
    let isValid = true;
    
    if (type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(value);
    } else if (name === 'user_password') {
        isValid = value.length >= 6;
    } else if (name === 'session_id') {
        isValid = value.length >= 4;
    } else {
        isValid = value.length > 0;
    }
    
    if (value && isValid) {
        input.classList.add('valid');
    } else if (value && !isValid) {
        input.classList.add('invalid');
    }
    
    return isValid;
}

// Ripple effect function
function createRipple(event, button) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
    `;
    
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Add CSS for validation states
const style = document.createElement('style');
style.textContent = `
    .input-group.focused label {
        color: #4CAF50;
    }
    
    input.valid {
        border-color: #28a745;
        background-color: rgba(40, 167, 69, 0.05);
    }
    
    input.invalid {
        border-color: #dc3545;
        background-color: rgba(220, 53, 69, 0.05);
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
