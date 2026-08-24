/* =============================================================================
   ALPHA VITAL ELITE IV — SCRIPT.JS  (ES6 module)
   -----------------------------------------------------------------------------
   Loaded with <script type="module">: module scope, strict mode, deferred.
   Every class feature-detects and no-ops when its elements are absent, so new
   sections drop in without touching this file.

     Helpers
     Scroll      one listener, one rAF, every subscriber
     Nav         the single smooth-scroll path — every button and anchor
     Trail       "you are here" — the active nav state, derived from the URL
     Preloader   hairline draws with the load, curtain lifts onto the film
     Header      condense · retreat on the way down · return on the way up
     Menu        parchment page, circular reveal, scroll lock, escape
     WordLoop    the rotating category in the "Infusions for ..." line
     HeroVideo   autoplay kick for iOS, poster fallback if the file is absent
     Magnetic    primary buttons lean toward the pointer (fine pointers only)
     Rail        ONE snap-carousel engine — used by the shelf and the evidence
     Shelf       the services rail — pinned horizontally, Rail-driven on phones
     Chronic     the chronic-condition switcher, its compounds and spotlight
     Advantage   the oral-vs-IV switch, drawn on arrival and on every toggle
     Visit       the four-step ledger
     Physician   sticky portrait, beats that pop, the chain of custody
     Research    the reference rail — a Rail with drag enabled
     Dock        back to top (left) and the action dial (right)
     Quiz        the modal matcher — four questions across the ten infusions
     Social      the Instagram band
     Reveal      generic scroll reveal for anything marked [data-reveal]
     Boot

   REQUIRES GSAP + ScrollTrigger from CDN in index.html BEFORE this file.
   Without them every module degrades to a static, readable layout.
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

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

/** Pop something into place the first time it is seen.
 *  gsap.from() rewrites its START values every time ScrollTrigger refreshes,
 *  which strands elements at opacity 0 — that is what broke the lanes. Setting
 *  the start state once and tweening TO the end state is immune to that, and a
 *  trigger-owned `to` tween still fires if the page is jumped past the section
 *  rather than scrolled to it. */
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
   Header and Dock each had their own scroll listener and their own rAF. Two
   listeners means two layout reads per frame for the same number. One loop
   reads scrollY once and hands it to everyone.
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
   NAV — the ONE place the page is allowed to scroll itself
   `scroll-behavior: smooth` has been removed from html in styles.css because
   it silently swallowed programmatic scrolls that arrived while one of its own
   animations was still running — ScrollTrigger issues those constantly around
   a pinned section. Every button and every in-page anchor routes through here
   instead, so there is exactly one scroll animation in flight at a time and a
   second click retargets it rather than being dropped.

   The fixed header is subtracted, which CSS smooth scrolling never did — an
   anchor used to land with its heading tucked underneath the bar.
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
        // delegated, so anchors added later (and the footer's) are covered too
        document.addEventListener('click', (e) => {
            const a = e.target.closest?.('a[href^="#"]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (!href || href === '#') return;
            const el = document.getElementById(href.slice(1));
            if (!el) return;
            e.preventDefault();
            this.to(el);
            // pushState, not replaceState: an in-page jump should be undoable
            // with the back button, and Chronic listens for that.
            if (window.location.hash !== href) history.pushState(null, '', href);
            else window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
    },
};


/* =============================================================================
   TRAIL — "you are here", derived from the URL
   -----------------------------------------------------------------------------
   The markup already carries `is-here` on the right link for index.html and
   infusions.html, so the correct item is lit with JavaScript off. What the
   markup cannot do is the ten drip pages: /drips/liver-support/ has to light
   its own row inside the flyout AND keep "Infusions" lit as the parent of the
   trail. Hand-editing that into ten files is ten chances to get it wrong, and
   eleven more the next time the menu changes. Read the path instead, once, and
   every page that exists — or gets built later — is correct by construction.

   THE MATCHING. Paths are normalised before they are compared, because the
   same page is reachable as /htmls/infusions.html, /htmls/infusions and
   /htmls/infusions/ depending on the host, and a trailing-slash mismatch is
   the classic reason an active state "randomly" stops working on deploy.

   Nav order across the site: Home · Infusions (flyout) · Dr. Aronov ·
   Research · Contact.
============================================================================= */
const Trail = {
    /** '/Drips/Liver-Support/' · '/htmls/infusions.html' · '/index.html'
     *  all collapse to one comparable shape. */
    clean(p) {
        let s = (p || '/').toLowerCase().split('#')[0].split('?')[0];
        s = s.replace(/\/index\.html?$/, '/');   // /index.html   -> /
        s = s.replace(/\.html?$/, '');           // /a/b.html     -> /a/b
        s = s.replace(/\/+$/, '');               // /a/b/         -> /a/b
        return s || '/';
    },

    /** the normalised path an anchor points at, or null if it leaves the site */
    path(a) {
        const href = a.getAttribute('href') || '';
        if (!href || /^(https?:|tel:|mailto:|#)/i.test(href)) return null;
        try { return this.clean(new URL(href, window.location.href).pathname); }
        catch { return null; }
    },

    mark(el, exact) {
        el.classList.add('is-here');
        if (exact) el.setAttribute('aria-current', 'page');
    },

    init() {
        const here    = this.clean(window.location.pathname);
        const tops    = [...$$('.head__link'), ...$$('.menu__nav > a')];
        const items   = [...$$('.hd-item'), ...$$('.menu__sub-item'), ...$$('.menu__sub-all')];
        const parents = $$('.head__drop > .head__link');
        const summary = $('.menu__drop > summary');
        const details = $('.menu__drop');

        if (!tops.length && !items.length) return;

        // start from nothing, so a stale class in the markup cannot leave two
        // items lit at once
        [...tops, ...items].forEach((el) => {
            el.classList.remove('is-here');
            el.removeAttribute('aria-current');
        });
        summary?.classList.remove('is-here');

        /* 1 · the exact page, wherever it appears in either menu.
              Any /drips/ URL counts as being inside the infusion menu even if
              no row matches it — that covers a protocol page that is not on
              the ten-item shortlist. */
        let inMenu = here.startsWith('/drips/');

        items.forEach((a) => {
            if (this.path(a) !== here) return;
            this.mark(a, true);
            inMenu = true;
        });

        tops.forEach((a) => {
            if (this.path(a) !== here) return;
            this.mark(a, true);
        });

        /* 2 · the parent of the trail. "Infusions" stays lit on every drip
              page and on the menu page itself — it is the section you are in,
              not the page you are on, so it gets the class without
              aria-current. */
        if (inMenu) {
            parents.forEach((a) => this.mark(a, false));
            if (summary) this.mark(summary, false);
            // open the accordion so the lit row is visible the moment the
            // burger is tapped, rather than one tap further in
            if (details) details.open = true;
        }
    },
};


/* =============================================================================
   PRELOADER
   Progress is real where it can be (fonts + critical images), padded by
   elapsed time so the line never stalls.
============================================================================= */
class Preloader {
    constructor() {
        this.el  = $('#pre');
        this.bar = $('#preBar');
        this.pct = $('#prePct');

        /* It used to wait on `window.load` — which does not fire until every
           lazy image, the hero video and three icon webfonts are in. On a
           phone that read as a wall.

           Now: it waits only on the things actually on screen (the mark, the
           hero poster) and on fonts, with a hard 900ms cap on the font wait so
           a slow Google Fonts response can never hold the page. */
        this.MIN_MS = 320;
        this.MAX_MS = 2000;
        this.start  = performance.now();
        this.shown  = 0;
        this.target = 0;
        this.loaded = false;
        this.dead   = false;
    }

    init() {
        if (!this.el || REDUCED) { this.release(true); return; }
        this.watchAssets();
        this.tick();
        setTimeout(() => { this.loaded = true; }, this.MAX_MS);
    }

    watchAssets() {
        // only what is painted before the first scroll — lazy images are not
        // part of "ready", and waiting on them was most of the old delay
        const critical = $$('img').filter((img) =>
            img.getAttribute('src') && img.loading !== 'lazy');
        const total = critical.length + 1;   // +1 for the font set
        let done = 0;

        const step = () => {
            done += 1;
            this.target = Math.max(this.target, (done / total) * 100);
        };

        // fonts, but never wait longer than 900ms for them
        const fonts = document.fonts
            ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))])
            : Promise.resolve();
        fonts.then(step);

        critical.forEach((img) => {
            if (img.complete) { step(); return; }
            img.addEventListener('load',  step, { once: true });
            img.addEventListener('error', step, { once: true });
        });

        // if the critical set is already cached there is nothing to wait for
        if (!critical.length) this.target = 100;
    }

    tick() {
        if (this.dead) return;
        const elapsed = performance.now() - this.start;
        const paced   = clamp((elapsed / this.MIN_MS) * 96, 0, 96);
        const goal    = this.loaded ? 100 : Math.max(this.target, paced);

        this.shown = lerp(this.shown, goal, 0.22);
        if (goal - this.shown < 0.6) this.shown = goal;

        if (this.bar) this.bar.style.width = `${this.shown.toFixed(1)}%`;
        const v = String(Math.round(this.shown));
        if (this.pct && this.pct.textContent !== v) this.pct.textContent = v;

        if (this.shown >= 99.4 && elapsed >= this.MIN_MS) { this.lift(); return; }
        requestAnimationFrame(() => this.tick());
    }

    async lift() {
        this.dead = true;                // stop the rAF loop before the DOM goes
        await wait(80);
        this.el?.classList.add('is-lifting');
        this.release();                  // the page is interactive during the curtain
        await wait(760);
        this.el?.remove();
    }

    release(instant = false) {
        this.dead = true;
        document.documentElement.classList.remove('is-preloading');
        document.body.classList.add('is-ready');
        if (instant) this.el?.remove();
    }
}


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
        // driven by the single shared scroll loop — see Scroll
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
   WORD LOOP — the rotating category in "Infusions for ..."
   The first child holds the layout width and height; the rest sit on top of it.
   Each category rises through the mask, holds, and exits upward. Only one is
   ever legible at a time. Nine categories — Joint and Skin are ONE infusion and
   share one line, so the loop never implies a tenth signature formula.
