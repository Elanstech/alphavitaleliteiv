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
        this.el = $('.ivx-hero');
    }

    init() {
        if (!this.el) return;
        if (!LIVE()) { release(); return; }

        const first = $('.hr__line[data-split]', this.el);
        const chars = first ? splitChars(first) : [];

        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

        if (chars.length) {
            gsap.set(first, { opacity: 1 });
            tl.fromTo(chars,
                { opacity: 0, yPercent: 60, rotateX: -55 },
                { opacity: 1, yPercent: 0, rotateX: 0, duration: .9, stagger: .022 }, .15);
        }

        tl.to($$('[data-rise]', this.el),
            { opacity: 1, y: 0, duration: .9, stagger: .09 }, .5);
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
/** Cut an element into per-character spans, keeping words unbreakable so the
 *  line still wraps at word boundaries. Returns the spans to animate. */
const splitChars = (el) => {
    if (el.dataset.split === 'done') return $$('.ivx-ch', el);
    const words = (el.textContent || '').split(/(\s+)/);
    el.innerHTML = words.map((w) => {
        if (/^\s+$/.test(w)) return ' ';
        const inner = [...w].map((c) => `<span class="ivx-ch">${c}</span>`).join('');
        return `<span class="ivx-word">${inner}</span>`;
    }).join('');
    el.dataset.split = 'done';
    return $$('.ivx-ch', el);
};

/** Scripting off, GSAP missing or motion reduced: show everything at once. */
const release = () => {
    document.documentElement.classList.remove('ivx-on', 'has-js');
    $$('[data-rise], [data-split]').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });
    $$('.ivx-ch').forEach((el) => { el.style.opacity = '1'; });
    document.body.classList.add('is-ready');
};


/* =============================================================================
   THE TYPEWRITER — the headline finishes itself
   -----------------------------------------------------------------------------
   Types a phrase, holds it, erases it, moves to the next. Timed with setTimeout
   rather than a GSAP tween so the caret rhythm stays irregular the way real
   typing is. The full sentence is in the DOM for screen readers already, so
   this element is aria-hidden and purely decorative.
============================================================================= */
class Typer {
    constructor() {
        this.el = $('#hrTyped');
        this.lines = [
            'Chosen one at a time.',
            'Given by one physician.',
            'Mixed for one person.',
        ];
        this.i = 0;
        this.stopped = false;
    }

    init() {
        if (!this.el) return;
        if (REDUCED || !LIVE()) { this.el.textContent = this.lines[0]; return; }

        // nothing types until the hero is actually being looked at
        document.addEventListener('visibilitychange', () => {
            this.stopped = document.hidden;
            if (!this.stopped) this.type();
        });
        this.type();
    }

    wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

    async type() {
        if (this.stopped) return;
        const line = this.lines[this.i];

        for (let n = 1; n <= line.length; n++) {
            if (this.stopped) return;
            this.el.textContent = line.slice(0, n);
            await this.wait(38 + Math.random() * 55);       // an uneven hand
        }
        await this.wait(2100);

        for (let n = line.length; n >= 0; n--) {
            if (this.stopped) return;
            this.el.textContent = line.slice(0, n);
            await this.wait(20);
        }
        await this.wait(260);

        this.i = (this.i + 1) % this.lines.length;
        this.type();
    }
}


/* =============================================================================
   THE DROP — one bead falls down the hero's left margin, forever
============================================================================= */
class Drop {
    constructor() { this.el = $('.hr__drop'); this.stem = $('.hr__drip'); }

    init() {
        if (!this.el || !LIVE()) return;
        const fall = () => {
            const h = this.stem.offsetHeight || 110;
            gsap.fromTo(this.el,
                { y: 0, opacity: 0, scaleY: .7 },
                {
                    keyframes: [
                        { opacity: 1, scaleY: 1, duration: .18 },
                        { y: h - 6, scaleY: 1.35, duration: 1.15, ease: 'power2.in' },
                        { opacity: 0, scaleY: .5, duration: .16 },
                    ],
                    onComplete: () => gsap.delayedCall(1.1 + Math.random() * 1.4, fall),
                });
        };
        fall();
    }
}


/* =============================================================================
   THE STAGE — the ten, handed over one at a time
   -----------------------------------------------------------------------------
   Above 900px the section pins and the scroll distance is divided into ten
   equal stops; crossing a boundary swaps the live panel. Below 900px the pin
   is skipped entirely (mobile viewport height changes mid-scroll and drags a
   pin out of register) and each panel reveals on its own as it arrives.
============================================================================= */
class Stage {
    constructor() {
        this.scene  = $('.ivx-stage');
        this.pin    = $('#stPin');
        this.deck   = $('#stDeck');
        this.panels = $$('.st__panel');
        this.marks  = $$('.st__mark');
        this.fill   = $('#stProgFill');
        this.mq     = window.matchMedia('(min-width: 901px)');
        this.at     = -1;
        this.st     = null;
    }

