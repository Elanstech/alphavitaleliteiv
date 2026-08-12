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
     Reveal      generic scroll reveal for the sections still to come
     Boot
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
   LIBRARY FILTER — chapter pills toggle rows; the "x" count fills itself in
============================================================================= */
class LibraryFilter {
    constructor() {
        this.pills = $$('.lib__pill');
        this.rows  = $$('.lib__row[data-cat]');
    }

    init() {
        if (!this.pills.length || !this.rows.length) return;

        // the "All" pill advertises the true count in lowercase roman
        const all = this.pills.find((p) => p.dataset.filter === 'all');
        const sup = all?.querySelector('sup');
        if (sup) sup.textContent = this.roman(this.rows.length);

        this.pills.forEach((pill) =>
            pill.addEventListener('click', () => this.apply(pill))
        );
    }

    apply(active) {
        const cat = active.dataset.filter;
        this.pills.forEach((p) => {
            const on = p === active;
            p.classList.toggle('is-on', on);
            p.setAttribute('aria-selected', String(on));
        });
        this.rows.forEach((row) => {
            const show = cat === 'all' || row.dataset.cat === cat || row.dataset.cat === 'all';
            row.classList.toggle('is-hidden', !show);
            if (show) {
                row.classList.remove('is-visible');
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => row.classList.add('is-visible'))
                );
            }
        });
    }

    roman(n) {
        const map = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
        let out = '';
        map.forEach(([v, sym]) => { while (n >= v) { out += sym; n -= v; } });
        return out;
    }
}


/* =============================================================================
   LIBRARY PREVIEW — the apothecary label that trails the cursor
   Built from each row's data-ing / data-cad, so adding a drip to the HTML
   is all it takes. Fine pointers only.
============================================================================= */
class LibraryPreview {
    constructor() {
        this.list = $('#libList');
        this.card = $('#libCard');
        this.x = 0;  this.y = 0;
        this.cx = 0; this.cy = 0;
        this.raf = null;
        this.active = false;
    }

    init() {
        if (!this.list || !this.card) return;
        if (REDUCED || !FINE_POINTER) return;

        $$('.lib__row', this.list).forEach((row) => {
            row.addEventListener('mouseenter', () => this.fill(row));
        });

        this.list.addEventListener('mousemove', (e) => {
            // sit up and to the right of the cursor so the drip name stays readable,
            // and never let the card leave the viewport
            this.x = clamp(e.clientX + 190, 170, window.innerWidth - 170);
            this.y = clamp(e.clientY - 24, 210, window.innerHeight - 60);
        });
        this.list.addEventListener('mouseleave', () => this.hide());
    }

    fill(row) {
        $('#libCardNo').textContent   = $('.lib__no', row)?.textContent ?? '';
        $('#libCardName').textContent = $('.lib__name', row)?.textContent ?? '';
        $('#libCardCad').textContent  = row.dataset.cad ?? '';

        const ul = $('#libCardIng');
        ul.innerHTML = '';
        (row.dataset.ing ?? '').split('|').filter(Boolean).forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
        });

        this.show();
    }

    show() {
        if (this.active) return;
        this.active = true;
        this.cx = this.x; this.cy = this.y;   // snap so it doesn't fly in
        this.card.classList.add('is-on');
        this.loop();
    }

    hide() {
        this.active = false;
        this.card.classList.remove('is-on');
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    }

    loop() {
        if (!this.active) return;
        this.cx = lerp(this.cx, this.x, 0.16);
        this.cy = lerp(this.cy, this.y, 0.16);
        this.card.style.left = `${this.cx.toFixed(1)}px`;
        this.card.style.top  = `${this.cy.toFixed(1)}px`;
        this.raf = requestAnimationFrame(() => this.loop());
    }
}