============================================================================= */
class WordLoop {
    constructor() {
        this.el    = $('#wordLoop');
        this.words = this.el ? $$('.loop__stack span', this.el) : [];
        this.index = 0;
        this.HOLD  = 2600;
        this.timer = null;
        this.swap  = null;
    }

    init() {
        if (!this.el || this.words.length < 2 || REDUCED) return;

        // Wait for the entrance to land before the first swap
        const begin = () => { this.timer = setInterval(() => this.next(), this.HOLD); };
        setTimeout(begin, 2400);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(this.timer); this.timer = null;
                clearTimeout(this.swap);   this.swap  = null;
            } else if (!this.timer) {
                this.timer = setInterval(() => this.next(), this.HOLD);
            }
        });
    }

    next() {
        const current = this.words[this.index];
        this.index = (this.index + 1) % this.words.length;
        const incoming = this.words[this.index];

        // Roll out through the top of the mask...
        current.classList.remove('is-on');
        current.classList.add('is-out');

        // ...and only then bring the next category up through the bottom,
        // so two are never legible at once.
        clearTimeout(this.swap);
        this.swap = setTimeout(() => {
            current.classList.remove('is-out');
            incoming.classList.add('is-on');
        }, 220);
    }
}


/* =============================================================================
   HERO VIDEO
============================================================================= */
class HeroVideo {
    constructor() {
        this.video = $('#heroVideo');
        this.media = this.video?.closest('.hero__media') ?? null;
    }

    init() {
        if (!this.video) return;

        // iOS sometimes needs an explicit kick even with autoplay+muted
        const play = () => this.video.play()?.catch(() => {});
        if (this.video.readyState >= 2) play();
        else this.video.addEventListener('loadeddata', play, { once: true });

        // File missing or codec unsupported -> hold on the poster, stop the drift
        this.video.addEventListener('error', () => this.media?.classList.add('is-still'), { once: true });
        const src = this.video.querySelector('source');
        src?.addEventListener('error', () => this.media?.classList.add('is-still'), { once: true });

        if (REDUCED) { this.video.pause(); this.video.removeAttribute('autoplay'); }

        // Spare the battery when the tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (REDUCED) return;
            if (document.hidden) this.video.pause();
            else play();
        });

        /* And when the hero is scrolled past. The video decode and the grain
           keyframes were both still running for the whole page — on a phone
           that is a constant tax for something nobody can see. */
        if ('IntersectionObserver' in window && !REDUCED) {
            const grain = $('.hero__grain');
            new IntersectionObserver(([e]) => {
                if (e.isIntersecting) { play(); if (grain) grain.style.animationPlayState = 'running'; }
                else { this.video.pause(); if (grain) grain.style.animationPlayState = 'paused'; }
            }, { threshold: 0.01 }).observe(this.media ?? this.video);
        }
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

        /* mousemove fires far faster than the display refreshes, and each event
           was writing a transform and caching a getBoundingClientRect. Now the
           box is measured on enter, and the write is a gsap quickTo — one
           interpolated set per frame, which also makes the lean feel smoother. */
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
   RAIL — ONE snap-carousel engine
   -----------------------------------------------------------------------------
   The shelf (on phones) and the evidence rail were two separate implementations
   of the same thing: a native scroll-snap track, arrow buttons, a counter, a
   meter, keyboard support and pointer drag. They had drifted — the evidence
   rail had the stale-index fix and the shelf did not, so the shelf's arrows
   "worked sometimes". One engine, one place to fix anything.

   Native snap deliberately: the browser scrolls the track on the compositor
   for free. Hijacking vertical scroll to drive a transform is what was dropping
   frames on a phone.

   THE STALE INDEX, FIXED. `step()` used to compute the next index from the
   index last WRITTEN BY A SCROLL EVENT. Click twice quickly and the second
   click read the pre-scroll index, recomputed the SAME target, and the rail
   went nowhere. `aim` is the index the buttons own; while it is set, scroll
   events update the disabled states but may NOT overwrite the index underneath
   an in-flight smooth scroll. It clears once scrolling has settled.

   Options:
     track    the scrolling element                       (required)
     item     selector for one card, scoped to the track  (required)
     prev/next/now/total/meter   optional chrome
     drag     enable pointer drag on fine pointers        (default false)
     onIndex  callback(i, liveItems) whenever the index changes
============================================================================= */
class Rail {
    constructor(opts = {}) {
        this.track = opts.track;
        this.sel   = opts.item;
        this.prev  = opts.prev  || null;
        this.next  = opts.next  || null;
        this.now   = opts.now   || null;
        this.total = opts.total || null;
        this.meter = opts.meter || null;
        this.useDrag = !!opts.drag;
        this.onIndex = opts.onIndex || null;

        this.last = -1;
        this.aim  = -1;
        this.DRAG = 6;
        this.io   = null;
        this.off  = [];
        this.settle = debounce(() => { this.aim = -1; this.read(); }, 180);
    }

    /** only the cards the filter has left visible */
    items() {
        return $$(this.sel, this.track).filter((el) => !el.classList.contains('is-out'));
    }

