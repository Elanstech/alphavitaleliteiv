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
    const here = new URLSearchParams(location.search);

    const slot = $('#bsWho');
    if (slot) {
        const first = (here.get('first') || '').trim();
        if (first) slot.textContent = `, ${first.slice(0, 24)}`;
    }

    /* The reference is what the patient quotes on the phone, so it has to be
       visible somewhere they can screenshot. textContent, never innerHTML — it
       arrives from a query string and is treated as text, not markup. */
    const ref = $('#bsRef');
    if (ref) {
        const code = (here.get('ref') || '').trim();
        if (code) {
            ref.textContent = `Reference ${code.slice(0, 20)}`;
            ref.hidden = false;
        }
    }
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


/* ═══════════════════════════════════════════════════════════════════════════
   THE SCREENING — review-safety.html
   ───────────────────────────────────────────────────────────────────────────
   The twenty-four questions used to live inside a Jotform iframe on this page.
   They are ours now, so they live here, beside the code that paints the room
   they sit in. Nothing above this line needed to change: the card kept the id
   #screeningForm that rise() animates, and it has no #ctScreenFrame, so
   embed() bails out on its own and scrub() still runs.

   THE RULES, from Dr. Aronov's screening document:
     - Twenty-four questions, one per screen, yes or no. No "unsure" option.
     - Any yes is a hard stop. The assigned explanation shows immediately.
       No appointment is scheduled and nothing is submitted.
     - Questions 1-10 are emergencies: the explanation carries a 911 dialler.
     - All twenty-four no, and only then, reveals the contact form.
     - Passing is not approval, and this must never say that it is.

   WHERE THE ANSWERS LIVE: in ANSWERS below, in memory, and nowhere else.
   Nothing reaches localStorage, sessionStorage, a cookie or the query string,
   and no request leaves the page until the contact form is sent on a pass. A
   stop is therefore recorded nowhere, deliberately — somebody told to call 911
   has not consented to the practice holding a note that they reported chest
   pain, and the practice has no use for one.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ▸ CLINICAL COPY — Dr. Aronov's wording, verbatim. Do not reword, reorder or
   renumber. `e: true` marks questions 1–10, which get the 911 dialler. */
