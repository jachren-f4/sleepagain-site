// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
  // Check for successful subscription
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('subscribed') === 'true') {
    // Replace inline waitlist forms with success message
    const forms = document.querySelectorAll('.waitlist-form, .site-footer-form');
    forms.forEach(function(form) {
      const successMessage = document.createElement('div');
      successMessage.className = 'subscription-success';
      successMessage.innerHTML = '<p><strong>You\'re on the list!</strong></p><p>We\'ll notify you when the book launches.</p>';
      form.replaceWith(successMessage);
    });

    // Clean up URL (remove query param)
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Branded site-footer waitlist form handler (matches index.html pattern)
  var footerForm = document.getElementById('footer-waitlist-form');
  if (footerForm) {
    footerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var input = document.getElementById('footer-waitlist-email');
      var btn = footerForm.querySelector('button[type="submit"]');
      var email = input.value.trim();
      if (!email) return;
      var originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      fetch('https://api.convertkit.com/v3/forms/9118264/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: 'DUyq416rGUL_qxk-o1jLlQ', email: email, tags: [16407733] })
      })
      .then(function (res) {
        if (res.ok || res.status === 200 || res.status === 201) {
          window.location.href = 'https://sleepagain.co/?subscribed=true';
        } else {
          throw new Error('API error ' + res.status);
        }
      })
      .catch(function () {
        btn.textContent = originalText;
        btn.disabled = false;
      });
    });
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

  // Dropdown toggle for mobile
  var dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  dropdownToggles.forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        var parent = toggle.parentElement;
        parent.classList.toggle('open');
      }
    });
  });
});