    mount() {
        if (!this.track || !this.items().length) return;

        this.count();
        this.last = -1;
        this.paint(0);

        const onScroll = onFrame(() => {
            this.edges();
            if (this.aim < 0) this.read();
            this.settle();
        });
        this.track.addEventListener('scroll', onScroll, { passive: true });
        this.off.push(() => this.track.removeEventListener('scroll', onScroll));

        const onPrev = () => this.step(-1);
        const onNext = () => this.step(1);
        this.prev?.addEventListener('click', onPrev);
        this.next?.addEventListener('click', onNext);
        this.off.push(() => {
            this.prev?.removeEventListener('click', onPrev);
            this.next?.removeEventListener('click', onNext);
        });

        // arrow keys, once the rail has focus
        const onKey = (e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); this.step(1); }
            if (e.key === 'ArrowLeft')  { e.preventDefault(); this.step(-1); }
        };
        this.track.setAttribute('tabindex', '0');
        this.track.addEventListener('keydown', onKey);
        this.off.push(() => {
            this.track.removeEventListener('keydown', onKey);
            this.track.removeAttribute('tabindex');
        });

        this.observe();
        if (this.useDrag && FINE_POINTER) this.drag();

        // a late-loading webfont changes every card's height and the track's
        // scrollWidth with it — re-read once the type has settled
        if (document.fonts) document.fonts.ready.then(() => this.read());

        this.edges();
    }

    unmount() {
        this.off.forEach((fn) => fn());
        this.off = [];
        this.io?.disconnect();
        this.io = null;
        this.aim = -1;
        this.last = -1;
    }

    /** THE FILTER BUG, FIXED. The observer used to be built once at mount and
     *  went on watching all ten cards including the hidden ones, so after a
     *  filter the counter read positions from cards that were not on screen.
     *  Rebuilt against the live set every time the filter changes. */
    observe() {
        this.io?.disconnect();
        this.io = null;
        if (!('IntersectionObserver' in window)) return;

        this.io = new IntersectionObserver((entries) => {
            if (this.aim >= 0) return;          // the arrows own the index right now
            let best = null;
            for (const en of entries) {
                if (!en.isIntersecting) continue;
                if (!best || en.intersectionRatio > best.intersectionRatio) best = en;
            }
            if (!best) return;
            const i = this.items().indexOf(best.target);
            if (i >= 0) this.paint(i);
        }, { root: this.track, threshold: [0.5, 0.7, 0.9] });

        this.items().forEach((el) => this.io.observe(el));
    }

    /** call after the visible set changes */
    refilter() {
        this.count();
        this.last = -1;
        this.aim  = -1;
        this.track.scrollLeft = 0;
        this.paint(0);
        this.observe();
        this.edges();
    }

    count() {
        if (this.total) this.total.textContent = String(this.items().length).padStart(2, '0');
    }

    /** read the index back off the scroll position */
    read() {
        const items = this.items();
        if (!items.length) return;
        const x = this.track.scrollLeft;
        const base = items[0].offsetLeft;
        let i = 0;
        for (let n = 0; n < items.length; n += 1) {
            if (items[n].offsetLeft - base <= x + 8) i = n;
        }
        this.paint(i);
        this.edges();
    }

    /** counter + meter + whatever the owner wants to do with the index */
    paint(i) {
        const items = this.items();
        if (!items.length || i === this.last) return;
        this.last = i;
        if (this.now)   this.now.textContent = String(i + 1).padStart(2, '0');
        if (this.meter) this.meter.style.width = ((i + 1) / items.length) * 100 + '%';
        this.onIndex?.(i, items);
    }

    /* Several cards are visible at once on a laptop, so the last card can never
       become the leftmost one — index alone would leave "next" enabled forever.
       Disable against the real scroll extent instead. A 2px tolerance covers
       sub-pixel scroll positions on fractional device pixel ratios. */
    edges() {
        const max = this.track.scrollWidth - this.track.clientWidth;
        if (this.prev) this.prev.disabled = this.track.scrollLeft <= 2;
        if (this.next) this.next.disabled = this.track.scrollLeft >= max - 2;
    }

    step(dir) {
        const items = this.items();
        if (!items.length) return;

        // start from the index the buttons already claimed, not from wherever
        // the scroll happens to have reached this frame
        const from = this.aim >= 0 ? this.aim : (this.last < 0 ? 0 : this.last);
        const i = clamp(from + dir, 0, items.length - 1);
        if (i === from) { this.edges(); return; }

        this.aim = i;
        this.paint(i);                     // the counter answers immediately
        this.track.scrollTo({
            left: items[i].offsetLeft - items[0].offsetLeft,
            behavior: REDUCED ? 'auto' : 'smooth',
        });
        this.settle();                     // release the claim once it lands
    }

    /** grab and pull, the way you would slide a card across a desk */
    drag() {
        const t = this.track;
        let down = false, moved = false, startX = 0, startLeft = 0;

        const onDown = (e) => {
            if (e.pointerType === 'touch' || e.button !== 0) return;   // touch already scrolls
            down = true; moved = false;
            startX = e.clientX;
            startLeft = t.scrollLeft;
        };
        const onMove = (e) => {
            if (!down) return;
            const dx = e.clientX - startX;
            if (!moved && Math.abs(dx) < this.DRAG) return;
            if (!moved) { moved = true; t.classList.add('is-dragging'); t.setPointerCapture(e.pointerId); }
            t.scrollLeft = startLeft - dx;
        };
        const release = (e) => {
            if (!down) return;
            down = false;
            if (!moved) return;
            this.aim = -1;                 // the pointer wins over the arrows
            t.classList.remove('is-dragging');
            if (e?.pointerId != null && t.hasPointerCapture?.(e.pointerId)) t.releasePointerCapture(e.pointerId);
            // hand the position back to the snap engine, then re-read
            requestAnimationFrame(() => this.read());
        };
        // a drag that ends on a card must not also open the link
        const onClick = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } };

        t.addEventListener('pointerdown', onDown);
        t.addEventListener('pointermove', onMove);
        t.addEventListener('pointerup', release);
        t.addEventListener('pointercancel', release);
        t.addEventListener('pointerleave', release);
        t.addEventListener('click', onClick, true);

        this.off.push(() => {
            t.removeEventListener('pointerdown', onDown);
            t.removeEventListener('pointermove', onMove);
            t.removeEventListener('pointerup', release);
            t.removeEventListener('pointercancel', release);
            t.removeEventListener('pointerleave', release);
            t.removeEventListener('click', onClick, true);
        });
    }
}


/* =============================================================================
   THE SHELF — the services rail (#infusions)
   Ten plates: nine signature infusions and one customized option. Pinned
   horizontally on desktop and scrubbed by vertical scroll; a Rail on phones.

   The filters are generic — a pill's data-filter is matched against a plate's
   data-tags, so the eleven-button order needs no code change here. The desktop
   pills and the phone select both call applyFilter(), so there is one code
   path and the two controls can never disagree.
============================================================================= */
class Shelf {
    static pinned = false;

    constructor() {
        this.scene    = $('.shelf');
        this.pin      = $('#shelfPin');
        this.viewport = $('#shelfViewport');
        this.track    = $('#shelfTrack');
        this.meter    = $('#shelfMeter');
        this.now      = $('#shelfNow');
        this.total    = $('#shelfTotal');
        this.skip     = $('#shelfSkip');
        this.prev     = $('#shelfPrev');
        this.next     = $('#shelfNext');
        this.jump     = $('#shelfJump');
        this.at       = 'all';
        this.last     = -1;
        this.st       = null;
        this.rail     = null;
        this.BREAK    = 900;
    }

