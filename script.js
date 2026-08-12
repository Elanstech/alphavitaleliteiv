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
        /* global refresh lives in boot() — see the note there */
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

            // the lane card arrives with the same pop as the physician beats
            if (!REDUCED) {
                gsap.from(lane, {
                    y: 40, opacity: 0, scale: .975, duration: .6, ease: 'back.out(1.7)',
                    scrollTrigger: { trigger: lane, start: 'top 86%', once: true },
                });
                gsap.from($$('.stop', lane), {
                    y: 20, opacity: 0, duration: .45, ease: 'back.out(1.5)', stagger: .07,
                    scrollTrigger: { trigger: lane, start: 'top 80%', once: true },
                });
            }

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
   THE DOCK — back to top (left) and the action dial (right)
   Both surface once you are past the hero. The dial closes on Escape, on an
   outside click, and whenever one of its actions is taken.
============================================================================= */
class Social {
    constructor() { this.el = $('.social'); }
    init() {
        if (!this.el || typeof window.gsap === 'undefined' || REDUCED) return;
        gsap.registerPlugin(ScrollTrigger);
        gsap.from($$('.social__head > *, .social__cta', this.el), {
            y: 28, opacity: 0, duration: .6, ease: 'back.out(1.6)', stagger: .08,
            scrollTrigger: { trigger: this.el, start: 'top 84%', once: true },
        });
    }
}


class Dock {
    constructor() {
        this.top    = $('#toTop');
        this.fab    = $('#fab');
        this.toggle = $('#fabToggle');
        this.open   = false;
    }

    init() {
        if (!this.top && !this.fab) return;

        const onScroll = onFrame(() => {
            const past = window.scrollY > window.innerHeight * 0.6;
            this.top?.classList.toggle('is-up', past);
            this.fab?.classList.toggle('is-up', past);
            if (!past && this.open) this.set(false);
        });
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        this.top?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
        });

        this.toggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.set(!this.open);
        });

        // any action taken closes the dial behind it
        $$('.fab__act', this.fab ?? document).forEach((a) =>
            a.addEventListener('click', () => this.set(false))
        );

        document.addEventListener('click', (e) => {
            if (this.open && !this.fab.contains(e.target)) this.set(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.open) { this.set(false); this.toggle.focus(); }
        });
    }

    set(open) {
        this.open = open;
        this.fab?.classList.toggle('is-open', open);
        this.toggle?.setAttribute('aria-expanded', String(open));
        this.toggle?.setAttribute('aria-label', open ? 'Close contact options' : 'Open contact options');
    }
}


