/* =============================================================================
   ALPHA VITAL ELITE IV — INFUSIONS.JS  (ES6 module)
   -----------------------------------------------------------------------------
   Loaded with <script type="module"> AFTER /script.js, and shares its GSAP +
   ScrollTrigger from the CDN. Same shape as the site script: every class
   feature-detects, no-ops when its elements are absent, and degrades to a
   static readable page without GSAP.

     Helpers
     Flip        measure · mutate · animate — the one layout engine
     MENU        the ten, by id
     COMPOUNDS   the component index, and where each one appears
     Hero        masked lines, the counters
     Ticker      the running index under the hero
     Bar         the console — pins under the header and rides up with it
     Cabinet     view · chair time · order · pricing, all through Flip
     Tilt        cards lean toward the pointer (fine pointers only)
     DripLine    the gold line beside the menu, drawn by scroll
     Compounds   the component index panel
     Program     six sessions, and what the program rate does to them
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
   FLIP — measure, mutate, animate
   -----------------------------------------------------------------------------
   Every control in the cabinet does the same three things: read where the cards
   are, change the DOM, then move them from the old position to the new one. One
   engine, so the view switch, the filter and the sort can never behave
   differently from one another.

   Cards hidden by the filter are skipped rather than tweened — a display:none
   element has a zero rect, and animating from it throws every card across the
   viewport. Anything arriving into view fades up instead.
============================================================================= */
const Flip = {
    seen(el) { return el.offsetParent !== null; },

    run(cards, mutate, opts = {}) {
        const box = opts.box || null;

        if (!cards.length || !LIVE()) { mutate(); opts.onDone?.(); return; }

        gsap.killTweensOf(cards);
        gsap.set(cards, { x: 0, y: 0 });
        if (box) { gsap.killTweensOf(box); gsap.set(box, { clearProps: 'height' }); }

        const h0 = box ? box.offsetHeight : 0;
        const before = cards.map((el) => ({ on: this.seen(el), rect: el.getBoundingClientRect() }));

        mutate();

        const after = cards.map((el) => ({ on: this.seen(el), rect: el.getBoundingClientRect() }));
        const h1 = box ? box.offsetHeight : 0;

        if (box && h0 !== h1) {
            gsap.fromTo(box, { height: h0 }, {
                height: h1, duration: .7, ease: 'expo.out', clearProps: 'height',
                onComplete: () => opts.onDone?.(),
            });
        } else {
            opts.onDone?.();
        }

        cards.forEach((el, i) => {
            const was = before[i];
            const now = after[i];
            if (!now.on) return;

            // arriving from behind a filter — nowhere to travel from
            if (!was.on) {
                gsap.fromTo(el, { opacity: 0, y: 22 },
                    { opacity: 1, y: 0, duration: .6, ease: 'expo.out', delay: .06 });
                return;
            }

            const dx = was.rect.left - now.rect.left;
            const dy = was.rect.top  - now.rect.top;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

            gsap.fromTo(el, { x: dx, y: dy },
                { x: 0, y: 0, duration: .8, ease: 'expo.out', clearProps: 'transform' });
        });

        // a soft dip while the contents change shape underneath the move
        gsap.fromTo(cards.map((c) => $('.ivx-card__in', c)),
            { opacity: .32 },
            { opacity: 1, duration: .55, ease: 'power2.out', stagger: .015, overwrite: true });
    },
};


