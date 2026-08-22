/* =============================================================================
   ALPHA VITAL ELITE IV — RESEARCH.JS
   The reference library. Requires gsap + ScrollTrigger on window, and loads
   AFTER ../script.js, which owns the header, menu, dock and nav trail.

   The filter is the real work here. Two independent axes — evidence tier and
   treatment — combined with AND, animated with a FLIP so cards slide to their
   new positions instead of teleporting. Everything degrades to plain visible
   HTML if GSAP never arrives.

     Release   Split   Reveal   Counters   Filter   Progress   Boot
============================================================================= */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const HAS_GSAP = typeof window.gsap !== 'undefined'
              && typeof window.ScrollTrigger !== 'undefined';


/* ── RELEASE ────────────────────────────────────────────────────────────────
   No visitor should ever be left with a blank column because a CDN was slow. */
const release = () => {
    root.classList.remove('rs-on');
    $$('[data-rs], [data-rs-split]').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });
    $$('.rs-line > span').forEach((el) => { el.style.transform = 'none'; });
    $$('[data-rs-count]').forEach((el) => { el.textContent = el.dataset.rsCount; });
};


/* ── SPLIT ───────────────────────────────────────────────────────────────────
   Masked lines, measured after the webfonts land so the mask matches the wrap
   that is actually on screen. */
const splitLines = (el) => {
    if (!el || el.dataset.split) return [];
    el.dataset.split = '1';

    const source = el.innerHTML;
    el.innerHTML = source.replace(/(<[^>]+>)|([^<\s]+)/g,
        (m, tag, word) => (tag ? tag : `<i class="rs-probe" style="font-style:inherit">${word}</i>`));

    const probes = $$('.rs-probe', el);
    if (!probes.length) { el.innerHTML = source; return []; }

    const rows = [];
    let top = null;
    probes.forEach((p) => {
        const t = Math.round(p.offsetTop);
        if (top === null || Math.abs(t - top) > 4) { top = t; rows.push([]); }
        rows[rows.length - 1].push(p);
    });

    el.innerHTML = rows.map((row) => {
        const frag = document.createElement('div');
        row.forEach((p, i) => {
            const holder = p.parentElement !== el ? p.parentElement.cloneNode(false) : null;
            const text = document.createTextNode((i ? ' ' : '') + p.textContent);
            if (holder) { holder.appendChild(text); frag.appendChild(holder); }
            else frag.appendChild(text);
        });
        return `<span class="rs-line"><span>${frag.innerHTML}</span></span>`;
    }).join('');

    return $$('.rs-line > span', el);
};


/* ── REVEAL ─────────────────────────────────────────────────────────────────
   Cards stagger within their own group, so a long list reads as one movement
   rather than 27 separate ones. */
const Reveal = {
    init() {
        // group the plain risers by their nearest section for a tidy stagger
        $$('section, .rs-tiers, .rs-limits').forEach((sec) => {
            const bits = $$('[data-rs]', sec).filter((el) => !el.dataset.done);
            if (!bits.length) return;
            bits.forEach((el) => { el.dataset.done = '1'; });
            gsap.to(bits, {
                opacity: 1, y: 0, scale: 1,
                duration: .8, ease: 'power3.out', stagger: .05,
                scrollTrigger: { trigger: sec, start: 'top 82%', once: true },
            });
        });

        // anything the loop above missed
        $$('[data-rs]:not([data-done])').forEach((el) => {
            gsap.to(el, {
                opacity: 1, y: 0, scale: 1, duration: .8, ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            });
        });
    },

    lines() {
        $$('[data-rs-split="lines"]').forEach((el) => {
            const rows = splitLines(el);
            gsap.set(el, { opacity: 1 });
            if (!rows.length) return;
            gsap.to(rows, {
                y: '0%', duration: .95, ease: 'power4.out', stagger: .08,
                scrollTrigger: { trigger: el, start: 'top 86%', once: true },
            });
        });
    },
};


