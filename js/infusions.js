/* =============================================================================
   ALPHA VITAL ELITE IV — INFUSIONS.JS  ( /infusions/ )  (ES6 module)
   -----------------------------------------------------------------------------
   Loaded with <script type="module">: module scope, strict mode, deferred.
   Same architecture as the home script — every class feature-detects and
   no-ops when its elements are absent. NO PINNED SECTIONS on this page, so
   the ScrollTrigger refresh strategy is the simple one.

     Helpers
     Scroll      one listener, one rAF, every subscriber
     Nav         the single smooth-scroll path (no CSS smooth scrolling)
     Header      condense · retreat on the way down · return on the way up
     Menu        the parchment page, circular reveal, scroll lock, escape
     Magnetic    primary buttons lean toward the pointer (fine pointers only)
     Tape        the running price line — paused when the tab is hidden
     Ledger      row hover summons the bag; a click drops to the dossier
     Gallery     the dossier grid — one filter path for pills AND the select
     Dock        back to top (left) and the quick actions (right)
     Reveal      generic scroll reveal for anything marked [data-reveal]
     Boot

   REQUIRES GSAP + ScrollTrigger from CDN in the HTML BEFORE this file.
   Without them the page degrades to a static, readable layout.
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

const debounce = (fn, ms = 150) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

/** Pop something into place the first time it is seen. gsap.to(), never
 *  gsap.from() — from() rewrites its start values on every ScrollTrigger
 *  refresh and strands elements at opacity 0. Same helper as the home page. */
const popIn = (targets, opts = {}, trigger, start = 'top 86%') => {
    const { y = 32, scale = 1, stagger = 0, ease = 'back.out(1.7)', duration = 0.6 } = opts;
    const els = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!els.length || typeof window.gsap === 'undefined') return;
    if (REDUCED) { gsap.set(els, { opacity: 1, y: 0, scale: 1 }); return; }

    gsap.set(els, { opacity: 0, y, scale });
    gsap.to(els, {
        opacity: 1, y: 0, scale: 1, duration, ease, stagger,
        scrollTrigger: { trigger: trigger || els[0], start, once: true },
    });
};


/* =============================================================================
   SCROLL — one listener, one rAF, every subscriber
============================================================================= */
const Scroll = {
    subs: [],
    queued: false,
    add(fn) {
        this.subs.push(fn);
        fn(window.scrollY);
        if (this.subs.length === 1) this.listen();
    },
    listen() {
        const run = () => {
            const y = window.scrollY;
            for (const fn of this.subs) fn(y);
            this.queued = false;
        };
        window.addEventListener('scroll', () => {
            if (this.queued) return;
            this.queued = true;
            requestAnimationFrame(run);
        }, { passive: true });
    },
};


/* =============================================================================
   NAV — the ONE place the page is allowed to scroll itself.
   CSS smooth scrolling is off (see infusions.css) for the same reason as the
   home page: it silently drops programmatic scrolls that land mid-animation.
============================================================================= */
const Nav = {
    offset() { return ($('#head')?.offsetHeight || 0) + 8; },

    toY(y) {
        window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: REDUCED ? 'auto' : 'smooth' });
    },

    to(el) {
        if (!el) return;
        this.toY(window.scrollY + el.getBoundingClientRect().top - this.offset());
    },

    init() {
        // delegated, so every in-page anchor on the page is covered
        document.addEventListener('click', (e) => {
            const a = e.target.closest?.('a[href^="#"]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (!href || href === '#') return;
            const el = document.getElementById(href.slice(1));
            if (!el) return;
            e.preventDefault();
            this.to(el);
            if (window.location.hash !== href) history.pushState(null, '', href);
        });
    },
};


/* =============================================================================
   HEADER
============================================================================= */
class Header {
    constructor() {
        this.el = $('#head');
        this.lastY = 0;
    }

    init() {
        if (!this.el) return;
        Scroll.add((y) => {
            this.el.classList.toggle('is-stuck', y > 40);
            const goingDown = y > this.lastY && y > 320;
            const menuOpen  = document.documentElement.classList.contains('is-locked');
            this.el.classList.toggle('is-hidden', goingDown && !menuOpen);
            this.lastY = y;
        });
    }
}


