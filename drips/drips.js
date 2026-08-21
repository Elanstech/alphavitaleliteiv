/* =============================================================================
   ALPHA VITAL ELITE IV — DRIPS.JS  (ES6 module)
   -----------------------------------------------------------------------------
   The ten /drips/<slug>/ protocol pages. Loaded with <script type="module">
   AFTER /script.js, and shares its GSAP + ScrollTrigger from the CDN — and,
   deliberately, its Rail engine off window.AVE rather than shipping a fourth
   carousel implementation.

   Same shape as the rest of the site: every class feature-detects, no-ops when
   its elements are absent, and degrades to a static readable page with GSAP
   missing or reduced motion on.

     Helpers
     Line        the gold IV line threading the document, and its ports
     Hero        the masked name, the hanging bag, the falling drop
     Vitals      the four figures under the hero, counted up
     Bag         THE SIGNATURE — the bag fills as the ingredients are read
     Course      six weeks drawn on a rule, and the arithmetic beside it
     More        the other nine, on the site's own Rail
     Reveal      generic [data-reveal] for anything not owned above
     Boot

   ONE FILE FOR ALL TEN PAGES. Nothing here is page-specific: every number it
   needs is read out of the markup, so a new infusion is an HTML file and no
   JavaScript at all.

   REQUIRES .page-drip on <body>. Bails instantly otherwise.
============================================================================= */


/* =============================================================================
   HELPERS
============================================================================= */
const PAGE = document.querySelector('.page-drip');

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const GSAP_ON = () => typeof window.gsap !== 'undefined';
const LIVE    = () => GSAP_ON() && !REDUCED;

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const debounce = (fn, ms = 150) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

/** Run a handler at most once per frame. */
const onFrame = (fn) => {
    let queued = false;
    return (...args) => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { fn(...args); queued = false; });
    };
};

/** $5,100 · $445.50 — cents only when there are cents. */
const money = (v) => '$' + (v % 1 ? v.toFixed(2) : Math.round(v).toLocaleString('en-US'));

/** Count a figure from where it currently sits to where it should be. */
const countTo = (el, to, format = money) => {
    if (!el) return;
    const from = parseFloat(el.dataset.at ?? 0);
    el.dataset.at = to;
    if (!LIVE()) { el.textContent = format(to); return; }
    const o = { v: from };
    gsap.killTweensOf(o);
    gsap.to(o, {
        v: to, duration: .9, ease: 'expo.out',
        onUpdate: () => { el.textContent = format(Math.round(o.v)); },
        onComplete: () => { el.textContent = format(to); },
    });
};

/** Set the start state once and tween TO the end state.
 *  gsap.from() rewrites its START values on every ScrollTrigger refresh, which
 *  is what strands elements at opacity 0 halfway down a page that grew after
 *  first paint. A trigger-owned `to` tween is immune to that and still fires
 *  when the page is jumped past the section rather than scrolled to it. */
const popIn = (targets, opts = {}, trigger, start = 'top 86%') => {
    const { y = 26, stagger = 0, ease = 'expo.out', duration = .8 } = opts;
    const els = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!els.length || !GSAP_ON()) return;
    if (REDUCED) { gsap.set(els, { opacity: 1, y: 0 }); return; }

    gsap.set(els, { opacity: 0, y });
    gsap.to(els, {
        opacity: 1, y: 0, duration, ease, stagger,
        scrollTrigger: { trigger: trigger || els[0], start, once: true },
    });
};

/** One shared scroll loop for every subscriber on this page.
 *  Three modules want scrollY. Three listeners means three layout reads per
 *  frame for the same number. */
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
   LINE — the gold IV line that threads the page
   -----------------------------------------------------------------------------
   The line is position:fixed and one viewport tall, so a fraction of its height
   is a fraction of the SCROLLABLE RANGE, not of the document. That is what lets
   the bead and the ports share one coordinate space: a port sits at the scroll
   progress at which its section arrives, so the bead is exactly on the port at
   the moment you reach that section.

   Ports are measured, not authored — each one comes from a [data-port] section,
   so re-ordering the page or adding a section needs nothing here.
