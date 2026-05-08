// ---- MOBILE NAV ----
document.querySelectorAll('.nav-links a').forEach(function(link) {
  link.addEventListener('click', function() {
    var navLinks = document.querySelector('.nav-links');
    var hamburger = document.querySelector('.hamburger');
    if (navLinks) navLinks.classList.remove('open');
    if (hamburger) hamburger.classList.remove('active');
  });
});

// ---- SCROLL REVEAL ----
(function() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(function(el) { el.classList.add('visible'); });
    return;
  }
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });
})();

// ---- MODAL ----
function openModal(e) {
  if (e && e.preventDefault) e.preventDefault();
  var modal = document.getElementById('signupModal');
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  var modal = document.getElementById('signupModal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

(function() {
  var modal = document.getElementById('signupModal');
  if (!modal) return;
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });
})();

function flashField(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#ff4444';
  setTimeout(function() { el.style.borderColor = ''; }, 1500);
}

function submitForm() {
  var name = document.getElementById('formName').value.trim();
  var email = document.getElementById('formEmail').value.trim();
  var interest = document.getElementById('formInterest').value;

  if (!name || !email || !interest) {
    if (!name) flashField('formName');
    if (!email) flashField('formEmail');
    if (!interest) flashField('formInterest');
    return;
  }

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    flashField('formEmail');
    return;
  }

  var btn = document.getElementById('formSubmit');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  emailjs.send('service_ul775rq', 'template_w2zvaqb', {
    from_name: name,
    from_email: email,
    interest: interest
  }).then(function() {
    document.getElementById('formContent').style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
  }, function(error) {
    btn.disabled = false;
    btn.textContent = 'Submit';
    alert('Something went wrong. Please try again.');
    console.error('EmailJS error:', error);
  });
}
