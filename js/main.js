// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
  // Check for successful subscription
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('subscribed') === 'true') {
    // Replace all waitlist forms with success message
    const forms = document.querySelectorAll('.waitlist-form');
    forms.forEach(function(form) {
      const successMessage = document.createElement('div');
      successMessage.className = 'subscription-success';
      successMessage.innerHTML = '<p><strong>You\'re on the list!</strong></p><p>We\'ll notify you when the book launches.</p>';
      form.replaceWith(successMessage);
    });

    // Clean up URL (remove query param)
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', function() {
      nav.classList.toggle('active');
      navToggle.classList.toggle('active');
    });

    // Close menu when clicking a link
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        nav.classList.remove('active');
        navToggle.classList.remove('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
        nav.classList.remove('active');
        navToggle.classList.remove('active');
      }
    });
  }
});