============================================================================= */
class Line {
    constructor() {
        this.el    = $('#dxLine');
        this.fluid = $('#dxFluid');
        this.stops = [];
    }

    init() {
        if (!this.el) return;
        if (!window.matchMedia('(min-width: 1281px)').matches) return;

        this.build();
        Scroll.add(onFrame(() => this.read()));
        window.addEventListener('resize', debounce(() => { this.build(); this.read(); }, 200));
        if (document.fonts) document.fonts.ready.then(() => { this.build(); this.read(); });
    }

    /** the scrollable range, never zero */
    range() {
        return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    }

    build() {
        $$('.dx-line__port', this.el).forEach((p) => p.remove());
        this.stops = [];

        const range = this.range();
        // a section counts as "reached" a little before its top hits the top of
        // the window, which is when it actually starts reading as arrived
        const lead = window.innerHeight * 0.42;

        $$('[data-port]').forEach((sec) => {
            const top = sec.getBoundingClientRect().top + window.scrollY;
            const at  = clamp((top - lead) / range, 0, 1);

            const dot = document.createElement('span');
            dot.className = 'dx-line__port';
            dot.style.top = (at * 100).toFixed(3) + '%';
            dot.title = sec.getAttribute('data-port') || '';
            this.el.appendChild(dot);

            this.stops.push({ at, dot });
        });
    }

    read() {
        const run = clamp(window.scrollY / this.range(), 0, 1);
        this.el.style.setProperty('--dx-run', run.toFixed(4));
        for (const s of this.stops) s.dot.classList.toggle('is-passed', run >= s.at - 0.004);
    }
}


/* =============================================================================
   HERO — the name cuts in, the bag hangs, the drop falls
   -----------------------------------------------------------------------------
   The drop is the page's ambient motion and it is deliberately the ONLY thing
   moving on its own. The CSS keyframe covers the no-GSAP case; when GSAP is
   present the timeline takes over so the ripple in the pool can be fired at the
   exact frame the drop lands rather than guessed at with a second timer that
   would slowly drift out of phase.
============================================================================= */
class Hero {
    constructor() {
        this.el    = $('.dx-hero');
        this.lines = $$('.dx-cut__in', this.el ?? document);
        this.anims = $$('.dx-anim', this.el ?? document);
        this.tube  = $('#dxTube');
        this.drop  = $('#dxDrop');
        this.pool  = $('#dxPool');
        this.loop  = null;
    }

    init() {
        if (!this.el) return;

        this.measure();
        window.addEventListener('resize', debounce(() => this.measure(), 200));

        if (!LIVE()) {
            document.documentElement.classList.remove('dx-js');
            return;
        }

        // the entrance: the name cuts up through its mask, everything else
        // rises behind it
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        gsap.set(this.anims, { y: 16 });
        tl.to(this.lines, { y: 0, duration: 1.15, stagger: .09 }, .05)
          .to(this.anims, { opacity: 1, y: 0, duration: .85, stagger: .07 }, .35);

        this.fall();

        document.addEventListener('visibilitychange', () => {
            if (!this.loop) return;
            document.hidden ? this.loop.pause() : this.loop.resume();
        });
    }

    /** the drop has to travel exactly the length of the tube, and the tube is
     *  a clamp() that changes with the viewport */
    measure() {
        const h = this.tube ? this.tube.offsetHeight : 100;
        this.el.style.setProperty('--dx-drop', h + 'px');
        this.travel = h;
    }

    fall() {
        if (!this.drop || !this.tube) return;

        // the CSS keyframe was the fallback; GSAP owns it from here
        this.drop.style.animation = 'none';

        const ripple = () => {
            if (!this.pool) return;
            this.pool.classList.remove('is-hit');
            void this.pool.offsetWidth;          // restart the ripple keyframes
            this.pool.classList.add('is-hit');
        };

        this.loop = gsap.timeline({ repeat: -1, repeatDelay: .55, onRepeat: ripple });
        this.loop
            .set(this.drop, { y: 0, scale: .5, opacity: 0 })
            .to(this.drop, { opacity: 1, scale: 1, duration: .22, ease: 'power2.out' })
            .to(this.drop, {
                y: () => this.travel,
                scale: .84,
                duration: .78,
                ease: 'power2.in',
            })
            .to(this.drop, { opacity: 0, duration: .12 }, '-=0.1');
    }
}