/* =============================================================================
   THE QUIZ — modal, four questions, weighted across all ten protocols
   Every price below is her published figure. The engine proposes a starting
   point and says plainly that it is not a medical opinion.
============================================================================= */
const DRIPS = [
    { id:'immuno',    name:'Immun-O-Boost IV Support',            slug:'/drips/immuno-boost/',                    img:'immuneoboost',  time:'2 h 30',    price:'$650', prog:'$585',    tag:'Immunity',
      why:'Immune support, hydration and recovery — the deep seasonal replenishment.' },
    { id:'muscle',    name:'LIQUIXO Muscle Recovery IV',          slug:'/drips/muscle-support/',                  img:'liquixo',       time:'45 min',    price:'$495', prog:'$445.50', tag:'Recovery',
      why:'Lean-muscle support through GLP-1 and weight-loss programmes — the full amino profile.' },
    { id:'antiox',    name:'Antioxidant ×3 Reset IV',             slug:'/drips/antioxidant-reset/',               img:'antioxidant',   time:'75 min',    price:'$500', prog:'$450',    tag:'Longevity',
      why:'Three antioxidants that recharge one another rather than working alone.' },
    { id:'glynac',    name:'GLyNAC Longevity Restoration IV',     slug:'/drips/glynac-longevity/',                img:'glynac',        time:'60 min',    price:'$450', prog:'$405',    tag:'Longevity',
      why:'The two components your body uses to make its own glutathione.' },
    { id:'brain',     name:'Stress, Burnout & Brain Wellness IV', slug:'/drips/mental-recovery-brain-wellness/',  img:'brainwellness', time:'1 h 30',    price:'$700', prog:'$630',    tag:'Mind',
      why:'Brain fuel for stress, mental burnout and demanding schedules.' },
    { id:'curcumin',  name:'Curcumin IV Infusion',                slug:'/drips/curcumin/',                        img:'curcumin',      time:'45 min',    price:'$325', prog:'$292.50', tag:'Recovery',
      why:'Turmeric’s active compound, delivered past the gut — joint comfort.' },
    { id:'gluta',     name:'Glutathione IV Injection',            slug:'/drips/glutathione/',                     img:'glutathione',   time:'10–20 min', price:'$125', prog:'$112.50', tag:'Radiance',
      why:'The master antioxidant, in and out inside twenty minutes.' },
    { id:'quercetin', name:'Quercetin Seasonal Allergy Support IV',slug:'/drips/quercetin/',                      img:'quercetin',     time:'45 min',    price:'$300', prog:'$270',    tag:'Immunity',
      why:'A plant flavonoid for pollen season, delivered past digestion.' },
    { id:'revive',    name:'Revive IV Support',                   slug:'/drips/revive/',                          img:'revive',        time:'2 h 30',    price:'$625', prog:'$562.50', tag:'Recovery',
      why:'Replenish, recharge, revive — the unhurried full restoration.' },
    { id:'custom',    name:'The Customized Drip',                 slug:'/drips/customized-drip/',                 img:'customized',    time:'Bespoke',   price:'By consultation', prog:'Quoted', tag:'Bespoke',
      why:'Composed for you alone after a private consultation.' },
];

const ASKS = [
    { ask:'What brought you here?', hint:'Pick whichever is loudest right now.', opts:[
        { t:'I keep getting sick',   s:'Run-down, seasonal',             i:'ph-shield-check', w:{ immuno:5, quercetin:2, revive:2 } },
        { t:'I am exhausted',        s:'Depleted, dehydrated',           i:'ph-battery-low',  w:{ revive:5, immuno:2, brain:2 } },
        { t:'My head is foggy',      s:'Burnout, stress, poor sleep',    i:'ph-brain',        w:{ brain:5, revive:2 } },
        { t:'My joints ache',        s:'Stiffness, inflammatory stress', i:'ph-bone',         w:{ curcumin:5, antiox:3 } },
        { t:'I am losing muscle',    s:'On a GLP-1 or weight-loss plan', i:'ph-barbell',      w:{ muscle:5 } },
        { t:'I want to age well',    s:'Longevity, cellular, skin',      i:'ph-infinity',     w:{ glynac:4, antiox:3, gluta:3 } },
    ]},
    { ask:'Any seasonal allergies or a diagnosed condition?', hint:'This changes how carefully she coordinates, never whether you are welcome.', opts:[
        { t:'Seasonal allergies',    s:'Pollen, dust, environmental',    i:'ph-wind',           w:{ quercetin:6, immuno:2 } },
        { t:'An inflammatory condition', s:'Crohn’s, RA, psoriasis',     i:'ph-first-aid-kit',  flag:true, w:{ custom:5, antiox:3, curcumin:2 } },
        { t:'Something else',        s:'Another diagnosis',              i:'ph-clipboard-text', flag:true, w:{ custom:6 } },
        { t:'None of these',         s:'Generally well',                 i:'ph-check-circle',   w:{} },
    ]},
    { ask:'How long can you sit?', hint:'Her chairs are private — the long ones are the unhurried ones.', opts:[
        { t:'Twenty minutes',   s:'A lunch break',        i:'ph-timer',     w:{ gluta:5 } },
        { t:'About an hour',    s:'A proper sit',         i:'ph-clock',     w:{ glynac:3, curcumin:3, quercetin:3, muscle:3 } },
        { t:'Ninety minutes',   s:'Time to switch off',   i:'ph-armchair',  w:{ brain:4, antiox:3 } },
        { t:'A full afternoon', s:'The complete ones',    i:'ph-hourglass', w:{ revive:5, immuno:5 } },
    ]},
    { ask:'What feels comfortable per session?', hint:'Every figure here is her real published rate.', opts:[
        { t:'Under $350',   s:'Single-compound infusions', i:'ph-coins',    w:{ gluta:4, curcumin:3, quercetin:3 } },
        { t:'$350 – $550',  s:'The mid-length protocols',  i:'ph-wallet',   w:{ glynac:4, antiox:3, muscle:3 } },
        { t:'$550 and up',  s:'The long, complete ones',   i:'ph-diamond',  w:{ immuno:4, revive:4, brain:4 } },
        { t:'Let her decide', s:'Whatever is right',       i:'ph-pen-nib',  w:{ custom:3 } },
    ]},
];

