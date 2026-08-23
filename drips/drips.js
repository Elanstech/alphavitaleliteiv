/* =============================================================================
   ALPHA VITAL ELITE IV — DRIPS.JS
   GSAP + ScrollTrigger animation engine. One file, all ten infusion pages.
   Requires gsap.min.js and ScrollTrigger.min.js on window before this runs.

     Intro      hero master timeline
     Ledger     compound rows, the bag fill, the layer tracker, scroll skew
     Weeks      the six-week rail
     Money      counters and comparison bars
     Questions  accordion
     Carousel   drag, arrows, meter
     Rail       section dots
     Progress   the hairline at the top
     Pointer    magnetic buttons, 3D card tilt
============================================================================= */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const clamp = (n, a, b) => (n < a ? a : n > b ? b : n);

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const FINE = matchMedia('(hover: hover) and (pointer: fine)');
const LOW = (navigator.hardwareConcurrency || 4) <= 4;

/* release every start state — used when GSAP is missing or motion is reduced */
const release = () => {
    root.classList.remove('dx-on');
    $$('[data-anim], .dx-ing, .dx-wk, .dx-char').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });
};


/* ── SPLIT ────────────────────────────────────────────────────────────────── */
const splitChars = (el) => {
    if (!el || el.dataset.split) return [];
    el.dataset.split = '1';
    const wrap = (t) => t.split(/(\s+)/).map((w) =>
        w.trim() ? `<span class="dx-word">${[...w].map((c) => `<span class="dx-char">${c}</span>`).join('')}</span>` : w
    ).join('');

    el.innerHTML = [...el.childNodes].map((n) => {
        if (n.nodeType === 3) return wrap(n.textContent);
        if (n.nodeType === 1) return `<${n.tagName.toLowerCase()} class="${n.getAttribute('class') || ''}">${wrap(n.textContent)}</${n.tagName.toLowerCase()}>`;
        return '';
    }).join('');
    return $$('.dx-char', el);
};

const splitWords = (el) => {
    if (!el || el.dataset.split) return [];
    el.dataset.split = '1';
    el.innerHTML = el.textContent.split(/(\s+)/)
        .map((w) => (w.trim() ? `<span class="dx-w">${w}</span>` : w)).join('');
    return $$('.dx-w', el);
};


/* ── INTRO ────────────────────────────────────────────────────────────────── */
const intro = () => {
    const chars = splitChars($('#dxName'));
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 });

    const eyebrow = $('.dx-hero__no');
    const bag = $('.dx-hero__bag');

    if (eyebrow) tl.fromTo(eyebrow, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.7 }, 0);

    if (chars.length) {
        gsap.set(chars, { yPercent: 110, rotate: 4 });
        tl.to(chars, {
            opacity: 1, yPercent: 0, rotate: 0,
            duration: 1, stagger: { each: 0.018, from: 'start' },
        }, 0.15);
    } else {
        tl.fromTo('.dx-hero__name', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9 }, 0.15);
    }

    if (bag) tl.fromTo(bag, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.3, ease: 'power3.out' }, 0.1);

    tl.fromTo('.dx-hero__dek',  { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.8 }, 0.5)
      .fromTo('.dx-hero__real', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.8 }, 0.62)
      .fromTo('.dx-hero__acts', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.8 }, 0.74)
      .fromTo('.dx-vital', { opacity: 0, y: 28, scale: 0.94 },
              { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.07, ease: 'back.out(1.6)' }, 0.85);

    /* the droplet runs at the pace this infusion actually does */
    const drop = $('.dx-drop');
    if (drop && !LOW) {
        gsap.timeline({ repeat: -1, repeatDelay: 1.1 })
            .fromTo(drop, { y: 0, opacity: 0, scale: 0.5 },
                          { opacity: 1, scale: 1, duration: 0.25 })
            .to(drop, { y: 34, opacity: 0, scale: 0.7, duration: 1.5, ease: 'power2.in' });
    }

    /* the bag drifts as the hero leaves */
    if (bag) {
        gsap.to(bag, {
            yPercent: -12, ease: 'none',
            scrollTrigger: { trigger: '.dx-hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
        });
    }
};