    init() {
        if (!this.scene || !this.track) return;

        this.filters();
        this.skipButton();
        this.count();
        this.paint(0);

        if (typeof window.gsap === 'undefined' || REDUCED) {
            $$('.plate', this.track).forEach((p) => p.classList.add('is-active'));
            this.arrows(false);
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        const mm = gsap.matchMedia();
        mm.add(`(min-width: ${this.BREAK + 1}px)`, () => this.desktopRail());
        mm.add(`(max-width: ${this.BREAK}px)`,     () => this.mobileRail());
    }

    live() {
        return $$('.plate', this.track).filter((p) => !p.classList.contains('is-out'));
    }

    count() {
        if (this.total) this.total.textContent = String(this.live().length).padStart(2, '0');
    }

    /** desktop counter/meter/dimming. The mobile rail drives this through its
     *  own onIndex callback so the two never fight over the same numbers. */
    paint(index) {
        const list = this.live();
        if (!list.length) return;

        const i = clamp(index, 0, list.length - 1);
        if (i === this.last) return;
        this.last = i;

        if (this.now)   this.now.textContent = String(i + 1).padStart(2, '0');
        if (this.meter) this.meter.style.width = ((i + 1) / list.length) * 100 + '%';
        list.forEach((p, n) => p.classList.toggle('is-active', n === i));
    }

    /* =====================================================================
       DESKTOP — the section pins and vertical scroll drives the rail sideways
       ===================================================================== */
    desktopRail() {
        const distance = () => {
            const list = this.live();
            if (!list.length) return 0;
            const lastEl = list[list.length - 1];
            const pad = parseFloat(getComputedStyle(this.track).paddingRight) || 0;
            return Math.max(0, Math.round(lastEl.offsetLeft + lastEl.offsetWidth + pad - window.innerWidth));
        };

        const setX = gsap.quickSetter(this.track, 'x', 'px');

        this.st = ScrollTrigger.create({
            trigger: this.pin,
            start: 'top top',
            /* end is a FUNCTION and invalidateOnRefresh is on, so the scroll
               length is re-measured against the live set every refresh —
               which is what makes filtering shorten the section instead of
               leaving a stretch of empty scroll behind the last card. */
            end: () => '+=' + (distance() + window.innerHeight * 0.6),
            pin: this.viewport,
            pinSpacing: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            fastScrollEnd: true,
            onToggle: (self) => {
                Shelf.pinned = self.isActive;
                this.track.style.willChange = self.isActive ? 'transform' : 'auto';
            },
            onUpdate: (self) => {
                setX(-Math.round(self.progress * distance()));
                const list = this.live();
                this.paint(Math.round(self.progress * (list.length - 1)));

                // numerals counter-scroll — one pass, not a trigger per card
                const vw = window.innerWidth;
                for (const p of list) {
                    const no = p.__no || (p.__no = $('.plate__no', p));
                    if (!no) continue;
                    const box = p.getBoundingClientRect();
                    const t = 1 - clamp((box.left + box.width / 2) / vw, 0, 1);
                    no.style.transform = `translateX(${Math.round(22 - t * 44)}px)`;
                }
            },
        });

        popIn($$('.plate', this.track), { y: 46, stagger: .05, duration: .9, ease: 'expo.out' }, this.pin, 'top 72%');
        this.arrows(false);

        return () => {
            this.st?.kill(true);
            this.st = null;
            Shelf.pinned = false;
            gsap.set(this.track, { x: 0, clearProps: 'willChange' });
            /* the counter-scroll wrote an inline transform onto every numeral.
               Crossing the breakpoint tears this rail down but those writes
               survive, so the numerals stayed shoved sideways on the phone
               layout. Clear them on the way out. */
            $$('.plate__no', this.track).forEach((no) => { no.style.transform = ''; });
        };
    }

    /* =====================================================================
       PHONE + TABLET — the shared Rail. No pin, no scrub, no scroll-jacking.
       ===================================================================== */
    mobileRail() {
        gsap.set(this.track, { x: 0 });

        this.rail = new Rail({
            track: this.track,
            item: '.plate',
            prev: this.prev,
            next: this.next,
            now: this.now,
            total: this.total,
            meter: this.meter,
            onIndex: (i, items) => {
                this.last = i;
                items.forEach((p, n) => p.classList.toggle('is-active', n === i));
            },
        });
        this.rail.mount();

        this.arrows(true);
        popIn($$('.plate', this.track), { y: 26, stagger: .05, duration: .7, ease: 'expo.out' }, this.scene, 'top 78%');

        return () => {
            this.rail?.unmount();
            this.rail = null;
        };
    }

    arrows(on) {
        const box = $('.shelf__arrows');
        if (box) box.style.display = on ? 'flex' : '';
        [this.prev, this.next].forEach((b) => b && (b.hidden = !on));
    }

    skipButton() {
        if (!this.skip) return;

        /* Was scrollIntoView() on #conditions. Two problems with that while the
           rail is pinned:

           1. The pin owns hundreds of pixels of scroll BELOW the viewport, and
              #conditions' box is measured against the pin-spacer, so the
              browser aimed into the middle of the pinned range and the page
              appeared not to move — or moved and got dragged straight back by
              the scrub.
           2. It requested a smooth scroll while CSS smooth scrolling was also
              on, so the request was frequently dropped outright.

           The pin already knows the one scroll position where it lets go:
           st.end. Go there. On mobile there is no pin, so aim at the section. */
        this.skip.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.st) { Nav.toY(this.st.end + 2); return; }
            const after = $('#advantage') || this.scene.nextElementSibling;
            if (after) { Nav.to(after); return; }
            Nav.toY(this.scene.offsetTop + this.scene.offsetHeight);
        });
    }

    /* ---------------------------------------------------------------------
       FILTERS — the pills (desktop) and the select (phone) are two faces of
       one action. Both land in applyFilter().
       --------------------------------------------------------------------- */
    filters() {
        const pills = $$('[data-filter]', this.scene);

        pills.forEach((pill) => {
            pill.addEventListener('click', () => this.applyFilter(pill.dataset.filter));
        });

        this.jump?.addEventListener('change', () => this.applyFilter(this.jump.value));
    }

    applyFilter(key) {
        if (!key || key === this.at) return;
        this.at = key;

        // keep both controls in step, whichever one was used
        $$('[data-filter]', this.scene).forEach((p) => {
            p.classList.toggle('is-on', p.dataset.filter === key);
        });
        if (this.jump && this.jump.value !== key) this.jump.value = key;

        $$('.plate', this.track).forEach((plate) => {
            const tags = (plate.dataset.tags || '').split(' ');
            plate.classList.toggle('is-out', !(key === 'all' || tags.includes(key)));
        });

        this.last = -1;
        this.count();

        // the phone rail rebuilds its observer and its counter against the
        // new visible set — see Rail.refilter()
        if (this.rail) { this.rail.refilter(); }
        else { this.track.scrollLeft = 0; this.paint(0); }

        if (typeof window.gsap === 'undefined' || REDUCED) return;

        gsap.set(this.track, { x: 0 });
        gsap.fromTo(this.live(),
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: .6, ease: 'expo.out', stagger: .04 });

        /* THE FILTER → BLANK-SECTIONS BUG, FIXED.
           Filtering changes the pin's scroll length, which changes the height
           of the whole document — but refreshing ONLY this.st (the old code)
           left every trigger BELOW the shelf holding start positions measured
           against the ten-card page. Scroll on and those triggers fire at the
           wrong scroll offsets or never fire at all, and since popIn parks its
           targets at opacity 0 until its trigger fires, whole sections render
           blank. Every trigger has to be remeasured, not just this one.

           A GLOBAL refresh is only unsafe mid-pin, so first return to the top
           of the pin (progress 0) where nothing is in flight, then refresh
           everything on the next frame. This deliberately bypasses the
           safeRefresh guard in boot(): that guard exists to block refreshes
           that arrive at an arbitrary pin progress, and this one never does. */
        if (this.st && window.scrollY > this.st.start) {
            window.scrollTo({ top: this.st.start, behavior: 'auto' });
        }
        requestAnimationFrame(() => ScrollTrigger.refresh());
    }
}


/* =============================================================================
   CHRONIC CONDITIONS — a switcher, not a stack (#conditions)
   Seven long cards made this the tallest block on the page and nobody reads a
   condition they do not have. One panel is live at a time; the rest stay in
   the DOM (visibility, not display) so every word is still crawlable.

   Deep-linkable: /#cond-mafld opens fatty liver from an ad or an email —
   and now at ANY time, not only on load. It used to read the hash exactly once
   during init, so a link clicked while already on the page did nothing, and
   the back button did nothing after switching conditions.
============================================================================= */
class Chronic {
    constructor() {
        this.scene = $('.chron');
        this.tabs  = $$('.cnav__tab');
        this.cards = $$('.cd');
        this.prev  = $('#condPrev');
        this.next  = $('#condNext');
        this.now   = $('#condNow');
        this.total = $('#condTotal');
        this.at    = 0;
    }

    init() {
        if (!this.scene || !this.cards.length) return;

        this.tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => this.show(i, true));
            tab.addEventListener('keydown', (e) => {
                const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
                if (step) {
                    e.preventDefault();
                    const n = (i + step + this.tabs.length) % this.tabs.length;
                    this.show(n, true); this.tabs[n].focus();
                } else if (e.key === 'Home') { e.preventDefault(); this.show(0, true); this.tabs[0].focus(); }
                else if (e.key === 'End')  { e.preventDefault(); const n = this.tabs.length - 1; this.show(n, true); this.tabs[n].focus(); }
            });
        });

        /* On a phone the pill rail scrolls sideways and the other six
           conditions are off screen with nothing to say they exist. These
           step through them and the counter states the total outright. */
        if (this.total) this.total.textContent = String(this.cards.length).padStart(2, '0');
        this.prev?.addEventListener('click', () => this.step(-1));
        this.next?.addEventListener('click', () => this.step(1));

        const first = this.fromHash();
        this.show(first >= 0 ? first : 0, false);
        if (first >= 0) setTimeout(() => Nav.to(this.scene), 60);

        // any time, not just on load — covers in-page links and the back button
        window.addEventListener('hashchange', () => {
            const i = this.fromHash();
            if (i < 0) return;
            this.show(i, true);
            Nav.to(this.scene);
        });
        window.addEventListener('popstate', () => {
            const i = this.fromHash();
            if (i >= 0) this.show(i, true);
        });

        this.spotlight();

        if (typeof window.gsap !== 'undefined' && !REDUCED) {
            gsap.registerPlugin(ScrollTrigger);
            popIn($$('.cnav__tab', this.scene), { y: 14, stagger: .04, duration: .4, ease: 'back.out(1.8)' }, '.cnav', 'top 90%');
            popIn($('.cstage'), { y: 26, duration: .6 }, '.cstage', 'top 88%');
        }
    }

    fromHash() {
        const h = window.location.hash;
        if (!h) return -1;
        return this.cards.findIndex((c) => '#' + c.id === h);
    }

    /** wrap around, so the arrows never dead-end */
    step(dir) {
        const n = (this.at + dir + this.cards.length) % this.cards.length;
        this.show(n, true);
    }

    show(i, animate) {
        if (i === this.at && animate) return;
        this.at = i;
        if (this.now) this.now.textContent = String(i + 1).padStart(2, '0');

        this.tabs.forEach((t, n) => {
            const on = n === i;
            t.classList.toggle('is-on', on);
            // keep the active pill in view on the phone's horizontal rail
            if (on && animate && t.scrollIntoView) {
                t.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
            }
        });

        this.cards.forEach((c, n) => c.classList.toggle('is-live', n === i));

        const card = this.cards[i];
        if (!animate || typeof window.gsap === 'undefined' || REDUCED) return;

        gsap.killTweensOf([card, ...$$('.cd__l > *, .cd__mol, .cd__never', card)]);
        gsap.fromTo(card, { opacity: 0, y: 20, scale: .99 },
                          { opacity: 1, y: 0, scale: 1, duration: .48, ease: 'expo.out' });
        gsap.fromTo($$('.cd__l > *', card), { opacity: 0, y: 14 },
                    { opacity: 1, y: 0, duration: .42, ease: 'power3.out', stagger: .045, delay: .05 });
        gsap.fromTo($$('.cd__mol, .cd__never', card), { opacity: 0, x: 14 },
                    { opacity: 1, x: 0, duration: .42, ease: 'power3.out', stagger: .05, delay: .12 });
        const ghost = $('.cd__ghost', card);
        if (ghost) gsap.fromTo(ghost, { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: .8, ease: 'expo.out' });
    }

    /** a pool of warmth that follows the pointer across the section */
    spotlight() {
        if (!FINE_POINTER || REDUCED) return;
        const move = onFrame((e) => {
            const b = this.scene.getBoundingClientRect();
            this.scene.style.setProperty('--mx', ((e.clientX - b.left) / b.width  * 100).toFixed(2) + '%');
            this.scene.style.setProperty('--my', ((e.clientY - b.top)  / b.height * 100).toFixed(2) + '%');
        });
        this.scene.addEventListener('pointermove', move);
        this.scene.addEventListener('pointerenter', () => this.scene.classList.add('is-live'));
        this.scene.addEventListener('pointerleave', () => this.scene.classList.remove('is-live'));
    }
}


