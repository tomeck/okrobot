// ---- PARTICLE NETWORK ----
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: null, y: null };
const PARTICLE_COUNT = 80;
const CONNECTION_DIST = 150;
const MOUSE_DIST = 200;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONNECTION_DIST) {
        const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
        ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }

  for (const p of particles) {
    if (mouse.x !== null) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_DIST) {
        const alpha = (1 - dist / MOUSE_DIST) * 0.4;
        ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = `rgba(0, 255, 136, 0.6)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
  }

  requestAnimationFrame(draw);
}

window.addEventListener('resize', () => { resize(); createParticles(); });
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });

resize();
createParticles();
draw();

// ---- SYNC CHAT WIDTH TO HERO TEXT ----
function syncChatWidth() {
  const heroName = document.querySelector('.hero-name');
  const heroChat = document.getElementById('heroChat');
  heroChat.style.width = Math.min(heroName.offsetWidth * 2, window.innerWidth * 0.85) + 'px';
}
syncChatWidth();
window.addEventListener('resize', syncChatWidth);

// ---- MOBILE NAV ----
document.querySelectorAll('.nav-links a').forEach(function(link) {
  link.addEventListener('click', function() {
    document.querySelector('.nav-links').classList.remove('open');
    document.querySelector('.hamburger').classList.remove('active');
  });
});

// ---- SCROLL REVEAL ----
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ---- TTS ----
var femaleVoice = null;
var robotVoice = null;
var ttsMuted = true;
var chatVisible = true;

var chatObserver = new IntersectionObserver(function(entries) {
  chatVisible = entries[0].isIntersecting;
  if (!chatVisible && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}, { threshold: 0 });
chatObserver.observe(document.getElementById('heroChat'));

function initVoices() {
  var voices = speechSynthesis.getVoices();
  if (!voices.length) return;
  var en = voices.filter(function(v) { return v.lang.startsWith('en'); });
  if (!en.length) en = voices;

  var femalePref = ['Ava (Premium)', 'Samantha (Enhanced)', 'Ava', 'Samantha',
    'Google US English', 'Google UK English Female', 'Zira', 'Karen', 'Moira', 'Victoria'];
  for (var i = 0; i < femalePref.length; i++) {
    for (var j = 0; j < en.length; j++) {
      if (en[j].name.indexOf(femalePref[i]) !== -1) { femaleVoice = en[j]; break; }
    }
    if (femaleVoice) break;
  }
  if (!femaleVoice) femaleVoice = en[0];

  var robotPref = ['Daniel', 'Alex', 'Google UK English Male', 'Microsoft David',
    'Aaron', 'Tom', 'Rishi', 'Oliver'];
  for (var i = 0; i < robotPref.length; i++) {
    for (var j = 0; j < en.length; j++) {
      if (en[j].name.indexOf(robotPref[i]) !== -1) { robotVoice = en[j]; break; }
    }
    if (robotVoice) break;
  }
  if (!robotVoice) robotVoice = en.find(function(v) { return v !== femaleVoice; }) || en[0];
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = initVoices;
  initVoices();
}

function speak(text, isRobot) {
  if (ttsMuted || !chatVisible || typeof speechSynthesis === 'undefined' || !femaleVoice) return;
  speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text);
  if (isRobot) {
    u.voice = robotVoice;
    u.pitch = 0.4;
    u.rate = 0.85;
  } else {
    u.voice = femaleVoice;
    u.pitch = 1.1;
    u.rate = 1.0;
  }
  u.volume = 0.8;
  speechSynthesis.speak(u);
}

function toggleTtsMute() {
  ttsMuted = !ttsMuted;
  var btn = document.getElementById('ttsMuteBtn');
  var iconOff = document.getElementById('ttsIconOff');
  var iconOn = document.getElementById('ttsIconOn');
  if (ttsMuted) {
    btn.classList.remove('active');
    btn.setAttribute('aria-label', 'Unmute conversation');
    btn.title = 'Unmute';
    iconOff.style.display = '';
    iconOn.style.display = 'none';
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  } else {
    btn.classList.add('active');
    btn.setAttribute('aria-label', 'Mute conversation');
    btn.title = 'Mute';
    iconOff.style.display = 'none';
    iconOn.style.display = '';
    var assistantText = document.getElementById('chatAssistantText').textContent;
    var userText = document.getElementById('chatUserText').textContent;
    if (assistantText) {
      speak(assistantText, true);
    } else if (userText) {
      speak(userText, false);
    }
  }
}

document.getElementById('ttsMuteBtn').addEventListener('click', toggleTtsMute);

// ---- CHAT ANIMATION ----
(function() {
  const conversations = [
    { user: 'Who is this company?',   reply: 'We are OK Robot.' },
    { user: 'I\'ve never heard about you.',    reply: 'Oh, you will soon.' },
    { user: 'What do you do?', reply: 'We help executives and teams understand AI and how best to leverage it for significant impact.' },
    { user: 'Do you offer anything else?', reply: 'Yes!  For example we can take on any AI-related project for you.' },
    { user: 'What qualifies you to do this?',       reply: 'The Team has extensive experience in AI research, safety and applications.' },
    { user: 'Can you prove this?',       reply: 'Certainly!  Take a look at our samples.' },
    { user: 'How can I get involved or find out more?',   reply: 'Just fill in the form at the bottom of the page.' },
  ];
  let currentIndex = 0;

  const typeSpeed = 65;
  const thinkingDuration = 1500;
  const startDelay = 1200;
  const loopPause = 4000;

  const userTextEl = document.getElementById('chatUserText');
  const assistantTextEl = document.getElementById('chatAssistantText');
  const assistantLine = document.getElementById('chatLineAssistant');
  const cursorUser = document.getElementById('cursorUser');
  const cursorAssistant = document.getElementById('cursorAssistant');
  const thinkingDots = document.getElementById('thinkingDots');

  function reset() {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    userTextEl.textContent = '';
    assistantTextEl.textContent = '';
    assistantLine.style.display = 'none';
    cursorUser.style.display = 'inline-block';
    cursorAssistant.style.display = 'none';
    thinkingDots.style.display = 'none';
  }

  function typeText(el, text, speed, callback) {
    let i = 0;
    function tick() {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        setTimeout(tick, speed + (Math.random() * 30 - 15));
      } else if (callback) {
        callback();
      }
    }
    tick();
  }

  function runAnimation() {
    reset();
    const convo = conversations[currentIndex];
    currentIndex = (currentIndex + 1) % conversations.length;

    speak(convo.user, false);
    typeText(userTextEl, convo.user, typeSpeed, () => {
      cursorUser.style.display = 'none';
      assistantLine.style.display = 'block';
      thinkingDots.style.display = 'inline';

      setTimeout(() => {
        thinkingDots.style.display = 'none';
        cursorAssistant.style.display = 'inline-block';
        speak(convo.reply, true);
        typeText(assistantTextEl, convo.reply, typeSpeed, () => {
          setTimeout(runAnimation, loopPause);
        });
      }, thinkingDuration);
    });
  }

  setTimeout(runAnimation, startDelay);
})();

// ---- MODAL ----
function openModal(e) {
  e.preventDefault();
  document.getElementById('signupModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('signupModal').classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('signupModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

function submitForm() {
  const name = document.getElementById('formName').value.trim();
  const email = document.getElementById('formEmail').value.trim();
  const interest = document.getElementById('formInterest').value;

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

  const btn = document.getElementById('formSubmit');
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

function flashField(id) {
  const el = document.getElementById(id);
  el.style.borderColor = '#ff4444';
  setTimeout(() => { el.style.borderColor = ''; }, 1500);
}
