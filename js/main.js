/* ============================================================
   AUREA — demo parrucchiere
   Hero a scroll-scrub su canvas (sequenza di frame WebP),
   slider prima/dopo, menu, reveal. Vanilla JS, zero dipendenze.
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const range = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- anno footer ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- nav: stato scrolled ---------- */
  const nav = $('#nav');
  let navQueued = false;
  const updateNav = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 10);
    navQueued = false;
  };
  window.addEventListener('scroll', () => {
    if (!navQueued) { navQueued = true; requestAnimationFrame(updateNav); }
  }, { passive: true });
  updateNav();

  /* ---------- menu mobile ---------- */
  const burger = $('#burger');
  const menu = $('#menu');
  const root = document.documentElement;
  menu.removeAttribute('hidden');
  menu.querySelectorAll('a').forEach((a, i) => a.style.setProperty('--i', i));

  const closeMenu = () => {
    root.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Apri il menu');
  };
  burger.addEventListener('click', () => {
    const open = root.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- marquee: duplica il gruppo per il loop ---------- */
  const track = $('#marqueeTrack');
  if (track && !reduced) {
    const clone = track.firstElementChild.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  }

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        revealIO.unobserve(en.target);
      }
    }
  }, { threshold: 0.18, rootMargin: '0px 0px -40px' });
  document.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));

  /* ---------- slider prima / dopo ---------- */
  const ba = $('#ba');
  const baRange = $('#baRange');
  if (ba && baRange) {
    const setX = (v) => ba.style.setProperty('--x', v + '%');
    baRange.addEventListener('input', () => setX(baRange.value));

    // piccola oscillazione iniziale per suggerire l'interazione
    if (!reduced) {
      let played = false;
      new IntersectionObserver((entries, obs) => {
        if (!entries[0].isIntersecting || played) return;
        played = true;
        obs.disconnect();
        const t0 = performance.now();
        const DURATION = 1600;
        const wiggle = (now) => {
          const t = clamp((now - t0) / DURATION, 0, 1);
          const v = 50 + Math.sin(t * Math.PI * 2) * (1 - t) * 16;
          baRange.value = v;
          setX(v);
          if (t < 1) requestAnimationFrame(wiggle);
        };
        requestAnimationFrame(wiggle);
      }, { threshold: 0.45 }).observe(ba);
    }
  }

  /* ============================================================
     HERO SCRUB
     ============================================================ */
  const scrub = $('#scrub');
  if (!scrub) return;

  const poster = $('#scrubPoster');
  const canvas = $('#scrubCanvas');
  const bar = $('#scrubBar');
  const hint = $('#scrubHint');

  // fasi di testo: opacità in funzione del progresso p ∈ [0,1]
  const copies = [
    { el: $('#copyA'), calc: (p) => 1 - range(p, 0.14, 0.23), dir: -1 },
    { el: $('#copyB'), calc: (p) => range(p, 0.30, 0.385) * (1 - range(p, 0.52, 0.60)), dir: 1, flip: 0.46 },
    { el: $('#copyC'), calc: (p) => range(p, 0.84, 0.92), dir: 1 },
  ];

  if (reduced) {
    // niente scrub: hero statico con il risultato finale
    scrub.classList.add('is-static');
    poster.src = 'assets/after.webp';
    return;
  }

  const FRAMES = 121;
  const LAST = FRAMES - 1;
  const conn = navigator.connection || {};
  const small = window.matchMedia('(max-width: 640px)').matches || conn.saveData === true;
  const DIR = small ? 'assets/frames-sm' : 'assets/frames';
  const srcOf = (i) => `${DIR}/f_${String(i).padStart(3, '0')}.webp`;

  const imgs = new Array(FRAMES).fill(null);
  const ready = new Array(FRAMES).fill(false);

  // ordine di caricamento progressivo: prima una scansione grossolana
  // (lo scrub funziona subito), poi i frame intermedi
  const order = [];
  {
    const seen = new Set();
    const push = (i) => { if (!seen.has(i)) { seen.add(i); order.push(i); } };
    push(0); push(LAST);
    for (const step of [12, 6, 3, 1]) {
      for (let i = 0; i < FRAMES; i += step) push(i);
    }
  }

  let cursor = 0;
  let needsDraw = true;
  const pump = () => {
    if (cursor >= order.length) return;
    const i = order[cursor++];
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { imgs[i] = im; ready[i] = true; needsDraw = true; pump(); };
    im.onerror = pump;
    im.src = srcOf(i);
  };
  for (let k = 0; k < 8; k++) pump();

  const ctx = canvas.getContext('2d');
  let canvasPx = 0;
  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(w * dpr);
    if (px > 0 && px !== canvasPx) {
      canvasPx = px;
      canvas.width = px;
      canvas.height = px;
      needsDraw = true;
    }
  };

  const nearestReady = (i) => {
    if (ready[i]) return i;
    for (let d = 1; d < FRAMES; d++) {
      if (i - d >= 0 && ready[i - d]) return i - d;
      if (i + d <= LAST && ready[i + d]) return i + d;
    }
    return -1;
  };

  let target = 0;
  let current = 0;
  let lastDrawn = -1;

  const measure = () => {
    const rect = scrub.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = rect.height - vh;
    const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;

    // i frame scorrono tra il 4% e l'86% (tiene fermo l'inizio e la fine)
    target = range(p, 0.04, 0.86) * LAST;

    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    hint.style.opacity = (1 - range(p, 0.02, 0.06)).toFixed(2);

    for (const c of copies) {
      const o = c.calc(p);
      const dir = c.flip != null ? (p < c.flip ? 1 : -1) * c.dir : c.dir;
      c.el.style.opacity = o.toFixed(3);
      c.el.style.transform = `translateY(${((1 - o) * 20 * dir).toFixed(1)}px)`;
      c.el.classList.toggle('is-off', o <= 0.01);
      if (c.el.id === 'copyC') c.el.classList.toggle('is-on', o > 0.6);
    }
  };

  let running = false;
  let rafId = 0;
  const loop = () => {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    current += (target - current) * 0.17;
    if (Math.abs(target - current) < 0.4) current = target;

    const idx = nearestReady(Math.round(current));
    if (idx >= 0 && (needsDraw || idx !== lastDrawn)) {
      const im = imgs[idx];
      if (im && canvas.width > 0) {
        ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
        lastDrawn = idx;
        needsDraw = false;
      }
    }
  };
  const start = () => { if (!running) { running = true; loop(); } };
  const stop = () => { running = false; cancelAnimationFrame(rafId); };

  // anima solo quando l'hero è (quasi) in vista
  new IntersectionObserver((entries) => {
    entries[0].isIntersecting ? start() : stop();
  }, { rootMargin: '200px' }).observe(scrub);

  window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', () => { resize(); measure(); }, { passive: true });

  resize();
  measure();
  start();
})();