/* =============================================================================
   THE IV ADVANTAGE — one stage, one switch (#advantage)
   Picking a road draws it: the rule fills, the pins light in sequence. The
   first draw is fired by ScrollTrigger so it plays on arrival; every switch
   after that replays it. Vertical below 900px, which is why the fill animates
   whichever axis the media query is using — and why it redraws when the
   layout flips, or a rotate left the fill running along the wrong axis.
============================================================================= */
class Advantage {
    constructor() {
        this.el     = $('#advantage');
        this.road   = $('#advRoad');
        this.stage  = $('#advStage');
        this.switch = $('.adv__switch', this.el ?? document);
        this.opts   = $$('.adv__opt', this.el ?? document);
        this.lanes  = $$('.adv__lane', this.el ?? document);
        this.at     = 'oral';
        this.st     = null;
        this.pinned = false;
        this.locked = false;
        this.BREAK  = 900;

        /* Where the scrub does what, as a fraction of the pinned run:
             0    → .40   the oral road draws, stop by stop
             .40  → .50   it sits finished — the beat where the verdict reads
             .50          the switch throws over to the line
             .50  → .92   the IV road draws
             .92  → 1     finished, held, then the pin releases        */
        this.CUT = { oral: .40, swap: .50, iv: .92 };
    }

    init() {
        if (!this.el || !this.lanes.length) return;

        this.opts.forEach((o) => o.addEventListener('click', () => this.pick(o.dataset.lane)));

        this.switch?.addEventListener('keydown', (e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault();
            const next = this.at === 'oral' ? 'iv' : 'oral';
            this.pick(next);
            this.opts.find((o) => o.dataset.lane === next)?.focus();
        });

        // no GSAP, or motion turned down: both roads drawn, nothing moves
        if (typeof window.gsap === 'undefined' || REDUCED) {
            this.lanes.forEach((l) => {
                $$('.stp', l).forEach((s) => s.classList.add('is-passed'));
                const f = $('.adv__fill', l);
                if (f) { f.style.width = '100%'; f.style.height = '100%'; }
            });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        popIn($$('.adv__head > *, .adv__note', this.el),
              { y: 26, stagger: .07, duration: .55, ease: 'back.out(1.5)' }, this.el, 'top 84%');

        /* Same split the shelf uses. Desktop gets the pin; a phone gets the
           road in normal flow, because pinning a mid-page block on a touch
           device fights the address bar every time it collapses. */
        const mm = gsap.matchMedia();
        mm.add(`(min-width: ${this.BREAK + 1}px)`, () => this.pinnedRoad());
        mm.add(`(max-width: ${this.BREAK}px)`,     () => this.flowRoad());
    }

    laneEl(lane) { return this.lanes.find((l) => l.dataset.lane === lane); }

    /* =====================================================================
       DESKTOP — the road pins and vertical scroll draws it
       ===================================================================== */
    pinnedRoad() {
        if (!this.road) return;
        this.pinned = true;
        const C = this.CUT;

        this.setLane('oral', false);
        this.paint(this.laneEl('oral'), 0);

        this.st = ScrollTrigger.create({
            trigger: this.road,
            start: 'center center',
            /* a function + invalidateOnRefresh so the run re-measures against
               the live viewport instead of freezing whatever height the page
               happened to load at */
            end: () => '+=' + Math.round(window.innerHeight * 1.9),
            pin: true,
            pinSpacing: true,
            scrub: .6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            fastScrollEnd: true,
            onToggle: (self) => {
                this.road.style.willChange = self.isActive ? 'transform' : 'auto';
            },
            onUpdate: (self) => {
                const p = self.progress;
                if (p < C.swap) {
                    this.setLane('oral');
                    this.paint(this.laneEl('oral'), p / C.oral);
                } else {
                    this.setLane('iv');
                    this.paint(this.laneEl('iv'), (p - C.swap) / (C.iv - C.swap));
                }
            },
        });

        return () => {
            this.st?.kill(true);
            this.st = null;
            this.pinned = false;
            gsap.set(this.road, { clearProps: 'willChange' });
        };
    }

    /* =====================================================================
       PHONE + TABLET — no pin. The road draws itself on arrival and the
       switch throws over once the stage is carried past mid-screen.
       ===================================================================== */
    flowRoad() {
        this.pinned = false;

        const first = ScrollTrigger.create({
            trigger: this.el, start: 'top 72%', once: true,
            onEnter: () => this.sweep(this.at),
        });

        const over = ScrollTrigger.create({
            trigger: this.stage ?? this.el,
            start: 'center 46%',
            onEnter: () => {
                if (this.locked || this.at !== 'oral') return;
                this.setLane('iv'); this.sweep('iv');
            },
            onLeaveBack: () => {
                if (this.locked || this.at !== 'iv') return;
                this.setLane('oral'); this.sweep('oral');
            },
        });

        return () => { first.kill(); over.kill(); };
    }

    /* =====================================================================
       SHARED
       ===================================================================== */

    /** A click on the switch. While the road is pinned the switch is a
     *  readout of scroll position, not a toggle — setting the class alone
     *  would be overwritten by the very next scroll event. So move the page
     *  to the scroll position that owns that lane and let the scrub do it. */
    pick(lane) {
        if (this.pinned && this.st) {
            const { start, end } = this.st;
            const at = lane === 'iv' ? this.CUT.iv : this.CUT.oral;
            Nav.toY(Math.round(start + (end - start) * at));
            return;
        }
        this.locked = true;              // phone: stop the auto-flip meddling
        if (lane === this.at) return;
        this.setLane(lane);
        this.sweep(lane);
    }

    /** lane visibility + the switch chrome. Never touches the fill. */
    setLane(lane, fade = true) {
        if (lane === this.at && this.lanes.some((l) => l.classList.contains('is-live'))) return;
        this.at = lane;

        this.opts.forEach((o) => o.classList.toggle('is-on', o.dataset.lane === lane));
        this.switch?.classList.toggle('is-iv', lane === 'iv');
        this.lanes.forEach((l) => l.classList.toggle('is-live', l.dataset.lane === lane));

        if (fade && typeof window.gsap !== 'undefined' && !REDUCED) {
            gsap.fromTo(this.laneEl(lane),
                { opacity: 0, y: 14 },
                { opacity: 1, y: 0, duration: .4, ease: 'expo.out', overwrite: true });
        }
    }

    /** Draw a road to an exact position, 0 → 1. Below 900px the rule is
     *  vertical, so the fill has to animate whichever axis is in play. */
    paint(lane, p) {
        if (!lane) return;
        const fill  = $('.adv__fill', lane);
        const stops = $$('.stp', lane);
        if (!fill || !stops.length) return;

        const vertical = window.matchMedia(`(max-width: ${this.BREAK}px)`).matches;
        const pct = clamp(p, 0, 1) * 100;

        fill.style[vertical ? 'height' : 'width'] = pct.toFixed(1) + '%';
        fill.style[vertical ? 'width' : 'height'] = '100%';
        stops.forEach((s, i) => {
            s.classList.toggle('is-passed', pct >= ((i + 0.55) / stops.length) * 100);
        });
    }

    /** Self-running draw, for the unpinned layout where no scrub exists. */
    sweep(lane) {
        const el = this.laneEl(lane);
        if (!el) return;
        const stops = $$('.stp', el);
        const span  = { v: 0 };
        gsap.killTweensOf(span);
        this.paint(el, 0);
        gsap.to(span, {
            v: 1,
            duration: 0.32 * stops.length + 0.5,
            ease: 'power2.inOut',
            onUpdate: () => this.paint(el, span.v),
        });
    }
}


/* =============================================================================
   HOW A VISIT WORKS — four beats on one rule (#visit)
   The rule draws once, on arrival, and each node lights as the fill reaches
   it. Deliberately simple: the section sits between two heavy ones and its job
   is to be over quickly. Horizontal above 640px, vertical below, so the fill
   animates whichever axis the media query is using.
============================================================================= */
class Visit {
    constructor() {
        this.el    = $('#visit');
        this.list  = $('#visitSteps');
        this.steps = $$('.vs', this.list ?? document);
        this.fill  = $('.visit__fill', this.el ?? document);
        this.drawn = false;
    }

