/* ═══════════════════════════════════════════════════════════════════════════
   screening.js — begin-screening, review, review-safety, review-done

   begin-screening.html is a plain list of links; it needs nothing here beyond
   the shared animations, which script.js already runs.

   review.html is the one that does work. It is a single page serving all ten
   infusions: it reads ?drip=<slug>, paints itself for that infusion, and hands
   the slug to Form 1 as a prefill. Ten near-identical form pages would drift
   apart the first time a price moved — this one cannot.

   All ten infusions share ONE intake chain rather than ten near-identical
   forms, which would drift apart the first time a price or a question moved.
   The patient-facing chain is TWO steps, both online, both free:

     1. INTAKE  — name, email, phone, which infusion.   (review.html embeds it)
     2. URGENT  — twelve yes/no urgent-symptom questions.
                  Any "yes" hides the submit button entirely, so a patient
                  reporting an emergency symptom cannot submit and no record
                  is created. All "no" submits, and the thank-you page tells
                  them the practice will call within 24–48 hours.

   There is no third step and no payment. The full medical history is a
   separate Jotform the practice fills out WITH the patient on an iPad in the
   office; it is never linked from this site and MEDICAL below is recorded
   only so the id is findable.

   Step 1 redirects to step 2, and step 2 redirects to review-done.html — the
   confirmation. Each redirect passes the patient's details in the query
   string, so nobody is asked their name twice; both receiving pages scrub
   that query string out of the address bar once they have read it.

   The two redirect URLs are set inside Jotform, not here:
     intake  →  …/htmls/review-safety.html?first={fullLegal:first}&last={fullLegal:last}
                &email={emailAddress}&phone={phoneNumber}&drip={whichIv}
     urgent  →  …/htmls/review-done.html?drip={whichIv}&first={fullLegal:first}
   ═══════════════════════════════════════════════════════════════════════════ */

/* ▸ THE ONLY BLOCK TO EDIT.
   Each page embeds one of these; the redirect between them is configured
   inside Jotform, not here. MEDICAL is the in-office iPad form — reference
   only, never embedded. Blank url shows the phone fallback, not a dead
   iframe. */
const FORMS = {
    intake:  'https://hipaa.jotform.com/262494642474061',
    urgent:  'https://hipaa.jotform.com/262484460970059',
    medical: 'https://hipaa.jotform.com/262387848695075',  // in-office only
};

/* Jotform's field name for the infusion dropdown on the intake form. The
   options there are the MENU names below, verbatim — if you rename an infusion,
   rename it in both places or the dropdown arrives blank. */
const INTAKE_DRIP_FIELD = 'dropdown3';


const MENU = {
    'glynac':              { name: 'GLyNAC Healthy Aging',      price: '$350', chair: '1 h 15', tone: '#5B7098', img: 'glynac' },
    'immun-o-boost':       { name: 'Immun-O-Boost IV Support',  price: '$550', chair: '2 h 30', tone: '#D9982A', img: 'immuneoboost' },
    'liquixo':             { name: 'LIQUIXO Muscle Recovery',   price: '$395', chair: '45 min', tone: '#B34E37', img: 'liquixo' },
    'antioxidant':         { name: 'Antioxidant \u00d73 Reset', price: '$400', chair: '1 h 15', tone: '#4F7D5E', img: 'antioxidant' },
    'glutathione':         { name: 'Glutathione IV Injection',  price: '$100', chair: '30 min', tone: '#7FA08C', img: 'glutathione' },
    'joint-skin':          { name: 'Joint & Skin Wellness',     price: '$650', chair: '2 h 30', tone: '#8C6239', img: 'jointsupport' },
    'fatty-liver-support': { name: 'Fatty Liver Support',       price: '$650', chair: '3 h',    tone: '#5F7A55', img: 'liversupport' },
    'revive':              { name: 'Revive IV Support',         price: '$525', chair: '2 h 15', tone: '#35707F', img: 'revive' },
    'stress-brain':        { name: 'Stress & Brain Wellness',   price: '$500', chair: '1 h 30', tone: '#7A5F98', img: 'brainwellness' },
    'customized':          { name: 'Customized IV Infusion',    price: 'By consultation', chair: 'Individual', tone: '#C1963F', img: 'customized' },
};

