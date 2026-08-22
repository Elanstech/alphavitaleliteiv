/* =============================================================================
   ALPHA VITAL ELITE IV — ABOUT.JS
   The physician page. Requires gsap.min.js and ScrollTrigger.min.js on window
   before this runs, and loads AFTER /script.js — which owns the header, the
   mobile menu, the dock, the nav trail and the magnetic buttons.

   Everything here feature-detects and no-ops when its elements are absent, and
   every start state set in about.css is released if GSAP never arrives.

     Helpers    split, clamp, frame throttle
     Release    the failsafe — nothing stays invisible
     Intro      hero master timeline
     Parallax   the portrait drifts inside its frame
     Counters   the vitals ledger
     Film       the video: scrubbed stage, autoplay in view, real controls
     Question   the pull quote and the thread through it
     Path       the thread draw, the travelling node, the sticky era readout
     Tilt       the four principle cards lean toward the pointer
     Marquee    the specialties band, modulated by scroll velocity
     Progress   the hairline at the top of the window
     Reveal     everything marked [data-ab]
     Boot
============================================================================= */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const clamp = (n, a, b) => (n < a ? a : n > b ? b : n);

const RM   = matchMedia('(prefers-reduced-motion: reduce)');
const FINE = matchMedia('(hover: hover) and (pointer: fine)');
const LOW  = (navigator.hardwareConcurrency || 4) <= 4;

const HAS_GSAP = typeof window.gsap !== 'undefined'
              && typeof window.ScrollTrigger !== 'undefined';


/* ── RELEASE ────────────────────────────────────────────────────────────────
   Nothing on this page is worth leaving a visitor with a blank column. If GSAP
   is missing, blocked or motion is reduced, strip every start state and let the
   page stand as static, readable HTML. */
const release = () => {
    root.classList.remove('ab-on');
    $$('[data-ab], [data-ab-split], .ab-char').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.clipPath = 'none';
    });
    $$('.ab-line > span').forEach((el) => { el.style.transform = 'none'; });
    // counters should still show their real value
    $$('[data-ab-count]').forEach((el) => { el.textContent = el.dataset.abCount; });
};


/* ── SPLIT ───────────────────────────────────────────────────────────────────
   Two shapes. `chars` for the two display headlines that get a per-letter
   cascade; `lines` for section titles, which are masked and pushed up as whole
   lines — cheaper, and it keeps long medical phrases readable mid-animation. */
const splitChars = (el) => {
    if (!el || el.dataset.split) return [];
    el.dataset.split = '1';

    const wrapWords = (text) => text.split(/(\s+)/).map((w) => (
        w.trim()
            ? `<span class="ab-mask"><span class="ab-word">${
                [...w].map((c) => `<span class="ab-char">${c === ' ' ? '&nbsp;' : c}</span>`).join('')
              }</span></span>`
            : w
    )).join('');

    el.innerHTML = [...el.childNodes].map((n) => {
        if (n.nodeType === 3) return wrapWords(n.textContent);
        if (n.nodeType === 1) {
            const tag = n.tagName.toLowerCase();
            const cls = n.getAttribute('class') || '';
            return `<${tag} class="${cls}">${wrapWords(n.textContent)}</${tag}>`;
        }
        return '';
    }).join('');

    return $$('.ab-char', el);
};

/** Wrap each rendered line in a mask. Measured after layout, so it survives
 *  text-wrap: balance and any font swap that has already happened. */
