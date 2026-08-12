/* =============================================================================
   PRECISION MEDICAL IV — SCRIPT.JS  (ES6 module)
   -----------------------------------------------------------------------------
   Loaded with <script type="module">: module scope, strict mode, deferred.
   Every class feature-detects and no-ops when its elements are absent, so new
   sections drop in without touching this file.

     Helpers
     Preloader   hairline draws with the load, curtain lifts onto the film
     Header      condense · retreat on the way down · return on the way up
     Menu        parchment page, circular reveal, scroll lock, escape
     WordLoop    the living word in the headline
     HeroVideo   autoplay kick for iOS, poster fallback if the file is absent
     Magnetic    primary buttons lean toward the pointer (fine pointers only)
     Shelf       the services rail — pinned horizontal scrub, compound colour
     Reveal      generic scroll reveal for the sections still to come
     Boot

   REQUIRES for Shelf only: GSAP + ScrollTrigger loaded from CDN in index.html
   BEFORE this file. If they are missing, Shelf falls back to a stacked grid
   and everything else runs untouched.
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


/* =============================================================================
   PRELOADER
   Progress is real where it can be (fonts + images), padded by elapsed time
   so the line never stalls. Minimum 1.2s so it reads; ceiling 5s so a slow
   asset can never trap anyone.
============================================================================= */
class Preloader {
    constructor() {
        this.el  = $('#pre');
        this.bar = $('#preBar');
        this.pct = $('#prePct');

        this.MIN_MS = 1200;
        this.MAX_MS = 5000;
        this.start  = performance.now();
        this.shown  = 0;
        this.target = 0;
        this.loaded = false;
    }

    init() {
        if (!this.el || REDUCED) { this.release(true); return; }
        this.watchAssets();
        this.tick();
        setTimeout(() => { this.loaded = true; }, this.MAX_MS);
    }

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
        const paced   = clamp((elapsed / this.MIN_MS) * 96, 0, 96);
        const goal    = this.loaded ? 100 : Math.max(this.target, paced);

        this.shown = lerp(this.shown, goal, 0.1);
        if (goal - this.shown < 0.4) this.shown = goal;

        if (this.bar) this.bar.style.width = `${this.shown.toFixed(1)}%`;
        const v = String(Math.round(this.shown));
        if (this.pct && this.pct.textContent !== v) this.pct.textContent = v;

        if (this.shown >= 99.6 && elapsed >= this.MIN_MS) { this.lift(); return; }
        requestAnimationFrame(() => this.tick());
    }

    async lift() {
        await wait(240);
        this.el.classList.add('is-lifting');
        this.release();
        await wait(1050);
        this.el.remove();
    }

    release(instant = false) {
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
        const onScroll = onFrame(() => {
            const y = window.scrollY;
            this.el.classList.toggle('is-stuck', y > 40);

            const goingDown = y > this.lastY && y > 320;
            const menuOpen  = document.documentElement.classList.contains('is-locked');
            this.el.classList.toggle('is-hidden', goingDown && !menuOpen);

            this.lastY = y;
        });
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
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
        this.el.setAttribute('aria-hidden', String(!open));
        this.burger.classList.toggle('is-open', open);
        this.burger.setAttribute('aria-expanded', String(open));
        this.burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.documentElement.classList.toggle('is-locked', open);
    }
}


/* =============================================================================
   WORD LOOP — the living word in the headline
   The first child holds the layout height; the rest sit on top of it.
   Each word rises through the mask, holds, and exits upward.
============================================================================= */
class WordLoop {
    constructor() {
        this.el    = $('#wordLoop');
        this.words = this.el ? $$('.loop__stack span', this.el) : [];
        this.index = 0;
        this.HOLD  = 2600;
        this.timer = null;
    }

    init() {
        if (!this.el || this.words.length < 2 || REDUCED) return;

        // Wait for the entrance to land before the first swap
        const begin = () => { this.timer = setInterval(() => this.next(), this.HOLD); };
        setTimeout(begin, 2400);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { clearInterval(this.timer); this.timer = null; }
            else if (!this.timer) this.timer = setInterval(() => this.next(), this.HOLD);
        });
    }

    next() {
        const current = this.words[this.index];
        this.index = (this.index + 1) % this.words.length;
        const incoming = this.words[this.index];

        // Roll out through the top of the mask…
        current.classList.remove('is-on');
        current.classList.add('is-out');

        // …and only then bring the next word up through the bottom,
        // so two words are never legible at once.
        setTimeout(() => {
            current.classList.remove('is-out');
            incoming.classList.add('is-on');
        }, 220);
    }
}


