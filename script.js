/* =============================================================================
   PRECISION MEDICAL IV — SCRIPT.JS  (ES6 module)
   -----------------------------------------------------------------------------
   Loaded with <script type="module">: module scope, strict mode, deferred by
   default. Every class feature-detects and no-ops when its elements are absent,
   so you can drop new sections in without touching this file.

     Helpers
     Preloader   the vial, the count, the split, the mark's flight
     Header      condense on scroll, hide/reveal, star indicator
     Menu        mobile overlay, scroll lock, escape, focus return
     Hero        entrance, mote field, portal parallax, image fallback
     Magnetic    pointer attraction on primary buttons (fine pointers only)
     Boot
============================================================================= */


/* =============================================================================
   HELPERS
============================================================================= */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const lerp  = (a, b, t) => a + (b - a) * t;

/** Run a handler at most once per frame. */
const onFrame = (fn) => {
    let queued = false;
    return (...args) => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { fn(...args); queued = false; });
    };
};

const debounce = (fn, wait = 150) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

const wait = (ms) => new Promise((res) => setTimeout(res, ms));


/* =============================================================================
   PRELOADER
   Progress is real where it can be (fonts + images), padded by elapsed time so
   the vial never sits still on a fast connection. Minimum 1.5s so the sequence
   reads; hard ceiling of 6s so a stalled asset can never trap anyone.
============================================================================= */
class Preloader {
    constructor() {
        this.el      = $('#pre');
        this.mark    = $('#preMark');
        this.liquid  = $('#preLiquid');
        this.pct     = $('#prePct');
        this.navMark = $('#navMark');

        this.MIN_MS  = 1500;
        this.MAX_MS  = 6000;
        this.start   = performance.now();
        this.shown   = 0;    // what the vial is displaying
        this.target  = 0;    // what loading says
        this.loaded  = false;
    }

    init() {
        if (!this.el) { this.finish(true); return; }

        if (REDUCED) { this.finish(true); return; }

        this.watchAssets();
        this.tick();

        // Never let a slow asset hold the page hostage
        setTimeout(() => { this.loaded = true; }, this.MAX_MS);
    }

    /** Real progress: fonts, then every image with a src. */
    watchAssets() {
        const images = $$('img').filter((img) => img.getAttribute('src'));
        const total  = images.length + 1; // +1 for the font set
        let done     = 0;

        const step = () => {
            done += 1;
            this.target = Math.max(this.target, (done / total) * 100);
        };

        (document.fonts ? document.fonts.ready : Promise.resolve()).then(step);

        images.forEach((img) => {
            if (img.complete) { step(); return; }
            img.addEventListener('load',  step, { once: true });
            img.addEventListener('error', step, { once: true });
        });

        window.addEventListener('load', () => { this.target = 100; this.loaded = true; }, { once: true });
    }

    tick() {
        const elapsed = performance.now() - this.start;

        // Pad with time so the bar always creeps, but cap it below 100
        const paced = clamp((elapsed / this.MIN_MS) * 96, 0, 96);
        const goal  = this.loaded ? 100 : Math.max(this.target, paced);

        this.shown = lerp(this.shown, goal, 0.09);
        if (goal - this.shown < 0.4) this.shown = goal;

        this.render(this.shown);

        if (this.shown >= 99.6 && elapsed >= this.MIN_MS) { this.finish(); return; }
        requestAnimationFrame(() => this.tick());
    }

    render(value) {
        const v = Math.round(value);
        if (this.liquid) this.liquid.style.height = `${value.toFixed(1)}%`;
        if (this.pct && this.pct.textContent !== String(v)) this.pct.textContent = v;
    }

    /** Drain, fly the mark home, split the field. */
    async finish(instant = false) {
        this.render(100);

        if (instant) {
            this.el?.classList.add('is-done');
            document.documentElement.classList.remove('is-preloading');
            document.body.classList.add('is-ready');
            return;
        }

        await wait(320);
        this.flyMark();
        this.el.classList.add('is-draining');

        await wait(420);
        this.el.classList.add('is-open');
        document.documentElement.classList.remove('is-preloading');
        document.body.classList.add('is-ready');

        await wait(1250);
        this.el.classList.add('is-done');
        this.el.remove();
    }