/* =============================================================================
   THE MENU — the ten, by id
   Names, numerals and slugs match the cards and the header flyout exactly.
============================================================================= */
const MENU = {
    healthyaging: { no: 'I',    name: 'GLyNAC Longevity Restoration', slug: '/drips/glynac.html',          tone: '#5B7098' },
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
class Bar {
    constructor() {
        this.el   = $('#ivxBar');
        this.head = $('#head');
        this.mq   = window.matchMedia('(min-width: 901px)');
        this.gap  = 8;
        this.top  = 0;
    }

    init() {
        if (!this.el) return;

        this.sync();
        this.watch();

        if (this.head) {
            new MutationObserver(() => this.sync())
                .observe(this.head, { attributes: true, attributeFilter: ['class'] });
        }

        window.addEventListener('resize', debounce(() => this.sync(), 160));
    }

    /** where the console should park right now */
    sync() {
        if (!this.mq.matches) { this.top = 0; return; }

        const hidden = this.head?.classList.contains('is-hidden');
        const h = this.head ? this.head.offsetHeight : 0;

        this.top = hidden ? 10 : h + this.gap;
        this.el.style.setProperty('--ivx-top', this.top + 'px');
    }

    /** has it reached that park yet */
    watch() {
        const read = onFrame(() => {
            if (!this.mq.matches) { this.el.classList.remove('is-stuck'); return; }
            const top = this.el.getBoundingClientRect().top;
            this.el.classList.toggle('is-stuck', top <= this.top + 1);
        });

        window.addEventListener('scroll', read, { passive: true });
        read();
    }
}


/* =============================================================================
   THE CABINET  (#cabinet)
   -----------------------------------------------------------------------------
   Four controls, one state object, one code path. View, chair time and order
   all route through Flip.run(); pricing does not move anything, so it counts
   the figures instead.

   The ledger is not a second component — it is the same cards under a different
   grid, which is why the switch can animate between the two at all.
============================================================================= */
class Cabinet {
    constructor() {
        this.scene = $('.ivx-cab');
        this.grid  = $('#ivxGrid');
        this.cards = this.grid ? $$('.ivx-card', this.grid) : [];
        this.nums  = this.grid ? $$('.ivx-num', this.grid) : [];
        this.count = $('#ivxCount');
        this.empty = $('#ivxEmpty');
        this.segView  = $('#ivxSegView');
        this.segPrice = $('#ivxSegPrice');

        this.at = { view: 'cabinet', band: 'all', order: 'order', price: 'single' };
    }

    init() {
        if (!this.grid || !this.cards.length) return;

        // countTo reads where a figure currently sits — seed it, or the first
        // switch has nothing to count from and simply snaps
        this.nums.forEach((n) => { n.dataset.at = n.dataset.single; });
        if (this.count) this.count.dataset.at = this.live().length;

        this.views();
        this.bands();
        this.orders();
        this.pricing();
        this.arrive();

        popIn($$('.ivx-cab__head > *', this.scene), { y: 24, stagger: .08 }, '.ivx-cab__head', 'top 86%');
    }

    live() { return this.cards.filter((c) => !c.classList.contains('is-out')); }

    /** everything that moves the cards goes through here */
    relayout(mutate) {
        Flip.run(this.cards, mutate, {
            box: this.grid,
            onDone: () => { if (GSAP_ON()) ScrollTrigger.refresh(); },
        });
    }

    mark(list, on) {
        list.forEach((b) => b.classList.toggle('is-on', b === on));
    }

    /* ---------- cabinet ⇄ ledger ---------- */
    views() {
        const btns = $$('[data-view]', this.segView);
        btns.forEach((b) => {
            b.addEventListener('click', () => {
                const next = b.dataset.view;
                if (next === this.at.view) return;
                this.at.view = next;

                this.mark(btns, b);
                this.segView.classList.toggle('is-b', next === 'ledger');
                this.relayout(() => this.grid.classList.toggle('is-ledger', next === 'ledger'));
            });
        });
    }

    /* ---------- chair time ---------- */
    bands() {
        $$('[data-band]').forEach((b) => {
            b.addEventListener('click', () => {
                const next = b.dataset.band;
                if (next === this.at.band) return;
                this.at.band = next;

                this.mark($$('.ivx-chip[data-band]'), $(`.ivx-chip[data-band="${next}"]`));
                this.relayout(() => {
                    this.cards.forEach((c) => {
                        c.classList.toggle('is-out', !(next === 'all' || c.dataset.band === next));
                    });
                    this.tally();
                });
            });
        });
    }

    /* ---------- order ---------- */
    orders() {
        const btns = $$('[data-order]');
        btns.forEach((b) => {
            b.addEventListener('click', () => {
                const key = b.dataset.order;
                if (key === this.at.order) return;
                this.at.order = key;

                this.mark(btns, b);
                this.relayout(() => {
                    [...this.cards]
                        .sort((a, z) => (+a.dataset[key]) - (+z.dataset[key]))
                        .forEach((c) => this.grid.appendChild(c));
                });
            });
        });
    }

    /* ---------- single ⇄ program ---------- */
    pricing() {
        const btns = $$('[data-price]', this.segPrice);
        btns.forEach((b) => {
            b.addEventListener('click', () => {
                const mode = b.dataset.price;
                if (mode === this.at.price) return;
                this.at.price = mode;

                this.mark(btns, b);
                this.segPrice.classList.toggle('is-b', mode === 'program');
                this.grid.classList.toggle('is-program', mode === 'program');

                this.nums.forEach((n) => {
                    const to = parseFloat(n.dataset[mode]);
                    if (isFinite(to)) countTo(n, to);
                });
            });
        });
    }

    /** the count in the console, and the line that appears when a filter
     *  leaves nothing behind */
    tally() {
        const n = this.live().length;
        if (this.count) countTo(this.count, n, (v) => String(Math.round(v)));
        this.empty?.classList.toggle('is-on', n === 0);
    }

    /** the cards land as the menu comes into view */
    arrive() {
        if (!LIVE()) {
            document.documentElement.classList.remove('has-js');
            return;
        }
        gsap.set(this.cards, { opacity: 0, y: 38 });
        ScrollTrigger.create({
            trigger: this.grid,
            start: 'top 84%',
            once: true,
            onEnter: () => gsap.to(this.cards, {
                opacity: 1, y: 0, duration: .9, ease: 'expo.out',
                stagger: .055, clearProps: 'transform',
            }),
        });
    }
}


/* =============================================================================
   TILT — the cards lean toward the pointer
   The lean is written to the INNER element: the Flip engine owns x and y on the
   card itself, and two writers on one transform would fight every time the
   layout changes. Fine pointers only, never in the ledger, and never once the
   grid is one column wide.
============================================================================= */
class Tilt {
    constructor() {
        this.grid  = $('#ivxGrid');
        this.cards = this.grid ? $$('.ivx-card', this.grid) : [];
        this.mq    = window.matchMedia('(min-width: 781px)');
        this.LEAN  = 7;
    }

    init() {
        if (!this.cards.length || !LIVE() || !FINE_POINTER) return;

        this.cards.forEach((card) => {
            const inner = $('.ivx-card__in', card);
            const rx = gsap.quickTo(inner, 'rotationX', { duration: .5, ease: 'power3' });
            const ry = gsap.quickTo(inner, 'rotationY', { duration: .5, ease: 'power3' });
            const up = gsap.quickTo(inner, 'y', { duration: .5, ease: 'power3' });
            let box = null;

            const flat = () => !this.mq.matches || this.grid.classList.contains('is-ledger');

            card.addEventListener('pointerenter', () => {
                box = card.getBoundingClientRect();
                up(flat() ? 0 : -8);
            });

            card.addEventListener('pointermove', (e) => {
                if (flat()) return;
                if (!box) box = card.getBoundingClientRect();
                const px = clamp((e.clientX - box.left) / box.width, 0, 1) - .5;
                const py = clamp((e.clientY - box.top) / box.height, 0, 1) - .5;
                ry(px * this.LEAN);
                rx(-py * this.LEAN);
            });

            card.addEventListener('pointerleave', () => {
                box = null;
                rx(0); ry(0); up(0);
            });
        });
    }
}


/* =============================================================================
   DRIP LINE — the gold rule beside the menu, filled by scroll
============================================================================= */
class DripLine {
    constructor() {
        this.scene = $('.ivx-cab');
        this.fill  = $('.ivx-line__fill');
    }

    init() {
        if (!this.scene || !this.fill || !LIVE()) return;

        gsap.to(this.fill, {
            height: '100%',
            ease: 'none',
            scrollTrigger: { trigger: this.scene, start: 'top 60%', end: 'bottom 85%', scrub: .6 },
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
class Program {
    constructor() {
        this.scene  = $('.ivx-prog');
        this.picks  = $$('.ivx-pick');
        this.name   = $('#ivxProgName');
        this.single = $('#ivxProgSingle');
        this.total  = $('#ivxProgTotal');
        this.save   = $('#ivxProgSave');
        this.bars   = $$('.ivx-math__bar i');
        this.SESSIONS = 6;
        this.at = null;
    }

    init() {
        if (!this.scene || !this.picks.length || !this.total) return;

        this.picks.forEach((b) => b.addEventListener('click', () => this.show(b)));
        this.show(this.picks[0], false);

        if (!GSAP_ON() || REDUCED) return;
        popIn($$('.ivx-prog__head > *', this.scene), { y: 24, stagger: .08 }, '.ivx-prog__head', 'top 86%');
        popIn(this.picks, { y: 16, stagger: .05, duration: .5 }, '.ivx-prog__picker', 'top 88%');
        popIn([$('.ivx-math')], { y: 30, duration: .9 }, '.ivx-prog__console', 'top 84%');
    }

    show(btn, animate = true) {
        if (!btn || btn === this.at) return;
        this.at = btn;

        this.picks.forEach((b) => b.classList.toggle('is-on', b === btn));

        const one  = parseFloat(btn.dataset.single);
        const prog = parseFloat(btn.dataset.program);
        const full = one * this.SESSIONS;
        const cut  = prog * this.SESSIONS;

        this.name.innerHTML = btn.dataset.name;

        if (!animate) {
            this.single.textContent = money(full);
            this.total.textContent  = money(cut);
            this.save.textContent   = money(full - cut);
            this.single.dataset.at = full;
            this.total.dataset.at  = cut;
            this.save.dataset.at   = full - cut;
        } else {
            countTo(this.single, full);
            countTo(this.total, cut);
            countTo(this.save, full - cut);
        }

        // the two bars are the same arithmetic, read sideways
        if (this.bars.length === 2) {
            this.bars[0].style.width = '100%';
            this.bars[1].style.width = ((cut / full) * 100).toFixed(1) + '%';
        }

        if (animate && LIVE()) {
            gsap.fromTo(this.name, { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: .5, ease: 'expo.out' });
        }
    }
}


/* =============================================================================
   BOOT
============================================================================= */
const modules = {
    hero:      new Hero(),
    ticker:    new Ticker(),
    bar:       new Bar(),
    cabinet:   new Cabinet(),
    tilt:      new Tilt(),
    dripLine:  new DripLine(),
    rack:      new Rack(),
    compounds: new Compounds(),
    program:   new Program(),
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
   Flip.run() opens every move by writing the OLD position onto the card as an
   inline transform, and only clears it when the tween finishes. Click through
   to a drip page while that 0.8s is still running and the card travels into the
   back/forward cache still holding translate(dx, dy).

   Coming back does not re-run boot() — DOMContentLoaded has already fired for
   this document — so nothing clears it. The grid has meanwhile settled at its
   filtered height, and the stranded cards sit on top of whatever follows.

   So: leave clean on the way out, and re-measure on the way back in.
============================================================================= */
addEventListener('pagehide', () => {
    if (!GSAP_ON()) return;
    const cards = $$('.ivx-card');
    if (!cards.length) return;

    gsap.killTweensOf(cards);
    gsap.set(cards, { clearProps: 'transform' });

    const grid = $('#ivxGrid');
    if (grid) { gsap.killTweensOf(grid); gsap.set(grid, { clearProps: 'height' }); }
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
window.AVEIX = { modules, boot, MENU, COMPOUNDS, Flip, helpers: { $, $$, clamp, money, countTo, debounce, onFrame } };