    init() {
        if (!this.deck || !this.panels.length) return;

        this.marks.forEach((m) => m.addEventListener('click', () => this.jump(+m.dataset.go)));

        if (!LIVE()) { this.panels.forEach((p) => p.classList.add('is-live')); return; }

        this.mq.addEventListener('change', () => this.build());
        this.build();
    }

    build() {
        this.st?.kill();
        this.st = null;

        if (!this.mq.matches) {
            // stacked: every panel is live, each announces itself on arrival
            this.panels.forEach((p) => p.classList.add('is-live'));
            gsap.set(this.panels, { clearProps: 'all' });
            this.panels.forEach((p) => {
                popIn($$('.st__text > *, .st__shot', p), { y: 26, stagger: .06 }, p, 'top 82%');
                ScrollTrigger.create({
                    trigger: p, start: 'top 70%', once: true,
                    onEnter: () => {
                        this.write(p);
                        this.tally(p);
                    },
                });
            });
            return;
        }

        // pinned: ten stops across ten viewport heights of scroll
        this.panels.forEach((p, i) => p.classList.toggle('is-live', i === 0));
        this.at = -1;

        this.st = ScrollTrigger.create({
            trigger: this.pin,
            start: 'top top',
            end: () => '+=' + (this.panels.length * window.innerHeight * .85),
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            scrub: false,
            onUpdate: (self) => {
                const n = Math.min(
                    this.panels.length - 1,
                    Math.floor(self.progress * this.panels.length),
                );
                if (this.fill) this.fill.style.width = (self.progress * 100).toFixed(2) + '%';
                this.show(n);
            },
        });

        this.show(0);
    }

    /** hand the screen from one panel to the next */
    show(n) {
        if (n === this.at) return;
        const back = n < this.at;
        const from = this.panels[this.at];
        const to   = this.panels[n];
        this.at = n;

        this.marks.forEach((m, i) => m.classList.toggle('is-on', i === n));

        if (from && from !== to) {
            gsap.killTweensOf(from);
            gsap.to(from, {
                opacity: 0, y: back ? 26 : -26, duration: .4, ease: 'power2.in',
                onComplete: () => from.classList.remove('is-live'),
            });
        }

        to.classList.add('is-live');
        gsap.killTweensOf(to);
        gsap.fromTo(to, { opacity: 0, y: back ? -26 : 26 },
            { opacity: 1, y: 0, duration: .6, ease: 'expo.out' });

        gsap.fromTo($$('.st__text > *', to), { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: .55, ease: 'expo.out', stagger: .045, delay: .08 });

        const shot = $('.st__shot img', to);
        if (shot) {
            gsap.fromTo(shot, { opacity: 0, scale: .9, rotate: back ? 4 : -4 },
                { opacity: 1, scale: 1, rotate: 0, duration: .8, ease: 'expo.out' });
        }

        this.write(to);
        this.tally(to);
    }

    /** the name types itself in as the panel takes the screen */
    write(panel) {
        const h = $('.st__name', panel);
        const slot = h && $('span', h);
        if (!slot) return;
        const text = h.dataset.name || '';

        if (REDUCED) { slot.textContent = text; return; }

        gsap.killTweensOf(slot);
        const o = { n: 0 };
        slot.textContent = '';
        gsap.to(o, {
            n: text.length, duration: Math.min(.9, text.length * .028), ease: 'none',
            onUpdate: () => { slot.textContent = text.slice(0, Math.round(o.n)); },
            onComplete: () => { slot.textContent = text; },
        });
    }

    /** the rate counts up rather than appearing */
    tally(panel) {
        const b = $('.st__rate b', panel);
        if (!b) return;
        const to = parseFloat(b.dataset.cost);
        if (!isFinite(to)) return;
        b.dataset.at = 0;
        countTo(b, to);
    }

    jump(n) {
        if (!this.st || !this.mq.matches) {
            this.panels[n]?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
            return;
        }
        const span = this.st.end - this.st.start;
        const y = this.st.start + (span * ((n + .5) / this.panels.length));
        window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
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
    typer:     new Typer(),
    drop:      new Drop(),
    stage:     new Stage(),
    compounds: new Compounds(),
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
    const rows = $$('.st__panel');
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