/* =============================================================================
   QUIZ — the miniature consultation
   A weighted matcher: every answer adds points across the ten formulas, the
   highest total is proposed, the runner-up is offered as a second opinion.
   The result is a starting point by design — the physician decides.
============================================================================= */
class Quiz {
    constructor() {
        this.stage = $('#quizStage');
        this.card  = $('#quizCard');
        this.back  = $('#quizBack');
        this.again = $('#quizAgain');
        this.bars  = $$('.quiz__bar', this.card ?? document);
        this.steps = $$('.quiz__step', this.card ?? document);

        this.DRIPS = {
            immuno:   { name: 'Immun-O-Boost',                url: '/drips/immuno-boost/',                  dur: '2 h 30',    cad: 'A monthly ritual',   why: 'deep, broad replenishment for a run-down season' },
            liquixo:  { name: 'LIQUIXO Muscle Recovery',      url: '/drips/muscle-support/',                dur: '45 min',    cad: 'Weekly · 6 weeks',   why: 'the full amino profile for muscle through weight loss and training' },
            antiox:   { name: 'Antioxidant \u00d73 Reset',    url: '/drips/antioxidant-reset/',             dur: '75 min',    cad: 'As advised',         why: 'a threefold antioxidant reset for cellular wellness' },
            glynac:   { name: 'GLyNAC Longevity Restoration', url: '/drips/glynac-longevity/',              dur: '60 min',    cad: 'Weekly · 6 weeks',   why: 'glycine and NAC — the components of your own glutathione' },
            brain:    { name: 'Stress, Burnout & Brain Wellness', url: '/drips/mental-recovery-brain-wellness/', dur: '90 min', cad: 'As advised',        why: 'mental recovery, hydration and focus for the overworked' },
            curcumin: { name: 'Curcumin Infusion',            url: '/drips/curcumin/',                      dur: '45 min',    cad: 'As advised',         why: 'one golden compound for joint comfort and healthy response' },
            gluta:    { name: 'Glutathione Injection',        url: '/drips/glutathione/',                   dur: '10\u201320 min', cad: 'Quick visit',   why: 'the master antioxidant for skin wellness, in minutes' },
            quercetin:{ name: 'Quercetin Seasonal Support',   url: '/drips/quercetin/',                     dur: '45 min',    cad: 'Seasonal',           why: 'seasonal wellness support, to breathe easier' },
            revive:   { name: 'Revive',                       url: '/drips/revive/',                        dur: '2 h 30',    cad: 'When depleted',      why: 'the unhurried full restoration — fluids, nutrients, recovery' },
            custom:   { name: 'The Customized Drip',          url: '/drips/customized-drip/',               dur: 'Bespoke',   cad: 'By consultation',    why: 'a protocol composed for you alone, from your history' },
        };

        this.QUESTIONS = [
            {
                q: 'What brings you in?',
                opts: [
                    { t: 'Run-down, catching everything',      w: { immuno: 4, quercetin: 1, revive: 1 } },
                    { t: 'Training, recovering, or on a GLP-1', w: { liquixo: 4, revive: 1, curcumin: 1 } },
                    { t: 'Aging well, on purpose',             w: { glynac: 4, antiox: 2 } },
                    { t: 'Burnt out, foggy, overworked',       w: { brain: 4, revive: 1 } },
                    { t: 'Skin, glow, radiance',               w: { gluta: 4, antiox: 1 } },
                    { t: 'Seasonal sniffles and sneezes',      w: { quercetin: 4, immuno: 1 } },
                ],
            },
            {
                q: 'How much time can you give an appointment?',
                opts: [
                    { t: 'In and out — under an hour',   w: { gluta: 2, liquixo: 2, curcumin: 2, quercetin: 2, glynac: 2, immuno: -2, revive: -2 } },
                    { t: 'An hour or so',                w: { glynac: 2, antiox: 2, brain: 1 } },
                    { t: 'Unhurried — the full ritual',  w: { immuno: 2, revive: 2, brain: 1 } },
                ],
            },
            {
                q: 'Which sounds most like you?',
                opts: [
                    { t: 'Cover my bases — broad replenishment',    w: { immuno: 2, revive: 2, brain: 1 } },
                    { t: 'One targeted ingredient, done precisely', w: { gluta: 2, curcumin: 2, quercetin: 2, glynac: 1 } },
                    { t: 'Compose something for me alone',          w: { custom: 5 } },
                ],
            },
        ];

        this.step = 0;
        this.picks = [];
    }