const splitLines = (el) => {
    if (!el || el.dataset.split) return [];
    el.dataset.split = '1';

    const source = el.innerHTML;
    // temporarily wrap every word so we can read its box top
    el.innerHTML = source.replace(/(<[^>]+>)|([^<\s]+)/g,
        (m, tag, word) => (tag ? tag : `<i class="ab-probe" style="font-style:inherit">${word}</i>`));

    const probes = $$('.ab-probe', el);
    if (!probes.length) { el.innerHTML = source; return []; }

    const rows = [];
    let top = null;
    probes.forEach((p) => {
        const t = Math.round(p.offsetTop);
        if (top === null || Math.abs(t - top) > 4) { top = t; rows.push([]); }
        rows[rows.length - 1].push(p);
    });

    // rebuild: one masked line per measured row, inner HTML preserved
    const html = rows.map((row) => {
        const frag = document.createElement('div');
        row.forEach((p, i) => {
            // keep the element the probe was inside (em, etc.) by cloning parents
            const holder = p.parentElement !== el ? p.parentElement.cloneNode(false) : null;
            const text = document.createTextNode((i ? ' ' : '') + p.textContent);
            if (holder) { holder.appendChild(text); frag.appendChild(holder); }
            else frag.appendChild(text);
        });
        return `<span class="ab-line"><span>${frag.innerHTML}</span></span>`;
    }).join('');

    el.innerHTML = html;
    return $$('.ab-line > span', el);
};


/* ── INTRO ─────────────────────────────────────────────────────────────────
   One master timeline. The folio and eyebrow set the frame, the name cascades
   in, the portrait is uncovered from the bottom edge, the ledger arrives last. */
const Intro = {
    init() {
        const hero = $('.ab-hero');
        if (!hero) return;

        const title  = $('.ab-hero__title', hero);
        const chars  = splitChars(title);
        if (title) gsap.set(title, { opacity: 1 });
        const shot   = $('.ab-shot', hero);
        const img    = $('.ab-shot img', hero);
        const rises  = $$('.ab-hero__lede [data-ab="rise"], .ab-folio[data-ab]', hero);
        const vitals = $$('.ab-vital[data-ab]', hero);

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.to(rises.slice(0, 2), { opacity: 1, y: 0, duration: .8, stagger: .1 })
          .to(chars, {
              opacity: 1, y: 0, duration: .82, ease: 'power4.out',
              stagger: { each: .016, from: 'start' },
          }, '-=.45');

        if (shot) {
            tl.to(shot, {
                clipPath: 'inset(0 0 0% 0)', duration: 1.15, ease: 'power4.inOut',
                onComplete: () => { shot.style.clipPath = 'none'; },
            }, '-=.85');
            if (img) tl.from(img, { scale: 1.18, duration: 1.4, ease: 'power3.out' }, '<');
        }

        tl.to(rises.slice(2), { opacity: 1, y: 0, duration: .75, stagger: .09 }, '-=.9')
          .to(vitals, { opacity: 1, y: 0, duration: .7, stagger: .07 }, '-=.5')
          .add(() => Counters.run(), '-=.35');

        return tl;
    },
};


/* ── PARALLAX ──────────────────────────────────────────────────────────────
   The portrait drifts inside its own frame. Skipped on low-core devices — it
   is the least valuable motion on the page and the first thing worth cutting. */
const Parallax = {
    init() {
        if (LOW) return;
        const img = $('[data-ab-parallax]');
        if (!img) return;

        gsap.to(img, {
            yPercent: 8, ease: 'none',
            scrollTrigger: { trigger: img.closest('.ab-shot'), start: 'top bottom', end: 'bottom top', scrub: .8 },
        });
    },
};


/* ── COUNTERS ──────────────────────────────────────────────────────────────
   The vitals ledger. Called by the intro timeline rather than a trigger, so
   the numbers land as part of the page opening rather than a second later. */
const Counters = {
    run() {
        $$('[data-ab-count]').forEach((el) => {
            if (el.dataset.counted) return;
            el.dataset.counted = '1';
            const end = parseFloat(el.dataset.abCount) || 0;
            const obj = { v: 0 };
            gsap.to(obj, {
                v: end, duration: 1.5, ease: 'power2.out',
                onUpdate: () => { el.textContent = Math.round(obj.v); },
                onComplete: () => { el.textContent = String(end); },
            });
        });
    },
};


/* ── FILM ──────────────────────────────────────────────────────────────────
   The frame grows into place as it is scrolled to, then plays itself — muted,
   because every browser requires that, with the control bar saying so until
   sound is turned on. Nothing here assumes the file exists: if it 404s the
   whole player degrades to the poster still. */