/* =============================================================================
   VITALS — the four figures under the hero
   Only the ones marked [data-to] count; a duration like "3 h" is a string and
   is left exactly as it was typed.
============================================================================= */
class Vitals {
    constructor() { this.figs = $$('.dx-vital [data-to]'); }

    init() {
        if (!this.figs.length) return;
        if (!LIVE()) { this.figs.forEach((f) => { f.textContent = money(+f.dataset.to); }); return; }

        this.figs.forEach((f, i) => {
            f.dataset.at = 0;
            gsap.delayedCall(.75 + i * .09, () => countTo(f, +f.dataset.to));
        });
    }
}


/* =============================================================================
   THE BAG  —  THE SIGNATURE  (#composition)
   -----------------------------------------------------------------------------
   The bag fills as the ingredient list is read. Every band's share of the bag
   is declared once in the markup as data-h on the ingredient row, so the bag
   and the list can never disagree about how many things are in it, and a
   formulation with three components and one with ten both fill to exactly 100.

   THE MECHANIC. An IntersectionObserver watches the rows against a narrow band
   across the middle of the viewport. The row closest to the middle is active;
   every band up to and including it is in. No pin, no scrub, no scroll-jacking
   — a scaled band is one compositor property and the browser does the rest for
   free.

   ONE-WAY, DELIBERATELY. Bands do not drain when you scroll back up. A bag that
   empties while you re-read something you missed is a bag that is arguing with
   you. Only the highlight moves backwards.
============================================================================= */
class Bag {
    constructor() {
        this.scene = $('#composition');
        this.bag   = $('#dxBag');
        this.stack = $('#dxStack');
        this.rows  = $$('.dx-ing', this.scene ?? document);
        this.read  = $('#dxFill');
        this.bands = [];
        this.high  = -1;      // the highest row reached so far
        this.at    = -1;      // the row currently highlighted
        this.io    = null;
    }

    init() {
        if (!this.scene || !this.stack || !this.rows.length) return;

        this.build();

        if (!LIVE() || !('IntersectionObserver' in window)) { this.fill(this.rows.length - 1); return; }

        popIn($$('.dx-mix__head > *', this.scene), { y: 24, stagger: .08 }, '.dx-mix__head', 'top 86%');
        popIn([$('.dx-mix__close', this.scene)], { y: 26 }, '.dx-mix__close', 'top 90%');

        this.watch();
    }

    /** one band per ingredient row, in the row's own tone, sized by its share */
    build() {
        this.stack.innerHTML = '';
        this.bands = [];

        // shares are normalised, so the markup can use any numbers it likes and
        // the bag still ends up exactly full
        const shares = this.rows.map((r) => Math.max(0.5, parseFloat(r.dataset.h) || 1));
        const total  = shares.reduce((a, b) => a + b, 0);

        this.rows.forEach((row, i) => {
            const pct  = (shares[i] / total) * 100;
            const tone = row.dataset.tone || '';

            const band = document.createElement('i');
            band.className = 'dx-band';
            band.style.setProperty('--h', pct.toFixed(3) + '%');
            if (tone) band.style.setProperty('--bt', tone);
            this.stack.appendChild(band);

            if (tone) row.style.setProperty('--bt', tone);
            this.bands.push({ el: band, pct });
        });
    }

    watch() {
        this.io = new IntersectionObserver((entries) => {
            let best = null;
            for (const en of entries) {
                if (!en.isIntersecting) continue;
                if (!best || en.intersectionRatio > best.intersectionRatio) best = en;
            }
            if (!best) return;
            const i = this.rows.indexOf(best.target);
            if (i >= 0) this.fill(i);
        }, {
            // a band across the middle of the viewport: a row is active while it
            // is the one you are actually looking at, not when it first appears
            rootMargin: '-42% 0px -42% 0px',
            threshold: [0, .25, .5, 1],
        });

        this.rows.forEach((r) => this.io.observe(r));
    }