    init() {
        if (!this.el || !this.steps.length) return;

        // no GSAP or reduced motion -> everything already lit, nothing to draw
        if (typeof window.gsap === 'undefined' || REDUCED) {
            this.steps.forEach((s) => s.classList.add('is-on'));
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        ScrollTrigger.create({
            trigger: this.list,
            start: 'top 74%',
            once: true,
            onEnter: () => { this.drawn = true; this.draw(); },
        });

        popIn(this.steps, { y: 26, stagger: .09, duration: .55, ease: 'back.out(1.5)' }, this.list, 'top 82%');
        popIn($$('.visit__intro > *, .visit__close > *', this.el),
              { y: 22, stagger: .08, duration: .55 }, this.el, 'top 86%');

        // same axis-flip problem as the advantage lanes — redraw on the hinge
        const mq = window.matchMedia('(max-width: 640px)');
        const onFlip = () => { if (this.drawn) this.draw(); };
        mq.addEventListener ? mq.addEventListener('change', onFlip) : mq.addListener(onFlip);
    }

    /** fill the rule and light each node as it is passed */
    draw() {
        if (!this.fill) return;
        const vertical = window.matchMedia('(max-width: 640px)').matches;
        const axis = vertical ? 'height' : 'width';
        // clear the other axis, or a flip leaves the old one at 100%
        this.fill.style[vertical ? 'width' : 'height'] = '';
        const span = { v: 0 };

        gsap.killTweensOf(span);
        gsap.to(span, {
            v: 100,
            duration: 1.5,
            ease: 'power2.inOut',
            onUpdate: () => {
                this.fill.style[axis] = span.v.toFixed(1) + '%';
                this.steps.forEach((s, i) => {
                    s.classList.toggle('is-on', span.v >= (i / this.steps.length) * 100);
                });
            },
        });
    }
}


/* =============================================================================
   THE PHYSICIAN — the pop (#physician)
   Beats snap in on overshoot easing rather than fading, the chain links land
   one at a time, and the rule under the portrait fills as you move through the
   story. Short durations and back.out are what make it read staccato instead
   of soft. No pin here on purpose: the shelf already owns that gesture.
============================================================================= */
class Physician {
    constructor() {
        this.scene = $('.doc');
        this.beats = $$('.beat', this.scene ?? document);
        this.links = $$('.link', this.scene ?? document);
        this.shot  = $('.doc__shot');
        this.done  = 0;
    }

    init() {
        if (!this.scene) return;

        // No GSAP or reduced motion -> everything visible, nothing animated.
        if (typeof window.gsap === 'undefined' || REDUCED) {
            this.beats.forEach((b) => b.classList.add('is-on'));
            this.shot?.style.setProperty('--doc-progress', '1');
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        this.popBeats();
        this.popChain();
    }

    /** Each beat overshoots into place and lights its own dot. */
    popBeats() {
        this.beats.forEach((beat, i) => {
            gsap.set(beat, { opacity: 0, y: 44, scale: 0.965 });

            ScrollTrigger.create({
                trigger: beat,
                start: 'top 82%',
                once: true,
                onEnter: () => {
                    gsap.to(beat, {
                        opacity: 1, y: 0, scale: 1,
                        duration: 0.55,
                        ease: 'back.out(1.7)',      // the pop
                    });
                    beat.classList.add('is-on');

                    // fill the rule under the portrait as the story advances
                    this.done = Math.max(this.done, (i + 1) / this.beats.length);
                    this.shot?.style.setProperty('--doc-progress', this.done.toFixed(3));
                },
            });
        });
    }

    /** The six steps land in sequence, not together. */
    popChain() {
        if (!this.links.length) return;
        gsap.set(this.links, { opacity: 0, y: 30, scale: 0.96 });

        ScrollTrigger.create({
            trigger: '#chainGrid',
            start: 'top 85%',
            once: true,
            onEnter: () => {
                gsap.to(this.links, {
                    opacity: 1, y: 0, scale: 1,
                    duration: 0.5,
                    ease: 'back.out(2)',
                    stagger: 0.085,             // pop · pop · pop
                });
            },
        });
    }
}


/* =============================================================================
   THE EVIDENCE — the reference rail (#research)
   A Rail with drag enabled. No pin: the shelf owns that gesture and two pinned
   sections on one page fight each other every time the document height changes.

   Degrades cleanly: with GSAP absent the cards are simply visible and the
   arrows still work. Under prefers-reduced-motion the CSS turns the track into
   a grid and this class stands down entirely.
============================================================================= */
class Research {
    constructor() {
        this.scene = $('.rsrch');
        this.track = $('#rsrchTrack');
        this.rail  = null;
    }

    init() {
        if (!this.scene || !this.track) return;

        // reduced motion: the CSS has already flattened the rail into a grid,
        // so there is nothing left to drive
        if (REDUCED) {
            $('#rsrchPrev')?.setAttribute('hidden', '');
            $('#rsrchNext')?.setAttribute('hidden', '');
            const total = $('#rsrchTotal');
            if (total) total.textContent = String($$('.ref', this.track).length).padStart(2, '0');
            return;
        }

        this.rail = new Rail({
            track: this.track,
            item: '.ref',
            prev: $('#rsrchPrev'),
            next: $('#rsrchNext'),
            now: $('#rsrchNow'),
            total: $('#rsrchTotal'),
            meter: $('#rsrchMeter'),
            drag: true,
        });
        this.rail.mount();

        this.reveal();
    }

