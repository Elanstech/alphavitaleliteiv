/* =============================================================================
   ALPHA VITAL ELITE IV — INFUSIONS.JS  (ES6 module)
   -----------------------------------------------------------------------------
   Loaded with <script type="module"> AFTER /script.js, and shares its GSAP +
   ScrollTrigger from the CDN. Same shape as the site script: every class
   feature-detects, no-ops when its elements are absent, and degrades to a
   static readable page without GSAP.

     Helpers
     Rack        the ten bags hanging in the hero, each on its own arc
     MENU        the ten, by id
     COMPOUNDS   the component index, and where each one appears
     Hero        masked lines, the counters
     Ticker      the running index under the hero
     Cabinet     the menu list and its chair-time filter
     Compounds   the component index panel
     Boot

   REQUIRES .page-infusions on <body>. Bails instantly otherwise.
============================================================================= */


/* =============================================================================
   HELPERS
============================================================================= */
const PAGE = document.querySelector('.page-infusions');

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const GSAP_ON = () => typeof window.gsap !== 'undefined';
const LIVE = () => GSAP_ON() && !REDUCED;

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

/** $2,430 · $445.50 — cents only when there are cents. */
const money = (v) => '$' + (v % 1 ? v.toFixed(2) : Math.round(v).toLocaleString('en-US'));

/** Count a number element from where it is to where it should be. */
const countTo = (el, to, format = money) => {
    const from = parseFloat(el.dataset.at ?? to);
    el.dataset.at = to;
    if (!LIVE()) { el.textContent = format(to); return; }
    const o = { v: from };
    gsap.killTweensOf(o);
    gsap.to(o, {
        v: to, duration: .75, ease: 'expo.out',
        onUpdate: () => { el.textContent = format(Math.round(o.v)); },
        onComplete: () => { el.textContent = format(to); },
    });
};

/** Set the start state once and tween TO the end state — a ScrollTrigger
 *  refresh cannot strand these at opacity 0 the way gsap.from() can. */
const popIn = (targets, opts = {}, trigger, start = 'top 86%') => {
    const { y = 28, stagger = 0, ease = 'expo.out', duration = .8 } = opts;
    const els = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!els.length || !GSAP_ON()) return;
    if (REDUCED) { gsap.set(els, { opacity: 1, y: 0 }); return; }

    gsap.set(els, { opacity: 0, y });
    gsap.to(els, {
        opacity: 1, y: 0, duration, ease, stagger,
        scrollTrigger: { trigger: trigger || els[0], start, once: true },
    });
};


/* =============================================================================
   THE MENU — the ten, by id
   Names, numerals and slugs match the cards and the header flyout exactly.
============================================================================= */
const MENU = {
    healthyaging: { no: 'I',    name: 'GLyNAC Healthy Aging', slug: '/drips/glynac.html',          tone: '#5B7098' },
    immune:       { no: 'II',   name: 'Immun-O-Boost IV Support',     slug: '/drips/immun-o-boost.html',         tone: '#D9982A' },
    muscle:       { no: 'III',  name: 'LIQUIXO Muscle Recovery',      slug: '/drips/liquixo.html',        tone: '#B34E37' },
    antioxidant:  { no: 'IV',   name: 'Antioxidant ×3 Reset',         slug: '/drips/antioxidant.html',    tone: '#4F7D5E' },
    glutathione:  { no: 'V',    name: 'Glutathione IV Injection',     slug: '/drips/glutathione.html', tone: '#7FA08C' },
    jointskin:    { no: 'VI',   name: 'Joint & Skin Wellness',        slug: '/drips/joint-skin.html',    tone: '#8C6239' },
    liver:        { no: 'VII',  name: 'Fatty Liver Support',          slug: '/drips/fatty-liver-support.html',          tone: '#5F7A55' },
    recovery:     { no: 'VIII', name: 'Revive IV Support',            slug: '/drips/revive.html',       tone: '#35707F' },
    mind:         { no: 'IX',   name: 'Stress & Brain Wellness',      slug: '/drips/stress-brain.html',     tone: '#7A5F98' },
    custom:       { no: 'X',    name: 'Customized IV Infusion',       slug: '/drips/customized.html',    tone: '#C1963F' },
};