    fill(i) {
        if (i === this.at) return;
        this.at = i;
        this.high = Math.max(this.high, i);

        this.rows.forEach((r, n) => r.classList.toggle('is-active', n === i));

        let sum = 0;
        this.bands.forEach((b, n) => {
            const inBag = n <= this.high;
            b.el.classList.toggle('is-in', inBag);
            b.el.classList.toggle('is-active', n === i);
            if (inBag) sum += b.pct;
        });

        this.bag?.style.setProperty('--dx-fill', (sum / 100).toFixed(4));
        if (this.read) this.read.textContent = Math.round(sum);
    }
}


/* =============================================================================
   THE COURSE  (#course)
   The rule draws once on arrival and each week lights as the fill reaches it.
   Horizontal above 780px and vertical below, so the fill animates whichever
   axis the media query is currently using — and redraws when that flips, or a
   rotation would leave a fully-drawn rule with a 0% bar on the new axis.

   Every figure is derived from two numbers on the section — the single rate and
   the number of sessions — so the arithmetic on the page can never drift away
   from the arithmetic on the menu.
============================================================================= */
class Course {
    constructor() {
        this.el     = $('#course');
        this.list   = $('#dxWeeks');
        this.weeks  = $$('.dx-wk', this.list ?? document);
        this.fill   = $('.dx-weeks__fill', this.el ?? document);
        this.bars   = $$('.dx-sum__bar i', this.el ?? document);
        this.single = $('#dxSingle');
        this.total  = $('#dxTotal');
        this.keep   = $('#dxKeep');
        this.drawn  = false;
    }

    init() {
        if (!this.el) return;

        this.sums();

        if (!LIVE()) {
            this.weeks.forEach((w) => w.classList.add('is-on'));
            if (this.fill) { this.fill.style.width = '100%'; this.fill.style.height = '100%'; }
            return;
        }

        ScrollTrigger.create({
            trigger: this.list || this.el,
            start: 'top 76%',
            once: true,
            onEnter: () => { this.drawn = true; this.draw(); },
        });

        popIn($$('.dx-course__head > *', this.el), { y: 24, stagger: .08 }, '.dx-course__head', 'top 86%');
        popIn([$('.dx-sum__box', this.el), $('.dx-sum__why', this.el)],
              { y: 30, stagger: .1, duration: .9 }, '.dx-sum', 'top 84%');

        const mq = window.matchMedia('(max-width: 780px)');
        const flip = () => { if (this.drawn) this.draw(); };
        mq.addEventListener ? mq.addEventListener('change', flip) : mq.addListener(flip);
    }

    /** the money, worked out from the two numbers on the section */
    sums() {
        const one  = parseFloat(this.el.dataset.single);
        const n    = parseInt(this.el.dataset.sessions, 10) || 6;
        const off  = parseFloat(this.el.dataset.discount) || 0.10;
        if (!isFinite(one)) return;

        const full = one * n;
        const cut  = Math.round(full * (1 - off) * 100) / 100;

        const paint = () => {
            countTo(this.single, full);
            countTo(this.total, cut);
            countTo(this.keep, full - cut);
            if (this.bars.length === 2) {
                this.bars[0].style.width = '100%';
                this.bars[1].style.width = ((cut / full) * 100).toFixed(1) + '%';
            }
        };

        if (!LIVE()) { paint(); return; }

        ScrollTrigger.create({
            trigger: '.dx-sum', start: 'top 78%', once: true, onEnter: paint,
        });
    }

    /** fill the rule and light each week as it is passed */
    draw() {
        if (!this.fill || !this.weeks.length) return;

        const vertical = window.matchMedia('(max-width: 780px)').matches;
        const axis = vertical ? 'height' : 'width';
        // clear the other axis, or a flip strands the old one at 100%
        this.fill.style[vertical ? 'width' : 'height'] = '';

        const span = { v: 0 };
        gsap.killTweensOf(span);
        gsap.to(span, {
            v: 100,
            duration: 1.7,
            ease: 'power2.inOut',
            onUpdate: () => {
                this.fill.style[axis] = span.v.toFixed(1) + '%';
                this.weeks.forEach((w, i) => {
                    w.classList.toggle('is-on', span.v >= (i / this.weeks.length) * 100);
                });
            },
        });
    }
}