    /** the head and the cards arrive on the page's own grammar */
    reveal() {
        if (typeof window.gsap === 'undefined') return;
        gsap.registerPlugin(ScrollTrigger);

        popIn($$('.rsrch__intro > *', this.scene),
              { y: 24, stagger: .08, duration: .55, ease: 'back.out(1.5)' }, this.scene, 'top 84%');
        popIn($$('.ref', this.track), { y: 26, stagger: .06, duration: .6, ease: 'expo.out' }, '.rail', 'top 88%');
    }
}


/* =============================================================================
   THE DOCK — back to top (left) and the action dial (right)
   Both surface once you are past the hero. The dial closes on Escape, on an
   outside click, and whenever one of its actions is taken.
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

        // any action taken closes the dial behind it
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
   THE QUIZ — modal, four questions, weighted across the ten infusions
   -----------------------------------------------------------------------------
   Menu, names and order per Dr. Aronov's 17 Aug email: nine signature
   infusions + one customized option. Quercetin and Curcumin removed.

   Every slug below matches the real page the header flyout links to —
   /drips/<name>.html — so a quiz result can never land on a 404.

   Copy rule for every `why` below: "supports" and "designed to complement".
   Never treats, cures, repairs, or guaranteed-outcome language.
============================================================================= */
const DRIPS = [
    { id:'healthyaging', name:'GLyNAC Healthy Aging IV',  slug:'/drips/glynac.html',              img:'glynac',        time:'1 h 15',                     price:'$350', prog:'$405',    tag:'Healthy Aging',
      why:'The two compounds the body uses as building components to produce glutathione.' },

    { id:'immune',       name:'Immun-O-Boost IV Support',         slug:'/drips/immun-o-boost.html',       img:'immuneoboost',  time:'2 h 30',                     price:'$550', prog:'$585',    tag:'Immune Support',
      why:'Immune system support, hydration, recovery and wellness optimization.' },

    { id:'muscle',       name:'LIQUIXO Muscle Recovery IV',       slug:'/drips/liquixo.html',             img:'liquixo',       time:'45 min',                     price:'$395', prog:'$445.50', tag:'Muscle Recovery',
      why:'A full 20 amino acid blend with alpha-lipoic acid and exosomes.' },

    { id:'antioxidant',  name:'Antioxidant ×3 Reset IV',          slug:'/drips/antioxidant.html',         img:'antioxidant',   time:'75 min',                     price:'$400', prog:'$350',    tag:'Antioxidant Support',
      why:'Three antioxidants in one network, recharging one another rather than working alone.' },

    { id:'glutathione',  name:'Glutathione IV Injection',         slug:'/drips/glutathione.html',         img:'glutathione',   time:'15 min push · 30 min visit', price:'$100', prog:'$112.50', tag:'Glutathione IV Therapy',
      why:'Concentrated antioxidant support as a slow physician-administered push.' },

    // one infusion, two categories — the quiz can land on it from either route
    { id:'jointskin',    name:'Joint & Skin Wellness IV',         slug:'/drips/joint-skin.html',          img:'jointsupport',  time:'2 h 30',                     price:'$650', prog:'$675',    tag:'Joint Support & Skin Health',
      why:'Amino acids involved in normal collagen formation, with antioxidant support around them.' },

    { id:'liver',        name:'Fatty Liver Support IV',           slug:'/drips/fatty-liver-support.html', img:'liversupport',  time:'3 h',                        price:'$650', prog:'$765',    tag:'Liver Support',
      why:'Glycine and taurine for the liver’s normal bile work, with NAC for the glutathione pathway.' },

    { id:'recovery',     name:'Revive IV Support',                slug:'/drips/revive.html',              img:'revive',        time:'2 h 15',                     price:'$525', prog:'$562.50', tag:'Recovery Support',
      why:'Hydration and nutritional replenishment for flexible, as-needed use.' },

    // name matches the plate exactly — it used to read "Stress, Mental Burnout
    // & Brain Wellness IV" here and "Stress & Brain Wellness IV" on the card,
    // so a quiz result and the shelf disagreed about what the thing is called
    { id:'mind',         name:'Stress & Brain Wellness IV',       slug:'/drips/stress-brain.html',        img:'brainwellness', time:'1 h 30',                     price:'$500', prog:'$630',    tag:'Mind & Focus Support',
      why:'Brain fuel for stress, mental burnout and demanding lifestyles.' },

    { id:'custom',       name:'Customized IV Infusion',           slug:'/drips/customized.html',          img:'customized',    time:'Individually determined',    price:'By consultation', prog:'Quoted after screening', tag:'Customized IV Infusion',
      why:'Composed for you alone, based on Dr. Aronov’s individual review.' },
];

const ASKS = [
    { ask:'What brought you here?', hint:'Pick whichever is loudest right now.', opts:[
        { t:'I keep getting sick',       s:'Run-down, seasonal',             i:'ph-shield-check',     w:{ immune:6, recovery:2 } },
        { t:'I am still run down',       s:'After illness, travel or stress', i:'ph-arrows-clockwise', w:{ recovery:6, immune:2 } },
        { t:'My joints ache',            s:'Stiffness, arthritis, wear',     i:'ph-bone',             w:{ jointskin:6, antioxidant:2 } },
        { t:'I am thinking about my skin', s:'Tone, texture, skin wellness', i:'ph-sparkle',          w:{ jointskin:5, glutathione:3 } },
        { t:'I am losing muscle',        s:'On a GLP-1 or weight-loss plan', i:'ph-barbell',          w:{ muscle:7 } },
        { t:'My liver markers came back off', s:'Metabolic or liver concern', i:'ph-leaf',            w:{ liver:6, antioxidant:2 } },
        { t:'I want to age well',        s:'Longevity, cellular defenses',   i:'ph-infinity',         w:{ healthyaging:6, antioxidant:3 } },
        /* Seven specific complaints and no way out of them. Anyone who did not
           fit still had to pick one, and got steered somewhere that did not
           match. This is the honest answer, and it is what the customized
           option exists for. */
        { t:'I am not sure yet',         s:'Still working it out',           i:'ph-question',         w:{ custom:6 } },
    ]},

    { ask:'Are you under a specialist’s care for anything?', hint:'This changes how carefully she coordinates, never whether you are welcome.', opts:[
        { t:'Yes — a gut condition',    s:'Crohn’s, colitis, celiac',       i:'ph-first-aid-kit',  flag:true, w:{ custom:5, immune:2 } },
        { t:'Yes — joints or skin',     s:'RA, osteoarthritis, psoriasis',  i:'ph-hand-heart',     flag:true, w:{ custom:4, jointskin:3 } },
        { t:'Yes — liver or metabolic', s:'Fatty liver, related',           i:'ph-heartbeat',      flag:true, w:{ custom:4, liver:3 } },
        { t:'No — generally well',      s:'No diagnosis, no specialist',    i:'ph-check-circle',   w:{} },
    ]},

    { ask:'How long can you sit?', hint:'Her chairs are private — the long ones are the unhurried ones.', opts:[
        { t:'About half an hour', s:'A lunch break',      i:'ph-timer',     w:{ glutathione:6 } },
        { t:'About an hour',      s:'A proper sit',       i:'ph-clock',     w:{ healthyaging:4, antioxidant:4, muscle:3 } },
        { t:'Ninety minutes',     s:'Time to switch off', i:'ph-armchair',  w:{ antioxidant:3, healthyaging:2, mind:4 } },
        { t:'A full afternoon',   s:'The complete ones',  i:'ph-hourglass', w:{ recovery:5, immune:5, liver:4, jointskin:4 } },
    ]},

    /* Joint & Skin ($650) and Liver ($650) used to carry no weight here — a
       deliberate hold from when neither had a confirmed price. Both are
       published now, and they are the two most expensive infusions on the
       menu, so the top band could never reach them. They belong in it. */
    { ask:'What feels comfortable per session?', hint:'Every figure here is her real published rate.', opts:[
        { t:'Under $350',     s:'Single-compound infusions', i:'ph-coins',   w:{ glutathione:5 } },
        { t:'$350 – $550',    s:'The mid-length protocols',  i:'ph-wallet',  w:{ healthyaging:4, antioxidant:4, muscle:3 } },
        { t:'$550 and up',    s:'The long, complete ones',   i:'ph-diamond', w:{ immune:4, recovery:4, mind:4, jointskin:4, liver:4 } },
        { t:'Let her decide', s:'Whatever is right',         i:'ph-pen-nib', w:{ custom:4 } },
    ]},
];

const THINKING = ['Reading your answers', 'Weighing ten infusions', 'Checking time and budget', 'Preparing your starting point'];

class Quiz {
    constructor() {
        this.el    = $('#quiz');
        this.stage = $('#quizStage');
        this.prog  = $('#quizProg');
        this.back  = $('#quizBack');
        this.again = $('#quizAgain');
        this.step  = 0;
        this.answers = [];
        this.lastFocus = null;
        this.open  = false;
        this.timers = [];
    }

    init() {
        if (!this.el || !this.stage) return;

        this.prog.innerHTML = ASKS.map(() => '<i></i>').join('');

        $$('[data-open-quiz]').forEach((b) => b.addEventListener('click', () => this.show()));
        $$('[data-close-quiz]', this.el).forEach((b) => b.addEventListener('click', () => this.hide()));

        this.back.addEventListener('click', () => {
            if (!this.step) return;
            this.step -= 1; this.answers.length = this.step; this.render();
        });
        this.again.addEventListener('click', () => { this.step = 0; this.answers = []; this.render(); });

        document.addEventListener('keydown', (e) => {
            if (!this.open) return;
            if (e.key === 'Escape') { this.hide(); return; }
            if (e.key === 'Tab') this.trap(e);
        });
    }

    /** every setTimeout the modal starts is tracked, so closing mid-flight
     *  cannot leave a panel swap or a thinking beat firing into a dead DOM */
    later(fn, ms) {
        const t = setTimeout(() => {
            this.timers = this.timers.filter((x) => x !== t);
            fn();
        }, ms);
        this.timers.push(t);
        return t;
    }

    clearTimers() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    }