/* =============================================================================
   THE COMPONENT INDEX
   -----------------------------------------------------------------------------
   `in` lists only the formulations where the component is NAMED on the printed
   ingredient list. Nothing is inferred, and no line here says what an infusion
   will do — every entry states what the compound is involved in.
============================================================================= */
const COMPOUNDS = [
    { id: 'glutathione', name: 'Glutathione', ghost: 'Gl',
      what: 'A major intracellular antioxidant. Given directly in some formulations, and supported in others through the compounds the body builds it from.',
      in: ['immune', 'antioxidant', 'glutathione', 'jointskin', 'liver', 'recovery'] },

    { id: 'vitaminc', name: 'Vitamin C', ghost: 'C',
      what: 'An antioxidant that is also required for normal collagen production — which is why it appears beside the collagen amino acids as well as in the antioxidant formulations.',
      in: ['immune', 'antioxidant', 'jointskin', 'liver', 'recovery'] },

    { id: 'ala', name: 'Alpha-Lipoic Acid', ghost: 'ALA',
      what: 'Works in mitochondrial energy metabolism and inside the antioxidant network, where it and glutathione recharge one another rather than working alone.',
      in: ['antioxidant', 'jointskin', 'liver', 'recovery', 'mind'] },

    { id: 'bcomplex', name: 'B-Complex', ghost: 'B',
      what: 'B1 through B12, involved in normal energy metabolism and in the production of neurotransmitters. B12 is taken up in the ileum, the stretch of bowel that malabsorption most often involves.',
      in: ['immune', 'jointskin', 'liver', 'recovery', 'mind'] },

    { id: 'aminos', name: 'Amino Acids', ghost: 'AA',
      what: 'Building blocks that reduced intake, long flares and weight-loss programs leave short. LIQUIXO carries a full twenty; the collagen set is glycine, proline and lysine.',
      in: ['immune', 'muscle', 'jointskin', 'recovery'] },

    { id: 'nac', name: 'N-Acetylcysteine', ghost: 'NAC',
      what: 'Supplies cysteine — one of the three amino acids the body needs to make glutathione, and usually the one in shortest supply.',
      in: ['healthyaging', 'jointskin', 'liver'] },

    { id: 'minerals', name: 'Magnesium & Trace Minerals', ghost: 'Mg',
      what: 'Magnesium with copper, manganese and selenium. Cofactors the rest of a formulation depends on — zinc and copper are kept in ratio, since excess zinc interferes with copper absorption.',
      in: ['immune', 'jointskin', 'liver'] },

    { id: 'glycine', name: 'Glycine', ghost: 'Gly',
      what: 'The second building component of glutathione, and one of the amino acids the liver uses to prepare bile.',
      in: ['healthyaging', 'liver'] },

    { id: 'taurine', name: 'Taurine', ghost: 'Tau',
      what: 'An amino acid involved in the liver\u2019s normal bile work, and present in the brain in high concentration.',
      in: ['liver', 'mind'] },

    { id: 'zinc', name: 'Zinc', ghost: 'Zn',
      what: 'Supports hundreds of enzymes, immune-cell communication and normal tissue repair. Low zinc is documented in inflammatory bowel disease.',
      in: ['immune'] },
];


/* =============================================================================
   HERO
============================================================================= */
class Hero {
    constructor() {
        this.el     = $('.ivx-hero');
        this.lines  = $$('.ivx-mask__in');
        this.anims  = $$('.ivx-anim');
        this.counts = $$('[data-count]');
    }

