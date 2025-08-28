// Handle form submission for joining the session
document.querySelector('form').addEventListener('submit', function(event) {
    const sessionId = document.getElementById('session_id').value;

    // Validate the session ID to be 6 digits long
    if (sessionId.length !== 6 || isNaN(sessionId)) {
        alert('Please enter a valid 6-digit session code.');
        event.preventDefault();  // Prevent form submission if the ID is invalid
    }
});
