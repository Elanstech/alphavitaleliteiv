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
     HeroVideo   autoplay kick for iOS, poster fallback if the file is absent
     Magnetic    primary buttons lean toward the pointer (fine pointers only)
     Shelf       the services rail — pinned horizontally, swipeable on phones
     Route       the two-lane oral-vs-IV explainer, scrubbed on scroll
     Dock        back to top (left) and the action dial (right)
     Quiz        the modal matcher — four questions across ten infusions
     Conditions  the chronic-condition switcher and its compounds
     Social      the Instagram band
     Physician   sticky portrait, beats that pop, the chain of custody
     Reveal      generic scroll reveal for anything marked [data-reveal]
     Boot

   REQUIRES GSAP + ScrollTrigger from CDN in index.html BEFORE this file.
   Without them every module degrades to a static, readable layout.

   NOTE — WordLoop was removed with the hero headline rewrite (Edit #2). The
   markup no longer contains #wordLoop. The CSS for it is still in styles.css
   if the loop is ever restored.
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

            /* the roman numeral counter-scrolls against its own plate */
            $$('.plate', this.track).forEach((plate) => {
                const no = $('.plate__no', plate);
                if (!no) return;
                gsap.fromTo(no,
                    { x: 30, opacity: .25 },
                    { x: -30, opacity: .85, ease: 'none',
                      scrollTrigger: { trigger: plate, containerAnimation: drag,
                                       start: 'left right', end: 'right left', scrub: true } });
            });

            popIn($$('.plate', this.track), { y: 60, stagger: .06, duration: 1, ease: 'expo.out' }, this.pin, 'top 70%');

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
            popIn($$('.plate', track), { y: 34, stagger: .05, duration: .8, ease: 'expo.out' }, this.pin, 'top 82%');

            return () => { track.removeEventListener('scroll', onScroll); };
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
            popIn(lane, { y: 40, scale: .975 }, lane, 'top 86%');
            popIn($$('.stop', lane), { y: 20, stagger: .07, duration: .45, ease: 'back.out(1.5)' }, lane, 'top 80%');

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
   Menu as approved by Dr. Aronov: nine signature infusions + one customized
   option. Quercetin and Curcumin have been removed entirely.

   ⚠ TWO ENTRIES ARE INCOMPLETE. Joint Support and Skin Health share one
   formulation and their ingredients, chair time and pricing have not been
   supplied yet. They are marked below and their `price`/`prog` read
   "To be confirmed" so nothing false is ever displayed. They are deliberately
   left OUT of the budget question's weighting until real figures exist —
   see ASKS[3].
============================================================================= */
const DRIPS = [
    { id:'immune',      name:'Immun-O-Boost IV Support',                slug:'/drips/immune-support/',        img:'immuneoboost',  time:'2 h 30',                   price:'$650', prog:'$585',    tag:'Immune Support',
      why:'Hydration, immune and recovery support — the deep seasonal replenishment.' },

    { id:'postillness', name:'Revive IV Support Infusion',              slug:'/drips/post-illness-recovery/', img:'revive',        time:'2 h 15',                   price:'$625', prog:'$562.50', tag:'Post-Illness Recovery',
      why:'Replenish, recharge, revive — the unhurried full restoration.' },

    { id:'antioxidant', name:'Antioxidant ×3 Reset IV Infusion',        slug:'/drips/antioxidant-support/',   img:'antioxidant',   time:'1 h 15',                   price:'$500', prog:'$450',    tag:'Antioxidant Support',
      why:'Three antioxidants that recharge one another rather than working alone.' },

    { id:'glutathione', name:'Glutathione IV Injection',                slug:'/drips/glutathione-iv-therapy/',img:'glutathione',   time:'15 min push · 30 min visit', price:'$125', prog:'$112.50', tag:'Glutathione IV Therapy',
      why:'A slow physician-administered push of the body’s major antioxidant.' },

    { id:'muscle',      name:'LIQUIXO Muscle Support IV Infusion',      slug:'/drips/muscle-recovery/',       img:'liquixo',       time:'45 min',                   price:'$495', prog:'$445.50', tag:'Muscle Recovery',
      why:'Lean-muscle support through GLP-1 and weight-loss programmes — the full amino profile.' },

    /* ⚠ awaiting formulation + pricing */
    { id:'joint',       name:'Joint Support IV Infusion',               slug:'/drips/joint-support/',         img:'jointsupport',  time:'To be confirmed',           price:'To be confirmed', prog:'To be confirmed', tag:'Joint Support',
      why:'Supportive care for joint comfort and a healthy inflammatory response.' },

    /* ⚠ same formulation as Joint Support — awaiting formulation + pricing */
    { id:'skin',        name:'Skin Health IV Infusion',                 slug:'/drips/skin-health/',           img:'skinhealth',    time:'To be confirmed',           price:'To be confirmed', prog:'To be confirmed', tag:'Skin Health',
      why:'The same formulation as Joint Support, selected for skin wellness goals.' },

    { id:'liver',       name:'GLyNAC Longevity Restoration IV',         slug:'/drips/liver-support/',         img:'glynac',        time:'1 h 15',                   price:'$450', prog:'$405',    tag:'Liver Support',
      why:'The two components your body uses to make its own glutathione.' },

    { id:'mind',        name:'Stress, Mental Burnout & Brain Wellness IV', slug:'/drips/mind-focus-support/', img:'brainwellness', time:'1 h 30',                   price:'$700', prog:'$630',    tag:'Mind & Focus Support',
      why:'Nutritional support for stress, mental fatigue and demanding schedules.' },

    { id:'custom',      name:'Customized IV Infusion',                  slug:'/drips/customized-infusion/',   img:'customized',    time:'Individually determined',   price:'By consultation', prog:'Quoted after screening', tag:'Customized IV Infusion',
      why:'Composed for you alone, based on Dr. Aronov’s individual review.' },
];

const ASKS = [
    { ask:'What brought you here?', hint:'Pick whichever is loudest right now.', opts:[
        { t:'I keep getting sick',    s:'Run-down, seasonal',              i:'ph-shield-check',  w:{ immune:5, postillness:2 } },
        { t:'I am still run down',    s:'Recovering after an illness',     i:'ph-arrows-clockwise', w:{ postillness:5, immune:2 } },
        { t:'My head is foggy',       s:'Stress, burnout, poor sleep',     i:'ph-brain',         w:{ mind:5, postillness:2 } },
        { t:'My joints ache',         s:'Stiffness, inflammatory stress',  i:'ph-bone',          w:{ joint:5, antioxidant:2 } },
        { t:'I am thinking about my skin', s:'Tone, texture, skin wellness', i:'ph-sparkle',     w:{ skin:5, glutathione:3 } },
        { t:'I am losing muscle',     s:'On a GLP-1 or weight-loss plan',  i:'ph-barbell',       w:{ muscle:6 } },
        { t:'I want to age well',     s:'Longevity, cellular, liver',      i:'ph-infinity',      w:{ liver:4, antioxidant:4, glutathione:2 } },
    ]},

    { ask:'Are you under a specialist’s care for anything?', hint:'This changes how carefully she coordinates, never whether you are welcome.', opts:[
        { t:'Yes — a gut condition',  s:'Crohn’s, colitis, coeliac',       i:'ph-first-aid-kit',  flag:true, w:{ custom:5, immune:2 } },
        { t:'Yes — joints or skin',   s:'RA, psoriasis, related',          i:'ph-hand-heart',     flag:true, w:{ custom:4, joint:2, skin:2 } },
        { t:'Yes — liver or metabolic', s:'Fatty liver, related',          i:'ph-heartbeat',      flag:true, w:{ custom:4, liver:3 } },
        { t:'No — generally well',    s:'No diagnosis, no specialist',     i:'ph-check-circle',   w:{} },
    ]},

    { ask:'How long can you sit?', hint:'Her chairs are private — the long ones are the unhurried ones.', opts:[
        { t:'About half an hour', s:'A lunch break',      i:'ph-timer',     w:{ glutathione:6 } },
        { t:'About an hour',      s:'A proper sit',       i:'ph-clock',     w:{ liver:4, antioxidant:3, muscle:3 } },
        { t:'Ninety minutes',     s:'Time to switch off', i:'ph-armchair',  w:{ mind:5, antioxidant:2 } },
        { t:'A full afternoon',   s:'The complete ones',  i:'ph-hourglass', w:{ postillness:5, immune:5 } },
    ]},

    /* Joint Support and Skin Health carry no weight here on purpose — their
       pricing is not confirmed, so they must not be steered to on budget.
       Add them once Dr. Aronov supplies the figures. */
    { ask:'What feels comfortable per session?', hint:'Every figure here is her real published rate.', opts:[
        { t:'Under $350',     s:'Single-compound infusions', i:'ph-coins',   w:{ glutathione:5 } },
        { t:'$350 – $550',    s:'The mid-length protocols',  i:'ph-wallet',  w:{ liver:4, antioxidant:4, muscle:3 } },
        { t:'$550 and up',    s:'The long, complete ones',   i:'ph-diamond', w:{ immune:4, postillness:4, mind:4 } },
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
            popIn(this.items, { y: 0, stagger: .05, duration: .55, ease: 'back.out(1.6)' }, this.rail, 'top 86%');
            const gate = $('[data-gate]');
            if (gate) {
                popIn(gate, { y: 30, duration: .8, ease: 'back.out(1.4)' }, gate, 'top 88%');
                popIn($$('.gate__cell'), { y: 26, scale: .96, stagger: .07, duration: .55 }, '.gate__grid', 'top 90%');
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
        gsap.fromTo($$('.cond__block, .compound', card),
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
    preloader:  new Preloader(),
    header:     new Header(),
    menu:       new Menu(),
    heroVideo:  new HeroVideo(),
    magnetic:   new Magnetic(),
    shelf:      new Shelf(),
    route:      new Route(),
    dock:       new Dock(),
    quiz:       new Quiz(),
    conditions: new Conditions(),
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

// handy in the console while the rest of the pages get built
window.AVE = { modules, boot, DRIPS, ASKS, helpers: { $, $$, clamp, lerp, onFrame, debounce } };