const QUESTIONS = [
  { e: true,
    q: 'Are you currently experiencing chest pain, pressure, squeezing or tightness, with or without pain spreading to your arm, shoulder, back, neck or jaw?',
    r: 'These symptoms may indicate a heart emergency. Stop and call 911 now.' },
  { e: true,
    q: 'Are you experiencing new or severe shortness of breath, difficulty breathing, or blue or gray lips?',
    r: 'These symptoms may indicate a serious heart or breathing problem. Stop and call 911 now.' },
  { e: true,
    q: 'Are you experiencing fainting, near-fainting, or a rapid or irregular heartbeat with chest pain, severe weakness or dizziness?',
    r: 'These symptoms may indicate a serious heart or circulation problem. Stop and call 911 now.' },
  { e: true,
    q: 'Are you experiencing swelling of your lips, tongue or throat, or difficulty breathing from a possible allergic reaction?',
    r: 'This may be anaphylaxis, a life-threatening emergency. Follow your emergency allergy plan and call 911 now.' },
  { e: true,
    q: 'Do you have a blood pressure above 180/120 with chest pain, shortness of breath, weakness, numbness, vision changes or difficulty speaking?',
    r: 'This may be a blood-pressure emergency. Stop and call 911 now.' },
  { e: true,
    q: 'Are you experiencing sudden one-sided weakness or numbness, facial drooping, confusion, or difficulty speaking or understanding speech?',
    r: 'These may be stroke symptoms. Call 911 now.' },
  { e: true,
    q: 'Are you experiencing sudden vision loss, new double or blurred vision, loss of balance, a new seizure or loss of consciousness?',
    r: 'These symptoms may indicate a neurologic emergency. Stop and call 911 now.' },
  { e: true,
    q: 'Are you experiencing a sudden, severe headache or the \u201Cworst headache\u201D of your life?',
    r: 'This may indicate a neurologic emergency. Call 911 now.' },
  { e: true,
    q: 'Are you experiencing severe or worsening abdominal pain, a hard or swollen abdomen, or vomiting with inability to pass stool or gas?',
    r: 'These symptoms may require emergency treatment. Seek emergency care now.' },
  { e: true,
    q: 'Are you vomiting blood or coffee-ground material, or passing black, tarry or bloody stool?',
    r: 'These symptoms may indicate internal bleeding. Seek emergency care now.' },

  { e: false,
    q: 'Do you have a fever, shaking chills, contagious illness, suspected infection, or a red, warm, painful or draining wound or abscess?',
    r: 'Elective infusions are postponed during active or suspected infection. Obtain medical care and rescreen after recovery.' },
  { e: false,
    q: 'Are you taking an antibiotic or antiviral medication for an unresolved acute infection?',
    r: 'Postpone the infusion until the infection and treatment have resolved, or your clinician confirms you are stable.' },
  { e: false,
    q: 'In the past 48 hours, have you had ongoing vomiting or diarrhea, been unable to keep liquids down, urinated much less than usual, or felt significantly dizzy or faint when standing?',
    r: 'You may be dehydrated and need medical evaluation before an elective infusion.' },
  { e: false,
    q: 'Do you receive dialysis, have Stage 4 or 5 kidney disease, a Glomerular Filtration Rate below 30, or produce very little or no urine?',
    r: 'Advanced kidney disease requires specialist fluid and electrolyte management. Alpha Vital Elite cannot offer an elective infusion.' },
  { e: false,
    q: 'Have you been told to restrict fluids because of kidney or heart disease, or have worsening swelling, rapid unexplained weight gain or fluid-related shortness of breath?',
    r: 'An elective infusion could worsen fluid overload. Alpha Vital Elite cannot offer one.' },
  { e: false,
    q: 'Have you recently had repeated blood-pressure readings of 180/120 or higher, even without emergency symptoms?',
    r: 'Contact your clinician promptly for evaluation and blood-pressure management before considering an infusion.' },
  { e: false,
    q: 'Have you been diagnosed with cirrhosis, liver failure, portal hypertension, ascites, hepatic encephalopathy or liver-related jaundice?',
    r: 'Advanced liver disease requires specialist-directed management. Alpha Vital Elite cannot offer an elective infusion.' },
  { e: false,
    q: 'In the past 30 days, have you visited an emergency department, been hospitalized, had surgery or anesthesia, or suffered a serious injury and are still recovering, symptomatic, restricted or awaiting follow-up or clearance?',
    r: 'Complete follow-up and obtain medical clearance before reconsidering an infusion.' },
  { e: false,
    q: 'Within the next 14 days, are you scheduled for surgery, hospitalization or an invasive procedure involving anesthesia, sedation, fasting, bowel preparation or medication changes?',
    r: 'Complete the procedure and recovery before reconsidering an infusion.' },
  { e: false,
    q: 'Are you experiencing or being evaluated for a new, unexplained or worsening symptom without completed testing, diagnosis, treatment or follow-up?',
    r: 'Complete the recommended medical evaluation before considering an elective infusion.' },
  { e: false,
    q: 'In the past six months, have you had a heart attack, acute coronary syndrome, unstable angina, coronary stent, cardiac or major vascular surgery, or hospitalization for heart failure or a serious arrhythmia?',
    r: 'Recent heart or vascular events require specialist-directed care. Alpha Vital Elite cannot offer an elective infusion while risk remains.' },
  { e: false,
    q: 'In the past six months, have you had a stroke or TIA, or do you have an untreated, recently repaired or actively evaluated cerebral aneurysm?',
    r: 'These conditions require specialist-directed care. Alpha Vital Elite cannot offer an elective infusion while risk remains.' },
  { e: false,
    q: 'Have you ever had anaphylaxis, needed emergency epinephrine, had a severe insect-sting reaction, been prescribed an epinephrine device, had a severe reaction to an infusion, injection, medication or contrast, or been diagnosed with sulfite sensitivity or sulfite-triggered asthma?',
    r: 'This history indicates risk of a severe allergic reaction requiring emergency care. Alpha Vital Elite cannot offer an elective infusion.' },
  { e: false,
    q: 'Are you pregnant, possibly pregnant or breastfeeding?',
    r: 'Elective IV ingredients may not be safe or appropriately dosed during pregnancy or breastfeeding. Alpha Vital Elite does not offer infusions during this time.' },
];


/* ▸ JOTFORM — two forms, both on the practice's HIPAA account.
   ──────────────────────────────────────────────────────────────────────────
   Field names and endpoints were read off the live forms' own HTML, not
   guessed. If a field is ever added, moved or renamed inside Jotform these
   names change — re-read them from the form source rather than editing by eye.
   A wrong name does not throw; it posts a blank, which is worse.

   The patient never sees either form. They fill in our fields, in our page,
   and we post on their behalf into a hidden iframe. */
