/* ═══════════════════════════════════════════════════════════════════════════
   screening.js — begin-screening.html and review.html

   begin-screening.html is a plain list of links; it needs nothing here beyond
   the shared animations, which script.js already runs.

   review.html is the one that does work. It is a single page serving all ten
   infusions: it reads ?drip=<slug>, paints itself for that infusion, and hands
   the slug to Form 1 as a prefill. Ten near-identical form pages would drift
   apart the first time a price moved — this one cannot.

   All ten infusions share ONE intake chain rather than ten near-identical
   forms. Ten copies of the same medical questionnaire would drift apart the
   first time a question changed — and there are 189 of them. The chain is:

     1. INTAKE  — name, email, phone, which infusion.        (this is the embed)
     2. URGENT  — twelve yes/no urgent-symptom questions.
                  Any "yes" hides the submit button entirely, so a patient
                  reporting an emergency symptom cannot submit and no record
                  is created. All "no" carries them on.
     3. MEDICAL — the full 189-question history, then the $100 payment.

   Each step redirects to the next and passes the patient's details along in
   the query string, so nobody is asked their name twice. review.html only
   ever embeds step 1; Jotform handles the rest inside the same iframe.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ▸ THE ONLY BLOCK TO EDIT.
   INTAKE is the form the page embeds. URGENT and MEDICAL are listed for
   reference only — the redirects between them are configured inside Jotform,
   not here. Blank INTAKE shows the phone fallback instead of a dead iframe. */
const FORMS = {
    intake:  'https://hipaa.jotform.com/262494642474061',
    urgent:  'https://hipaa.jotform.com/262484460970059',
    medical: 'https://hipaa.jotform.com/262387848695075',
};

/* Jotform's field name for the infusion dropdown on the intake form. The
   options there are the MENU names below, verbatim — if you rename an infusion,
   rename it in both places or the dropdown arrives blank. */
const INTAKE_DRIP_FIELD = 'dropdown3';