/* =============================================================================
   THE OTHER NINE  (#more)
   Not a fourth carousel. script.js already exports its Rail engine on
   window.AVE, and this is the same native snap track the shelf and the
   evidence rail use — arrows, counter, meter, keyboard and drag included.

   If script.js somehow has not run, the track is still a scrollable snap rail
   because the CSS says so; only the arrows and the counter go quiet.
============================================================================= */
class More {
    constructor() {
        this.track = $('#dxMoreTrack');
        this.rail  = null;
    }

    init() {
        if (!this.track) return;

        const Rail = window.AVE?.Rail;
        const total = $('#dxMoreTotal');
        const n = $$('.dx-nxt', this.track).length;

        if (REDUCED || typeof Rail !== 'function') {
            if (total) total.textContent = String(n).padStart(2, '0');
            $('#dxMorePrev')?.setAttribute('hidden', '');
            $('#dxMoreNext')?.setAttribute('hidden', '');
            return;
        }

        this.rail = new Rail({
            track: this.track,
            item: '.dx-nxt',
            prev: $('#dxMorePrev'),
            next: $('#dxMoreNext'),
            now:  $('#dxMoreNow'),
            total,
            meter: $('#dxMoreMeter'),
            drag: true,
        });
        this.rail.mount();

        popIn($$('.dx-nxt', this.track), { y: 24, stagger: .05, duration: .6 }, '.dx-more__rail', 'top 90%');
    }
}


/* =============================================================================
   REVEAL — generic, for anything the modules above do not own
============================================================================= */
class Reveal {
    init() {
        const els = $$('[data-reveal]', PAGE ?? document);
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
        }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

        els.forEach((el, i) => {
            const sibs = $$('[data-reveal]', el.parentElement)
                .filter((s) => s.parentElement === el.parentElement);
            const idx = sibs.indexOf(el);
            if (idx > 0) el.style.transitionDelay = `${Math.min(idx * .07, .35)}s`;
            io.observe(el);
        });
    }
}


/* =============================================================================
   BOOT
============================================================================= */
const modules = {
    line:   new Line(),
    hero:   new Hero(),
    vitals: new Vitals(),
    bag:    new Bag(),
    course: new Course(),
    more:   new More(),
    reveal: new Reveal(),
};

/** Nothing in this file is worth hiding the page for. */
const release = () => {
    document.documentElement.classList.remove('dx-js');
    document.body.classList.add('is-ready');
};

const boot = () => {
    if (!PAGE) return;

    if (GSAP_ON()) gsap.registerPlugin(ScrollTrigger);

    Object.values(modules).forEach((m) => {
        try { m.init(); }
        catch (err) { console.error(`[AVE·DX] ${m.constructor?.name || 'module'} failed to start`, err); release(); }
    });

    /* the bag PNG and three webfonts land after first paint and change the
       height of the document. Any trigger measured before that was measured
       against a shorter page — which is exactly why a section further down
       stops firing, or fires at the wrong moment, as the page grows. */
    if (GSAP_ON()) {
        const refresh = debounce(() => {
            ScrollTrigger.refresh();
            // the page just got taller or shorter — every port moved with it
            if (modules.line.stops.length) { modules.line.build(); modules.line.read(); }
        }, 140);

        if (document.fonts) document.fonts.ready.then(refresh);
        window.addEventListener('load', refresh);

        let lastW = window.innerWidth;
        window.addEventListener('resize', debounce(() => {
            if (window.innerWidth === lastW) return;   // height only = the address bar
            lastW = window.innerWidth;
            ScrollTrigger.refresh();
        }, 260));

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

    /* NOT called unconditionally here. release() drops .dx-js, and .dx-js is
       what holds the hero at opacity 0 — pulling it the same tick the hero
       timeline is built means the tween runs from 1 to 1 and the entrance is
       silently lost. Hero removes it itself when there is no GSAP; otherwise
       GSAP's own inline styles are already doing the job. This is only the
       failsafe, in case a module threw before painting anything. */
    setTimeout(release, 3000);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

// handy in the console while the other nine get built
window.AVEDX = { modules, boot, helpers: { $, $$, clamp, money, countTo, debounce, onFrame } };