const Film = {
    init() {
        this.player = $('#abPlayer');
        this.video  = $('#abVideo');
        if (!this.player || !this.video) return;

        this.track = $('#abTrack');
        this.fill  = $('#abFill');
        this.time  = $('#abTime');
        this.manual = false;   // the visitor has taken control; stop autoplaying

        this.stage();
        this.wire();
        this.watch();
    },

    /* the scrubbed grow-in */
    stage() {
        const stage = $('[data-ab-stage]');
        if (!stage || RM.matches || !HAS_GSAP) return;
        gsap.fromTo(stage,
            { scale: .9, y: 40 },
            {
                scale: 1, y: 0, ease: 'none',
                scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top 32%', scrub: .7 },
            });
    },

    wire() {
        const v = this.video;

        /* Detecting a missing file is fiddlier than it looks. A <source> that
           404s fires `error` on the SOURCE element, and the video only fires
           its own error once every source is exhausted — but Chromium ALSO
           fires a source error during ordinary resource selection on a file
           that is perfectly fine. So the event is only a prompt to look: the
           verdict comes from the media state one tick later. */
        const verdict = () => {
            if (v.readyState > 0) return;                       // metadata is in, it is fine
            if (v.networkState !== 3 && !v.error) return;       // 3 = NETWORK_NO_SOURCE
            this.player.classList.add('is-missing');
            $('#abCtrl')?.setAttribute('hidden', '');
        };
        const found = () => {
            this.player.classList.remove('is-missing');
            $('#abCtrl')?.removeAttribute('hidden');
        };

        v.addEventListener('error', () => setTimeout(verdict, 500));
        $('source', v)?.addEventListener('error', () => setTimeout(verdict, 500));
        v.addEventListener('loadedmetadata', found);

        // and a hard backstop: nothing loaded at all after four seconds
        setTimeout(() => { if (v.readyState === 0) verdict(); }, 4000);

        $('[data-ab-play]')?.addEventListener('click', () => { this.manual = true; this.toggle(); });

        $('[data-ab-mute]')?.addEventListener('click', () => {
            v.muted = !v.muted;
            if (!v.muted) { v.volume = 1; this.manual = true; if (v.paused) this.toggle(true); }
            this.player.classList.toggle('is-loud', !v.muted);
        });

        v.addEventListener('play',  () => this.player.classList.add('is-playing'));
        v.addEventListener('pause', () => this.player.classList.remove('is-playing'));
        v.addEventListener('loadedmetadata', () => { found(); this.paint(); });
        v.addEventListener('timeupdate', () => this.paint());

        // clicking the frame itself is the fastest play/pause on any device
        v.addEventListener('click', () => {
            // the film is already running, so the thing a click actually wants
            // is almost always sound — pause is the second press
            if (v.muted) { v.muted = false; v.volume = 1; this.player.classList.add('is-loud'); return; }
            this.manual = true; this.toggle();
        });

        if ('ontouchstart' in window) this.player.classList.add('is-touch');

        this.seeking();
    },

    toggle(force) {
        const v = this.video;
        const wantPlay = force === true ? true : v.paused;
        if (wantPlay) v.play().catch(() => {});
        else v.pause();
    },

    paint() {
        const v = this.video;
        const d = v.duration;
        if (!d || !isFinite(d)) return;
        const pct = (v.currentTime / d) * 100;
        if (this.fill) this.fill.style.width = `${pct}%`;
        if (this.track) this.track.setAttribute('aria-valuenow', String(Math.round(pct)));
        if (this.time) this.time.textContent = `${this.mmss(v.currentTime)} / ${this.mmss(d)}`;
    },

    mmss(s) {
        if (!isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const r = Math.floor(s % 60);
        return `${m}:${String(r).padStart(2, '0')}`;
    },

    seeking() {
        const t = this.track;
        if (!t) return;
        const v = this.video;

        const seekTo = (clientX) => {
            const r = t.getBoundingClientRect();
            const p = clamp((clientX - r.left) / r.width, 0, 1);
            if (v.duration && isFinite(v.duration)) v.currentTime = p * v.duration;
        };

        let dragging = false;
        t.addEventListener('pointerdown', (e) => {
            dragging = true; this.manual = true;
            t.setPointerCapture(e.pointerId); seekTo(e.clientX);
        });
        t.addEventListener('pointermove', (e) => { if (dragging) seekTo(e.clientX); });
        t.addEventListener('pointerup',   (e) => { dragging = false; t.releasePointerCapture(e.pointerId); });

        t.addEventListener('keydown', (e) => {
            if (!v.duration || !isFinite(v.duration)) return;
            const step = e.shiftKey ? 10 : 5;
            if (e.key === 'ArrowRight') { v.currentTime = Math.min(v.duration, v.currentTime + step); e.preventDefault(); }
            if (e.key === 'ArrowLeft')  { v.currentTime = Math.max(0, v.currentTime - step); e.preventDefault(); }
            if (e.key === ' ' || e.key === 'Enter') { this.manual = true; this.toggle(); e.preventDefault(); }
        });
    },

    /* play when the frame is genuinely on screen, pause when it is not — but
       never fight a visitor who has pressed pause themselves */
    watch() {
        if (!('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach(({ isIntersecting }) => {
                if (isIntersecting && !this.manual && !RM.matches) this.video.play().catch(() => {});
                else if (!isIntersecting && !this.video.paused && this.video.muted) this.video.pause();
            });
        }, { threshold: 0.55 });
        io.observe(this.player);

        // a backgrounded tab should not keep the file streaming
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !this.video.paused && this.video.muted) this.video.pause();
        });
    },
};


