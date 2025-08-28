// /public/js/registerP.js - Client-side functionality for RegisterP page

document.addEventListener('DOMContentLoaded', function() {
    console.log('RegisterP page loaded');

    // Form elements
    const form = document.getElementById('registerP-form');
    const registerButton = document.getElementById('register-button');
    const inputs = document.querySelectorAll('input');
    
    // Input validation
    inputs.forEach(input => {
        // Add focus/blur effects
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
            validateInput(this);
        });

        // Real-time validation
        input.addEventListener('input', function() {
            validateInput(this);
        });
    });

    // Form submission handling
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate all inputs
            let isValid = true;
            inputs.forEach(input => {
                if (!validateInput(input)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                showError('Please fix the errors above before submitting.');
                return;
            }

            // Add loading state
            registerButton.textContent = 'Creating Account...';
            registerButton.disabled = true;
            form.classList.add('loading');
            
            // Submit the form
            form.submit();
        });
    }

    // Reset button functionality
    const resetButton = document.querySelector('button[type="reset"]');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            // Clear validation classes
            inputs.forEach(input => {
                input.classList.remove('valid', 'invalid');
                input.parentElement.classList.remove('focused');
            });
            
            // Clear error messages
            const errorMessage = document.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        });
    }

    // Auto-focus first input
    const firstInput = document.querySelector('input');
    if (firstInput) {
        firstInput.focus();
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Enter key to submit form
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
            if (registerButton && !registerButton.disabled) {
                registerButton.click();
            }
        }
    });

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('button');
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

    // Password strength indicator
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
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
    let errorMessage = '';
    
    if (name === 'name') {
        isValid = value.length >= 2;
        errorMessage = 'Name must be at least 2 characters long';
    } else if (type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(value);
        errorMessage = 'Please enter a valid email address';
    } else if (name === 'password') {
        isValid = value.length >= 6;
        errorMessage = 'Password must be at least 6 characters long';
    } else {
        isValid = value.length > 0;
        errorMessage = 'This field is required';
    }
    
    if (value && isValid) {
        input.classList.add('valid');
        removeFieldError(input);
    } else if (value && !isValid) {
        input.classList.add('invalid');
        showFieldError(input, errorMessage);
    } else if (!value) {
        removeFieldError(input);
    }
    
    return isValid || !value; // Return true if valid or empty (for optional validation)
}

// Show field-specific error
function showFieldError(input, message) {
    removeFieldError(input); // Remove existing error first
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        animation: fadeIn 0.3s ease-in;
    `;
    
    input.parentElement.appendChild(errorDiv);
}

// Remove field-specific error
function removeFieldError(input) {
    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

// Show general error message
function showError(message) {
    // Remove existing error
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const form = document.getElementById('registerP-form');
    form.parentNode.insertBefore(errorDiv, form);
    
    errorDiv.style.animation = 'shake 0.5s ease-in-out';
}

// Check password strength
function checkPasswordStrength(password) {
    const strengthIndicator = document.getElementById('password-strength') || createPasswordStrengthIndicator();
    
    let strength = 0;
    let strengthText = '';
    let strengthColor = '';
    
    if (password.length >= 6) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    
    switch (strength) {
        case 0:
        case 1:
            strengthText = 'Weak';
            strengthColor = '#dc3545';
            break;
        case 2:
        case 3:
            strengthText = 'Medium';
            strengthColor = '#ffc107';
            break;
        case 4:
        case 5:
            strengthText = 'Strong';
            strengthColor = '#28a745';
            break;
    }
    
    strengthIndicator.textContent = password.length > 0 ? `Password Strength: ${strengthText}` : '';
    strengthIndicator.style.color = strengthColor;
}

// Create password strength indicator
function createPasswordStrengthIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'password-strength';
    indicator.style.cssText = `
        font-size: 0.875rem;
        margin-top: 0.25rem;
        font-weight: bold;
    `;
    
    const passwordInput = document.getElementById('password');
    passwordInput.parentElement.appendChild(indicator);
    
    return indicator;
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

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
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
    
    .field-error {
        animation: fadeIn 0.3s ease-in;
    }
`;
document.head.appendChild(style);
