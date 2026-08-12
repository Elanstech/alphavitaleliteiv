/* =============================================================================
   ALPHA VITAL ELITE IV — SCRIPT.JS  (ES6 module)
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
     Route       the two-lane oral-vs-IV explainer, scrubbed on scroll
     Physician   sticky portrait, beats that pop, the chain of custody
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
   Framed plates hung on a cream wood panel. Pinned horizontally on desktop and
   dragged by the scrollbar; stacked on phones. The counter and meter track
   whichever plate is centred.

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

    /** Move the counter and the meter to the plate at `index`.
        The panel itself stays cream — each formula's compound colour lives
        only in the spectrum strip under its own photograph. */
    paint(index) {
        const list = this.live();
        if (!list.length) return;

        const i = clamp(index, 0, list.length - 1);
        if (i === this.last) return;
        this.last = i;

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

        /* -- phone: a real horizontal scroller with snap points --
           No pin, no scrub. The track scrolls natively under the thumb and the
           counter reads off its scrollLeft, which is what a phone expects and
           what survives an address bar resizing mid-gesture. -- */
        mm.add(`(max-width: ${this.BREAK}px)`, () => {
            const track = this.track;

            const sync = () => {
                const list = this.live();
                if (!list.length) return;
                const mid = track.scrollLeft + track.clientWidth / 2;
                let best = 0, bestD = Infinity;
                list.forEach((p, i) => {
                    const c = p.offsetLeft + p.offsetWidth / 2;
                    const d = Math.abs(c - mid);
                    if (d < bestD) { bestD = d; best = i; }
                });
                this.paint(best);
            };

            let ticking = false;
            const onScroll = () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(() => { sync(); ticking = false; });
            };
            track.addEventListener('scroll', onScroll, { passive: true });
            sync();

            /* the plates fade up once, as the shelf comes into view */
            const intro = gsap.from($$('.plate', track), {
                y: 34, opacity: 0, duration: .8, ease: 'expo.out', stagger: .05,
                scrollTrigger: { trigger: this.pin, start: 'top 82%', once: true },
            });

            return () => {
                track.removeEventListener('scroll', onScroll);
                intro.scrollTrigger?.kill();
                intro.kill();
            };
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
   THE PHYSICIAN — the pop
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
        this.tally();
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

    /** Count the figures up once they are on screen. */
    tally() {
        $$('[data-tally]', this.scene).forEach((el) => {
            const end = parseFloat(el.dataset.tally);
            const obj = { v: 0 };
            ScrollTrigger.create({
                trigger: el, start: 'top 92%', once: true,
                onEnter: () => gsap.to(obj, {
                    v: end, duration: 1.3, ease: 'power2.out',
                    onUpdate: () => { el.textContent = Math.round(obj.v); },
                    onComplete: () => { el.textContent = end; },
                }),
            });
        });
    }
}


/* =============================================================================
   THE ROUTE — the two lanes in #advantage
   Each lane's gold rule fills as the section scrolls past, and each stop lights
   the moment the fill reaches it. Feature-detects GSAP; without it the CSS
   already shows every stop lit, so nothing is lost.
============================================================================= */
class Route {
    constructor() {
        this.el = $('#advantage');
    }

    init() {
        if (!this.el || REDUCED || typeof window.gsap === 'undefined') return;

        $$('.lane', this.el).forEach((lane) => {
            const fill  = $('.lane__fill', lane);
            const stops = $$('.stop', lane);
            if (!fill || !stops.length) return;

            ScrollTrigger.create({
                trigger: lane,
                start: 'top 72%',
                end: 'bottom 78%',
                scrub: 0.6,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    const p = self.progress;
                    fill.style.height = (p * 100).toFixed(1) + '%';
                    // a stop lights once the fill has run past its own pin
                    stops.forEach((s, i) => {
                        s.classList.toggle('is-passed', p >= (i + 0.6) / stops.length);
                    });
                },
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
    route:     new Route(),
    physician: new Physician(),
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
        catch (err) { console.error(`[AVE] ${m.constructor.name} failed to start`, err); release(); }
    });

    if ('ontouchstart' in window) document.documentElement.classList.add('is-touch');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

/* -----------------------------------------------------------------------------
   CONSOLE HELPERS
   Try wood textures live, no reload:

     PMIV.wood('https://images.unsplash.com/photo-XXXX?auto=format&w=2400')
     PMIV.wood()                     // back to the stylesheet default
     PMIV.woodShow(0.55)             // 0 = flat cream, 1 = full strength photo
     PMIV.plank('140px')             // width of one plank

   When you settle on one, copy the values into --wood-img / --wood-show /
   --plank at the top of section 06 in styles.css.
----------------------------------------------------------------------------- */
const shelfEl = () => $('.shelf');

const wood = (url) => {
    const el = shelfEl(); if (!el) return 'no .shelf on this page';
    if (!url) { el.style.removeProperty('--wood-img'); return 'reset to the stylesheet default'; }
    el.style.setProperty('--wood-img', `url('${url}')`);
    return url;
};
const woodShow = (v) => {
    const el = shelfEl(); if (!el) return;
    el.style.setProperty('--wood-show', String(v));
    return v;
};
const plank = (w) => {
    const el = shelfEl(); if (!el) return;
    el.style.setProperty('--plank', w);
    return w;
};

// handy in the console while the rest of the pages get built
window.PMIV = { modules, boot, wood, woodShow, plank, helpers: { $, $$, clamp, lerp, onFrame, debounce } };