    /**
     * FLIP the preloader mark onto the header mark so the logo appears to
     * travel to its resting place rather than cross-fading.
     */
    flyMark() {
        const target = this.navMark?.querySelector('img');
        if (!this.mark || !target) return;

        const from = this.mark.getBoundingClientRect();
        const to   = target.getBoundingClientRect();
        if (!from.width || !to.width) return;

        const scale = to.width / from.width;
        const dx    = (to.left + to.width  / 2) - (from.left + from.width  / 2);
        const dy    = (to.top  + to.height / 2) - (from.top  + from.height / 2);

        this.mark.classList.add('is-travelling');
        requestAnimationFrame(() => {
            this.mark.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
        });
    }
}


/* =============================================================================
   HEADER
============================================================================= */
class Header {
    constructor() {
        this.el   = $('#head');
        this.nav  = $('#headNav');
        this.star = $('#headStar');
        this.links = $$('[data-nav]', this.nav || document);
        this.lastY = 0;
    }

    init() {
        if (!this.el) return;
        this.bindScroll();
        this.bindStar();
    }

    bindScroll() {
        const onScroll = onFrame(() => {
            const y = window.scrollY;

            this.el.classList.toggle('is-stuck', y > 30);

            // Hide going down, return going up — but never over the hero
            const goingDown = y > this.lastY && y > 260;
            this.el.classList.toggle('is-hidden', goingDown && !document.body.classList.contains('menu-open'));

            this.lastY = y;
        });

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /** The star slides to whichever link is hovered, and parks on the current one. */
    bindStar() {
        if (!this.nav || !this.star || !this.links.length) return;

        const moveTo = (link) => {
            if (!link) return;
            const navBox  = this.nav.getBoundingClientRect();
            const linkBox = link.getBoundingClientRect();
            const x = (linkBox.left - navBox.left) + (linkBox.width / 2) - 4.5;
            this.star.style.setProperty('--x', `${x.toFixed(1)}px`);
            this.nav.classList.add('is-marking');
        };

        const park = () => moveTo(this.nav.querySelector('.is-current') || this.links[0]);

        this.links.forEach((link) => {
            link.addEventListener('mouseenter', () => moveTo(link));
            link.addEventListener('focus', () => moveTo(link));
        });
        this.nav.addEventListener('mouseleave', park);

        // Park once the display face has loaded, or the measurement is wrong
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(park);
        window.addEventListener('resize', debounce(park, 200));
    }
}


/* =============================================================================
   MENU — mobile overlay
============================================================================= */
class Menu {
    constructor() {
        this.el     = $('#menu');
        this.burger = $('#burger');
        this.open   = false;
    }

    init() {
        if (!this.el || !this.burger) return;

        this.burger.addEventListener('click', () => this.set(!this.open));

        $$('a', this.el).forEach((a) =>
            a.addEventListener('click', () => this.set(false))
        );

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.open) { this.set(false); this.burger.focus(); }
        });

        window.addEventListener('resize', debounce(() => {
            if (this.open && window.innerWidth > 860) this.set(false);
        }, 200));
    }

    set(open) {
        this.open = open;
        this.el.classList.toggle('is-open', open);
        this.el.setAttribute('aria-hidden', String(!open));
        this.burger.classList.toggle('is-open', open);
        this.burger.setAttribute('aria-expanded', String(open));
        this.burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.documentElement.classList.toggle('is-locked', open);
        document.body.classList.toggle('menu-open', open);
    }
}


/* =============================================================================
   HERO — mote field, portal parallax, photo fallback
============================================================================= */
class Hero {
    constructor() {
        this.el      = $('#hero');
        this.canvas  = $('#heroMotes');
        this.portal  = $('[data-parallax]', this.el || document);
        this.photo   = $('#portalPhoto');
        this.motes   = [];
        this.pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
        this.raf     = null;
    }

    init() {
        if (!this.el) return;
        this.guardPhoto();
        this.startMotes();
        this.bindParallax();
    }

    /** If the photograph is missing, fall back to the drawn scene beneath it. */
    guardPhoto() {
        if (!this.photo) return;
        const fail = () => this.photo.classList.add('is-missing');
        if (this.photo.complete && this.photo.naturalWidth === 0) fail();
        this.photo.addEventListener('error', fail, { once: true });
    }