    init() {
        if (!this.el) return;

        if (!LIVE()) {
            document.documentElement.classList.remove('has-js');
            this.counts.forEach((el) => { el.textContent = el.dataset.count; });
            return;
        }

        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        gsap.set(this.anims, { y: 18 });
        tl.to(this.lines, { y: 0, duration: 1.2, stagger: .1 }, .1)
          .to(this.anims, { opacity: 1, y: 0, duration: .9, stagger: .08 }, .4);

        this.counts.forEach((el, i) => {
            const end = +el.dataset.count;
            const o = { v: 0 };
            gsap.to(o, {
                v: end, duration: 1.5, ease: 'expo.out', delay: .95 + i * .08,
                onUpdate: () => { el.textContent = Math.round(o.v); },
            });
        });
    }
}


/* =============================================================================
   TICKER — the running index
   Two identical sets sit side by side; the row travels exactly one set width,
   so the loop has no seam. Slows to a crawl under the pointer.
============================================================================= */
class Ticker {
    constructor() {
        this.row = $('#ivxTicker');
        this.roll = null;
    }

    init() {
        if (!this.row || !LIVE()) return;

        this.roll = gsap.to(this.row, { xPercent: -50, duration: 46, ease: 'none', repeat: -1 });

        this.row.addEventListener('pointerenter', () => gsap.to(this.roll, { timeScale: .18, duration: .5 }));
        this.row.addEventListener('pointerleave', () => gsap.to(this.roll, { timeScale: 1, duration: .5 }));

        document.addEventListener('visibilitychange', () => {
            if (!this.roll) return;
            document.hidden ? this.roll.pause() : this.roll.resume();
        });
    }
}


/* =============================================================================
   BAR — the console
   -----------------------------------------------------------------------------
   The console is position:sticky, but a fixed offset is wrong on this site: the
   site header condenses at 40px and retreats entirely on the way down, so a bar
   parked at the full header height floats with a gap under it half the time.

   --ivx-top is written here instead, from the header's own state, and the CSS
   transitions to it — the console tucks under the header while it is showing
   and rides up to the top edge the moment it leaves. `is-stuck` fires when the
   bar has actually reached its offset, which is what tightens the padding and
   lifts the shadow off the cards behind it.

   Below 900px the CSS makes the bar static and this all becomes inert.
============================================================================= */
/* =============================================================================
   THE CABINET  (#cabinet)
   -----------------------------------------------------------------------------
   Four controls, one state object, one code path. View, chair time and order
   route through one measure-filter-slide pass, so the list can never animate
   two different ways.

   The ledger is not a second component — it is the same cards under a different
   grid, which is why the switch can animate between the two at all.
============================================================================= */
class Cabinet {
    constructor() {
        this.scene = $('.ivx-menu');
        this.list  = $('#mnList');
        this.rows  = this.list ? $$('.mn__row', this.list) : [];
        this.count = $('#mnCount');
        this.empty = $('#mnEmpty');
        this.chips = $$('.mn__chip');
        this.at    = 'all';
    }

    init() {
        if (!this.list || !this.rows.length) return;

        if (this.count) this.count.dataset.at = this.live().length;

        this.chips.forEach((c) => c.addEventListener('click', () => this.band(c.dataset.band)));
        if (this.empty) {
            $$('button[data-band]', this.empty)
                .forEach((b) => b.addEventListener('click', () => this.band(b.dataset.band)));
        }

        if (!GSAP_ON() || REDUCED) return;
        this.reveal();
    }

    live() { return this.rows.filter((r) => !r.classList.contains('is-out')); }