/* =============================================================================
   VIMEO BACKDROP — dormant on this page, ready for the About page.
   Give any element the class "hero__media" (or restyle the selector) plus
   data-vimeo="VIDEO_ID" and this covers it with that footage, object-fit
   style. The practice's clip of Dr. Aronov speaking is Vimeo 1206022178.
   Without a data-vimeo element on the page, this does nothing.
============================================================================= */
class VimeoBackdrop {
    constructor() {
        this.media = $('.hero__media[data-vimeo]');
        this.id    = this.media?.dataset.vimeo ?? '';
        this.frame = null;
        this.RATIO = 16 / 9;
    }

    init() {
        if (!this.media || !this.id || REDUCED) return;

        this.frame = document.createElement('iframe');
        this.frame.className = 'hero__vimeo';
        this.frame.src =
            `https://player.vimeo.com/video/${this.id}` +
            `?background=1&autoplay=1&muted=1&loop=1&autopause=0&controls=0&playsinline=1&dnt=1`;
        this.frame.allow = 'autoplay; fullscreen';
        this.frame.setAttribute('aria-hidden', 'true');
        this.frame.tabIndex = -1;

        this.frame.addEventListener('load', () => this.media.classList.add('has-vimeo'), { once: true });

        this.size();
        this.media.appendChild(this.frame);
        window.addEventListener('resize', debounce(() => this.size(), 150));
    }