/* ── QUESTION ──────────────────────────────────────────────────────────────
   The pull quote, one letter at a time, with the thread drawing down through
   the section behind it. */
const Question = {
    init() {
        const sec = $('.ab-q');
        if (!sec) return;

        const thread = $('#abQThread');
        if (thread && !RM.matches) {
            ScrollTrigger.create({
                trigger: sec, start: 'top bottom', end: 'bottom top', scrub: .5,
                onUpdate: (self) => thread.style.setProperty('--p', self.progress.toFixed(4)),
            });
        }
    },

    /* the letter cascade — called only once the webfonts have settled, so the
       split is measured against the type that is actually on screen */
    text() {
        const sec = $('.ab-q');
        const el = $('.ab-q__text', sec || document);
        if (!el) return;

        const chars = splitChars(el);
        gsap.set(el, { opacity: 1 });
        if (!chars.length) return;

        gsap.to(chars, {
            opacity: 1, y: 0, duration: .9, ease: 'power3.out',
            stagger: { each: .012, from: 'start' },
            scrollTrigger: { trigger: sec, start: 'top 72%', once: true },
        });
    },
};


/* ── PATH ──────────────────────────────────────────────────────────────────
   THE SIGNATURE. One gold hairline drawn by scroll down the length of her
   career, with a lit node riding the drawn tip, and a sticky readout on the
   left that names the era you are currently level with.

   The dash is normalised with pathLength="1", so the draw is a straight
   0 → 1 map of scroll progress no matter how tall the column gets. The node
   is placed from the same parameterisation, which is what keeps the two
   locked together instead of drifting apart on a resize. */