    /** Measure, filter, then slide the survivors from where they were to where
     *  they now are. A hidden row has a zero rect, so anything arriving from
     *  behind the filter fades up instead of travelling from nowhere. */
    band(next) {
        if (!next || next === this.at) return;
        this.at = next;

        this.chips.forEach((c) => c.classList.toggle('is-on', c.dataset.band === next));

        const before = this.rows.map((r) => r.getBoundingClientRect());

        this.rows.forEach((r) => {
            r.classList.toggle('is-out', !(next === 'all' || r.dataset.band === next));
        });

        this.tally();
        if (!LIVE()) return;

        const after = this.rows.map((r) => r.getBoundingClientRect());

        this.rows.forEach((r, i) => {
            if (r.classList.contains('is-out')) return;
            gsap.killTweensOf(r);

            if (before[i].height === 0) {
                gsap.fromTo(r, { opacity: 0, y: 18 },
                    { opacity: 1, y: 0, duration: .6, ease: 'expo.out', clearProps: 'all' });
                return;
            }
            const dy = before[i].top - after[i].top;
            if (Math.abs(dy) < 1) return;
            gsap.fromTo(r, { y: dy },
                { y: 0, duration: .7, ease: 'expo.out', clearProps: 'transform' });
        });

        if (GSAP_ON()) ScrollTrigger.refresh();
    }

    tally() {
        const n = this.live().length;
        if (this.count) countTo(this.count, n, (v) => String(Math.round(v)));
        this.empty?.classList.toggle('is-on', n === 0);
    }

    /* ---------- the list writes itself in, line by line ---------- */
    reveal() {
        const lines = $$('.mn__title span > i', this.scene);
        if (lines.length) {
            gsap.set(lines, { yPercent: 108 });
            gsap.to(lines, {
                yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: .1,
                scrollTrigger: { trigger: '.mn__head', start: 'top 88%', once: true },
            });
        }

        popIn($$('.ivx-eyebrow, .mn__lede', this.scene), { y: 20, stagger: .08 },
            '.mn__head', 'top 86%');

        gsap.set(this.rows, { opacity: 0, y: 26 });
        ScrollTrigger.create({
            trigger: this.list, start: 'top 86%', once: true,
            onEnter: () => gsap.to(this.rows, {
                opacity: 1, y: 0, duration: .8, ease: 'expo.out',
                stagger: .06, clearProps: 'transform',
            }),
        });
    }
}


/* =============================================================================
   THE COMPONENT INDEX  (#compounds)
   The panel is rewritten in place rather than rebuilt as a list of panels —
   ten hidden copies of the same block is a lot of DOM for one visible answer.
   The markup ships with the first compound already written into it, so this
   section reads correctly with the script absent.
============================================================================= */
class Compounds {
    constructor() {
        this.scene = $('.ivx-idx');
        this.rail  = $('#wlKeys');
        this.keys  = $$('.wl__key');
        this.bags  = $$('.wl__bag');
        this.panel = $('#wlPanel');
        this.name  = $('#wlName');
        this.what  = $('#wlWhat');
        this.count = $('#wlCount');
        this.title = $('#ivxIdxTitle');
        this.at    = -1;
        this.WORDS = ['zero', 'one', 'two', 'three', 'four', 'five',
                      'six', 'seven', 'eight', 'nine', 'ten'];
    }

    init() {
        if (!this.scene || !this.keys.length || !this.panel) return;

        this.keys.forEach((key, i) => {
            key.addEventListener('click', () => this.show(i));
            key.addEventListener('keydown', (e) => {
                const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
                if (!step) return;
                e.preventDefault();
                const n = (i + step + this.keys.length) % this.keys.length;
                this.show(n);
                this.keys[n].focus();
            });
        });

        this.light(COMPOUNDS[0], true);
        this.at = 0;

        if (!GSAP_ON() || REDUCED) return;
        this.reveal();
    }

    meters() { return $$('.wl__meter i', this.rail); }