const THINKING = ['Reading your answers', 'Weighing ten protocols', 'Checking time and budget', 'Preparing your starting point'];

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
            if (!this.el.classList.contains('is-open')) return;
            if (e.key === 'Escape') { this.hide(); return; }
            if (e.key === 'Tab') this.trap(e);
        });
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
        this.el.classList.add('is-open');
        this.el.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('is-locked');
        this.step = 0; this.answers = [];
        this.render();
        setTimeout(() => $('.modal__x', this.el)?.focus(), 60);
    }

    hide() {
        this.el.classList.remove('is-open');
        this.el.setAttribute('aria-hidden', 'true');
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
            old.setAttribute('inert', '');
            setTimeout(() => old.remove(), 420);
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
                        <i class="ph ${o.i}" aria-hidden="true"></i>
                        <span><b>${o.t}</b><span>${o.s}</span></span>
                    </button>`).join('')}
            </div>`);

        $$('[data-pick]', panel).forEach((b) => {
            b.addEventListener('click', () => {
                if (panel.dataset.locked) return;
                panel.dataset.locked = '1';
                this.answers[this.step] = q.opts[Number(b.dataset.pick)];
                setTimeout(() => { this.step += 1; this.render(); }, 160);
            });
        });
    }

    score() {
        const totals = Object.fromEntries(DRIPS.map((d) => [d.id, 0]));
        let flag = false;
        this.answers.forEach((a) => {
            if (!a) return;
            if (a.flag) flag = true;
            Object.entries(a.w || {}).forEach(([k, v]) => { totals[k] += v; });
        });
        const rank = Object.entries(totals).sort((x, y) => y[1] - x[1]);
        const by = Object.fromEntries(DRIPS.map((d) => [d.id, d]));
        return { top: by[rank[0][0]], alt: by[rank[1][0]], flag };
    }

    async think() {
        const p = this.swap(`
            <div class="q__think">
                <div class="q__ring" aria-hidden="true"></div>
                <p class="q__log" id="qLog">${THINKING[0]}</p>
            </div>`);
        const log = $('#qLog', p);
        for (const line of THINKING) {
            if (log) log.textContent = line;
            await wait(REDUCED ? 40 : 340);
        }
        this.result();
    }

    result() {
        const { top, alt, flag } = this.score();
        const note = flag
            ? `<p class="rx__why"><b>Because you are under a specialist’s care</b>, Dr.&nbsp;Aronov will review your medications and want your treating physician in the loop before anything is scheduled. Nothing here replaces your prescribed treatment.</p>`
            : '';

        this.swap(`
            <div class="rx">
                <div class="rx__top">
                    <img class="rx__bag" src="assets/drips/${top.img}.png" alt="${top.name}"
                         onerror="this.src='assets/drips/immuneoboost.png';this.onerror=null">
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
                    <div class="rx__fact"><dt>In a programme</dt><dd>${top.prog}</dd></div>
                </dl>
                <div class="rx__alt">
                    <span>Also worth asking about <b>${alt.name}</b></span>
                    <a href="${alt.slug}">View&nbsp;→</a>
                </div>
                <div class="rx__cta">
                    <a class="rx__btn rx__btn--solid" href="${top.slug}">
                        <span>Read the protocol</span><i class="ph ph-arrow-up-right" aria-hidden="true"></i>
                    </a>
                    <a class="rx__btn" href="tel:+19292010740">
                        <span>929 · 201 · 0740</span><i class="ph ph-phone" aria-hidden="true"></i>
                    </a>
                </div>
            </div>`);
        this.chrome();
    }
}