const Path = {
    init() {
        this.sec  = $('.ab-path');
        this.wrap = $('#abThread');
        this.draw = $('#abThreadDraw');
        this.node = $('#abThreadNode');
        this.rail = $('#abThreadRail');
        this.svg  = $('.ab-thread__svg', this.wrap || document);
        this.stops = $$('.ab-stop');
        if (!this.sec || !this.stops.length) return;

        this.reveals();
        this.era();
        if (this.rail && this.draw && !RM.matches) this.thread();
    },

    /* each stop arrives on its own, and only once */
    reveals() {
        this.stops.forEach((stop) => {
            const bits = $$('[data-ab]', stop);
            if (!bits.length) return;
            gsap.to(bits, {
                opacity: 1, x: 0, y: 0, duration: .8, ease: 'power3.out', stagger: .07,
                scrollTrigger: { trigger: stop, start: 'top 82%', once: true },
            });
        });
    },

    /* the sticky readout on the left */
    era() {
        const no    = $('#abEraNo');
        const label = $('#abEraLabel');
        const count = $('#abEraCount');
        if (!no) return;

        const total = String(this.stops.length).padStart(2, '0');

        this.stops.forEach((stop, i) => {
            const set = () => {
                const year = stop.dataset.era || '';
                if (no.textContent === year && label.textContent === stop.dataset.label) return;
                gsap.fromTo([no, label], { opacity: 0, y: 10 }, {
                    opacity: 1, y: 0, duration: .45, ease: 'power2.out',
                    onStart: () => {
                        no.textContent = year;
                        label.textContent = stop.dataset.label || '';
                        if (count) count.textContent = `${String(i + 1).padStart(2, '0')} / ${total}`;
                    },
                });
            };
            ScrollTrigger.create({
                trigger: stop,
                start: 'top 45%',
                end: 'bottom 45%',
                onEnter: set,
                onEnterBack: set,
            });
        });
    },

    /* the drawn line and the node that rides it */
    thread() {
        const draw = this.draw;
        const node = this.node;
        const svg  = this.svg;

        gsap.set(draw, { strokeDasharray: '1 1', strokeDashoffset: 1 });

        // user-space → rendered-space scale, recomputed whenever the box changes
        let sx = 1, sy = 1, len = draw.getTotalLength() || 1;
        const measure = () => {
            const r = svg.getBoundingClientRect();
            sx = r.width / 44;
            sy = r.height / 1000;
            len = draw.getTotalLength() || 1;
        };
        measure();

        const place = (p) => {
            if (!node) return;
            const pt = draw.getPointAtLength(clamp(p, 0, 1) * len);
            node.style.transform = `translate(${pt.x * sx}px, ${pt.y * sy}px) translate(-50%, -50%)`;
        };

        ScrollTrigger.create({
            trigger: this.rail,
            start: 'top 78%',
            end: 'bottom 62%',
            scrub: .6,
            onRefresh: measure,
            onUpdate: (self) => {
                const p = self.progress;
                draw.style.strokeDashoffset = String(1 - p);
                place(p);
                if (node) node.style.opacity = p > 0.002 && p < 0.999 ? '1' : '0';
            },
        });

        place(0);
    },
};


/* ── TILT ──────────────────────────────────────────────────────────────────
   The four principle cards lean toward the pointer. Fine pointers only — on a
   touch screen this is a card that jitters for no reason. */
const Tilt = {
    init() {
        if (!FINE.matches || RM.matches || LOW) return;

        $$('[data-ab-tilt]').forEach((card) => {
            const rx = gsap.quickTo(card, 'rotationX', { duration: .5, ease: 'power2.out' });
            const ry = gsap.quickTo(card, 'rotationY', { duration: .5, ease: 'power2.out' });

            const move = (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width  - .5;
                const py = (e.clientY - r.top)  / r.height - .5;
                rx(-py * 9);
                ry(px * 11);
            };

            card.addEventListener('pointermove', move);
            card.addEventListener('pointerleave', () => { rx(0); ry(0); });
        });
    },
};


/* ── MARQUEE ───────────────────────────────────────────────────────────────
   The specialties band. Duplicated until it is at least twice the viewport,
   then run on a single tween whose timeScale is nudged by how fast the page is
   moving — it leans into the scroll rather than ignoring it. */
const Marquee = {
    init() {
        const wrap  = $('#abMarq');
        const track = $('#abMarqTrack');
        if (!wrap || !track || RM.matches) return;

        const set = $('.ab-marq__set', track);
        if (!set) return;

        const width = set.offsetWidth;
        if (!width) return;

        /* The tween shifts the track by exactly one set and wraps. That only
           looks continuous if there is at least one whole spare set queued to
           the right of the viewport — so clone until the track covers the
           wrapper PLUS a full set, and never fewer than one clone. */
        let guard = 0;
        while ((track.scrollWidth < wrap.offsetWidth + width || guard < 1) && guard < 12) {
            track.appendChild(set.cloneNode(true));
            guard += 1;
        }

        const tween = gsap.to(track, {
            x: -width, duration: width / 42, ease: 'none', repeat: -1,
            modifiers: { x: (x) => `${parseFloat(x) % width}px` },
        });

        if (LOW) return;
        ScrollTrigger.create({
            trigger: wrap,
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: (self) => {
                const boost = clamp(Math.abs(self.getVelocity()) / 900, 0, 3);
                gsap.to(tween, { timeScale: 1 + boost, duration: .3, overwrite: true });
            },
            onLeave:     () => gsap.to(tween, { timeScale: 1, duration: .5, overwrite: true }),
            onLeaveBack: () => gsap.to(tween, { timeScale: 1, duration: .5, overwrite: true }),
        });
    },
};