/* =============================================================================
   MENU
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
            if (this.open && window.innerWidth > 780) this.set(false);
        }, 200));
    }

    set(open) {
        this.open = open;
        this.el.classList.toggle('is-open', open);
        this.burger.classList.toggle('is-open', open);
        document.documentElement.classList.toggle('is-locked', open);
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
            const strength = 0.26;
            let box = null;

            const hasGsap = typeof window.gsap !== 'undefined';
            const setX = hasGsap ? gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' }) : null;
            const setY = hasGsap ? gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' }) : null;

            el.addEventListener('pointerenter', () => { box = el.getBoundingClientRect(); });

            el.addEventListener('pointermove', (e) => {
                if (!box) box = el.getBoundingClientRect();
                const x = (e.clientX - (box.left + box.width  / 2)) * strength;
                const y = (e.clientY - (box.top  + box.height / 2)) * strength;
                if (setX) { setX(x); setY(y); }
                else el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            });

            el.addEventListener('pointerleave', () => {
                box = null;
                if (setX) { setX(0); setY(0); }
                else el.style.transform = '';
            });
        });
    }
}


/* =============================================================================
   TAPE — the running price line
   The animation is pure CSS. This class only spares the battery: paused when
   the tab is hidden and when the band itself is off screen.
============================================================================= */
class Tape {
    constructor() {
        this.el    = $('.tape');
        this.track = $('#tapeTrack');
    }

    init() {
        if (!this.el || !this.track || REDUCED) return;

        document.addEventListener('visibilitychange', () => {
            this.el.classList.toggle('is-paused', document.hidden);
        });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([e]) => {
                this.el.classList.toggle('is-paused', !e.isIntersecting);
            }, { threshold: 0.01 }).observe(this.el);
        }
    }
}


/* =============================================================================
   LEDGER — the index rows (#ledger)
   Hovering a row summons its bag as a floating thumbnail that trails the
   cursor (fine pointers only — on touch there is no hover and the thumb is
   display:none in the CSS). Clicking a row is an ordinary in-page anchor;
   Nav handles the scroll, so the header offset is respected.
============================================================================= */
class Ledger {
    constructor() {
        this.list  = $('#ledgerList');
        this.thumb = $('#ledgerThumb');
        this.img   = $('#ledgerThumbImg');
        this.setX  = null;
        this.setY  = null;
    }

    init() {
        if (!this.list) return;

        this.reveal();

        if (!this.thumb || !this.img || !FINE_POINTER || REDUCED) return;
        if (typeof window.gsap !== 'undefined') {
            // one interpolated write per frame — the trail is the charm
            this.setX = gsap.quickTo(this.thumb, 'x', { duration: 0.5, ease: 'power3' });
            this.setY = gsap.quickTo(this.thumb, 'y', { duration: 0.5, ease: 'power3' });
        }

        const move = onFrame((e) => {
            if (this.setX) { this.setX(e.clientX); this.setY(e.clientY); }
            else {
                this.thumb.style.transform =
                    `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -55%) rotate(3deg)`;
            }
        });

        this.list.addEventListener('pointermove', move);

        $$('.lrow', this.list).forEach((row) => {
            row.addEventListener('pointerenter', (e) => {
                const src = row.dataset.thumb;
                if (!src) return;
                if (this.img.getAttribute('src') !== src) this.img.src = src;
                // land the thumb where the pointer already is before showing it,
                // or it flies in from wherever the last row left it
                if (this.setX && typeof window.gsap !== 'undefined') {
                    gsap.set(this.thumb, { x: e.clientX, y: e.clientY });
                }
                this.thumb.classList.add('is-on');
            });
            row.addEventListener('pointerleave', () => this.thumb.classList.remove('is-on'));
        });

        // a click means the page is about to move — the thumb must not ride along
        this.list.addEventListener('click', () => this.thumb.classList.remove('is-on'));
    }