const JOTFORM = {

    /* Step 1 — sent the moment they finish their details, before question one.
       Name is one Full Name field here, not two text boxes, so first and last
       post as [first] and [last] sublabels of the same question. */
    contact: {
        action: 'https://hipaa-submit.jotform.com/submit/262506232577054',
        formID: '262506232577054',
        fields: {
            first: 'q2_q2_fullname0[first]',
            last:  'q2_q2_fullname0[last]',
            email: 'q3_q3_email1',
            phone: 'q4_q4_phone2[full]',
            drip:  'q5_q5_dropdown3',
            ref:   'q6_q6_textbox4',
        },
    },

    /* Step 2 — sent when the screening ends, on a pass OR a stop. Because the
       details are already in hand by then, a stop is now attributable: Dr.
       Aronov learns that somebody was turned away, at which question and why,
       which she could not see when contact came last. */
    answers: {
        action: 'https://hipaa-submit.jotform.com/submit/262505471570051',
        formID: '262505471570051',
        fields: {
            ref:       'q2_q2_textbox0',
            name:      'q3_q3_textbox1',
            email:     'q4_q4_email2',
            phone:     'q5_q5_textbox3',
            drip:      'q6_q6_textbox4',
            outcome:   'q7_q7_textbox5',
            stoppedAt: 'q8_q8_textbox6',
            reason:    'q9_q9_textarea7',
            emergency: 'q10_q10_textbox8',
            log:       'q11_q11_textarea9',
        },
    },
};

const PHONE = '+13477148660';


/* $ and RM are already defined at the top of this file. */
let step = 0;                  /* index of the question on screen */
const ANSWERS = [];            /* 'yes' | 'no', index-aligned */
const PATIENT = {};            /* filled by step one, read by step two */

/* Ties the two submissions together in Dr. Aronov's inbox. Deliberately not a
   name or an email — those change and repeat; this does not. */
const REF = 'AVE-' + Date.now().toString(36).toUpperCase().slice(-5)
          + Math.random().toString(36).toUpperCase().slice(2, 5);


/* ── POSTING ─────────────────────────────────────────────────────────────────
   A real form POST into a hidden iframe, not fetch(). Jotform's submit endpoint
   sends no CORS headers, so fetch is blocked outright; a form POST is not.
   Neither can read the response back, which is why the setup notes insist on a
   live test — Jotform's own notification email is the only real receipt.

   Fire-and-forget on purpose. Nothing waits on this, so a slow or failed post
   can never delay a 911 screen appearing. */
const post = (cfg, values) => {
    if (!cfg.action) { console.error('[screening] no action configured', cfg); return null; }

    const sink = document.createElement('iframe');
    sink.style.display = 'none';
    sink.name = 'sq-' + Math.random().toString(36).slice(2, 9);
    document.body.appendChild(sink);

    const f = document.createElement('form');
    f.method = 'POST';
    f.target = sink.name;
    f.action = cfg.action;
    f.style.display = 'none';

    Object.entries(values).forEach(([key, val]) => {
        const name = cfg.fields[key];
        if (!name) return;
        const el = document.createElement('input');
        el.type = 'hidden'; el.name = name; el.value = val == null ? '' : String(val);
        f.appendChild(el);
    });

    const id = document.createElement('input');
    id.type = 'hidden'; id.name = 'formID'; id.value = cfg.formID;
    f.appendChild(id);

    document.body.appendChild(f);
    try {
        f.submit();
        console.info('[screening] posted to', cfg.formID, Object.keys(values).join(', '));
    } catch (err) {
        console.error('[screening] POST FAILED', cfg.formID, err);
        return null;
    }
    return sink;
};

/* Every question and its answer, as Dr. Aronov would read it down the page.
   Unanswered questions are marked rather than omitted, so a stop at question 3
   does not look like a form that lost twenty-one fields. */
const answerLog = () => QUESTIONS.map((item, n) => {
    const a = ANSWERS[n];
    return (n + 1) + '. ' + item.q + '\n   ANSWER: '
         + (a ? a.toUpperCase() : 'not reached');
}).join('\n\n');


/* ── THE RAIL ────────────────────────────────────────────────────────────────
   Twenty-four ticks, one per question, built once at boot. A percentage bar
   would say "partway through"; this says how many questions there are and
   exactly which one you are on, which is what somebody actually wants to know
   at question seven. */
const buildRail = (rail) => {
    if (!rail) return [];
    const frag = document.createDocumentFragment();
    QUESTIONS.forEach(() => {
        const t = document.createElement('span');
        t.className = 'sq__t';
        frag.appendChild(t);
    });
    rail.appendChild(frag);
    return [...rail.children];
};


/* Warm the handoff. review-done.html shares this stylesheet and script, so by
   the time it is asked for the only new bytes are its own markup. Called once,
   four questions out. */