/* ── LEDGER ───────────────────────────────────────────────────────────────
   Each compound gets its own micro-timeline: the row lifts, the number slides
   in, the name wipes open, the chip pops and pings, the hairline draws.
   As each row arrives, the matching layer lights up inside the bag.        */
const ledger = () => {
    const list = $('#dxList');
    const bag = $('#dxBag');
    if (!list) return;

    const rows = $$('.dx-ing', list);
    const band = $('.dx-bag__hi');
    const pct = $('#dxPct');

    /* interior of the bag is 366 user units tall, split by component count */
    const H = 366, TOP = 54;
    const bandH = H / (rows.length || 1);
    if (band) band.setAttribute('height', bandH.toFixed(2));

    const moveBand = (i) => {
        if (!band) return;
        gsap.to(band, {
            y: TOP + (rows.length - 1 - i) * bandH,
            autoAlpha: 1, duration: 0.55, ease: 'power3.out', overwrite: true,
        });
    };

    rows.forEach((row, i) => {
        const name = $('.dx-ing__name', row);
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: row,
                start: 'top 86%',
                end: 'bottom 40%',
                toggleActions: 'play none none reverse',
                onEnter: () => moveBand(i),
                onEnterBack: () => moveBand(i),
            },
        });

        tl.fromTo(row, { opacity: 0, y: 34 },
                       { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, 0)
          .fromTo($('.dx-ing__key', row), { opacity: 0, x: -10 },
                                          { opacity: 1, x: 0, duration: 0.45 }, 0.05)
          .fromTo(name, { clipPath: 'inset(0 100% 0 0)', y: 6 },
                        { clipPath: 'inset(0 0% 0 0)', y: 0, duration: 0.7, ease: 'power3.out' }, 0.08)
          .fromTo([$('.dx-ing__what', row), $('.dx-ing__role', row)],
                  { opacity: 0, y: 12 },
                  { opacity: 1, y: 0, duration: 0.5, stagger: 0.07 }, 0.2)
          .fromTo($('.dx-ing__chip', row), { scale: 0 },
                  { scale: 1, duration: 0.55, ease: 'back.out(3)' }, 0.14)
          .fromTo($('.dx-ing__chip i', row), { scale: 1, opacity: 0.9 },
                  { scale: 2.6, opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.26)
          .fromTo($('.dx-ing__rule', row), { scaleX: 0 },
                  { scaleX: 1, duration: 0.9, ease: 'power3.out' }, 0.12);
    });

    /* the ledger fills the bag: read half the list, the bag is half full */
    if (bag) {
        const setFill = gsap.quickSetter(bag, '--fill');
        ScrollTrigger.create({
            trigger: list,
            start: 'top 78%',
            end: 'bottom 62%',
            scrub: 0.7,
            onUpdate: (self) => {
                setFill(self.progress.toFixed(4));
                if (pct) pct.textContent = Math.round(self.progress * 100);
            },
        });

        /* stuck state for the mobile gauge */
        ScrollTrigger.create({
            trigger: '.dx-mix__stage',
            start: 'top top+=90',
            end: 'bottom top+=240',
            onToggle: (self) => bag.classList.toggle('is-stuck', self.isActive),
        });
    }

    /* scroll velocity leans the whole ledger — subtle, desktop only */
    if (FINE.matches && !LOW) {
        const skew = gsap.quickTo(list, 'skewY', { duration: 0.6, ease: 'power3' });
        ScrollTrigger.create({
            trigger: list, start: 'top bottom', end: 'bottom top',
            onUpdate: (self) => skew(clamp(self.getVelocity() / -420, -2.2, 2.2)),
            onLeave: () => skew(0), onLeaveBack: () => skew(0),
        });
    }

    /* the closing line inks in word by word as it crosses */
    const say = $('.dx-say');
    const words = splitWords(say);
    if (words.length) {
        gsap.fromTo(words, { opacity: 0.14 }, {
            opacity: 1, ease: 'none', stagger: 0.4,
            scrollTrigger: { trigger: say, start: 'top 82%', end: 'bottom 62%', scrub: 0.5 },
        });
    }
};