/* =============================================================================
   CONDITIONS — a switcher, not a stack
   Five long cards end to end made this the tallest block on the page, and
   nobody reads a condition they do not have. So the index is a control now:
   one card on screen, swapped on click, with the same overshoot pop the
   physician beats use. No-ops when the section is absent.
============================================================================= */
class Conditions {
    constructor() {
        this.rail  = $('#condRail');
        this.cards = $$('.cond');
        this.items = this.rail ? $$('.rail__item', this.rail) : [];
        this.at    = -1;
    }

    init() {
        if (!this.rail || !this.cards.length) return;

        this.items.forEach((b, i) => {
            b.setAttribute('aria-controls', b.dataset.goto);
            b.addEventListener('click', () => this.show(i, true));
        });

        // arrow keys walk the list, like any real tab set
        this.rail.addEventListener('keydown', (e) => {
            if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            e.preventDefault();
            const dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
            const next = (this.at + dir + this.items.length) % this.items.length;
            this.show(next, true);
            this.items[next].focus();
        });

        this.show(0, false);

        // the whole block still arrives with a pop the first time it is seen
        if (typeof window.gsap !== 'undefined' && !REDUCED) {
            gsap.registerPlugin(ScrollTrigger);
            gsap.from(this.items, {
                x: -18, opacity: 0, duration: .55, ease: 'back.out(1.6)', stagger: .05,
                scrollTrigger: { trigger: this.rail, start: 'top 86%', once: true },
            });
            const gate = $('[data-gate]');
            if (gate) {
                gsap.from(gate, { y: 30, opacity: 0, duration: .8, ease: 'back.out(1.4)',
                    scrollTrigger: { trigger: gate, start: 'top 88%', once: true } });
                gsap.from($$('.gate__cell'), {
                    y: 26, opacity: 0, scale: .96, duration: .55, ease: 'back.out(1.7)', stagger: .07,
                    scrollTrigger: { trigger: '.gate__grid', start: 'top 90%', once: true } });
            }
        }
    }

    show(i, animate) {
        if (i === this.at) return;
        this.at = i;

        this.items.forEach((b, n) => {
            b.classList.toggle('is-here', n === i);
            b.setAttribute('aria-expanded', String(n === i));
        });
        this.cards.forEach((c, n) => {
            c.classList.toggle('is-live', n === i);
            c.setAttribute('aria-hidden', String(n !== i));
        });

        const card = this.cards[i];
        if (!animate || typeof window.gsap === 'undefined' || REDUCED) return;

        // the pop: overshoot in, and let the blocks inside land behind it
        gsap.fromTo(card,
            { opacity: 0, y: 26, scale: .975 },
            { opacity: 1, y: 0, scale: 1, duration: .5, ease: 'back.out(1.7)' });
        gsap.fromTo($$('.cond__block', card),
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: .45, ease: 'back.out(1.5)', stagger: .06, delay: .08 });
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
    dock:      new Dock(),
    quiz:      new Quiz(),
    conditions: new Conditions(),
    social:     new Social(),
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

    /* Fonts and the bag images land AFTER first paint and change the height of
       the document. Any trigger measured before that is measured against a
       shorter page — which is exactly why sections further down stop firing,
       or fire at the wrong moment, as the page grows. Refresh when fonts land,
       when every image is in, and again once a resize settles. */
    if (typeof window.gsap !== 'undefined') {
        const refresh = debounce(() => ScrollTrigger.refresh(), 120);

        if (document.fonts) document.fonts.ready.then(refresh);
        window.addEventListener('load', refresh);
        window.addEventListener('resize', debounce(() => ScrollTrigger.refresh(), 280));

        $$('img').forEach((img) => {
            if (img.complete) return;
            img.addEventListener('load',  refresh, { once: true });
            img.addEventListener('error', refresh, { once: true });
        });
    }
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
