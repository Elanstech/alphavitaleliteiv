/* ═══════════════════════════════════════════════════════════════════════════
   screening.js — begin-screening.html and review.html

   begin-screening.html is a plain list of links; it needs nothing here beyond
   the shared animations, which script.js already runs.

   review.html is the one that does work. It is a single page serving all ten
   infusions: it reads ?drip=<slug>, paints itself for that infusion, and hands
   the slug to Form 1 as a prefill. Ten near-identical form pages would drift
   apart the first time a price moved — this one cannot.

   Each infusion has its own Jotform: that drip's screening and medical
   questions in one form, with the $100 Stripe payment collected at submit.
   review.html looks the form up by slug and embeds it.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ▸ THE ONLY BLOCK TO EDIT — one Jotform per infusion.
   Each form carries that drip's own screening and medical questions, and takes
   the $100 Stripe payment at submit. Paste each form's URL beside its slug as
   you build it; any drip left blank shows the phone fallback instead of a dead
   iframe, so you can go live one drip at a time. */
const FORMS = {
    'glynac':              '',
    'immun-o-boost':       '',
    'liquixo':             '',
    'antioxidant':         '',
    'glutathione':         '',
    'joint-skin':          '',
    'fatty-liver-support': '',
    'revive':              '',
    'stress-brain':        '',
    'customized':          '',
};