/* ?drip= is a slug on step I (from the picker) and the infusion NAME on step
   II (relayed by Jotform from its dropdown). Resolve either. */
const findDrip = (raw) => {
    if (!raw) return null;
    if (MENU[raw]) return { slug: raw, ...MENU[raw] };
    const hit = Object.entries(MENU).find(([, d]) => d.name === raw);
    return hit ? { slug: hit[0], ...hit[1] } : null;
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const RM = matchMedia('(prefers-reduced-motion: reduce)');


/* ── PAINT ───────────────────────────────────────────────────────────────────
   Fill the green panel from the infusion: bottle, tone, name, chair, price.
   An unknown or absent infusion is not an error — the panel keeps its generic
   wording and the customised bottle, and the swap line explains. */
const paint = () => {
    const side = $('#bsSide');
    if (!side) return null;                       // not a review page

    const drip = findDrip(new URLSearchParams(location.search).get('drip'));
    const swap = $('#bsSwap');

    if (!drip) {
        /* Nothing chosen. On a step that still has a form there is something to
           offer — carry on, or go back and pick one. On the confirmation page
           there is nothing left to continue TO, so its own wording stands. */
        if (swap && !$('#bsDone')) {
            swap.hidden = false;
            swap.innerHTML = 'No infusion chosen yet. You can continue and let physician screening '
                + 'guide the next step, or <a href="begin-screening.html">choose one first</a>.';
        } else if (swap) {
            swap.hidden = false;
        }
        return null;
    }

    side.style.setProperty('--tone', drip.tone);
    const img = $('#bsBottleImg');
    if (img) { img.src = `../assets/drips/${drip.img}.png`; img.alt = drip.name; }

    const set = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
    set('#bsName',  drip.name);
    set('#bsChair', drip.chair);
    set('#bsPrice', drip.price);
    if (swap) swap.hidden = false;

    document.title = `${drip.name} — ${document.title}`;
    return drip;
};


/* ── CARRYING THE PATIENT BETWEEN STEPS ──────────────────────────────────────
   Each step is its own page on this site, and each embeds one Jotform. When a
   form is submitted, Jotform redirects to the NEXT page here and puts the
   patient's details in the query string. That page reads them and passes them
   into its own iframe, so the patient is asked for their name exactly once.

       review.html          → intake form  → redirects to…
       review-safety.html   → urgent form  → redirects to…
       review-done.html     → no form. Confirms, and says the practice calls
                              within 24–48 hours.

   Two separate vocabularies meet here, so keep them straight:

     • The SITE's own short params, below. These travel page → page and are
       ours to name.
     • JOTFORM's field names, in FIELDS. Those are fixed by the form and are
       the unique names WITHOUT the qID prefix — {fullLegal:first}, never
       {q16_fullLegal:first}, which silently prefills nothing.

   The Jotform redirect URLs are configured inside Jotform, not here. They must
   emit the site params below — see README-intake-chain.md. */
const CARRY = ['first', 'last', 'email', 'phone', 'drip'];

/* Site param  →  Jotform field name on the urgent form. */
const FIELDS = {
    first: 'fullLegal[first]',
    last:  'fullLegal[last]',
    email: 'emailAddress',
    phone: 'phoneNumber',
    drip:  'whichIv',
};


/* ── SCRUB THE ADDRESS BAR ───────────────────────────────────────────────────
   Once the patient's details have been handed to the form — or, on the last
   page, once the panel has been painted — they have no further business
   sitting in the address bar.

   This is not cosmetic. Left there they persist in browser history and in the
   back/forward cache on whatever machine this is — a shared laptop, a family
   iPad, a phone someone hands to a friend — and they are readable over
   anyone's shoulder for as long as the page is open. replaceState rewrites the
   entry rather than adding one, so Back still goes where the patient expects.

   What this does NOT undo: the request that carried these params has already
   reached the host, so they may sit in access logs. That is inherent to
   Jotform redirecting by GET, and is a question for whoever holds the hosting
   BAA. */
const scrub = () => {
    if (!location.search) return;
    if (!window.history?.replaceState) return;
    history.replaceState(null, '', location.pathname + location.hash);
};


/* ── EMBED ───────────────────────────────────────────────────────────────────
   One embed for both pages. The iframe declares which form it wants with
   data-form="intake|urgent"; everything else follows from that.

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
        /* Step two. Relay whatever step one sent us.
           A missing value is not an error — the patient can still type it — so
           blanks are skipped rather than passed through as empty strings, which
           would overwrite a value Jotform had already remembered. */
        CARRY.forEach((key) => {
            const val = here.get(key);
            if (val) url.searchParams.set(FIELDS[key], val);
        });
    }

    frame.src = url.toString();

    if (which !== 'intake') scrub();

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
   The picker's entrance, held paused until the title card starts to lift so
   the two overlap. The cards rise in reading order — left to right, row by
   row — which reads as an arrangement rather than a list loading. The bottle
   is not animated separately from its card any more: it arrives with it.

   Returns a play() function, or null if there is nothing to play. */
