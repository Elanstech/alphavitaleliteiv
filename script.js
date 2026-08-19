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
     WordLoop    the rotating category in the "Infusions for ..." line
     HeroVideo   autoplay kick for iOS, poster fallback if the file is absent
     Magnetic    primary buttons lean toward the pointer (fine pointers only)
     Shelf       the services rail — pinned horizontally, swipeable on phones
     Advantage   the oral-vs-IV switch, drawn on arrival and on every toggle
     Visit       the four-step ledger and the screening record beside it
     Dock        back to top (left) and the action dial (right)
     Quiz        the modal matcher — four questions across the infusions
     Chronic     the chronic-condition accordion, its compounds and spotlight
     Social      the Instagram band
     Physician   sticky portrait, beats that pop, the chain of custody
     Reveal      generic scroll reveal for anything marked [data-reveal]
     Boot

   REQUIRES GSAP + ScrollTrigger from CDN in index.html BEFORE this file.
   Without them every module degrades to a static, readable layout.

   NOTE — the loop no longer sits inside the headline. It drives the
   "Infusions for ..." descriptor line beneath it, so the approved hero wording
   is never part of the moving text. Nine categories, Dr. Aronov's order.
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
    const els = Array.isArray(targets) ? targets : [targets];
    if (!els.length || typeof window.gsap === 'undefined') return;
    if (REDUCED) { gsap.set(els, { opacity: 1, y: 0, scale: 1 }); return; }

    gsap.set(els, { opacity: 0, y, scale });
    gsap.to(els, {
        opacity: 1, y: 0, scale: 1, duration, ease, stagger,
        scrollTrigger: { trigger: trigger || els[0], start, once: true },
    });
};



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
   WORD LOOP — the rotating category in "Infusions for ..."
   The first child holds the layout width and height; the rest sit on top of it.
   Each category rises through the mask, holds, and exits upward. Only one is
   ever legible at a time.
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

        // Roll out through the top of the mask...
        current.classList.remove('is-on');
        current.classList.add('is-out');

        // ...and only then bring the next category up through the bottom,
        // so two are never legible at once.
        setTimeout(() => {
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
   Ten plates: nine signature infusions and one customized option. Pinned
   horizontally on desktop and dragged by the scrollbar; a native snap scroller
   on phones. The counter and meter track whichever plate is centred.

   Found by CLASS, not id: the section keeps id="infusions" so the header nav
   and the hero's "View infusions" button still land on it.

   The filters are generic — a pill's data-filter is matched against a plate's
   data-tags, so Dr. Aronov's eleven-button order needs no code change here.
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
        this.last     = -1;
        this.BREAK    = 900;   // below this the rail becomes a snap scroller
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
        The field itself stays cream — each formula's compound colour lives
        only in its own numeral, chips and hover. */
    paint(index) {
        const list = this.live();
        if (!list.length) return;

        const i = clamp(index, 0, list.length - 1);
        if (i === this.last) return;
        this.last = i;

        if (this.now)   this.now.textContent = String(i + 1).padStart(2, '0');
        if (this.total) this.total.textContent = String(list.length).padStart(2, '0');
        if (this.meter) this.meter.style.width = ((i + 1) / list.length) * 100 + '%';
    }

    rail() {
        const mm = gsap.matchMedia();

        /* -- desktop: pin the viewport, scrub the track sideways --
           Three things were causing the stutter and all three are fixed here:

           1. Every plate had its OWN ScrollTrigger for the counter-scrolling
              numeral — eleven extra scrubbed triggers all recalculating on the
              same frame. They are gone. One quickSetter loop inside the main
              onUpdate now moves every numeral, which is a single write per
              frame instead of eleven.
           2. The x transform landed on fractional pixels, so text inside the
              plates shimmered as it slid. Values are rounded now and the tween
              is forced onto the compositor.
           3. `scrub: 0.9` smooths toward a target, so a mid-scroll refresh
              re-targets and reads as a jump. Scrub is tighter and refreshes are
              gated in boot() so they cannot fire while the pin is active.        -- */
        mm.add(`(min-width: ${this.BREAK + 1}px)`, () => {
            const plates = $$('.plate', this.track);
            const noSetters = plates.map((p) => {
                const no = $('.plate__no', p);
                return no ? { set: gsap.quickSetter(no, 'x', 'px'), fade: gsap.quickSetter(no, 'opacity'), el: no } : null;
            }).filter(Boolean);

            const distance = () => Math.max(0, Math.round(this.track.scrollWidth - window.innerWidth + 80));

            const drag = gsap.to(this.track, {
                x: () => -distance(),
                ease: 'none',
                force3D: true,
                roundProps: 'x',            // whole pixels — no subpixel shimmer
                scrollTrigger: {
                    trigger: this.pin,
                    start: 'top top',
                    end: () => '+=' + distance(),
                    pin: this.viewport,
                    pinSpacing: true,
                    scrub: 0.45,            // tighter: less to re-target on a refresh
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    fastScrollEnd: true,
                    onToggle: (self) => {
                        // will-change is expensive to leave on permanently
                        this.track.style.willChange = self.isActive ? 'transform' : 'auto';
                        Shelf.pinned = self.isActive;
                    },
                    onUpdate: (self) => {
                        const p = self.progress;
                        this.paint(Math.round(p * (this.live().length - 1)));

                        // one pass over the numerals instead of eleven triggers
                        const vw = window.innerWidth;
                        for (const n of noSetters) {
                            const box = n.el.getBoundingClientRect();
                            const t = 1 - clamp((box.left + box.width / 2) / vw, 0, 1);
                            n.set(Math.round(30 - t * 60));
                            n.fade((0.25 + t * 0.6).toFixed(2));
                        }
                    },
                },
            });

            popIn(plates, { y: 60, stagger: .06, duration: 1, ease: 'expo.out' }, this.pin, 'top 70%');

            this.drag = drag;
            return () => { this.drag = null; this.track.style.willChange = 'auto'; Shelf.pinned = false; };
        });

        /* -- phone: a real horizontal scroller with snap points --
           No pin, no scrub. The track scrolls natively under the thumb and the
           counter reads off its scrollLeft, which is what a phone expects and
           what survives an address bar resizing mid-gesture. -- */
        mm.add(`(max-width: ${this.BREAK}px)`, () => {
            const track = this.track;

            /* The old version listened to `scroll` and re-measured every plate
               on every frame — on a snap scroller with momentum that is a lot
               of layout reads mid-gesture, which is where the phone stutter
               came from. An IntersectionObserver rooted on the track does the
               same job with no per-frame work at all. */
            let io = null;
            if ('IntersectionObserver' in window) {
                io = new IntersectionObserver((entries) => {
                    let best = null;
                    for (const en of entries) {
                        if (!en.isIntersecting) continue;
                        if (!best || en.intersectionRatio > best.intersectionRatio) best = en;
                    }
                    if (!best) return;
                    const i = this.live().indexOf(best.target);
                    if (i >= 0) this.paint(i);
                }, { root: track, threshold: [0.45, 0.6, 0.75, 0.9] });

                $$('.plate', track).forEach((p) => io.observe(p));
            }

            popIn($$('.plate', track), { y: 34, stagger: .05, duration: .8, ease: 'expo.out' }, this.pin, 'top 82%');

            return () => { io?.disconnect(); };
        });

        /* fonts land after first paint and change every measurement —
           global refresh lives in boot() */
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

                // a single-result filter has nothing to scroll through — send
                // the phone scroller back to the start so the one card is on screen
                this.track.scrollLeft = 0;

                if (typeof window.gsap !== 'undefined') {
                    gsap.fromTo(this.live(),
                        { opacity: 0, y: 26 },
                        { opacity: 1, y: 0, duration: 0.65, ease: 'expo.out', stagger: 0.04 });
                    // hiding plates changes scrollWidth, so the pin distance is
                    // now wrong — refresh on the next frame, once layout settles
                    requestAnimationFrame(() => ScrollTrigger.refresh());
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
   THE IV ADVANTAGE — one stage, one switch (#advantage)
   Picking a road draws it: the rule fills, the pins light in sequence. The
   first draw is fired by ScrollTrigger so it plays on arrival; every switch
   after that replays it. Vertical below 900px, which is why the fill animates
   whichever axis the media query is using.
============================================================================= */
class Advantage {
    constructor() {
        this.el     = $('#advantage');
        this.switch = $('.adv__switch', this.el ?? document);
        this.opts   = $$('.adv__opt', this.el ?? document);
        this.lanes  = $$('.adv__lane', this.el ?? document);
        this.at     = 'oral';
        this.drawn  = false;
    }

    init() {
        if (!this.el || !this.lanes.length) return;

        this.opts.forEach((o) => o.addEventListener('click', () => this.show(o.dataset.lane)));

        this.switch?.addEventListener('keydown', (e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault();
            const next = this.at === 'oral' ? 'iv' : 'oral';
            this.show(next);
            this.opts.find((o) => o.dataset.lane === next)?.focus();
        });

        if (typeof window.gsap === 'undefined' || REDUCED) {
            this.lanes.forEach((l) => {
                $$('.stp', l).forEach((s) => s.classList.add('is-passed'));
                const f = $('.adv__fill', l);
                if (f) { f.style.width = '100%'; f.style.height = '100%'; }
            });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.create({
            trigger: this.el, start: 'top 72%', once: true,
            onEnter: () => { this.drawn = true; this.draw(this.lanes.find((l) => l.dataset.lane === this.at)); },
        });
        popIn($$('.adv__head > *, .adv__switch, .adv__note', this.el),
              { y: 26, stagger: .07, duration: .55, ease: 'back.out(1.5)' }, this.el, 'top 84%');
    }

    show(lane) {
        if (lane === this.at) return;
        this.at = lane;

        this.opts.forEach((o) => {
            const on = o.dataset.lane === lane;
            o.classList.toggle('is-on', on);
            o.setAttribute('aria-selected', String(on));
        });
        this.switch?.classList.toggle('is-iv', lane === 'iv');

        this.lanes.forEach((l) => {
            const on = l.dataset.lane === lane;
            l.classList.toggle('is-live', on);
            l.setAttribute('aria-hidden', String(!on));
            if (on && this.drawn) this.draw(l);
        });

        if (typeof window.gsap !== 'undefined' && !REDUCED) {
            const live = this.lanes.find((l) => l.dataset.lane === lane);
            gsap.fromTo(live, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .45, ease: 'expo.out' });
        }
    }

    /** fill the rule, then light each pin as the fill reaches it */
    draw(lane) {
        if (!lane) return;
        const fill  = $('.adv__fill', lane);
        const stops = $$('.stp', lane);
        if (!fill || !stops.length) return;

        // below 900px the rule is vertical — animate whichever axis is in play
        const vertical = window.matchMedia('(max-width: 900px)').matches;
        stops.forEach((s) => s.classList.remove('is-passed'));
        gsap.killTweensOf(fill);
        gsap.set(fill, vertical ? { height: '0%', width: '100%' } : { width: '0%', height: '100%' });

        const span = { v: 0 };
        gsap.to(span, {
            v: 100,
            duration: 0.32 * stops.length + 0.5,
            ease: 'power2.inOut',
            onUpdate: () => {
                const p = span.v;
                fill.style[vertical ? 'height' : 'width'] = p.toFixed(1) + '%';
                stops.forEach((s, i) => {
                    s.classList.toggle('is-passed', p >= ((i + 0.55) / stops.length) * 100);
                });
            },
        });
    }
}


/* =============================================================================
   THE PRACTICE, LIVE
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
   THE QUIZ — modal, four questions, weighted across the ten infusions
   -----------------------------------------------------------------------------
   Menu, names and order per Dr. Aronov's 17 Aug email: nine signature
   infusions + one customized option. Quercetin and Curcumin removed.

   Copy rule for every `why` below: "supports" and "designed to complement".
   Never treats, cures, repairs, or guaranteed-outcome language.

   ⚠ THREE ENTRIES STILL LACK TIME AND PRICING — Joint Support, Liver Support
   and Skin Health. Their `price`/`prog` read "To be confirmed" so nothing
   false is ever displayed, and they are deliberately left OUT of the budget
   question's weighting until real figures exist — see ASKS[3].
============================================================================= */
const DRIPS = [
    { id:'healthyaging', name:'GLyNAC Longevity Restoration IV',        slug:'/drips/healthy-aging/',          img:'glynac',        time:'1 h 15',                     price:'$450', prog:'$405',    tag:'Healthy Aging',
      why:'Two of the building blocks the body uses to produce its own glutathione.' },

    { id:'immune',       name:'Immun-O-Boost IV Support',               slug:'/drips/immune-support/',         img:'immuneoboost',  time:'2 h 30',                     price:'$650', prog:'$585',    tag:'Immune Support',
      why:'Trace minerals, B-complex, amino acids and antioxidants supporting normal immune defenses.' },

    { id:'muscle',       name:'LIQUIXO Muscle Support IV Infusion',     slug:'/drips/muscle-recovery/',        img:'liquixo',       time:'45 min',                     price:'$495', prog:'$445.50', tag:'Muscle Recovery',
      why:'A broad twenty amino acid formula, designed to supply what muscles draw on during recovery.' },

    { id:'antioxidant',  name:'Antioxidant ×3 Reset IV Infusion',       slug:'/drips/antioxidant-support/',    img:'antioxidant',   time:'1 h 15',                     price:'$500', prog:'$450',    tag:'Antioxidant Support',
      why:'Three antioxidants that work within the same network rather than alone.' },

    { id:'glutathione',  name:'Glutathione IV Injection',               slug:'/drips/glutathione-iv-therapy/', img:'glutathione',   time:'15 min push · 30 min visit', price:'$125', prog:'$112.50', tag:'Glutathione IV Therapy',
      why:'A slow physician-administered push for focused antioxidant support.' },

    /* ! awaiting time + pricing */
    { id:'joint',        name:'Joint Support IV Infusion',              slug:'/drips/joint-support/',          img:'jointsupport',  time:'To be confirmed',            price:'To be confirmed', prog:'To be confirmed', tag:'Joint Support',
      why:'Nutrients involved in collagen production, designed to complement rheumatology care.' },

    /* ! awaiting time + pricing */
    { id:'liver',        name:'Liver Support IV Infusion',              slug:'/drips/liver-support/',          img:'liversupport',  time:'To be confirmed',            price:'To be confirmed', prog:'To be confirmed', tag:'Liver Support',
      why:'Supports antioxidant and metabolic pathways relevant to liver health.' },

    /* ! awaiting time + pricing — shares the Joint Support foundation */
    { id:'skin',         name:'Skin Health IV Infusion',                slug:'/drips/skin-health/',            img:'skinhealth',    time:'To be confirmed',            price:'To be confirmed', prog:'To be confirmed', tag:'Skin Health',
      why:'The same collagen-supporting foundation, for the skin’s nutritional and antioxidant needs.' },

    { id:'recovery',     name:'Revive IV Support Infusion',             slug:'/drips/recovery-support/',       img:'revive',        time:'2 h 15',                     price:'$625', prog:'$562.50', tag:'Recovery Support',
      why:'Hydration, vitamins, amino acids and antioxidant support after illness, travel or stress.' },

    { id:'custom',       name:'Customized IV Infusion',                 slug:'/drips/customized-infusion/',    img:'customized',    time:'Individually determined',    price:'By consultation', prog:'Quoted after screening', tag:'Customized IV Infusion',
      why:'Composed for you alone, based on Dr. Aronov’s individual review.' },
];

const ASKS = [
    { ask:'What brought you here?', hint:'Pick whichever is loudest right now.', opts:[
        { t:'I keep getting sick',       s:'Run-down, seasonal',             i:'ph-shield-check',     w:{ immune:6, recovery:2 } },
        { t:'I am still run down',       s:'After illness, travel or stress',i:'ph-arrows-clockwise', w:{ recovery:6, immune:2 } },
        { t:'My joints ache',            s:'Stiffness, arthritis, wear',     i:'ph-bone',             w:{ joint:6, antioxidant:2 } },
        { t:'I am thinking about my skin', s:'Tone, texture, skin wellness', i:'ph-sparkle',          w:{ skin:6, glutathione:3 } },
        { t:'I am losing muscle',        s:'On a GLP-1 or weight-loss plan', i:'ph-barbell',          w:{ muscle:7 } },
        { t:'My liver markers came back off', s:'Metabolic or liver concern',i:'ph-leaf',             w:{ liver:6, antioxidant:2 } },
        { t:'I want to age well',        s:'Longevity, cellular defenses',   i:'ph-infinity',         w:{ healthyaging:6, antioxidant:3 } },
    ]},

    { ask:'Are you under a specialist’s care for anything?', hint:'This changes how carefully she coordinates, never whether you are welcome.', opts:[
        { t:'Yes — a gut condition',    s:'Crohn’s, colitis, coeliac',      i:'ph-first-aid-kit',  flag:true, w:{ custom:5, immune:2 } },
        { t:'Yes — joints or skin',     s:'RA, osteoarthritis, psoriasis',  i:'ph-hand-heart',     flag:true, w:{ custom:4, joint:2, skin:2 } },
        { t:'Yes — liver or metabolic', s:'Fatty liver, related',           i:'ph-heartbeat',      flag:true, w:{ custom:4, liver:3 } },
        { t:'No — generally well',      s:'No diagnosis, no specialist',    i:'ph-check-circle',   w:{} },
    ]},

    { ask:'How long can you sit?', hint:'Her chairs are private — the long ones are the unhurried ones.', opts:[
        { t:'About half an hour', s:'A lunch break',      i:'ph-timer',     w:{ glutathione:6 } },
        { t:'About an hour',      s:'A proper sit',       i:'ph-clock',     w:{ healthyaging:4, antioxidant:4, muscle:3 } },
        { t:'Ninety minutes',     s:'Time to switch off', i:'ph-armchair',  w:{ antioxidant:3, healthyaging:2 } },
        { t:'A full afternoon',   s:'The complete ones',  i:'ph-hourglass', w:{ recovery:5, immune:5 } },
    ]},

    /* Joint Support, Liver Support and Skin Health carry no weight here on
       purpose — their pricing is not confirmed, so the quiz must not steer
       anyone to them on cost. Add them once Dr. Aronov supplies the figures. */
    { ask:'What feels comfortable per session?', hint:'Every figure here is her real published rate.', opts:[
        { t:'Under $350',     s:'Single-compound infusions', i:'ph-coins',   w:{ glutathione:5 } },
        { t:'$350 – $550',    s:'The mid-length protocols',  i:'ph-wallet',  w:{ healthyaging:4, antioxidant:4, muscle:3 } },
        { t:'$550 and up',    s:'The long, complete ones',   i:'ph-diamond', w:{ immune:4, recovery:4 } },
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
            Object.entries(a.w || {}).forEach(([k, v]) => {
                if (k in totals) totals[k] += v;
            });
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
            ? `<p class="rx__why"><b>Because you are under a specialist’s care</b>, Dr.&nbsp;Aronov will review your medications and requires your treating physician’s written approval before anything is scheduled. Nothing here replaces your prescribed treatment.</p>`
            : '';

        // the programme row is only shown when there is a real figure for it
        const progRow = /^\$/.test(top.prog)
            ? `<div class="rx__fact"><dt>In a programme</dt><dd>${top.prog}</dd></div>`
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
                    ${progRow}
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
   HOW A VISIT WORKS — the ledger and the record (#visit)
   Motion grammar is its own: no pin, no toggle, no scrub. Each step claims the
   sequence as it reaches the middle of the screen, the rail fills behind it,
   and the screening record beside it changes status and accumulates ticks.
   The record stamps once, on the last step. Clicking a step jumps to it.

   Step content is read from a JSON island in the markup rather than duplicated
   here, so the copy lives in one place and stays crawlable.
============================================================================= */
class Visit {
    constructor() {
        this.el     = $('#visit');
        this.list   = $('#visitSteps');
        this.steps  = $$('.vs', this.list ?? document);
        this.fill   = $('.visit__fill', this.el ?? document);
        this.status = $('#vfStatus');
        this.ticks  = $('#vfTicks');
        this.ref    = $('#vfRef');
        this.seal   = $('#vfSeal');
        this.at     = -1;
        this.data   = [];
    }

    init() {
        if (!this.el || !this.steps.length) return;

        try { this.data = JSON.parse($('#visitData')?.textContent || '[]'); }
        catch { this.data = []; }

        // the folio numeral behind each step comes from its own index
        this.steps.forEach((s, i) => {
            s.dataset.folio = String(i + 1).padStart(2, '0');
            $('.vs__hit', s)?.addEventListener('click', () => {
                this.set(i);
                s.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
            });
        });

        this.set(0);

        if (typeof window.gsap === 'undefined' || REDUCED) {
            this.steps.forEach((s) => s.classList.add('is-done'));
            if (this.fill) this.fill.style.height = '100%';
            this.set(this.steps.length - 1);
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        /* Each step owns a trigger rather than one scrubbed trigger for the
           whole list — a scrub here would fight the sticky record beside it,
           and a step should claim the sequence at a definite moment, not
           fractionally. */
        this.steps.forEach((s, i) => {
            ScrollTrigger.create({
                trigger: s,
                start: 'top 62%',
                end: 'bottom 42%',
                onEnter:     () => this.set(i),
                onEnterBack: () => this.set(i),
            });
        });

        popIn($$('.vh', this.el), { y: 26, scale: .98, stagger: .1, duration: .6 }, '.visit__honest', 'top 88%');
        popIn(this.steps, { y: 24, stagger: .08, duration: .55, ease: 'back.out(1.4)' }, this.list, 'top 82%');
    }

    set(i) {
        if (i === this.at) return;
        const first = this.at === -1;
        this.at = i;

        this.steps.forEach((s, n) => {
            s.classList.toggle('is-on', n === i);
            s.classList.toggle('is-done', n < i);
            $('.vs__hit', s)?.setAttribute('aria-current', String(n === i));
        });

        if (this.fill) {
            this.fill.style.height = (((i + 1) / this.steps.length) * 100).toFixed(1) + '%';
        }
        if (this.ref) this.ref.textContent = String(i + 1).padStart(2, '0');

        this.paintCard(i, !first);
    }

    /** status swaps, ticks accumulate — every tick from this step and the ones before it */
    paintCard(i, animate) {
        const entry = this.data[i];
        if (!entry) return;

        if (this.status) {
            if (animate && typeof window.gsap !== 'undefined' && !REDUCED) {
                gsap.fromTo(this.status, { opacity: 0, y: 10 },
                    { opacity: 1, y: 0, duration: .4, ease: 'expo.out' });
            }
            this.status.innerHTML = entry.status;
        }

        if (this.ticks) {
            const all = this.data.slice(0, i + 1).flatMap((d) => d.ticks);
            this.ticks.innerHTML = all.map((t) =>
                `<li class="vf__tick"><i class="ph-fill ph-check" aria-hidden="true"></i><span>${t}</span></li>`
            ).join('');

            if (animate && typeof window.gsap !== 'undefined' && !REDUCED) {
                const fresh = $$('.vf__tick', this.ticks).slice(-entry.ticks.length);
                gsap.fromTo(fresh, { opacity: 0, x: -10 },
                    { opacity: 1, x: 0, duration: .4, ease: 'back.out(1.6)', stagger: .07 });
            }
        }

        // the record is only stamped once the sequence is complete
        if (this.seal) {
            const done = i === this.steps.length - 1;
            if (typeof window.gsap === 'undefined' || REDUCED) {
                gsap.set?.(this.seal, { opacity: done ? 1 : 0 });
                this.seal.style.opacity = done ? '1' : '0';
                this.seal.style.transform = 'none';
                return;
            }
            gsap.to(this.seal, done
                ? { opacity: 1, scale: 1, rotate: 0, duration: .55, ease: 'back.out(2.2)' }
                : { opacity: 0, scale: .9, rotate: -4, duration: .3, ease: 'power2.in' });
        }
    }
}


/* =============================================================================
   CHRONIC CONDITIONS — a switcher, not a stack (#conditions)
   Seven long cards made this the tallest block on the page and nobody reads a
   condition they do not have. One panel is live at a time; the rest stay in
   the DOM (visibility, not display) so every word is still crawlable.
   Deep-linkable: /#cond-mafld opens fatty liver from an ad or an email.
============================================================================= */
class Chronic {
    constructor() {
        this.scene = $('.chron');
        this.tabs  = $$('.cnav__tab');
        this.cards = $$('.cd');
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

        const fromHash = this.cards.findIndex((c) => '#' + c.id === window.location.hash);
        this.show(fromHash >= 0 ? fromHash : 0, false);
        if (fromHash >= 0) setTimeout(() => this.scene.scrollIntoView({ block: 'start' }), 60);

        this.spotlight();

        if (typeof window.gsap !== 'undefined' && !REDUCED) {
            gsap.registerPlugin(ScrollTrigger);
            popIn($$('.cnav__tab', this.scene), { y: 14, stagger: .04, duration: .4, ease: 'back.out(1.8)' }, '.cnav', 'top 90%');
            popIn($('.cstage'), { y: 26, duration: .6 }, '.cstage', 'top 88%');
        }
    }

    show(i, animate) {
        if (i === this.at && animate) return;
        this.at = i;

        this.tabs.forEach((t, n) => {
            const on = n === i;
            t.classList.toggle('is-on', on);
            t.setAttribute('aria-selected', String(on));
            // keep the active pill in view on the phone's horizontal rail
            if (on && animate && t.scrollIntoView) {
                t.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
            }
        });

        this.cards.forEach((c, n) => {
            const on = n === i;
            c.classList.toggle('is-live', on);
            c.setAttribute('aria-hidden', String(!on));
        });

        const card = this.cards[i];
        if (!animate || typeof window.gsap === 'undefined' || REDUCED) return;

        gsap.killTweensOf([card, $$('.cd__l > *, .cd__mol, .cd__never', card)]);
        gsap.fromTo(card, { opacity: 0, y: 20, scale: .99 },
                          { opacity: 1, y: 0, scale: 1, duration: .48, ease: 'expo.out' });
        gsap.fromTo($$('.cd__l > *', card), { opacity: 0, y: 14 },
                    { opacity: 1, y: 0, duration: .42, ease: 'power3.out', stagger: .045, delay: .05 });
        gsap.fromTo($$('.cd__mol, .cd__never', card), { opacity: 0, x: 14 },
                    { opacity: 1, x: 0, duration: .42, ease: 'power3.out', stagger: .05, delay: .12 });
        gsap.fromTo($('.cd__ghost', card), { opacity: 0, scale: 1.12 },
                    { opacity: 1, scale: 1, duration: .8, ease: 'expo.out' });
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
    preloader:  new Preloader(),
    header:     new Header(),
    menu:       new Menu(),
    wordLoop:   new WordLoop(),
    heroVideo:  new HeroVideo(),
    magnetic:   new Magnetic(),
    shelf:      new Shelf(),
    advantage:  new Advantage(),
    visit:      new Visit(),
    dock:       new Dock(),
    quiz:       new Quiz(),
    conditions: new Chronic(),
    social:     new Social(),
    physician:  new Physician(),
    reveal:     new Reveal(),
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

        // never refresh while the rail is pinned — queue it for when it is not
        let queued = false;
        const safeRefresh = () => {
            if (Shelf.pinned) {
                if (queued) return;
                queued = true;
                const wait = setInterval(() => {
                    if (Shelf.pinned) return;
                    clearInterval(wait); queued = false; ScrollTrigger.refresh();
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
window.AVE = { modules, boot, DRIPS, ASKS, helpers: { $, $$, clamp, lerp, onFrame, debounce } };