/* ── COUNTERS ───────────────────────────────────────────────────────────── */
const Counters = {
    init() {
        $$('[data-rs-count]').forEach((el) => {
            const end = parseInt(el.dataset.rsCount, 10) || 0;
            const obj = { v: 0 };
            ScrollTrigger.create({
                trigger: el, start: 'top 92%', once: true,
                onEnter: () => gsap.to(obj, {
                    v: end, duration: 1.3, ease: 'power2.out',
                    onUpdate: () => { el.textContent = Math.round(obj.v); },
                    onComplete: () => { el.textContent = String(end); },
                }),
            });
        });
    },
};


/* ── FILTER ─────────────────────────────────────────────────────────────────
   Two axes, combined with AND: show a card when its tier is selected (or no
   tier is) AND its treatment is selected (or no treatment is). A group hides
   itself once it has no visible cards left, so you never get a stranded
   heading over an empty grid. */
const Filter = {
    init() {
        this.bar = $('#rsBar');
        if (!this.bar) return;

        this.chips  = $$('.rs-chip', this.bar);
        this.all    = $('[data-all]', this.bar);
        if (this.all) this.all.addEventListener('click', () => this.toggle(this.all));
        this.groups = $$('.rs-group');
        this.refs   = $$('.rs-ref');
        this.count  = $('#rsCount');
        this.empty  = $('#rsEmpty');

        this.tiers = new Set();
        this.txs   = new Set();

        this.chips.forEach((chip) => {
            chip.addEventListener('click', () => this.toggle(chip));
        });

        this.sync();
    },

    toggle(chip) {
        if (chip === this.all) { this.tiers.clear(); this.txs.clear(); }
        else {
            const set = chip.dataset.tier ? this.tiers : this.txs;
            const key = chip.dataset.tier || chip.dataset.tx;
            set.has(key) ? set.delete(key) : set.add(key);
        }
        this.apply();
    },

    /** reflect state onto the chips */
    sync() {
        this.chips.forEach((c) => {
            const on = c.dataset.tier ? this.tiers.has(c.dataset.tier) : this.txs.has(c.dataset.tx);
            c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        if (this.all) this.all.hidden = !this.tiers.size && !this.txs.size;
    },

    apply() {
        const canFlip = HAS_GSAP && !RM.matches;

        // FLIP: read every visible card's box BEFORE the DOM changes
        const first = canFlip
            ? new Map(this.refs.filter((r) => !r.hidden).map((r) => [r, r.getBoundingClientRect()]))
            : null;

        let shown = 0;
        this.groups.forEach((g) => {
            const txOk = !this.txs.size || this.txs.has(g.dataset.tx);
            let visible = 0;

            $$('.rs-ref', g).forEach((ref) => {
                const tierOk = !this.tiers.size || this.tiers.has(ref.dataset.tier);
                const on = txOk && tierOk;
                ref.hidden = !on;
                if (on) visible += 1;
            });

            g.hidden = visible === 0;
            shown += visible;
        });

        if (this.count) {
            const parts = [];
            if (this.tiers.size) parts.push(`${this.tiers.size} evidence tier${this.tiers.size > 1 ? 's' : ''}`);
            if (this.txs.size)   parts.push(`${this.txs.size} infusion${this.txs.size > 1 ? 's' : ''}`);
            this.count.textContent = parts.length
                ? `Showing ${shown} reference${shown === 1 ? '' : 's'} — filtered by ${parts.join(' and ')}`
                : `Showing all ${shown} references`;
        }
        if (this.empty) this.empty.hidden = shown > 0;

        this.sync();

        if (!canFlip) return;

        // FLIP: play the cards from where they were to where they now are
        this.refs.filter((r) => !r.hidden).forEach((ref) => {
            const box = ref.getBoundingClientRect();
            const was = first.get(ref);
            if (was) {
                const dx = was.left - box.left;
                const dy = was.top - box.top;
                if (dx || dy) {
                    gsap.fromTo(ref, { x: dx, y: dy },
                        { x: 0, y: 0, duration: .55, ease: 'power3.out' });
                }
            } else {
                gsap.fromTo(ref, { opacity: 0, y: 18, scale: .97 },
                    { opacity: 1, y: 0, scale: 1, duration: .5, ease: 'power3.out' });
            }
        });

        ScrollTrigger.refresh();
    },
};


/* ── STICK ──────────────────────────────────────────────────────────────────
   The filter bar pins under the header — but ../script.js condenses that
   header at 40px and retreats it entirely on the way down. Pinning to a flat
   78px therefore leaves the bar hanging with a gap above it. Rather than run a
   second scroll listener, watch the class the shared Header already sets and
   mirror it. One source of truth, and the two can never disagree. */
const Stick = {
    init() {
        const bar  = $('#rsBar');
        const head = $('#head');
        if (!bar) return;

        const HEIGHT  = 78;   // .head__rail
        const STUCK_H = 64;   // .head.is-stuck .head__rail

        const sync = () => {
            const hidden = head?.classList.contains('is-hidden');
            const stuck  = head?.classList.contains('is-stuck');
            const top    = hidden ? 0 : (stuck ? STUCK_H : HEIGHT);
            bar.style.setProperty('--rs-bar-top', `${top}px`);
            bar.classList.toggle('is-pinned', bar.getBoundingClientRect().top <= top + 1);
        };

        sync();
        if (head) new MutationObserver(sync)
            .observe(head, { attributes: true, attributeFilter: ['class'] });
        addEventListener('scroll', sync, { passive: true });
        addEventListener('resize', sync);
    },
};


/* ── PROGRESS ───────────────────────────────────────────────────────────── */
const Plate = {
    /* the featured document leans toward the pointer. Fine pointers only —
       on a touch screen it is a card that twitches for no reason. */
    init() {
        const el = $('[data-rs-tilt]');
        if (!el || RM.matches) return;
        if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        const rx = gsap.quickTo(el, 'rotationX', { duration: .55, ease: 'power2.out' });
        const ry = gsap.quickTo(el, 'rotationY', { duration: .55, ease: 'power2.out' });
        const host = el.closest('.rs-feat') || el;

        host.addEventListener('pointermove', (ev) => {
            const r = el.getBoundingClientRect();
            rx(-((ev.clientY - r.top) / r.height - .5) * 7);
            ry(((ev.clientX - r.left) / r.width - .5) * 9);
        });
        host.addEventListener('pointerleave', () => { rx(0); ry(0); });
    },
};


const Progress = {
    init() {
        const bar = $('#rsProg');
        if (!bar || RM.matches) return;
        gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .25 } });
    },
};


/* ── BOOT ────────────────────────────────────────────────────────────────────
   Filter first and unconditionally — it is function, not decoration, and has
   to work even when GSAP is blocked. Then the motion, with the split headlines
   held until the webfonts settle (capped, so a slow CDN can never stall). */
const boot = () => {
    const run = (label, fn) => {
        try { fn(); }
        catch (err) { console.error(`[AVE · research] ${label} failed`, err); release(); }
    };

    run('filter', () => Filter.init());
    run('stick',  () => Stick.init());

    if (!HAS_GSAP || RM.matches) { release(); return; }

    run('reveal',   () => Reveal.init());
    run('counters', () => Counters.init());
    run('plate',    () => Plate.init());
    run('progress', () => Progress.init());

    const fonts = document.fonts
        ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))])
        : Promise.resolve();

    fonts.then(() => {
        run('lines', () => Reveal.lines());
        ScrollTrigger.refresh();
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());

    // absolute failsafe
    setTimeout(() => {
        $$('[data-rs], [data-rs-split]').forEach((el) => {
            if (getComputedStyle(el).opacity === '0') {
                el.style.opacity = '1';
                el.style.transform = 'none';
            }
        });
    }, 3000);
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.AVE_RESEARCH = { boot, release, Filter };