    /** Cover-fit a fixed 16:9 iframe inside whatever box the hero is. */
    size() {
        if (!this.frame) return;
        const { width, height } = this.media.getBoundingClientRect();
        const w = Math.ceil(Math.max(width, height * this.RATIO));
        const h = Math.ceil(Math.max(height, width / this.RATIO));
        this.frame.width  = w;
        this.frame.height = h;
        this.frame.style.width  = `${w}px`;
        this.frame.style.height = `${h}px`;
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

        // File missing or codec unsupported → hold on the poster, stop the drift
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
   THE SHELF — the services rail (#infusions)
   Pinned horizontally on desktop and dragged by the scrollbar; stacked on
   phones. As each plate reaches the centre, the section takes that compound's
   colour — the value goes into --tone, which is registered with @property in
   styles.css so the browser interpolates it instead of snapping.

   Found by CLASS, not id: the section keeps id="infusions" so the header nav
   and the hero's "View infusions" button still land on it.
============================================================================= */
class Shelf {
    constructor() {
        this.scene    = $('.shelf');
        this.pin      = $('#shelfPin');
        this.viewport = $('#shelfViewport');
        this.track    = $('#shelfTrack');
        this.meter    = $('#shelfMeter');
        this.now      = $('#shelfNow');
        this.total    = $('#shelfTotal');
        this.last     = -1;
        this.BREAK    = 900;   // below this the rail stacks
    }

    init() {
        if (!this.scene || !this.track) return;

        const plates = $$('.plate', this.track);
        if (this.total) this.total.textContent = String(plates.length).padStart(2, '0');

        this.filters();
        this.paint(0);

        // No GSAP (blocked CDN, offline) or reduced motion → force the stacked
        // layout rather than leaving a rail that can never move.
        if (typeof window.gsap === 'undefined' || REDUCED) {
            if (this.viewport) {
                this.viewport.style.height   = 'auto';
                this.viewport.style.overflow = 'visible';
                this.viewport.style.display  = 'block';
                this.viewport.style.paddingBottom = '0';
            }
            this.track.style.cssText +=
                'display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:3rem;transform:none;';
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        this.rail();
    }

    /** Which plates are currently on the shelf (filters hide the rest). */
    live() {
        return $$('.plate', this.track).filter((p) => !p.classList.contains('is-out'));
    }

    /** Take the colour of the plate at `index` and hand it to the whole scene. */
    paint(index) {
        const list = this.live();
        if (!list.length) return;

        const i = clamp(index, 0, list.length - 1);
        if (i === this.last) return;
        this.last = i;

        this.scene.style.setProperty('--tone', list[i].dataset.tone || 'var(--gold)');

        if (this.now)   this.now.textContent = String(i + 1).padStart(2, '0');
        if (this.meter) this.meter.style.width = ((i + 1) / list.length) * 100 + '%';
    }

    rail() {
        const mm = gsap.matchMedia();

        /* -- desktop: pin the viewport, scrub the track sideways -- */
        mm.add(`(min-width: ${this.BREAK + 1}px)`, () => {
            const distance = () => Math.max(0, this.track.scrollWidth - window.innerWidth + 80);

            const drag = gsap.to(this.track, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                    trigger: this.pin,
                    start: 'top top',
                    end: () => '+=' + distance(),
                    pin: this.viewport,
                    pinSpacing: true,
                    scrub: 0.9,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    onUpdate: (self) =>
                        this.paint(Math.round(self.progress * (this.live().length - 1))),
                },
            });

            /* the photograph lags its own frame; the numeral counter-scrolls */
            $$('.plate', this.track).forEach((plate) => {
                const shot = $('.plate__img', plate);
                const no   = $('.plate__no', plate);
                const link = {
                    trigger: plate,
                    containerAnimation: drag,
                    start: 'left right',
                    end: 'right left',
                    scrub: true,
                };

                if (shot) gsap.fromTo(shot, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: link });
                if (no)   gsap.fromTo(no, { x: 30, opacity: 0.25 }, { x: -30, opacity: 0.85, ease: 'none', scrollTrigger: link });
            });

            gsap.from($$('.plate', this.track), {
                y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06,
                scrollTrigger: { trigger: this.pin, start: 'top 70%', once: true },
            });

            this.drag = drag;
            return () => { this.drag = null; };
        });

        /* -- phone: stacked, each plate paints the scene as it passes -- */
        mm.add(`(max-width: ${this.BREAK}px)`, () => {
            $$('.plate', this.track).forEach((plate, i) => {
                gsap.from(plate, {
                    y: 48, opacity: 0, duration: 0.9, ease: 'expo.out',
                    scrollTrigger: { trigger: plate, start: 'top 86%', once: true },
                });
                ScrollTrigger.create({
                    trigger: plate, start: 'top 55%', end: 'bottom 45%',
                    onToggle: (self) => { if (self.isActive) this.paint(i); },
                });
            });
        });

        /* fonts land after first paint and change every measurement */
        if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
        window.addEventListener('resize', debounce(() => ScrollTrigger.refresh(), 260));
    }

    filters() {
        const pills = $$('[data-filter]', this.scene);
        if (!pills.length) return;

        pills.forEach((pill) => {
            pill.addEventListener('click', () => {
                const key = pill.dataset.filter;

                pills.forEach((p) => {
                    const on = p === pill;
                    p.classList.toggle('is-on', on);
                    p.setAttribute('aria-selected', String(on));
                });

                $$('.plate', this.track).forEach((plate) => {
                    const tags = (plate.dataset.tags || '').split(' ');
                    plate.classList.toggle('is-out', !(key === 'all' || tags.includes(key)));
                });

                this.last = -1;
                this.paint(0);

                if (typeof window.gsap !== 'undefined') {
                    gsap.fromTo(this.live(),
                        { opacity: 0, y: 26 },
                        { opacity: 1, y: 0, duration: 0.65, ease: 'expo.out', stagger: 0.04 });
                    ScrollTrigger.refresh();
                }
            });
        });
    }
}


/* =============================================================================
   REVEAL — generic scroll reveal for the sections still to come
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
    preloader: new Preloader(),
    header:    new Header(),
    menu:      new Menu(),
    wordLoop:  new WordLoop(),
    vimeo:     new VimeoBackdrop(),
    heroVideo: new HeroVideo(),
    magnetic:  new Magnetic(),
    shelf:     new Shelf(),
    reveal:    new Reveal(),
};

/** Nothing here is worth trapping someone behind a cream screen for. */
const release = () => {
    document.documentElement.classList.remove('is-preloading');
    document.body.classList.add('is-ready');
    $('#pre')?.remove();
};

const boot = () => {
    setTimeout(release, 7000); // failsafe, whatever else happens

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

// handy in the console while the rest of the pages get built
window.PMIV = { modules, boot, helpers: { $, $$, clamp, lerp, onFrame, debounce } };
