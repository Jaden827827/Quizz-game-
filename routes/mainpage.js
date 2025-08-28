// mainpage.js

document.addEventListener('DOMContentLoaded', () => {
  const logoutButton = document.getElementById('logout-btn');

  if (logoutButton) {
    logoutButton.addEventListener('click', (event) => {
      // Prevent the default action (direct redirection)
      event.preventDefault();

      // Display the confirmation dialog
      const confirmation = confirm('Are you sure you want to log out?');

      if (confirmation) {
        // If the user confirms, proceed with the logout (redirect to /logout route)
        window.location.href = '/logout';
      }
      // If the user cancels, do nothing
    });
  }
});