    /** Keep tabbing inside the dialog while it is open. */
    trap(e) {
        const f = $$('button, [href], input, select, textarea', this.el)
            .filter((el) => !el.hasAttribute('hidden') && el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    show() {
        this.lastFocus = document.activeElement;
        this.open = true;
        this.el.classList.add('is-open');
        document.documentElement.classList.add('is-locked');
        this.step = 0; this.answers = [];
        this.render();
        this.later(() => $('.modal__x', this.el)?.focus(), 60);
    }

    hide() {
        this.open = false;
        this.clearTimers();
        this.el.classList.remove('is-open');
        document.documentElement.classList.remove('is-locked');
        this.lastFocus?.focus();
    }

    swap(html) {
        // Pin the stage height for a beat so removing the old panel cannot
        // collapse the modal, then take the old panel out of flow entirely.
        const h = this.stage.offsetHeight;
        this.stage.style.minHeight = h + 'px';

        $$('.q', this.stage).forEach((old) => {
            old.classList.remove('is-live');
            old.classList.add('is-out');
            this.later(() => old.remove(), 420);
        });
        const p = document.createElement('div');
        p.className = 'q';
        p.innerHTML = html;
        this.stage.appendChild(p);
        requestAnimationFrame(() => {
            p.classList.add('is-live');
            // release the pinned height once the new panel has its own
            requestAnimationFrame(() => { this.stage.style.minHeight = ''; });
        });
        this.stage.scrollTop = 0;
        return p;
    }

    chrome() {
        $$('i', this.prog).forEach((t, i) => t.classList.toggle('is-done', i < this.step));
        this.back.hidden  = this.step === 0 || this.step >= ASKS.length;
        this.again.hidden = this.step === 0;
    }

    render() {
        this.chrome();
        if (this.step >= ASKS.length) { this.think(); return; }

        const q = ASKS[this.step];
        const panel = this.swap(`
            <h3 class="q__ask">${q.ask}</h3>
            <p class="q__hint">${q.hint}</p>
            <div class="q__opts">
                ${q.opts.map((o, i) => `
                    <button class="q__opt" type="button" data-pick="${i}">
                        <i class="ph ${o.i}"></i>
                        <span><b>${o.t}</b><span>${o.s}</span></span>
                    </button>`).join('')}
            </div>`);

        $$('[data-pick]', panel).forEach((b) => {
            b.addEventListener('click', () => {
                if (panel.dataset.locked) return;
                panel.dataset.locked = '1';
                this.answers[this.step] = q.opts[Number(b.dataset.pick)];
                this.later(() => { this.step += 1; this.render(); }, 160);
            });
        });
    }

    score() {
        const totals = Object.fromEntries(DRIPS.map((d) => [d.id, 0]));
        let flag = false;
        this.answers.forEach((a) => {
            if (!a) return;
            if (a.flag) flag = true;
            Object.entries(a.w || {}).forEach(([k, v]) => {
                if (k in totals) totals[k] += v;
            });
        });
        const rank = Object.entries(totals).sort((x, y) => y[1] - x[1]);
        const by = Object.fromEntries(DRIPS.map((d) => [d.id, d]));

        /* The runner-up used to be whatever landed second, with no check on
           its score. If the answers were thin that could be an infusion with
           ZERO points, presented with the same confidence as the top pick.
           Only suggest something that actually scored. */
        const second = rank[1];
        const alt = second && second[1] > 0 ? by[second[0]] : null;

        return { top: by[rank[0][0]], alt, flag };
    }

    async think() {
        const p = this.swap(`
            <div class="q__think">
                <div class="q__ring"></div>
                <p class="q__log" id="qLog">${THINKING[0]}</p>
            </div>`);
        const log = $('#qLog', p);
        for (const line of THINKING) {
            if (!this.open) return;              // closed mid-thought
            if (log) log.textContent = line;
            await wait(REDUCED ? 40 : 340);
        }
        if (!this.open) return;
        this.result();
    }

    result() {
        const { top, alt, flag } = this.score();
        const note = flag
            ? `<p class="rx__why"><b>Because you are under a specialist’s care</b>, Dr.&nbsp;Aronov will review your medications and requires your treating physician’s written approval before anything is scheduled. Nothing here replaces your prescribed treatment.</p>`
            : '';

        // the program row is only shown when there is a real figure for it
        const progRow = /^\$/.test(top.prog)
            ? ''
            : '';

        const altRow = alt
            ? `<div class="rx__alt">
                   <span>Also worth asking about <b>${alt.name}</b></span>
                   <a href="${alt.slug}">View&nbsp;→</a>
               </div>`
            : '';

        this.swap(`
            <div class="rx">
                <div class="rx__top">
                    <img class="rx__bag" src="/assets/drips/${top.img}.png" alt="${top.name}">
                    <div>
                        <p class="rx__kick">Your starting point</p>
                        <h3 class="rx__name">${top.name}</h3>
                        <p class="rx__why">${top.why}</p>
                    </div>
                </div>
                ${note}
                <dl class="rx__facts">
                    <div class="rx__fact"><dt>Chair time</dt><dd>${top.time}</dd></div>
                    <div class="rx__fact"><dt>Per session</dt><dd>${top.price}</dd></div>
                    ${progRow}
                </dl>
                ${altRow}
                <div class="rx__cta">
                    <a class="rx__btn rx__btn--solid" href="${top.slug}">
                        <span>Read the protocol</span><i class="ph ph-arrow-up-right"></i>
                    </a>
                    <a class="rx__btn" href="tel:+19292010740">
                        <span>929 · 201 · 0740</span><i class="ph ph-phone"></i>
                    </a>
                </div>
            </div>`);
        this.chrome();
    }
}


/* =============================================================================
   THE PRACTICE, LIVE (#instagram)
============================================================================= */
class Social {
    constructor() { this.el = $('.social'); }
    init() {
        if (!this.el || typeof window.gsap === 'undefined' || REDUCED) return;
        gsap.registerPlugin(ScrollTrigger);
        popIn($$('.social__head > *, .social__cta', this.el),
              { y: 28, stagger: .08, duration: .6, ease: 'back.out(1.6)' }, this.el, 'top 84%');
    }
}


/* =============================================================================
   REVEAL — generic scroll reveal
   Mark anything with [data-reveal]; siblings cascade automatically.
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
    nav:        Nav,
    trail:      Trail,
    preloader:  new Preloader(),
    header:     new Header(),
    menu:       new Menu(),
    wordLoop:   new WordLoop(),
    heroVideo:  new HeroVideo(),
    magnetic:   new Magnetic(),
    shelf:      new Shelf(),
    conditions: new Chronic(),
    advantage:  new Advantage(),
    visit:      new Visit(),
    physician:  new Physician(),
    research:   new Research(),
    dock:       new Dock(),
    quiz:       new Quiz(),
    social:     new Social(),
    reveal:     new Reveal(),
};

/** Nothing here is worth trapping someone behind a cream screen for. */
const release = () => {
    document.documentElement.classList.remove('is-preloading');
    document.body.classList.add('is-ready');
    $('#pre')?.remove();
};

const boot = () => {
    setTimeout(release, 3500); // failsafe, whatever else happens

    Object.values(modules).forEach((m) => {
        try { m.init(); }
        catch (err) { console.error(`[AVE] ${m.constructor?.name || 'module'} failed to start`, err); release(); }
    });

    if ('ontouchstart' in window) document.documentElement.classList.add('is-touch');

    /* the footer year should never go stale */
    const yr = $('#footYear');
    if (yr) yr.textContent = new Date().getFullYear();

    /* Fonts and the bag images land AFTER first paint and change the height of
       the document. Any trigger measured before that is measured against a
       shorter page — which is exactly why sections further down stop firing,
       or fire at the wrong moment, as the page grows. Refresh when fonts land,
       when every image is in, and again once a resize settles. */
    if (typeof window.gsap !== 'undefined') {
        /* ScrollTrigger's own auto-refresh fires on every resize event — and on
           a phone, scrolling itself resizes the viewport as the address bar
           collapses. That refresh mid-scroll is the single biggest cause of the
           shelf jumping. Take resize off the auto list and handle it manually,
           only when the WIDTH actually changed. */
        ScrollTrigger.config({
            ignoreMobileResize: true,
            autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
        });

        /* Never refresh globally while the rail is pinned — queue it instead.
           The shelf's filter does NOT come through here: it first returns to
           the top of the pin (progress 0), where a global refresh is safe,
           and refreshes everything directly — see Shelf.applyFilter(). */
        let queued = null;
        const safeRefresh = () => {
            if (Shelf.pinned) {
                if (queued) return;
                queued = setInterval(() => {
                    if (Shelf.pinned) return;
                    clearInterval(queued); queued = null; ScrollTrigger.refresh();
                }, 400);
                return;
            }
            ScrollTrigger.refresh();
        };
        const refresh = debounce(safeRefresh, 140);

        if (document.fonts) document.fonts.ready.then(refresh);
        window.addEventListener('load', refresh);

        let lastW = window.innerWidth;
        window.addEventListener('resize', debounce(() => {
            if (window.innerWidth === lastW) return;   // height-only = address bar
            lastW = window.innerWidth;
            safeRefresh();
        }, 260));

        /* Images settle at different times; refreshing once per image meant a
           dozen refreshes in a row. Count them down and refresh once at the end. */
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

// handy in the console while the rest of the pages get built
window.AVE = { modules, boot, Trail, DRIPS, ASKS, Rail, helpers: { $, $$, clamp, lerp, onFrame, debounce } };