    /* --- ambient gold motes ------------------------------------------------ */
    startMotes() {
        if (!this.canvas || REDUCED) return;
        if (window.matchMedia('(max-width: 640px)').matches) return;

        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.sizeCanvas();
        this.seedMotes();
        this.loop();

        window.addEventListener('resize', debounce(() => {
            this.sizeCanvas();
            this.seedMotes();
        }, 200));

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = null; }
            else if (!this.raf) this.loop();
        });
    }

    sizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const { width, height } = this.el.getBoundingClientRect();
        this.w = width; this.h = height;
        this.canvas.width  = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width  = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    seedMotes() {
        const count = clamp(Math.round(this.w / 26), 20, 54);
        this.motes = Array.from({ length: count }, () => ({
            x: Math.random() * this.w,
            y: Math.random() * this.h,
            r: 0.5 + Math.random() * 1.5,
            speed: 0.08 + Math.random() * 0.24,
            drift: 0.4 + Math.random() * 1.4,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.16 + Math.random() * 0.4,
        }));
    }

    loop() {
        this.raf = requestAnimationFrame(() => this.loop());

        const { ctx } = this;
        const t = performance.now() / 1000;

        // ease the pointer influence
        this.pointer.x = lerp(this.pointer.x, this.pointer.tx, 0.05);
        this.pointer.y = lerp(this.pointer.y, this.pointer.ty, 0.05);
        const pushX = (this.pointer.x - 0.5) * 26;
        const pushY = (this.pointer.y - 0.5) * 16;

        ctx.clearRect(0, 0, this.w, this.h);

        this.motes.forEach((m) => {
            m.y -= m.speed;
            if (m.y < -6) { m.y = this.h + 6; m.x = Math.random() * this.w; }

            const x = m.x + Math.sin(t * 0.5 + m.phase) * m.drift * 6 + pushX * (m.r / 2);
            const y = m.y + pushY * (m.r / 2);

            ctx.beginPath();
            ctx.arc(x, y, m.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(193, 150, 63, ${m.alpha})`;
            ctx.fill();

            if (m.r > 1.4) {
                ctx.beginPath();
                ctx.arc(x, y, m.r * 3.4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(231, 203, 134, ${m.alpha * 0.12})`;
                ctx.fill();
            }
        });
    }

    /* --- portal parallax ---------------------------------------------------- */
    bindParallax() {
        if (REDUCED || !FINE_POINTER) return;

        const onMove = onFrame((e) => {
            const nx = e.clientX / window.innerWidth;
            const ny = e.clientY / window.innerHeight;
            this.pointer.tx = nx;
            this.pointer.ty = ny;

            if (!this.portal) return;
            const rx = (0.5 - ny) * 3.2;
            const ry = (nx - 0.5) * 4.2;
            this.portal.style.transform =
                `perspective(1400px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(${((0.5 - ny) * 10).toFixed(1)}px)`;
        });

        window.addEventListener('mousemove', onMove, { passive: true });
        this.el.addEventListener('mouseleave', () => {
            if (this.portal) this.portal.style.transform = '';
        });
    }
}


/* =============================================================================
   MAGNETIC — primary buttons lean toward the pointer
============================================================================= */
class Magnetic {
    constructor() {
        this.items = $$('[data-magnetic]');
    }

    init() {
        if (!this.items.length || REDUCED || !FINE_POINTER) return;

        this.items.forEach((el) => {
            const strength = 0.28;

            el.addEventListener('mousemove', (e) => {
                const box = el.getBoundingClientRect();
                const x = (e.clientX - (box.left + box.width  / 2)) * strength;
                const y = (e.clientY - (box.top  + box.height / 2)) * strength;
                el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            });

            el.addEventListener('mouseleave', () => { el.style.transform = ''; });
        });
    }
}


/* =============================================================================
   BOOT
============================================================================= */
const modules = {
    preloader: new Preloader(),
    header:    new Header(),
    menu:      new Menu(),
    hero:      new Hero(),
    magnetic:  new Magnetic(),
};

/** Nothing here is worth trapping someone behind a cream screen for. */
const release = () => {
    document.documentElement.classList.remove('is-preloading');
    document.body.classList.add('is-ready');
    $('#pre')?.remove();
};

const boot = () => {
    setTimeout(release, 8000); // failsafe, whatever else happens

    Object.values(modules).forEach((m) => {
        try { m.init(); }
        catch (err) { console.error(`[PMIV] ${m.constructor.name} failed to start`, err); release(); }
    });

    if ('ontouchstart' in window) document.documentElement.classList.add('is-touch');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

// handy in the console while you build the rest of the page
window.PMIV = { modules, boot, helpers: { $, $$, clamp, lerp, onFrame, debounce } };
