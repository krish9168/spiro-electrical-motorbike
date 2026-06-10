/*
  SPIRO ELECTRIC MOTORBIKES — Nairobi, Westlands
  UI Controller & WhatsApp Integration
*/

// Configuration
const WA_NUMBER = '254105305324'; // Edit this number with country code, no +

/**
 * Redirects the user to WhatsApp with pre-filled contextual messages.
 * @param {string} type - The contact trigger type ('order', 'testride', 'general')
 * @param {string} [model] - Optional bike model name for orders
 */
function openWA(type, model) {
  let msg = '';
  
  if (type === 'order') {
    msg = model
      ? `Hello Spiro Electric Motorbikes! I am interested in ordering the *${model}*. Could you please send me the price and availability? Thank you.`
      : `Hello Spiro Electric Motorbikes! I would like to order one of your electric motorbikes. Please help me choose the right model.`;
  } else if (type === 'testride') {
    msg = `Hello Spiro Electric Motorbikes! I would like to book a *test ride* at your showroom in Westlands. When are you available?`;
  } else {
    msg = `Hello Spiro Electric Motorbikes! I have an enquiry about your electric motorbikes. Can you help me please?`;
  }
  
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

/**
 * Opens Google Maps directions to the Nairobi showroom.
 */
function openMaps() {
  const directionsUrl = 'https://www.google.com/maps/dir/13.6244611,79.4310052/PQWW%2B3WP,+Nairobi,+Kenya/@4.0268076,8.6268639,3z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!1s0x182f1172d84d49a7:0x23daa7e61dec1af9!2m2!1d36.7973281!2d-1.2547875?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D';
  window.open(directionsUrl, '_blank');
}

/**
 * Initializes floating background particles in the hero container.
 */
function initBackgroundParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  
  const particleCount = 25;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'dot';
    
    const size = Math.random() * 5 + 2;
    const color = Math.random() > 0.5 ? '#0052FF' : '#00E5FF';
    const delay = Math.random() * 7;
    const duration = 7 + Math.random() * 7;
    
    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      background: ${color};
      animation-delay: ${delay}s;
      animation-duration: ${duration}s;
    `;
    
    container.appendChild(particle);
  }
}

// Start particles on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initBackgroundParticles();
});

// ==========================================================================
// CONFIGURATOR INTERACTIVE CONTROLLERS
// ==========================================================================

// Web Audio API Hologram Hum Synthesizer
let audioCtx = null;
let humOscillator = null;
let humFilter = null;
let humGain = null;
let lfoOsc = null;
let soundActive = false;

function toggleConfigSound() {
  const btnSound = document.getElementById('btn-sound');
  const statusLabel = document.getElementById('sound-status-label');
  if (!btnSound || !statusLabel) return;

  soundActive = !soundActive;

  if (soundActive) {
    btnSound.classList.add('active');
    statusLabel.textContent = 'ON';
    statusLabel.style.color = 'var(--accent)';
    
    // Initialize Audio
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      // Deep rumble oscillator
      humOscillator = audioCtx.createOscillator();
      humFilter = audioCtx.createBiquadFilter();
      humGain = audioCtx.createGain();
      
      humOscillator.type = 'sawtooth';
      humOscillator.frequency.setValueAtTime(55, audioCtx.currentTime); // Low A hum
      
      humFilter.type = 'lowpass';
      humFilter.frequency.setValueAtTime(110, audioCtx.currentTime);
      
      // LFO for volume pulsing
      lfoOsc = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfoOsc.frequency.setValueAtTime(1.5, audioCtx.currentTime); // 1.5Hz oscillation
      lfoGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      
      lfoOsc.connect(lfoGain);
      lfoGain.connect(humGain.gain); // Pulsate overall volume
      
      humGain.gain.setValueAtTime(0, audioCtx.currentTime);
      // Smooth fade in
      humGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 1.0);
      
      humOscillator.connect(humFilter);
      humFilter.connect(humGain);
      humGain.connect(audioCtx.destination);
      
      lfoOsc.start();
      humOscillator.start();
      
      // Update pitch based on current rotation speed ratio if auto-spin is on
      const currentSpeedText = document.getElementById('tel-speed')?.textContent || '0';
      const speedVal = parseFloat(currentSpeedText) || 0;
      updateConfigSoundPitch(speedVal / 100);
    } catch (e) {
      console.warn("Web Audio API not supported or blocked: ", e);
    }
  } else {
    btnSound.classList.remove('active');
    statusLabel.textContent = 'OFF';
    statusLabel.style.color = 'var(--text-muted)';
    
    // Stop Audio
    if (humGain && audioCtx) {
      humGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      const tempGain = humGain;
      const tempOsc = humOscillator;
      const tempLfo = lfoOsc;
      
      setTimeout(() => {
        try {
          if (tempOsc) tempOsc.stop();
          if (tempLfo) tempLfo.stop();
        } catch (err) {}
      }, 350);
      
      humOscillator = null;
      lfoOsc = null;
      humGain = null;
    }
  }
}

function updateConfigSoundPitch(speedRatio) {
  if (!soundActive || !humOscillator || !audioCtx) return;
  // Modulate frequency: base 55Hz to 85Hz
  const targetFreq = 55 + (speedRatio * 30);
  humOscillator.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
  if (humFilter) {
    const filterFreq = 110 + (speedRatio * 60);
    humFilter.frequency.setTargetAtTime(filterFreq, audioCtx.currentTime, 0.1);
  }
}

// Fullscreen toggle helper
function toggleFullscreen() {
  const container = document.getElementById('configurator-container');
  if (!container) return;
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => {
      console.warn(`Error trying to enable full-screen mode: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

// Cockpit UI theme light/dark toggler
let currentTheme = 'dark';
function toggleTheme() {
  const body = document.body;
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  if (currentTheme === 'light') {
    body.style.setProperty('--dark', '#ffffff');
    body.style.setProperty('--cream', '#050811');
    body.style.setProperty('--dark-card', '#f1f5f9');
    body.style.setProperty('--dark-border', 'rgba(0, 82, 255, 0.1)');
    body.style.setProperty('--text-muted', '#475569');
    body.style.setProperty('--panel-bg', 'rgba(241, 245, 249, 0.85)');
    body.style.setProperty('--dark-cockpit', 'rgba(241, 245, 249, 0.9)');
  } else {
    body.style.setProperty('--dark', '#050811');
    body.style.setProperty('--cream', '#F1F5F9');
    body.style.setProperty('--dark-card', '#0c1222');
    body.style.setProperty('--dark-border', 'rgba(0, 82, 255, 0.15)');
    body.style.setProperty('--text-muted', '#94A3B8');
    body.style.setProperty('--panel-bg', 'rgba(6, 11, 23, 0.65)');
    body.style.setProperty('--dark-cockpit', 'rgba(10, 15, 30, 0.82)');
  }
}

/* ═══════════════════════════════════════════════════════
   REVIEWS AUTO-SLIDER
═══════════════════════════════════════════════════════ */

(function initReviewsSlider() {
  let currentReview = 0;
  const TOTAL_REVIEWS = 4;
  const AUTO_INTERVAL = 4500; // ms between slides
  let autoTimer = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragDelta = 0;

  /**
   * Navigate to a specific review index.
   * Exposed globally so HTML onclick="goToReview(n)" works.
   */
  window.goToReview = function(index) {
    currentReview = (index + TOTAL_REVIEWS) % TOTAL_REVIEWS;
    applySlide();
    resetAutoTimer();
  };

  function applySlide() {
    const track = document.getElementById('reviews-track');
    if (!track) return;
    track.style.transform = `translateX(-${currentReview * 100}%)`;

    // Update dots
    const dots = document.querySelectorAll('.rev-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentReview);
      dot.setAttribute('aria-selected', i === currentReview ? 'true' : 'false');
    });
  }

  function nextReview() {
    currentReview = (currentReview + 1) % TOTAL_REVIEWS;
    applySlide();
  }

  function startAutoTimer() {
    autoTimer = setInterval(nextReview, AUTO_INTERVAL);
  }

  function resetAutoTimer() {
    clearInterval(autoTimer);
    startAutoTimer();
  }

  // Touch / drag support
  function onDragStart(e) {
    isDragging = true;
    dragStartX = e.touches ? e.touches[0].clientX : e.clientX;
    dragDelta = 0;
    clearInterval(autoTimer);
  }

  function onDragMove(e) {
    if (!isDragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    dragDelta = x - dragStartX;
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    if (dragDelta < -40) nextReview();
    else if (dragDelta > 40) currentReview = (currentReview - 1 + TOTAL_REVIEWS) % TOTAL_REVIEWS, applySlide();
    startAutoTimer();
  }

  // Init after DOM is ready
  function init() {
    const wrapper = document.getElementById('reviews-slider-wrapper');
    if (!wrapper) return;

    wrapper.addEventListener('touchstart',  onDragStart, { passive: true });
    wrapper.addEventListener('touchmove',   onDragMove,  { passive: true });
    wrapper.addEventListener('touchend',    onDragEnd);
    wrapper.addEventListener('mousedown',   onDragStart);
    wrapper.addEventListener('mousemove',   onDragMove);
    wrapper.addEventListener('mouseup',     onDragEnd);
    wrapper.addEventListener('mouseleave',  onDragEnd);

    // Pause on hover
    wrapper.addEventListener('mouseenter', () => clearInterval(autoTimer));
    wrapper.addEventListener('mouseleave', () => { if (!isDragging) startAutoTimer(); });

    applySlide();
    startAutoTimer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ═══════════════════════════════════════════════════════
   SCROLL-IN ANIMATION FOR PRICING CARDS & REVIEW SECTION
═══════════════════════════════════════════════════════ */
(function initScrollAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    .anim-fade-up {
      opacity: 0;
      transform: translateY(32px);
      transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.2,0.64,1);
    }
    .anim-fade-up.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  function observeElements() {
    const targets = document.querySelectorAll(
      '.pricing-card, .rating-banner, .reviews-slider-wrapper, .final-cta-banner'
    );
    if (!targets.length) return;

    targets.forEach((el, i) => {
      el.classList.add('anim-fade-up');
      el.style.transitionDelay = `${i * 0.08}s`;
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    targets.forEach(el => observer.observe(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeElements);
  } else {
    observeElements();
  }
})();