    init() {
        if (!this.stage || !this.card) return;

        this.back.addEventListener('click', () => this.go(this.step - 1));
        this.again.addEventListener('click', () => { this.picks = []; this.go(0); });

        this.render();
        this.go(0, true);
    }

    /* Build all panels once; movement is class toggling only. */
    render() {
        this.stage.innerHTML = '';
        this.QUESTIONS.forEach((question, qi) => {
            const panel = document.createElement('div');
            panel.className = 'quiz__panel';
            panel.dataset.panel = qi;

            const h = document.createElement('h3');
            h.className = 'quiz__q';
            h.textContent = question.q;
            panel.appendChild(h);

            const grid = document.createElement('div');
            grid.className = 'quiz__opts';
            question.opts.forEach((opt, oi) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quiz__opt';
                btn.innerHTML = `<i>${'abcdef'[oi]}.</i><span>${opt.t}</span>`;
                btn.addEventListener('click', () => this.answer(qi, oi));
                grid.appendChild(btn);
            });
            panel.appendChild(grid);
            this.stage.appendChild(panel);
        });

        const verdict = document.createElement('div');
        verdict.className = 'quiz__panel';
        verdict.dataset.panel = 'verdict';
        this.stage.appendChild(verdict);
    }

    answer(qi, oi) {
        this.picks[qi] = oi;
        if (qi + 1 < this.QUESTIONS.length) this.go(qi + 1);
        else this.verdict();
    }

    go(step, instant = false) {
        this.step = Math.max(0, step);
        $$('.quiz__panel', this.stage).forEach((p) =>
            p.classList.toggle('is-in', String(p.dataset.panel) === String(this.step))
        );
        this.back.hidden  = this.step === 0;
        this.again.hidden = true;
        this.paint(this.step, instant);
    }

    paint(step, instant = false) {
        this.steps.forEach((el, i) => {
            el.classList.toggle('is-here', i === step);
            el.classList.toggle('is-done', i < step);
        });
        this.bars.forEach((bar, i) => bar.classList.toggle('is-full', i < step));
        if (instant) return;
    }

    score() {
        const totals = Object.fromEntries(Object.keys(this.DRIPS).map((k) => [k, 0]));
        this.picks.forEach((oi, qi) => {
            const weights = this.QUESTIONS[qi].opts[oi]?.w ?? {};
            Object.entries(weights).forEach(([k, v]) => { totals[k] += v; });
        });
        return Object.entries(totals).sort((a, b) => b[1] - a[1]);
    }

    verdict() {
        const ranked = this.score();
        const first  = this.DRIPS[ranked[0][0]];
        const second = this.DRIPS[ranked[1][0]];

        const panel = $('[data-panel="verdict"]', this.stage);
        panel.innerHTML = `
            <p class="quiz__verdict-kicker">The concierge suggests</p>
            <h3 class="quiz__verdict-name">${first.name}</h3>
            <p class="quiz__verdict-why">Because you asked for ${first.why}.</p>
            <p class="quiz__verdict-meta"><span>${first.dur}</span><span>${first.cad}</span><span>Subject to physician review</span></p>
            <div class="quiz__verdict-actions">
                <a class="btn btn--forest" href="${first.url}"><span>Read about this infusion</span></a>
                <a class="btn btn--gold" href="#screening"><span>Begin screening</span></a>
            </div>
            <p class="quiz__runner">A close second: <a href="${second.url}">${second.name}</a> — worth raising with Dr.&nbsp;Aronov at screening.</p>
        `;

        this.step = this.QUESTIONS.length;
        $$('.quiz__panel', this.stage).forEach((p) =>
            p.classList.toggle('is-in', p.dataset.panel === 'verdict')
        );
        this.steps.forEach((el) => { el.classList.add('is-done'); el.classList.remove('is-here'); });
        this.bars.forEach((bar) => bar.classList.add('is-full'));
        this.back.hidden = true;
        this.again.hidden = false;
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
    libFilter: new LibraryFilter(),
    libCard:   new LibraryPreview(),
    quiz:      new Quiz(),
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