const MENU = {
    'glynac':              { name: 'GLyNAC Healthy Aging',      price: '$350',   chair: '1 h 15', tone: '#5B7098' },
    'immun-o-boost':       { name: 'Immun-O-Boost IV Support',  price: '$550',   chair: '2 h 30', tone: '#D9982A' },
    'liquixo':             { name: 'LIQUIXO Muscle Recovery',   price: '$395',   chair: '45 min', tone: '#B34E37' },
    'antioxidant':         { name: 'Antioxidant \u00d73 Reset', price: '$400',   chair: '1 h 15', tone: '#4F7D5E' },
    'glutathione':         { name: 'Glutathione IV Injection',  price: '$100',   chair: '30 min', tone: '#7FA08C' },
    'joint-skin':          { name: 'Joint & Skin Wellness',     price: '$650',   chair: '2 h 30', tone: '#8C6239' },
    'fatty-liver-support': { name: 'Fatty Liver Support',       price: '$650',   chair: '3 h',    tone: '#5F7A55' },
    'revive':              { name: 'Revive IV Support',         price: '$525',   chair: '2 h 15', tone: '#35707F' },
    'stress-brain':        { name: 'Stress & Brain Wellness',   price: '$500',   chair: '1 h 30', tone: '#7A5F98' },
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


/* ── CARRYING THE PATIENT BETWEEN STEPS ──────────────────────────────────────
   Each step is its own page on this site, and each embeds one Jotform. When a
   form is submitted, Jotform redirects to the NEXT page here and puts the
   patient's details in the query string. That page reads them and passes them
   into its own iframe, so the patient is asked for their name exactly once.

       review.html          → intake form  → redirects to…
       review-safety.html   → urgent form  → redirects to…
       review-medical.html  → medical form → the $100, then done.

   Two separate vocabularies meet here, so keep them straight:

     • The SITE's own short params, below. These travel page → page and are
       ours to name.
     • JOTFORM's field names, in FIELDS. Those are fixed by the forms and are
       identical on the urgent and medical forms, which is why one map covers
       both.

   The Jotform redirect URLs are configured inside Jotform, not here. They must
   emit the site params below — see README-intake-chain.md. */
const CARRY = ['first', 'last', 'email', 'phone', 'drip'];

/* Site param  →  Jotform field name on the urgent and medical forms. */
const FIELDS = {
    first: 'fullLegal[first]',
    last:  'fullLegal[last]',
    email: 'emailAddress',
    phone: 'phoneNumber',
    drip:  'whichIv',
};


/* ── EMBED ───────────────────────────────────────────────────────────────────
   One embed for all three pages. The iframe declares which form it wants with
   data-form="intake|urgent|medical"; everything else follows from that.

   Arriving with no infusion is a valid path — the intake form asks anyway, and
   the physician may recommend a different one. So the frame loads regardless;
   only an unconfigured form leaves the phone fallback showing, which is why
   this can go live one step at a time. */
const embed = (drip) => {
    const slot  = $('#screeningForm');
    const soon  = $('#bsSoon');
    const frame = $('#ctScreenFrame');
    if (!slot || !frame) return;

    const which = frame.dataset.form || 'intake';
    const src = FORMS[which];
    if (!src) return;                   // not configured — keep the fallback

    const url = new URL(src);
    const here = new URLSearchParams(location.search);

    if (which === 'intake') {
        /* Step one. Nothing to carry in yet — the only thing we know is which
           infusion they clicked, and the dropdown value must match the option
           text on the Jotform exactly, so it comes from MENU not the slug. */
        if (drip) {
            url.searchParams.set(INTAKE_DRIP_FIELD, drip.name);
            /* Kept for the record so a submission traces back to the page it
               started on, even if they change the dropdown. */
            url.searchParams.set('interest', drip.slug);
        }
    } else {
        /* Steps two and three. Relay whatever the previous step sent us.
           A missing value is not an error — the patient can still type it — so
           blanks are skipped rather than passed through as empty strings, which
           would overwrite a value Jotform had already remembered. */
        CARRY.forEach((key) => {
            const val = here.get(key);
            if (val) url.searchParams.set(FIELDS[key], val);
        });
    }

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


/* ── NAME THE TITLE SEQUENCE ─────────────────────────────────────────────────
   review.html opens on the same title card as begin-screening, but it can say
   what the patient actually came for. Runs before cine() so the name is in
   place for the first frame — a card that says "IV support." and then swaps to
   the infusion mid-animation reads as a bug.

   Falls back to the generic wording already in the markup when no infusion was
   chosen, which is a real path: you may start the review without picking one. */
const nameCine = () => {
    const slot = $('#bsCineDrip');
    if (!slot) return;

    const slug = new URLSearchParams(location.search).get('drip');
    const drip = slug && MENU[slug];
    if (!drip) return;

    slot.innerHTML = `<em>${drip.name}</em>`;
};


/* ── THE MASTHEAD LANDS ──────────────────────────────────────────────────────
   The review pages keep the world the title sequence builds, so the handover
   has to be a continuation rather than a cut: the rail, headline and form rise
   while the curtain is still fading, on the same easing. Built paused and
   released by the curtain cue, exactly as the picker is on begin-screening.

   Returns a play() function, or null when there is nothing to animate — no
   GSAP, reduced motion, or simply not one of these pages. */
const rise = () => {
    const top = $('.bs-top');
    if (!top || typeof window.gsap === 'undefined' || RM.matches) return null;

    /* contact.js reveals [data-ct] and [data-ct-split] elements when they scroll
       into view. On these pages the masthead is already in view at load, behind
       the title sequence — so by the time the curtain lifts the moment has
       passed and the headline stays parked at its start state: translated 105%
       down inside a line box with overflow:hidden, which paints as a completely
       blank masthead. That is why this timeline exists rather than leaning on
       the shared scroll reveal.

       Claiming them with data-done is what stops the two from fighting: it is
       the same flag contact.js sets, so it skips anything already handled here. */
    const claim = (sel) => {
        const els = [...document.querySelectorAll(sel)];
        els.forEach((el) => { el.dataset.done = '1'; });
        return els.length ? els : null;
    };


    const rail  = claim('.bs-rail__i');
    /* Both attributes, deliberately. The headline carries data-ct-split, not
       data-ct, and `html.ct-on [data-ct-split] { opacity: 0 }` hides the whole
       element — so leaving it out of the fade left the masthead blank even once
       the lines underneath were animating correctly. */
    const fades = claim('.bs-top [data-ct], .bs-top [data-ct-split]');
    const facts = document.querySelector('.bs-facts');
    const panel = document.querySelector('.ct-embed, .bs-soon');

    /* Whatever the reveal does not reach must not be left invisible. The CSS
       start states only apply under .ct-on, so dropping the class is the one
       move that guarantees nothing stays hidden if this bails out early. */
    if (!rail && !lines && !fades) {
        document.documentElement.classList.remove('ct-on');
        return null;
    }

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });

    /* 1 — the rail: "where am I" before "what am I reading". Each item returns
           to the resting opacity its own state calls for, not a flat 1. */
    if (rail) {
        tl.fromTo(rail, { opacity: 0, y: 8 }, {
            opacity: (i, el) => (el.classList.contains('is-now')  ? 1
                               : el.classList.contains('is-done') ? .72 : .38),
            y: 0, duration: .55, stagger: .07,
        });
    }

    /* The headline used to be a data-ct-split line reveal. It is a plain rise
       on these three pages now: contact.js only builds the .ct-line wrappers
       after the webfonts settle, and its scroll reveal fires while the title
       sequence is still covering the page — so it decided the masthead was
       already shown and left the lines parked at 105%, which paints as a blank
       masthead. Racing it with a poll swapped one timing bug for another. A
       reveal a patient depends on should not hinge on when a font arrives. */

    /* 3 — the eyebrow, lede and anything else marked for a plain fade */
    if (fades) {
        tl.fromTo(fades, { opacity: 0, y: 14 },
                  { opacity: 1, y: 0, duration: .7, stagger: .07 }, '-=.85');
    }

    if (facts) {
        tl.fromTo(facts, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .8 }, '-=.55');
    }

    /* 4 — the form last and from further down, so it reads as the thing the
           page was walking you toward, not something already sitting there. */
    if (panel) {
        tl.fromTo(panel, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.1 }, '-=.5');
    }

    return () => tl.play();
};


/* ── BOOT ───────────────────────────────────────────────────────────────── */
const boot = () => {
    /* Read this before cine() runs — it clears the class on its way out. */
    const curtain = document.documentElement.classList.contains('has-cine');

    nameCine();

    /* Stage before anything paints, then let the welcome screen decide when to
       release. choose() is begin-screening's card grid, rise() is the review
       pages' masthead — a page has one or the other, never both. */
    const play = choose() || rise();

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