const MENU = {
    'glynac':              { name: 'GLyNAC Healthy Aging',      price: '$450',   chair: '1 h 15', tone: '#5B7098' },
    'immun-o-boost':       { name: 'Immun-O-Boost IV Support',  price: '$650',   chair: '2 h 30', tone: '#D9982A' },
    'liquixo':             { name: 'LIQUIXO Muscle Recovery',   price: '$495',   chair: '45 min', tone: '#B34E37' },
    'antioxidant':         { name: 'Antioxidant \u00d73 Reset', price: '$500',   chair: '1 h 15', tone: '#4F7D5E' },
    'glutathione':         { name: 'Glutathione IV Injection',  price: '$125',   chair: '30 min', tone: '#7FA08C' },
    'joint-skin':          { name: 'Joint & Skin Wellness',     price: '$750',   chair: '2 h 30', tone: '#8C6239' },
    'fatty-liver-support': { name: 'Fatty Liver Support',       price: '$850',   chair: '3 h',    tone: '#5F7A55' },
    'revive':              { name: 'Revive IV Support',         price: '$625',   chair: '2 h 15', tone: '#35707F' },
    'stress-brain':        { name: 'Stress & Brain Wellness',   price: '$700',   chair: '1 h 30', tone: '#7A5F98' },
    'customized':          { name: 'Customized IV Infusion',    price: 'By consultation', chair: 'Individual', tone: '#C1963F' },
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const RM = matchMedia('(prefers-reduced-motion: reduce)');


/* ── PAINT ───────────────────────────────────────────────────────────────────
   Fill the masthead from the slug. An unknown or absent slug is not an error:
   the page falls back to the generic wording already in the markup, which is
   also what a crawler sees. */
const paint = () => {
    const host = $('#bsFacts');
    if (!host) return null;                       // not the form page

    const slug = new URLSearchParams(location.search).get('drip');
    const drip = slug && MENU[slug] ? MENU[slug] : null;

    if (!drip) {
        /* No infusion chosen. Say so plainly and offer the way back rather
           than showing three em-dashes and hoping they work it out. */
        const swap = $('#bsSwap');
        if (swap) {
            swap.hidden = false;
            swap.innerHTML = 'No infusion selected yet. You may continue without selecting one '
                + 'and let physician screening guide the next step, or '
                + '<a href="begin-screening.html">return to read about each infusion first</a>.';
        }
        return null;
    }

    document.documentElement.style.setProperty('--tone', drip.tone);

    const name = $('#bsName');
    if (name) name.innerHTML = `Review request for<br><em>${drip.name}</em>`;

    const set = (sel, val) => { const el = $(sel); if (el) el.innerHTML = val; };
    set('#bsDrip', drip.name);
    set('#bsChair', drip.chair);
    set('#bsPrice', drip.price);
    /* These two only mean anything once an infusion is chosen; review.html ships
       them hidden so the empty em-dash boxes never show on the no-selection path. */
    ['#bsChairBox', '#bsPriceBox'].forEach(sel => { const b = $(sel); if (b) b.hidden = false; });

    const swap = $('#bsSwap');
    if (swap) swap.hidden = false;

    document.title = `${drip.name} — Physician Review Request — Alpha Vital Elite IV`;

    return { slug, ...drip };
};


/* ── EMBED ───────────────────────────────────────────────────────────────────
   The frame is built only once FORMS.review is set. Until then the page shows
   the phone fallback instead, so the CTA is never a dead end. */
const embed = (drip) => {
    const slot = $('#screeningForm');
    const soon = $('#bsSoon');
    const frame = $('#ctScreenFrame');
    if (!slot || !frame) return;

    /* No drip chosen, or that drip's form is not built yet: leave the phone
       fallback showing. Never an empty iframe. */
    const src = drip && FORMS[drip.slug];
    if (!src) return;

    const url = new URL(src);
    url.searchParams.set('interest', drip.slug);
    url.searchParams.set('interestName', drip.name);
    frame.src = url.toString();

    slot.hidden = false;
    soon?.setAttribute('hidden', '');

    autosize(frame);
};


/* Jotform is taller than any height we could guess, and a fixed height gives
   the iframe its own scrollbar inside the page — two nested scroll areas,
   which is horrible on a trackpad and worse on a phone. Jotform posts its real
   height to the parent, so listen for that and let the frame grow. The CSS
   min-height covers us until it arrives. */
const autosize = (frame) => {
    window.addEventListener('message', (ev) => {
        let host;
        try { host = new URL(ev.origin).hostname; } catch { return; }
        if (!/(^|\.)jotform\.com$/.test(host)) return;

        const data = typeof ev.data === 'string' ? ev.data : '';
        const [action, height] = data.split(':');
        if (action === 'setHeight' && Number(height) > 0) {
            frame.style.height = `${Number(height)}px`;
        }
    });
};



/* ── THE TITLE SEQUENCE ──────────────────────────────────────────────────────
   Plays itself on begin-screening.html. No button to press — the skip is a
   courtesy, not the way through. Runs on every load of the page: the class is
   set in <head> before first paint so nothing flashes through underneath.

   If anything here throws, finish() still runs from the catch, so a broken
   animation can never leave a dark panel covering the page. */
const cine = () => {
    const box = $('#bsCine');
    if (!box) return;

    /* The cue the picker waits on. Fired once, at the moment the curtain
       starts to lift rather than after it has gone, so the two shots overlap. */
    let fired = false;
    const cue = () => {
        if (fired) return;
        fired = true;
        document.dispatchEvent(new CustomEvent('ave:curtain'));
    };

    const done = () => {
        document.documentElement.classList.remove('has-cine');
        box.remove();
        cue();
    };

    /* No GSAP, or motion reduced — clear it and show the page. */
    if (typeof window.gsap === 'undefined' || RM.matches) { done(); return; }

    const skip = $('#bsSkip');
    const q = (sel) => box.querySelector(sel);

    const tl = gsap.timeline({ onComplete: done });

    tl.fromTo(q('.bs-cine__mark'), { opacity: 0, y: 14, scale: .94 },
              { opacity: 1, y: 0, scale: 1, duration: .9, ease: 'expo.out' })
      .fromTo(q('.bs-cine__kicker'), { opacity: 0, y: 8 },
              { opacity: 1, y: 0, duration: .7, ease: 'power2.out' }, '-=.5')
      .fromTo(q('.bs-cine__line--1'), { opacity: 0, y: 22 },
              { opacity: 1, y: 0, duration: .75, ease: 'expo.out' }, '-=.25')
      .fromTo(q('.bs-cine__line--2'), { opacity: 0, y: 22 },
              { opacity: 1, y: 0, duration: .75, ease: 'expo.out' }, '-=.5')
      .fromTo(q('.bs-cine__line--3'), { opacity: 0, y: 22 },
              { opacity: 1, y: 0, duration: .8, ease: 'expo.out' }, '-=.5')
      .to(q('.bs-cine__rule'), { width: '11rem', duration: .8, ease: 'power3.inOut' }, '-=.35')
      .fromTo(q('.bs-cine__sub'), { opacity: 0 },
              { opacity: 1, duration: .7, ease: 'none' }, '-=.45')
      .fromTo(skip, { opacity: 0 }, { opacity: 1, duration: .5 }, '-=.6')
      /* hold, then clear — the cue goes out as the fade begins, not after it */
      .to(box, { opacity: 0, duration: .85, ease: 'power2.inOut', onStart: cue }, '+=1.1')
      .to(box, { duration: .01 });

    skip?.addEventListener('click', () => { tl.kill(); done(); });

    /* Escape gets you out too — a fixed dark overlay with no keyboard exit is
       a trap for anyone not using a mouse. */
    const esc = (ev) => {
        if (ev.key !== 'Escape') return;
        tl.kill(); done();
        window.removeEventListener('keydown', esc);
    };
    window.addEventListener('keydown', esc);
};


/* ── THE CHOICE ──────────────────────────────────────────────────────────────
   The picker is the second shot of a two-shot opening, so it is built as one
   timeline and held paused until the welcome screen starts lifting. The two
   overlap deliberately: cards are already rising while the curtain fades, which
   reads as one continuous move rather than "animation ends, page appears".

   Returns a play() function, or null if there is nothing to play. */
const choose = () => {
    const sec = $('#choose');
    const grid = $('#bsBags');
    if (!sec || !grid) return null;

    const cells = [...grid.querySelectorAll('.bs-bag__cell')];
    if (!cells.length || typeof window.gsap === 'undefined' || RM.matches) return null;

    const q = (sel) => sec.querySelector(sel);
    const all = (sel) => cells.map((c) => c.querySelector(sel)).filter(Boolean);

    const EASE = 'expo.out';

    /* fromTo sets its start state on creation, so the section is already
       staged before the first frame — nothing flashes behind the curtain. */
    const tl = gsap.timeline({ paused: true, defaults: { ease: EASE } });

    tl
      /* 1 — the eyebrow, quietly */
      .fromTo(q('.ct-eyebrow'),
              { opacity: 0, y: 10 },
              { opacity: 1, y: 0, duration: .6 })

      /* 2 — headline lines ride up out of their clips, one after the other */
      .fromTo(sec.querySelectorAll('.bs-mask__i'),
              { yPercent: 120 },
              { yPercent: 0, duration: 1.1, stagger: .1 }, '-=.34')

      /* 3 — the gold rule draws under them */
      .fromTo(q('.bs-choose__rule'),
              { scaleX: 0 },
              { scaleX: 1, duration: .85, ease: 'power3.inOut' }, '-=.72')

      /* 4 — the instruction */
      .fromTo(q('.bs-choose__note'),
              { opacity: 0, y: 10 },
              { opacity: 1, y: 0, duration: .7 }, '-=.58')

      /* 5 — the cards assemble from the middle out, tilting up to flat. Ten
             cards landing left-to-right looks like a list loading; from the
             centre it looks arranged. */
      .fromTo(cells,
              { opacity: 0, y: 52, scale: .93, rotateX: -9, transformOrigin: '50% 100%' },
              { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 1.15,
                stagger: { each: .055, from: 'center' } }, '-=.42')

      /* 6 — each bottle settles a beat after its own card, so the card feels
             like a frame the product drops into */
      .fromTo(all('.bs-bag__art img'),
              { yPercent: 22, opacity: 0 },
              { yPercent: 0, opacity: 1, duration: .95,
                stagger: { each: .055, from: 'center' } }, '<0.13')

      /* 7 — one pass of light over each card, riding the same stagger */
      .fromTo(all('.bs-bag__sheen'),
              { xPercent: -130, opacity: 0 },
              { xPercent: 130, opacity: 1, duration: .9, ease: 'power2.inOut',
                stagger: { each: .055, from: 'center' },
                onComplete() { gsap.set(this.targets(), { opacity: 0 }); } }, '<0.06')

      /* 8 — the way out, last */
      .fromTo(q('.bs-unsure'),
              { opacity: 0, y: 8 },
              { opacity: 1, y: 0, duration: .7 }, '-=.75');

    return () => tl.play();
};


/* ── BOOT ───────────────────────────────────────────────────────────────── */
const boot = () => {
    /* Read this before cine() runs — it clears the class on its way out. */
    const curtain = document.documentElement.classList.contains('has-cine');

    /* Stage the picker first so its start state is set before anything paints,
       then let the welcome screen decide when to release it. */
    const play = choose();

    cine();

    if (play) {
        if (curtain) document.addEventListener('ave:curtain', play, { once: true });
        else play();
    }

    const drip = paint();
    embed(drip);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}

/* release the animation start-states if something upstream failed */
if (RM.matches) document.documentElement.classList.remove('ct-on');

export { boot, choose, FORMS, MENU };