    /* ---------- which bags carry the live component ---------- */
    light(c, instant = false) {
        const has = new Set(c.in);

        this.bags.forEach((b) => {
            const on = has.has(b.dataset.id);
            b.classList.toggle('is-in', on);
            b.classList.toggle('is-past', !on);
        });

        if (instant || !LIVE()) return;

        // the lit bags settle in sequence rather than all at once
        const lit = this.bags.filter((b) => b.classList.contains('is-in'));
        gsap.killTweensOf(lit);
        gsap.fromTo(lit, { y: 4, scale: .97 },
            { y: 0, scale: 1, duration: .55, ease: 'expo.out', stagger: .04, clearProps: 'all' });
    }

    /* ---------- scroll choreography ---------- */
    reveal() {
        const lines = $$('.ivx-idx__title span > i', this.scene);
        if (lines.length) {
            gsap.set(lines, { yPercent: 108 });
            gsap.to(lines, {
                yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: .1,
                scrollTrigger: { trigger: this.title, start: 'top 88%', once: true },
            });
        }

        popIn($$('.ivx-eyebrow, .ivx-idx__lede', this.scene), { y: 20, stagger: .08 },
            '.ivx-idx__head', 'top 86%');
        popIn([this.panel], { y: 30, duration: .9 }, '.wl__panel', 'top 90%');

        // the shelf loads left to right, like bags being set down
        gsap.set(this.bags, { opacity: 0, y: 22 });
        ScrollTrigger.create({
            trigger: '.wl__bags', start: 'top 88%', once: true,
            onEnter: () => gsap.to(this.bags, {
                opacity: 1, y: 0, duration: .75, ease: 'expo.out',
                stagger: .05, clearProps: 'transform',
            }),
        });

        gsap.set(this.keys, { opacity: 0, x: -12 });
        gsap.set(this.meters(), { scaleX: 0 });
        ScrollTrigger.create({
            trigger: this.rail, start: 'top 90%', once: true,
            onEnter: () => {
                gsap.to(this.keys, {
                    opacity: 1, x: 0, duration: .6, ease: 'expo.out',
                    stagger: .04, clearProps: 'transform',
                });
                gsap.to(this.meters(), {
                    scaleX: 1, duration: 1.1, ease: 'expo.out', stagger: .04, delay: .1,
                });
            },
        });
    }

    show(i) {
        if (i === this.at) return;
        const c = COMPOUNDS[i];
        if (!c) return;
        this.at = i;

        this.keys.forEach((k, x) => {
            const on = x === i;
            k.classList.toggle('is-on', on);
            k.setAttribute('aria-selected', on ? 'true' : 'false');
            k.tabIndex = on ? 0 : -1;
        });

        this.panel.setAttribute('aria-labelledby', this.keys[i].id);

        // the first lit bag lends the panel its tone
        const first = this.bags.find((b) => b.dataset.id === c.in[0]);
        const tone = first && first.style.getPropertyValue('--tone').trim();
        if (tone) this.panel.style.setProperty('--tone', tone);

        const key = this.keys[i];
        if (key.scrollIntoView && this.rail && this.rail.scrollWidth > this.rail.clientWidth) {
            key.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        }

        this.name.textContent = c.name;
        this.what.textContent = c.what;
        if (this.count) this.count.textContent = this.WORDS[c.in.length] || c.in.length;

        this.light(c);

        if (!LIVE()) return;
        gsap.killTweensOf([this.name, this.what]);
        gsap.fromTo([this.name, this.what], { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: .5, ease: 'expo.out', stagger: .05 });
    }
}


/* =============================================================================
   THE RACK — the ten hanging in the hero
   -----------------------------------------------------------------------------
   Each bag swings from its own hook on its own timing, so the row never reads
   as one synchronised animation. The drop-in runs once on load; the sway runs
   forever, and both are skipped outright under reduced motion.
============================================================================= */
class Rack {
    constructor() {
        this.el    = $('#ivxRack');
        this.row   = $('#ivxRackRow');
        this.lifts = $$('.rk__lift');
    }

