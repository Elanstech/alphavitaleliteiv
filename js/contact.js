/* =============================================================================
   ALPHA VITAL ELITE IV — CONTACT.JS
   Requires gsap + ScrollTrigger on window; loads AFTER ../script.js, which owns
   the header, menu, dock, nav trail and magnetic buttons.

   Two jobs:
     1. The question form embed, with iframe autosize.
     2. Reveals, matching the about and research pages.

   Also loaded by begin-screening.html and review.html purely as the reveal
   engine — its modules each check for their own markup and no-op when it is
   absent, so it is safe on any ct- page.

   The screening flow is NOT here. It lives on begin-screening.html and
   review.html, and its forms are configured in js/screening.js.
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
    /* The question form only. The screening forms live on review.html and are
       configured in js/screening.js — one per infusion. */
    ask: 'https://form.jotform.com/262338508765062',          // Contact Alpha Vital Elite IV
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


/* ── EMBEDS ─────────────────────────────────────────────────────────────────
   The question form loads on its own; the screening form waits for the button
   so the interest prefill is known before the frame is built. */
const Embeds = {
    init() {
        const ask = $('#ctAskFrame');
        if (ask && FORMS.ask) { ask.src = FORMS.ask; this.autosize(ask); }
        else $('#ctFormSlot')?.setAttribute('hidden', '');
    },

    /* Jotform forms are taller than any height we could guess, and a fixed
       height gives the iframe its own scrollbar inside the page — two nested
       scroll areas, which is horrible on a trackpad and worse on a phone.
       Jotform posts its real height to the parent, so listen for that and let
       the frame grow instead. The CSS min-height covers us until it arrives. */
    autosize(frame) {
        window.addEventListener('message', (ev) => {
            if (!/jotform\.com$/.test(new URL(ev.origin).hostname)) return;
            const data = typeof ev.data === 'string' ? ev.data : '';
            if (!data.startsWith('setHeight')) return;

            const h = parseInt(data.split(':')[1], 10);
            if (h > 0) frame.style.height = `${h}px`;
        });
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
   Embeds is function, not decoration — it runs whether or not GSAP ever
   arrives. */
const boot = () => {
    const run = (label, fn) => {
        try { fn(); }
        catch (err) { console.error(`[AVE · contact] ${label} failed`, err); release(); }
    };
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

window.AVE_CONTACT = { boot, release, FORMS };