/* ── WEEKS ────────────────────────────────────────────────────────────────── */
const weeks = () => {
    const list = $('#dxWeeks');
    if (!list) return;
    const fill = $('.dx-weeks__fill', list);
    const pins = $$('.dx-wk', list);

    gsap.to(pins, {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: list, start: 'top 82%', once: true },
    });

    gsap.matchMedia().add({
        wide: '(min-width: 781px)',
        tall: '(max-width: 780px)',
    }, (ctx) => {
        const { wide } = ctx.conditions;
        const tl = gsap.timeline({
            scrollTrigger: { trigger: list, start: 'top 74%', end: 'bottom 68%', scrub: 0.6 },
        });
        tl.fromTo(fill, wide ? { scaleX: 0 } : { scaleY: 0 },
                        wide ? { scaleX: 1, ease: 'none' } : { scaleY: 1, ease: 'none' });

        pins.forEach((pin, i) => {
            ScrollTrigger.create({
                trigger: list,
                start: `top ${74 - i * 3}%`,
                end: 'bottom 68%',
                onToggle: (self) => {
                    pin.classList.toggle('is-on', self.isActive);
                    if (self.isActive) {
                        gsap.fromTo($('.dx-wk__pin', pin), { scale: 0.4 },
                            { scale: 1, duration: 0.5, ease: 'back.out(3)' });
                    }
                },
            });
        });
    });
};