const choose = () => {
    const sec  = $('#choose');
    const grid = $('#bsBags');
    if (!sec || !grid) return null;

    const cells = [...grid.querySelectorAll('.bs-bag__cell')];
    const lines = [...sec.querySelectorAll('.bs-h1 .l > span')];
    const eye   = $('#bsEyebrow');
    const lede  = $('#bsLede');
    const count = $('#bsCount');
    const unsure = sec.querySelector('.bs-unsure');

    [eye, lede, count, unsure, ...lines].forEach((el) => { if (el) el.dataset.done = '1'; });

    if (!cells.length || typeof window.gsap === 'undefined' || RM.matches) {
        [eye, lede, count, unsure].forEach((el) => { if (el) { el.style.opacity = 1; el.style.transform = 'none'; } });
        lines.forEach((el) => { el.style.transform = 'none'; });
        return null;
    }

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });

    if (eye) tl.fromTo(eye, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .6 });
    if (lines.length) tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: .1 }, '-=.35');
    if (count) tl.fromTo(count, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .7 }, '-=.8');
    if (lede)  tl.fromTo(lede,  { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .75 }, '-=.7');

    tl.fromTo(cells,
        { opacity: 0, y: 46, scale: .96 },
        { opacity: 1, y: 0, scale: 1, duration: 1.15, stagger: { each: .05, from: 'start' } }, '-=.5');

    if (unsure) tl.fromTo(unsure, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .7 }, '-=.8');

    return () => tl.play();
};


/* ── THE ROOM SETTLES ────────────────────────────────────────────────────────
   The review pages' entrance. Built paused and released by the curtain cue so
   it overlaps the title card fading, the same way the picker does on
   begin-screening — one continuous move, not "animation ends, page appears".

   Order is the order you would read the page in: the green panel slides in
   from the left and settles; the bottle lands on it; the progress line draws
   to your step; then the headline rides up line by line, the lede follows,
   and the form frame rises last with its gold rule drawing across the top.

   Everything here is claimed with data-done so contact.js's scroll reveal
   leaves it alone — the two fighting is how a masthead ends up blank. */
const rise = () => {
    const side  = $('#bsSide');
    const stage = $('#bsStage');
    if (!side || !stage) return null;

    const lines = [...stage.querySelectorAll('.bs-h1 .l > span')];
    const eye   = $('#bsEyebrow');
    const lede  = $('#bsLede');
    const frame = $('#screeningForm:not([hidden]), #bsSoon:not([hidden]), #bsDone:not([hidden])');
    const note  = $('#bs911');
    const path  = $('#bsPath');
    const bottle = $('#bsBottleImg');
    const sideBits = [...side.querySelectorAll('.bs-side__back, .bs-side__id, .bs-side__dr')];

    [eye, lede, ...lines, frame, note, side, stage].forEach((el) => { if (el) el.dataset.done = '1'; });

    const fill = () => { if (path) path.style.setProperty('--fill', side.dataset.fill || '0'); };
    const drawFrame = () => { if (frame) frame.style.setProperty('--draw', '1'); };

    if (typeof window.gsap === 'undefined' || RM.matches) {
        [eye, lede, frame, note, side].forEach((el) => { if (el) { el.style.opacity = 1; el.style.transform = 'none'; } });
        lines.forEach((el) => { el.style.transform = 'none'; });
        fill(); drawFrame();
        return null;
    }

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });

    tl.fromTo(side, { opacity: 0, x: -34, rotateY: 6, transformOrigin: 'left center' },
                    { opacity: 1, x: 0,  rotateY: 0, duration: 1.15 })
      .fromTo(sideBits, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7, stagger: .08 }, '-=.75');

    if (bottle) {
        tl.fromTo(bottle, { opacity: 0, y: 26, scale: .92 }, { opacity: 1, y: 0, scale: 1, duration: 1.1 }, '-=.9');
    }
    tl.add(fill, '-=.6');

    if (eye) tl.fromTo(eye, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .6 }, '-=.9');
    if (lines.length) tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.05, stagger: .1 }, '-=.45');
    if (lede) tl.fromTo(lede, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .75 }, '-=.7');
    if (frame) {
        tl.fromTo(frame, { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 1.15 }, '-=.55')
          .add(drawFrame, '-=.9');
    }
    if (note) tl.fromTo(note, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .6 }, '-=.7');

    return () => tl.play();
};


