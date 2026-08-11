/* ═══════════════════════════════════════════════════════════════════
   ALPHA VITAL ELITE — app.js
   ES6 class architecture. Each concern is its own class;
   App bootstraps everything and respects prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   SiteHeader
   Solid-on-scroll + hide-on-scroll-down / show-on-scroll-up
   ───────────────────────────────────────────── */
class SiteHeader {
  constructor(el) {
    this.el = el;
    this.lastY = 0;
    this.ticking = false;
    this.onScroll = this.onScroll.bind(this);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.update();
  }

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.update();
      this.ticking = false;
    });
  }

  update() {
    const y = window.scrollY;
    this.el.classList.toggle('header--solid', y > 40);

    const goingDown = y > this.lastY && y > 320;
    this.el.classList.toggle('header--hidden', goingDown && !document.body.classList.contains('nav-open'));
    this.lastY = y;
  }
}

/* ─────────────────────────────────────────────
   MobileNav
   Burger toggle, staggered link entrance (CSS),
   closes on link tap / Escape, locks body scroll
   ───────────────────────────────────────────── */
class MobileNav {
  constructor(toggleEl, drawerEl) {
    this.toggle = toggleEl;
    this.drawer = drawerEl;
    this.open = false;

    this.toggle.addEventListener('click', () => this.set(!this.open));
    this.drawer.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => this.set(false))
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) this.set(false);
    });
  }

  set(open) {
    this.open = open;
    this.drawer.classList.toggle('mobile-nav--open', open);
    this.drawer.setAttribute('aria-hidden', String(!open));
    this.toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
}

/* ─────────────────────────────────────────────
   RevealOnScroll
   IntersectionObserver → .is-revealed
   Siblings inside the same parent get a stagger.
   ───────────────────────────────────────────── */
class RevealOnScroll {
  constructor(selector = '[data-reveal]') {
    this.items = [...document.querySelectorAll(selector)];
    this.assignStagger();

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          this.observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }
    );
    this.items.forEach((el) => this.observer.observe(el));
  }

  assignStagger() {
    const groups = new Map();
    this.items.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach((els) =>
      els.forEach((el, i) => el.style.setProperty('--reveal-delay', `${i * 90}ms`))
    );
  }
}

/* ─────────────────────────────────────────────
   IVLine  — the signature
   A gold drop travels the fixed vertical line
   according to scroll progress (smoothed / lerped).
   ───────────────────────────────────────────── */
class IVLine {
  constructor(el) {
    this.el = el;
    this.drop = el.querySelector('.iv-line__drop');
    this.current = 0;
    this.target = 0;
    this.raf = null;

    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    this.onScroll();
    this.loop();
  }

  onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.target = max > 0 ? window.scrollY / max : 0;
  }

  loop() {
    // lerp toward target for that fluid "drip" lag
    this.current += (this.target - this.current) * 0.07;
    const pad = 0.06; // keep the drop inside the faded ends of the track
    const t = pad + this.current * (1 - pad * 2);
    this.drop.style.top = `${t * 100}%`;
    this.raf = requestAnimationFrame(() => this.loop());
  }
}

/* ─────────────────────────────────────────────
   HeroStage
   • Kicks off the line-mask entrance
   • Ken Burns drift while the film is a placeholder
   • Subtle parallax on the media layer
   ───────────────────────────────────────────── */
class HeroStage {
  constructor(section) {
    this.section = section;
    this.media = section.querySelector('[data-parallax]');
    this.video = section.querySelector('#heroVideo');

    // entrance
    requestAnimationFrame(() => this.section.classList.add('hero--in'));

    // no <source> yet → poster-only mode with slow drift
    if (this.video && this.video.querySelectorAll('source').length === 0) {
      this.video.classList.add('hero__video--poster-only');
    }

    // parallax
    window.addEventListener('scroll', () => this.parallax(), { passive: true });
  }

  parallax() {
    const y = window.scrollY;
    if (y > window.innerHeight) return;
    this.media.style.transform = `translateY(${y * 0.18}px)`;
  }
}

/* ─────────────────────────────────────────────
   Marquee
   Duplicates the track content once so the CSS
   -50% translate loops seamlessly.
   ───────────────────────────────────────────── */
class Marquee {
  constructor(track) {
    this.track = track;
    this.track.innerHTML += this.track.innerHTML;
    this.track.classList.add('marquee__track--run');
  }
}

/* ─────────────────────────────────────────────
   CardGlow
   Radial gold glow follows the cursor inside
   each program card (sets CSS vars).
   ───────────────────────────────────────────── */
class CardGlow {
  constructor(selector = '[data-tilt]') {
    document.querySelectorAll(selector).forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--gx', `${e.clientX - r.left}px`);
        card.style.setProperty('--gy', `${e.clientY - r.top}px`);
      });
    });
  }
}

/* ─────────────────────────────────────────────
   SmoothAnchors
   Offsets in-page anchor jumps below the fixed header.
   ───────────────────────────────────────────── */
class SmoothAnchors {
  constructor(headerEl, offsetExtra = 16) {
    this.header = headerEl;
    this.extra = offsetExtra;
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => this.go(e, a));
    });
  }

  go(e, a) {
    const id = a.getAttribute('href');
    if (id === '#' || id === '#top') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const top =
      target.getBoundingClientRect().top +
      window.scrollY -
      this.header.offsetHeight -
      this.extra;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

/* ─────────────────────────────────────────────
   App — bootstrap
   ───────────────────────────────────────────── */
class App {
  constructor() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const header = document.getElementById('siteHeader');

    this.header = new SiteHeader(header);
    this.nav = new MobileNav(
      document.getElementById('navToggle'),
      document.getElementById('mobileNav')
    );
    this.anchors = new SmoothAnchors(header);
    this.reveals = new RevealOnScroll();
    this.hero = new HeroStage(document.getElementById('hero'));
    this.marquee = new Marquee(document.querySelector('[data-marquee]'));
    this.glow = new CardGlow();

    if (!this.reducedMotion) {
      this.ivLine = new IVLine(document.querySelector('.iv-line'));
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new App());