/* ── MONEY ────────────────────────────────────────────────────────────────── */
const money = () => {
    const fmt = (v, plain) => plain
        ? Math.round(v).toString()
        : '$' + (v % 1 ? v.toFixed(2) : Math.round(v).toLocaleString('en-US'));

    $$('[data-count]').forEach((el) => {
        const to = parseFloat(el.dataset.count);
        const plain = el.dataset.fmt === 'plain';
        const obj = { v: 0 };
        gsap.to(obj, {
            v: to, duration: 1.4, ease: 'power3.out',
            onUpdate: () => { el.textContent = fmt(obj.v, plain); },
            onComplete: () => { el.textContent = fmt(to, plain); },
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
    });

    $$('.dx-sum__bar').forEach((bar) => {
        gsap.to($('i', bar), {
            scaleX: parseFloat(bar.dataset.w || 1), duration: 1.2, ease: 'expo.out',
            scrollTrigger: { trigger: bar, start: 'top 92%', once: true },
        });
    });

    $$('.dx-eyebrow s').forEach((line) => {
        gsap.to(line, {
            scaleX: 1, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: line, start: 'top 92%', once: true },
        });
    });
};


/* ── QUESTIONS ────────────────────────────────────────────────────────────── */
const questions = () => {
    $$('.dx-q').forEach((d) => {
        const summary = $('summary', d);
        const wrap = $('.dx-q__wrap', d);
        const icon = $('i', summary);
        if (!summary || !wrap) return;

        summary.addEventListener('click', (e) => {
            e.preventDefault();
            gsap.killTweensOf(wrap);

            if (d.open) {
                gsap.to(icon, { rotate: 0, duration: 0.4, ease: 'power3.out' });
                gsap.to(wrap, {
                    height: 0, opacity: 0, duration: 0.4, ease: 'power2.inOut',
                    onComplete: () => { d.open = false; gsap.set(wrap, { height: 'auto' }); },
                });
            } else {
                d.open = true;
                gsap.to(icon, { rotate: 135, duration: 0.45, ease: 'back.out(2)' });
                gsap.fromTo(wrap, { height: 0, opacity: 0 },
                    { height: 'auto', opacity: 1, duration: 0.5, ease: 'power3.out' });
                gsap.fromTo($$('p', wrap), { opacity: 0, y: 10 },
                    { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, delay: 0.1 });
            }
        });
    });
};


/* ── CAROUSEL ─────────────────────────────────────────────────────────────── */
const carousel = () => {
    const track = $('#dxTrack');
    if (!track) return;
    const cards = $$('.dx-nxt', track);
    const prev = $('#dxPrev'), next = $('#dxNext');
    const meter = $('#dxMeter'), now = $('#dxNow'), total = $('#dxTotal');

    if (total) total.textContent = String(cards.length).padStart(2, '0');

    gsap.fromTo(cards,
        { opacity: 0, y: 44, rotateX: -14, transformPerspective: 900, transformOrigin: '50% 100%' },
        {
            opacity: 1, y: 0, rotateX: 0, duration: 0.75, stagger: 0.06, ease: 'expo.out',
            scrollTrigger: { trigger: track, start: 'top 88%', once: true },
        });

    const step = () => {
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return (cards[0]?.offsetWidth || track.clientWidth * 0.8) + gap;
    };
    const paint = () => {
        const max = track.scrollWidth - track.clientWidth;
        const p = max > 0 ? track.scrollLeft / max : 0;
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= max - 2;
        if (meter) gsap.to(meter, { scaleX: clamp(p, 0.04, 1), duration: 0.3, ease: 'power2.out' });
        if (now) {
            const i = Math.round(p * (cards.length - 1)) + 1;
            now.textContent = String(i).padStart(2, '0');
        }
    };

    prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

    let ticking = false;
    track.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { paint(); ticking = false; });
    }, { passive: true });
    paint();

    if (!FINE.matches) return;
    let down = false, moved = false, x0 = 0, l0 = 0;
    track.addEventListener('pointerdown', (e) => {
        if (e.button || e.pointerType === 'touch') return;
        down = true; moved = false; x0 = e.clientX; l0 = track.scrollLeft;
    });
    track.addEventListener('pointermove', (e) => {
        if (!down) return;
        const d = e.clientX - x0;
        if (!moved && Math.abs(d) < 6) return;
        if (!moved) { moved = true; track.classList.add('is-drag'); track.setPointerCapture(e.pointerId); }
        track.scrollLeft = l0 - d;
    });
    const up = (e) => {
        if (!down) return;
        down = false;
        if (!moved) return;
        track.classList.remove('is-drag');
        if (e?.pointerId != null && track.hasPointerCapture?.(e.pointerId)) track.releasePointerCapture(e.pointerId);
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((k) => track.addEventListener(k, up));
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
};


/* ── GENERIC REVEALS ──────────────────────────────────────────────────────── */
const FROM = {
    rise:  { y: 36 },
    pop:   { y: 28, scale: 0.94 },
    slide: { x: -30 },
    scale: { scale: 0.9 },
    tilt:  { y: 44, rotateX: -14, transformPerspective: 900, transformOrigin: '50% 100%' },
};