/* ── GREET BY NAME ───────────────────────────────────────────────────────────
   review-done.html reads ?first= so the headline can say "Thank you, Jane."
   Optional in both directions: no name and it just says "Thank you." The value
   is written with textContent, never innerHTML — it arrives from a query string
   and is treated as text, not markup. Trimmed to a sane length so a pasted
   paragraph cannot blow the headline apart. */
const greet = () => {
    const slot = $('#bsWho');
    if (!slot) return;
    const first = (new URLSearchParams(location.search).get('first') || '').trim();
    if (!first) return;
    slot.textContent = `, ${first.slice(0, 24)}`;
};


/* ── HOW IT WORKS DRAWS ITSELF ───────────────────────────────────────────────
   The gold line across the four steps, and the line under the picker headline,
   draw when they scroll into view. CSS does the drawing; this just says when. */
const draw = () => {
    const line = $('#bsLine');
    if (!line || !('IntersectionObserver' in window)) { line?.style.setProperty('--draw', '1'); line?.classList.add('is-drawn'); return; }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            line.style.setProperty('--draw', '1');
            line.classList.add('is-drawn');
            io.disconnect();
        });
    }, { threshold: .35 });
    io.observe(line);
};


/* ── NAME THE TITLE SEQUENCE ─────────────────────────────────────────────────
   review.html opens on the same title card as begin-screening, but it can say
   what the patient actually came for. Runs before cine() so the name is in
   place for the first frame — a card that says "IV support." and then swaps to
   the infusion mid-animation reads as a bug. Falls back to the generic wording
   already in the markup when no infusion was chosen. */
const nameCine = () => {
    const slot = $('#bsCineDrip');
    if (!slot) return;
    const drip = findDrip(new URLSearchParams(location.search).get('drip'));
    if (!drip) return;
    slot.innerHTML = `<em>${drip.name}</em>`;
};


/* ── BOOT ───────────────────────────────────────────────────────────────── */
const boot = () => {
    /* Read this before cine() runs — it clears the class on its way out. */
    const curtain = document.documentElement.classList.contains('has-cine');

    nameCine();

    /* Paint and embed FIRST. rise() animates whichever of the form frame or
       the phone fallback is visible, and it is embed() that decides which —
       stage after it and the real frame just pops in un-animated. */
    const drip = paint();
    greet();
    embed(drip);

    /* A page with no form has nothing to hand the params to, so the moment the
       panel and the headline have read them they come straight back out of the
       address bar. embed() does this itself on the pages that have a form. */
    if (!$('#ctScreenFrame')) scrub();

    /* Stage before anything paints, then let the title card decide when to
       release. choose() is begin-screening's grid, rise() is the review pages'
       room — a page has one or the other, never both. */
    const play = choose() || rise();

    cine();

    if (play) {
        if (curtain) document.addEventListener('ave:curtain', play, { once: true });
        else play();
    }

    draw();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}

/* release the animation start-states if something upstream failed */
if (RM.matches) document.documentElement.classList.remove('ct-on');

export { boot, choose, FORMS, MENU };