    /** rows cascade in on the page's own grammar */
    reveal() {
        if (typeof window.gsap === 'undefined' || REDUCED) return;
        gsap.registerPlugin(ScrollTrigger);
        popIn($$('.lrow', this.list).map((r) => r.parentElement),
              { y: 26, stagger: .06, duration: .6, ease: 'expo.out' }, this.list, 'top 84%');
    }
}


/* =============================================================================
   GALLERY — the dossier grid (#gallery)
   The pills (desktop) and the select (phone) are two faces of one action:
   both land in applyFilter(), so the two controls can never disagree. A tilt
   follows the pointer across each card on fine pointers.
============================================================================= */
class Gallery {
    constructor() {
        this.scene = $('.gal');
        this.grid  = $('#galGrid');
        this.jump  = $('#galJump');
        this.empty = $('#galEmpty');
        this.reset = $('#galReset');
        this.at    = 'all';
    }

    init() {
        if (!this.scene || !this.grid) return;

        this.filters();
        this.reveal();
        if (FINE_POINTER && !REDUCED) this.tilt();

        /* Deep-linkable: /infusions/#d-liver opens with the liver dossier in
           view. The browser's own jump ignores the fixed header, so re-aim. */
        const h = window.location.hash;
        if (h && $(h)?.classList.contains('dos')) {
            setTimeout(() => Nav.to($(h)), 80);
        }
    }

    cards() { return $$('.dos', this.grid); }
    live()  { return this.cards().filter((c) => !c.classList.contains('is-out')); }

    filters() {
        $$('[data-filter]', this.scene).forEach((pill) => {
            pill.addEventListener('click', () => this.applyFilter(pill.dataset.filter));
        });
        this.jump?.addEventListener('change', () => this.applyFilter(this.jump.value));
        this.reset?.addEventListener('click', () => this.applyFilter('all'));
    }

    applyFilter(key) {
        if (!key || key === this.at) return;
        this.at = key;

        // keep both controls in step, whichever one was used
        $$('[data-filter]', this.scene).forEach((p) => {
            p.classList.toggle('is-on', p.dataset.filter === key);
        });
        if (this.jump && this.jump.value !== key) this.jump.value = key;

        this.cards().forEach((card) => {
            const tags = (card.dataset.tags || '').split(' ');
            card.classList.toggle('is-out', !(key === 'all' || tags.includes(key)));
        });

        const live = this.live();
        if (this.empty) this.empty.hidden = live.length > 0;

        if (typeof window.gsap === 'undefined' || REDUCED || !live.length) return;

        gsap.killTweensOf(live);
        gsap.fromTo(live,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: .55, ease: 'expo.out', stagger: .05,
              clearProps: 'opacity,transform' });
    }

    /** cards and chrome arrive on scroll */
    reveal() {
        if (typeof window.gsap === 'undefined' || REDUCED) return;
        gsap.registerPlugin(ScrollTrigger);

        /* one trigger per card, not one for the grid: on a phone the grid is
           one long column and a single trigger would fire everything at once
           for cards still three screens away */
        this.cards().forEach((card) => {
            popIn(card, { y: 40, duration: .7, ease: 'expo.out' }, card, 'top 88%');
        });
    }

    /** a quiet lean toward the pointer — the bags do the real moving */
    tilt() {
        if (typeof window.gsap === 'undefined') return;

        this.cards().forEach((card) => {
            const setRX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
            const setRY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
            let box = null;

            gsap.set(card, { transformPerspective: 900 });

            card.addEventListener('pointerenter', () => { box = card.getBoundingClientRect(); });
            card.addEventListener('pointermove', onFrame((e) => {
                if (!box) box = card.getBoundingClientRect();
                const px = (e.clientX - box.left) / box.width  - .5;
                const py = (e.clientY - box.top)  / box.height - .5;
                setRX(py * -3.5);
                setRY(px * 4.5);
            }));
            card.addEventListener('pointerleave', () => { box = null; setRX(0); setRY(0); });
        });
    }
}


/* =============================================================================
   DOCK — back to top (left) and the quick actions (right)
============================================================================= */
class Dock {
    constructor() {
        this.top    = $('#toTop');
        this.fab    = $('#fab');
        this.toggle = $('#fabToggle');
        this.open   = false;
    }