const reveals = () => {
    $$('[data-anim]').forEach((el) => {
        if (el.closest('.dx-hero') || el.classList.contains('dx-nxt')) return;
        const from = { opacity: 0, ...(FROM[el.dataset.anim] || FROM.rise) };
        gsap.fromTo(el, from, {
            opacity: 1, y: 0, x: 0, scale: 1, rotateX: 0,
            duration: 0.85, ease: 'expo.out',
            delay: (parseFloat(el.dataset.delay) || 0) / 1000,
            onComplete: () => el.classList.add('dx-done'),
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
    });
};


/* ── RAIL · PROGRESS ──────────────────────────────────────────────────────── */
const rail = () => {
    gsap.to('.dx-prog', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
    });

    const dots = $$('.dx-rail a');
    dots.forEach((dot) => {
        const sec = $(dot.getAttribute('href'));
        if (!sec) return;
        ScrollTrigger.create({
            trigger: sec, start: 'top 45%', end: 'bottom 45%',
            onToggle: (self) => {
                if (!self.isActive) return;
                dots.forEach((d) => d.classList.remove('is-on'));
                dot.classList.add('is-on');
            },
        });
    });
};


/* ── POINTER ──────────────────────────────────────────────────────────────── */
const pointer = () => {
    if (!FINE.matches || LOW) return;

    $$('[data-mag]').forEach((el) => {
        const k = parseFloat(el.dataset.mag) || 0.28;
        const x = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3' });
        const y = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3' });
        let box = null;
        el.addEventListener('pointerenter', () => { box = el.getBoundingClientRect(); });
        el.addEventListener('pointermove', (e) => {
            if (!box) box = el.getBoundingClientRect();
            x((e.clientX - box.left - box.width / 2) * k);
            y((e.clientY - box.top - box.height / 2) * k);
        });
        el.addEventListener('pointerleave', () => { box = null; x(0); y(0); });
    });

    $$('.dx-nxt').forEach((card) => {
        const inner = $('a', card);
        if (!inner) return;
        const rx = gsap.quickTo(inner, 'rotateX', { duration: 0.5, ease: 'power3' });
        const ry = gsap.quickTo(inner, 'rotateY', { duration: 0.5, ease: 'power3' });
        const ty = gsap.quickTo(inner, 'y', { duration: 0.5, ease: 'power3' });
        let box = null;
        card.addEventListener('pointerenter', () => { box = card.getBoundingClientRect(); ty(-8); });
        card.addEventListener('pointermove', (e) => {
            if (!box) box = card.getBoundingClientRect();
            const px = clamp((e.clientX - box.left) / box.width, 0, 1) - 0.5;
            const py = clamp((e.clientY - box.top) / box.height, 0, 1) - 0.5;
            ry(px * 12); rx(-py * 12);
        });
        card.addEventListener('pointerleave', () => { box = null; rx(0); ry(0); ty(0); });
    });
};


/* ── BOOT ─────────────────────────────────────────────────────────────────── */
const boot = () => {
    if (!document.body.classList.contains('page-drip')) return;

    if (typeof window.gsap === 'undefined' || RM.matches) {
        release();
        questions();          // the accordion still needs to open
        carouselFallback();
        return;
    }

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const run = () => {
        const go = (name, fn) => { try { fn(); } catch (err) { console.error(`[dx] ${name}`, err); } };
        go('intro', intro);
        go('reveals', reveals);
        go('ledger', ledger);
        go('weeks', weeks);
        go('money', money);
        go('questions', questions);
        go('carousel', carousel);
        go('rail', rail);
        go('pointer', pointer);
        ScrollTrigger.refresh();
    };

    /* wait for the display face, or the character split measures the fallback
       and reflows mid-animation. 800ms cap so a slow CDN never holds the page */
    if (document.fonts?.ready) {
        Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]).then(run);
    } else {
        run();
    }

    let w = innerWidth;
    addEventListener('resize', () => {
        if (innerWidth === w) return;      // height-only = mobile address bar
        w = innerWidth;
        ScrollTrigger.refresh();
    });

    addEventListener('pageshow', (e) => {
        const restored = e.persisted ||
            performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
        if (restored) ScrollTrigger.refresh(true);
    });
    RM.addEventListener?.('change', () => location.reload());
};

/* arrows still work if GSAP never loads */
function carouselFallback() {
    const track = $('#dxTrack');
    if (!track) return;
    const w = () => ($('.dx-nxt', track)?.offsetWidth || 240) + 16;
    $('#dxPrev')?.addEventListener('click', () => track.scrollBy({ left: -w(), behavior: 'smooth' }));
    $('#dxNext')?.addEventListener('click', () => track.scrollBy({ left: w(), behavior: 'smooth' }));
}

document.readyState === 'loading'
    ? addEventListener('DOMContentLoaded', boot)
    : boot();

export { boot };