let warmed = false;
const warm = () => {
    if (warmed) return;
    warmed = true;
    const l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = 'review-done.html';
    document.head.appendChild(l);
};


/* ── THE SCREENER ────────────────────────────────────────────────────────── */
const screener = () => {
    const card = $('#screeningForm');
    if (!card) return;                              /* not this page */

    const side  = $('#bsSide');
    const ticks = buildRail($('#sqRail'));
    const head  = $('#sqHead');
    const now   = $('#sqNow');
    const qText = $('#sqQ');
    const back  = $('#sqBack');
    const halt  = $('#sqHalt');
    const theme = $('#themeColor');

    const pane = (id) => {
        ['sqIntro', 'sqQuestion', 'sqStop', 'sqPass'].forEach((p) => {
            $('#' + p).classList.toggle('is-on', p === id);
        });
    };

    /* The green panel has to keep up. This was the bug: the pane changed, the
       step indicator beside it did not, so the patient was on step two being
       told they were on step one. */
    const setStep = (n) => {
        try {
            const one = n === 1;
            $('#bsPath1')?.classList.toggle('is-now', one);
            $('#bsPath1')?.classList.toggle('is-done', !one);
            $('#bsPath2')?.classList.toggle('is-now', !one);
            const num  = $('#sqBarNum');  if (num)  num.textContent  = one ? 'I' : 'II';
            const lab  = $('#sqBarStep'); if (lab)  lab.textContent  = one ? 'Your details' : 'Safety questions';
            const eye  = $('#bsEyebrow'); if (eye)  eye.textContent  = one ? 'Step one of two' : 'Step two of two';
            if (side) {
                side.dataset.numeral = one ? 'I' : 'II';
                side.dataset.fill = one ? '0' : '1';
                $('#bsPath')?.style.setProperty('--fill', one ? '0' : '1');
            }
        } catch (err) {
            /* A wrong step label is cosmetic. Questions not appearing is not —
               never let this throw into the caller. */
            console.error('[screening] setStep', err);
        }
    };

    /* ── question ─────────────────────────────────────────────────────────── */
    const ask = () => {
        ticks.forEach((t, n) => {
            t.classList.toggle('is-done', n < step);
            t.classList.toggle('is-now', n === step);
        });
        now.textContent = step + 1;
        qText.textContent = QUESTIONS[step].q;
        back.hidden = step === 0;
        head.hidden = false;
        pane('sqQuestion');
        qText.focus({ preventScroll: true });        /* hear the question first */

        /* Retrigger the keyframe. The reflow read is the documented way to
           restart a CSS animation and is cheaper than building a tween. */
        qText.classList.remove('is-new');
        void qText.offsetWidth;
        qText.classList.add('is-new');

        /* The thank-you page is fetched while they are still answering, so the
           handoff on the last question is instant rather than a cold load. */
        if (step === QUESTIONS.length - 4) warm();
    };

    /* ── record ───────────────────────────────────────────────────────────── */
    const record = (outcome, n) => {
        const item = n == null ? null : QUESTIONS[n];
        return post(JOTFORM.answers, {
            ref:       REF,
            name:      PATIENT.first + ' ' + PATIENT.last,
            email:     PATIENT.email,
            phone:     PATIENT.phone,
            drip:      PATIENT.drip,
            outcome:   outcome,
            stoppedAt: item ? 'Question ' + (n + 1) + ' of 24' : 'None',
            reason:    item ? item.r : 'Answered No to all 24 questions.',
            emergency: item && item.e ? 'YES \u2014 911 instruction shown' : 'No',
            log:       answerLog(),
        });
    };

    /* ── stop ─────────────────────────────────────────────────────────────────
       Two treatments, decided by the question rather than by the code's
       convenience. Questions 1-10 are emergencies and take over the viewport;
       11-24 stay in the card, in the house palette, because her wording for
       them says postpone and rescreen, not call 911. A screen that cries wolf
       fourteen times out of twenty-four is not believed the ten times it counts.

       The record is posted first and does not block — a slow network must never
       hold up a 911 screen. */
    const stop = (n) => {
        const item = QUESTIONS[n];
        const ref = 'Question ' + (n + 1) + ' of 24 \u00B7 Screening ended \u00B7 Ref ' + REF;
        record('STOPPED', n);

        if (!item.e) {
            head.hidden = true;
            $('#sqStopReason').textContent = item.r;
            $('#sqStopRef').textContent = ref;
            pane('sqStop');
            $('#sqStopReason').focus({ preventScroll: true });
            card.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
            return;
        }

        $('#sqHaltReason').textContent = item.r;
        $('#sqHaltBody').innerHTML = 'Do not wait for a call back, and do not drive '
            + 'yourself. <b>Alpha Vital Elite is not an emergency or urgent-care facility.</b>';
        $('#sqHaltRef').textContent = ref;
        $('#sqHaltCall').hidden = false;

        if (theme) theme.content = '#6E120C';
        document.documentElement.style.overflow = 'hidden';
        $('#main')?.setAttribute('aria-hidden', 'true');
        $('#head')?.setAttribute('aria-hidden', 'true');
        halt.hidden = false;
        $('#sqCall').focus({ preventScroll: true });
    };

    /* A mis-tap on a 24-question form is far likelier than a fabricated symptom,
       so the way back exists. The correction is posted as its own record rather
       than replacing the first — an audit trail that can only be added to. */
    const unstop = () => {
        halt.hidden = true;
        if (theme) theme.content = '#F6F1E7';
        document.documentElement.style.overflow = '';
        $('#main')?.removeAttribute('aria-hidden');
        $('#head')?.removeAttribute('aria-hidden');
        ANSWERS.length = step;
        ask();
    };

    /* ── pass ─────────────────────────────────────────────────────────────────
       The card confirms, then hands off to review-done.html — the thank-you
       page, with the seal, what-happens-next and the practice's number. A card
       inside a form is the wrong shape for "we are finished and we will call
       you"; a page they can screenshot is the right one.

       The redirect WAITS for the answers POST to land. Navigating away from an
       in-flight form submission cancels it, and a screening that silently fails
       to reach Dr. Aronov while telling the patient it arrived is the worst bug
       this thing could have. The iframe's load event fires when Jotform
       responds; the timer is the backstop for a network that never answers, and
       we go anyway rather than trapping somebody on a spinner. */
    const pass = () => {
        const sink = record('PASSED', null);
        head.hidden = true;
        $('#sqPassRef').textContent = 'Screening complete \u00B7 Ref ' + REF;
        pane('sqPass');
        card.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });

        const q = new URLSearchParams({
            first: PATIENT.first || '',
            drip:  PATIENT.drip  || '',
            ref:   REF,
        });
        const go = () => location.assign('review-done.html?' + q.toString());

        let gone = false;
        const once = () => { if (!gone) { gone = true; go(); } };
        /* Go as soon as the POST is acknowledged. The 150ms is the seal being
           seen, not a technical wait. The backstop covers a network that never
           answers — 1.6s, because past that the pause reads as a broken page
           rather than as work being done. */
        sink?.addEventListener('load', () => setTimeout(once, 150), { once: true });
        setTimeout(once, 1600);
    };

    /* ── step one: their details ──────────────────────────────────────────── */
    $('#sqBegin').addEventListener('click', () => {
        const err = $('#sqErr');
        const val = (id) => ($(id).value || '').trim();

        if (!val('#sqFirst') || !val('#sqLast') || !val('#sqEmail') || !val('#sqPhone')) {
            err.textContent = 'Add your name, email and phone so the practice can reach you.';
            err.hidden = false; return;
        }
        if (!$('#sqEmail').checkValidity()) {
            err.textContent = 'That email address does not look right.';
            err.hidden = false; return;
        }
        err.hidden = true;

        PATIENT.first = val('#sqFirst');
        PATIENT.last  = val('#sqLast');
        PATIENT.email = val('#sqEmail');
        PATIENT.phone = val('#sqPhone');
        PATIENT.drip  = $('#sqDrip').value || 'Not sure yet';

        post(JOTFORM.contact, { ref: REF, ...PATIENT });

        setStep(2);
        step = 0; ANSWERS.length = 0;
        ask();
    });

    card.querySelectorAll('.sq__b').forEach((btn) => {
        btn.addEventListener('click', () => {
            ANSWERS[step] = btn.dataset.answer;
            if (btn.dataset.answer === 'yes') { stop(step); return; }
            if (step === QUESTIONS.length - 1) { pass(); return; }
            step += 1;
            ask();
        });
    });

    back.addEventListener('click', () => {
        if (step === 0) return;
        step -= 1;
        ANSWERS.length = step;
        ask();
    });

    $('#sqHaltBack').addEventListener('click', unstop);
    $('#sqStopBack').addEventListener('click', () => { pane('sqQuestion'); unstop(); });

    setStep(1);
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
    screener();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}

/* release the animation start-states if something upstream failed */
if (RM.matches) document.documentElement.classList.remove('ct-on');

export { boot, choose, FORMS, MENU, QUESTIONS, JOTFORM };