    init() {
        if (!this.top && !this.fab) return;

        Scroll.add((y) => {
            const past = y > window.innerHeight * 0.6;
            this.top?.classList.toggle('is-up', past);
            this.fab?.classList.toggle('is-up', past);
            if (!past && this.open) this.set(false);
        });

        this.top?.addEventListener('click', () => Nav.toY(0));

        this.toggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.set(!this.open);
        });

        $$('.fab__act', this.fab ?? document).forEach((a) =>
            a.addEventListener('click', () => this.set(false))
        );

        document.addEventListener('click', (e) => {
            if (this.open && this.fab && !this.fab.contains(e.target)) this.set(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.open) { this.set(false); this.toggle?.focus(); }
        });
    }

    set(open) {
        this.open = open;
        this.fab?.classList.toggle('is-open', open);
    }
}


/* =============================================================================
   REVEAL — generic scroll reveal for [data-reveal]; siblings cascade
============================================================================= */
class Reveal {
    init() {
        const els = $$('[data-reveal]');
        if (!els.length) return;

        if (REDUCED || !('IntersectionObserver' in window)) {
            els.forEach((el) => el.classList.add('is-visible'));
            return;
        }

        const io = new IntersectionObserver((entries) => {
            entries.forEach(({ isIntersecting, target }) => {
                if (!isIntersecting) return;
                target.classList.add('is-visible');
                io.unobserve(target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        els.forEach((el) => {
            const sibs = $$('[data-reveal]', el.parentElement)
                .filter((s) => s.parentElement === el.parentElement);
            const idx = sibs.indexOf(el);
            if (idx > 0) el.style.transitionDelay = `${Math.min(idx * 0.07, 0.35)}s`;
            io.observe(el);
        });
    }
}


/* =============================================================================
   BOOT
============================================================================= */
const modules = {
    nav:      Nav,
    header:   new Header(),
    menu:     new Menu(),
    magnetic: new Magnetic(),
    tape:     new Tape(),
    ledger:   new Ledger(),
    gallery:  new Gallery(),
    dock:     new Dock(),
    reveal:   new Reveal(),
};

const boot = () => {
    Object.values(modules).forEach((m) => {
        try { m.init(); }
        catch (err) { console.error(`[AVE] ${m.constructor?.name || 'module'} failed to start`, err); }
    });

    if ('ontouchstart' in window) document.documentElement.classList.add('is-touch');

    /* the entrance — no preloader on interior pages; the hero rises as soon
       as the DOM is live, with fonts refreshing the triggers when they land */
    requestAnimationFrame(() => document.body.classList.add('is-ready'));

    /* the footer year should never go stale */
    const yr = $('#footYear');
    if (yr) yr.textContent = new Date().getFullYear();

    /* Fonts and the bag images land AFTER first paint and change the height
       of the document — refresh the triggers when they do. No pinned section
       on this page, so a global refresh is always safe, but the address-bar
       resize guard from the home page still applies. */
    if (typeof window.gsap !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        ScrollTrigger.config({
            ignoreMobileResize: true,
            autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
        });

        const refresh = debounce(() => ScrollTrigger.refresh(), 140);

        if (document.fonts) document.fonts.ready.then(refresh);
        window.addEventListener('load', refresh);

        let lastW = window.innerWidth;
        window.addEventListener('resize', debounce(() => {
            if (window.innerWidth === lastW) return;   // height-only = address bar
            lastW = window.innerWidth;
            ScrollTrigger.refresh();
        }, 260));

        /* images settle at different times; count them down, refresh once */
        const imgs = $$('img').filter((i) => !i.complete);
        if (imgs.length) {
            let left = imgs.length;
            const done = () => { if (--left <= 0) refresh(); };
            imgs.forEach((img) => {
                img.addEventListener('load',  done, { once: true });
                img.addEventListener('error', done, { once: true });
            });
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

// handy in the console while the drips pages get built
window.AVE_INFUSIONS = { modules, boot, helpers: { $, $$, clamp, lerp, onFrame, debounce } };