    init() {
        if (!this.el || !this.lifts.length || !LIVE()) return;

        // the bags drop onto the wire, then never stop moving
        gsap.set(this.lifts, { opacity: 0, y: -26, rotate: 0 });
        gsap.to(this.lifts, {
            opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .06,
            scrollTrigger: { trigger: this.el, start: 'top 92%', once: true },
            onComplete: () => this.sway(),
        });

        // the whole rail drifts a little against the scroll
        gsap.to(this.row, {
            yPercent: -6, ease: 'none',
            scrollTrigger: { trigger: this.el, start: 'top bottom', end: 'bottom top', scrub: .8 },
        });
    }

    sway() {
        this.lifts.forEach((el, i) => {
            const swing = 1.1 + (i % 3) * .35;          // never the same arc twice
            gsap.to(el, {
                rotate: swing, transformOrigin: '50% 0%',
                duration: 2.6 + (i % 4) * .45,
                ease: 'sine.inOut', yoyo: true, repeat: -1,
                startAt: { rotate: -swing },
                delay: i * .14,
            });
        });
    }
}


/* =============================================================================
   THE PROGRAM  (#program)
   Six sessions of the same formulation at ten percent under the single rate.
   Every figure is derived from the two rates on the button, so the arithmetic
   can never drift away from the menu.
============================================================================= */
/* =============================================================================
   BOOT
============================================================================= */
const modules = {
    hero:      new Hero(),
    ticker:    new Ticker(),
    cabinet:   new Cabinet(),
    rack:      new Rack(),
    compounds: new Compounds(),
};

/** Nothing in this file is worth hiding the page for. */
const release = () => {
    document.documentElement.classList.remove('has-js');
    document.body.classList.add('is-ready');
};

const boot = () => {
    if (!PAGE) return;

    if (GSAP_ON()) gsap.registerPlugin(ScrollTrigger);

    Object.values(modules).forEach((m) => {
        try { m.init(); }
        catch (err) { console.error(`[AVE·IX] ${m.constructor?.name || 'module'} failed to start`, err); release(); }
    });

    /* The bag PNGs and three webfonts land after first paint and change the
       height of the document. Any trigger measured before that was measured
       against a shorter page — refresh once the type settles, once every image
       is in, and again when a resize has actually changed the WIDTH. */
    if (GSAP_ON()) {
        const refresh = debounce(() => ScrollTrigger.refresh(), 140);

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
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

/* =============================================================================
   BACK NAVIGATION — the bfcache
   -----------------------------------------------------------------------------
   A filter move writes an inline transform on the surviving rows and only
   clears it when the tween finishes. Click through to a drip page while that
   is still running and the row travels into the back/forward cache holding it.

   Coming back does not re-run boot() — DOMContentLoaded has already fired for
   this document — so nothing clears it. The grid has meanwhile settled at its
   filtered height, and the stranded cards sit on top of whatever follows.

   So: leave clean on the way out, and re-measure on the way back in.
============================================================================= */
addEventListener('pagehide', () => {
    if (!GSAP_ON()) return;
    const rows = $$('.mn__row');
    if (!rows.length) return;
    gsap.killTweensOf(rows);
    gsap.set(rows, { clearProps: 'transform' });
});

/* =============================================================================
   BACK NAVIGATION
   -----------------------------------------------------------------------------
   Coming back from a drip page does not re-run boot() — DOMContentLoaded has
   already fired for this document, so the page returns from the back/forward
   cache with every inline style, every GSAP tween and every ScrollTrigger
   measurement exactly as they were left. Whatever state that leaves behind, a
   rebuild is correct by construction. Fired synchronously so the stale frame
   never paints.
============================================================================= */
addEventListener('pageshow', (e) => {
    const restored = e.persisted ||
        performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    if (restored) location.reload();
});


// handy in the console while the ten protocol pages get built
window.AVEIX = { modules, boot, MENU, COMPOUNDS, helpers: { $, $$, clamp, money, countTo, debounce, onFrame } };