/* ── PROGRESS ──────────────────────────────────────────────────────────────── */
const Progress = {
    init() {
        const bar = $('#abProg');
        if (!bar || RM.matches) return;
        gsap.to(bar, {
            scaleX: 1, ease: 'none',
            scrollTrigger: { start: 0, end: 'max', scrub: .25 },
        });
    },
};


/* ── REVEAL ────────────────────────────────────────────────────────────────
   Everything still carrying a start state: masked section titles first, then
   the generic [data-ab] elements the other modules did not claim. */
const Reveal = {
    /* everything that does not depend on where the type wraps */
    init() {
        const rest = $$('[data-ab]').filter((el) => !el.dataset.claimed);
        rest.forEach((el) => {
            gsap.to(el, {
                opacity: 1, x: 0, y: 0, scale: 1,
                duration: .85, ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
                onComplete: () => el.classList.add('ab-done'),
            });
        });
    },

    /* the masked section titles — measured only once the webfonts have landed,
       because the whole point of the mask is that it matches the real wrap */
    lines() {
        $$('[data-ab-split="lines"]').forEach((el) => {
            const rows = splitLines(el);
            gsap.set(el, { opacity: 1 });
            if (!rows.length) return;
            gsap.to(rows, {
                y: '0%', duration: .95, ease: 'power4.out', stagger: .08,
                scrollTrigger: { trigger: el, start: 'top 84%', once: true },
            });
        });
    },
};


/* ── BOOT ────────────────────────────────────────────────────────────────────
   Two phases. Everything whose geometry does not depend on where the type
   wraps starts at once. The split headlines wait for the webfonts, capped at
   900ms so a slow Google Fonts response can never hold the page — the same cap
   the site preloader uses. */
const boot = () => {
    if (!HAS_GSAP || RM.matches) { release(); return; }

    // stop-level [data-ab] belong to Path, hero-level to Intro — Reveal skips both
    $$('.ab-stop [data-ab], .ab-hero [data-ab]').forEach((el) => { el.dataset.claimed = '1'; });

    const run = (label, fn) => {
        try { fn(); }
        catch (err) { console.error(`[AVE · about] ${label} failed`, err); release(); }
    };

    run('parallax', () => Parallax.init());
    run('film',     () => Film.init());
    run('question', () => Question.init());
    run('path',     () => Path.init());
    run('tilt',     () => Tilt.init());
    run('marquee',  () => Marquee.init());
    run('progress', () => Progress.init());
    run('reveal',   () => Reveal.init());

    const fonts = document.fonts
        ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))])
        : Promise.resolve();

    fonts.then(() => {
        run('intro',    () => Intro.init());
        run('lines',    () => Reveal.lines());
        run('question', () => Question.text());
        ScrollTrigger.refresh();
    });

    // the images settle later than the fonts and change the column height, and
    // the thread is drawn against that height — remeasure when they are in
    window.addEventListener('load', () => ScrollTrigger.refresh());

    /* Absolute failsafe. Nothing on this page is worth leaving someone with a
       blank column, so anything still at opacity 0 after three seconds is let
       go regardless of what went wrong upstream. */
    setTimeout(() => {
        $$('[data-ab], [data-ab-split]').forEach((el) => {
            if (getComputedStyle(el).opacity === '0') {
                el.style.opacity = '1';
                el.style.transform = 'none';
                el.style.clipPath = 'none';
            }
        });
    }, 3000);
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

// handy while the rest of the pages get built
window.AVE_ABOUT = { boot, release, Film, Path, Marquee, helpers: { $, $$, splitChars, splitLines } };
