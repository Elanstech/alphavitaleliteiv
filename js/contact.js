/* =============================================================================
   ALPHA VITAL ELITE IV — CONTACT.JS
   Requires gsap + ScrollTrigger on window; loads AFTER ../script.js, which owns
   the header, menu, dock, nav trail and magnetic buttons.

   Two jobs:
     1. The infusion picker. It records INTEREST and passes it to the screening
        form as a prefill. It never decides anything — the copy says so and the
        code keeps it true: no branching, no eligibility, no scoring.
     2. Reveals, matching the about and research pages.

   Note on the embeds: both iframes ship with an empty src and the screening
   block ships hidden, so nothing renders a broken frame before the Jotform
   forms exist. Fill in FORMS below and both wake up.
============================================================================= */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const HAS_GSAP = typeof window.gsap !== 'undefined'
              && typeof window.ScrollTrigger !== 'undefined';

/* ─────────────────────────────────────────────────────────────────────────────
   ▸ THE ONLY TWO LINES TO EDIT ONCE THE JOTFORM FORMS EXIST.
     Paste the form URLs. Leave a value empty and that block stays dormant
     rather than rendering an empty frame.

     screening — the HIPAA-enabled form: payment → questionnaire → consent
     ask       — the plain question form: name, email, phone, subject, message
                 (no health fields on this one, ever)
   ───────────────────────────────────────────────────────────────────────── */
const FORMS = {
    screening: '',   // e.g. 'https://form.jotform.com/000000000000000'
    ask:       '',   // e.g. 'https://form.jotform.com/111111111111111'
};


/* ── RELEASE ────────────────────────────────────────────────────────────── */
const release = () => {
    root.classList.remove('ct-on');
    $$('[data-ct], [data-ct-split]').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });
    $$('.ct-line > span').forEach((el) => { el.style.transform = 'none'; });
};


/* ── SPLIT ──────────────────────────────────────────────────────────────── */
const splitLines = (el) => {
    if (!el || el.dataset.split) return [];
    el.dataset.split = '1';

    const source = el.innerHTML;
    el.innerHTML = source.replace(/(<[^>]+>)|([^<\s]+)/g,
        (m, tag, word) => (tag ? tag : `<i class="ct-probe" style="font-style:inherit">${word}</i>`));

    const probes = $$('.ct-probe', el);
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
        return `<span class="ct-line"><span>${frag.innerHTML}</span></span>`;
    }).join('');

    return $$('.ct-line > span', el);
};


/* ── PICKER ─────────────────────────────────────────────────────────────────
   Single-select, and clicking the active one clears it — nobody should be
   trapped into an answer they did not mean to give. The value is INTEREST
   only: it prefills the screening form so Dr. Aronov knows what the patient
   was hoping for. It grants nothing and unlocks nothing. */
const Picker = {
    init() {
        this.grid = $('#ctPick');
        if (!this.grid) return;

        this.opts  = $$('.ct-opt', this.grid);
        this.read  = $('#ctRead');
        this.start = $('#ctStart');
        this.slug  = null;
        this.label = null;

        this.opts.forEach((opt) => {
            opt.addEventListener('click', () => this.choose(opt));
        });

        this.start?.addEventListener('click', (ev) => this.go(ev));
        this.paint();
    },

    choose(opt) {
        const same = opt.dataset.iv === this.slug;
        this.slug  = same ? null : opt.dataset.iv;
        this.label = same ? null : opt.dataset.label;

        this.opts.forEach((o) => {
            o.setAttribute('aria-pressed', o.dataset.iv === this.slug ? 'true' : 'false');
        });
        this.paint();

        if (!RM.matches && HAS_GSAP && !same) {
            gsap.fromTo(opt, { scale: .97 }, { scale: 1, duration: .35, ease: 'power2.out' });
        }
    },

    paint() {
        if (!this.read) return;
        this.read.innerHTML = this.slug
            ? (this.slug === 'undecided'
                ? 'Noted &mdash; <b>you are not sure yet</b>. Dr. Aronov will work it out with you at the consultation.'
                : `Noted &mdash; you are interested in <b>${this.label}</b>. Dr. Aronov makes the final decision.`)
            : 'Choose one to continue, or start without choosing.';
    },

    /** open the screening form, carrying the interest along as a prefill */
    go(ev) {
        const slot  = $('#screeningForm');
        const frame = $('#ctScreenFrame');
        if (!FORMS.screening || !slot || !frame) return;   // no form yet: let the anchor do nothing

        ev.preventDefault();

        if (!frame.src) {
            const url = new URL(FORMS.screening);
            if (this.slug) {
                url.searchParams.set('interest', this.slug);
                if (this.label) url.searchParams.set('interestName', this.label);
            }
            frame.src = url.toString();
        }

        slot.hidden = false;
        slot.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
    },
};


/* ── EMBEDS ─────────────────────────────────────────────────────────────────
   The question form loads on its own; the screening form waits for the button
   so the interest prefill is known before the frame is built. */
const Embeds = {
    init() {
        const ask = $('#ctAskFrame');
        if (ask && FORMS.ask) ask.src = FORMS.ask;
        else $('#ctFormSlot')?.setAttribute('hidden', '');
    },
};


/* ── REVEAL ─────────────────────────────────────────────────────────────── */
const Reveal = {
    init() {
        $$('section').forEach((sec) => {
            const bits = $$('[data-ct]', sec).filter((el) => !el.dataset.done);
            if (!bits.length) return;
            bits.forEach((el) => { el.dataset.done = '1'; });
            gsap.to(bits, {
                opacity: 1, y: 0, scale: 1,
                duration: .8, ease: 'power3.out', stagger: .06,
                scrollTrigger: { trigger: sec, start: 'top 84%', once: true },
            });
        });
        $$('[data-ct]:not([data-done])').forEach((el) => {
            gsap.to(el, {
                opacity: 1, y: 0, scale: 1, duration: .8, ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            });
        });
    },

    lines() {
        $$('[data-ct-split="lines"]').forEach((el) => {
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


/* ── PROGRESS ───────────────────────────────────────────────────────────── */
const Progress = {
    init() {
        const bar = $('#ctProg');
        if (!bar || RM.matches) return;
        gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .25 } });
    },
};


/* ── BOOT ───────────────────────────────────────────────────────────────────
   Picker and Embeds are function, not decoration — they run whether or not
   GSAP ever arrives. */
const boot = () => {
    const run = (label, fn) => {
        try { fn(); }
        catch (err) { console.error(`[AVE · contact] ${label} failed`, err); release(); }
    };

    run('picker', () => Picker.init());
    run('embeds', () => Embeds.init());

    if (!HAS_GSAP || RM.matches) { release(); return; }

    run('reveal',   () => Reveal.init());
    run('progress', () => Progress.init());

    const fonts = document.fonts
        ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))])
        : Promise.resolve();

    fonts.then(() => { run('lines', () => Reveal.lines()); ScrollTrigger.refresh(); });
    window.addEventListener('load', () => ScrollTrigger.refresh());

    setTimeout(() => {
        $$('[data-ct], [data-ct-split]').forEach((el) => {
            if (getComputedStyle(el).opacity === '0') {
                el.style.opacity = '1';
                el.style.transform = 'none';
            }
        });
    }, 3000);
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.AVE_CONTACT = { boot, release, Picker, FORMS };
