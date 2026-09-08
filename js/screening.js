/* ═══════════════════════════════════════════════════════════════════════════
   screener.js — the 24-question preliminary safety screening

   Runs on review-safety.html only, alongside screening.js. It does not touch
   the green panel, the title card or the entrance animation: screening.js
   still owns all of those, and it needs no changes, because this page keeps
   the ids it looks for (#bsSide, #bsStage, #screeningForm) and drops the one
   it does not (#ctScreenFrame, the Jotform iframe — gone).

   ── THE RULES, from Dr. Aronov's screening document ─────────────────────────
     • Twenty-four questions, one per screen, yes or no. No "unsure" option.
     • Any yes is a hard stop. The assigned explanation is shown immediately.
       No appointment is scheduled and nothing is submitted.
     • Questions 1–10 are emergencies: the explanation appears with a
       tap-to-call 911 button.
     • All twenty-four no, and only then, reveals the contact form.
     • Passing is not approval, and this must never say that it is.

   ── WHERE THE ANSWERS LIVE ──────────────────────────────────────────────────
   In the ANSWERS array below, in memory, and nowhere else. Nothing is written
   to localStorage, sessionStorage, a cookie or the query string, and no
   request leaves the page until the contact form is sent on a full pass. A
   refusal is therefore not recorded anywhere — which is deliberate. A patient
   who is told to call 911 has not consented to the practice holding a note
   that they reported chest pain, and the practice has no use for one.
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


/* ▸ JOTFORM — THE ONLY BLOCK TO EDIT BEFORE THIS GOES LIVE.
   ──────────────────────────────────────────────────────────────────────────
   The contact form is ours; Jotform is only the store. On a pass we POST the
   five fields into a hidden iframe, so the patient never leaves this page and
   never sees a Jotform skin.

   `action` and every value in `fields` must be copied out of the live form's
   own HTML — see the setup notes. Guessing them does not throw an error; it
   posts a blank submission, which is worse. Leave ACTION empty and the form
   falls back to the phone number rather than pretending to send. */
const JOTFORM = {
    action: '',                     // ← the live form's <form action="...">
    formID: '',                     // ← the numeric form id
    fields: {
        first:  '',                 // ← e.g. q3_fullName[first]
        last:   '',                 // ← e.g. q3_fullName[last]
        email:  '',                 // ← e.g. q4_email
        phone:  '',                 // ← e.g. q5_phone[full]
        drip:   '',                 // ← e.g. q6_whichIv
        result: '',                 // ← e.g. q7_screeningResult (hidden field)
    },
};

/* What we record about the screening itself. It is always the same string,
   because a stop never reaches this code — but it makes each submission
   self-describing in the Jotform inbox, which is the point. */
const PASS_NOTE = 'Passed preliminary safety screening \u2014 answered No to all 24 questions.';

const PHONE = '+19292010740';


/* ── PLUMBING ────────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const RM = matchMedia('(prefers-reduced-motion: reduce)');

let step = 0;                  /* index of the question on screen */
const ANSWERS = [];            /* 'yes' | 'no', index-aligned, memory only */


/* ── THE RAIL ────────────────────────────────────────────────────────────── */
const buildRail = (rail) => {
    const frag = document.createDocumentFragment();
    QUESTIONS.forEach(() => {
        const t = document.createElement('span');
        t.className = 'sq__t';
        frag.appendChild(t);
    });
    rail.appendChild(frag);
    return [...rail.children];
};


/* ── THE SCREENER ────────────────────────────────────────────────────────── */
const screener = () => {
    const card = $('#screeningForm');
    if (!card) return;                              /* not this page */

    const ticks   = buildRail($('#sqRail'));
    const head    = $('#sqHead');
    const now     = $('#sqNow');
    const qText   = $('#sqQ');
    const back    = $('#sqBack');
    const halt    = $('#sqHalt');
    const theme   = $('#themeColor');

    const pane = (id) => {
        ['sqIntro', 'sqQuestion', 'sqPass'].forEach((p) => {
            $('#' + p).classList.toggle('is-on', p === id);
        });
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

        /* Focus the question, not a button — a screen reader has to hear what
           is being asked before it hears the two options. */
        qText.focus({ preventScroll: true });

        if (!RM.matches && window.gsap) {
            gsap.fromTo(qText, { opacity: 0, y: 12 },
                        { opacity: 1, y: 0, duration: .45, ease: 'expo.out' });
        }
    };

    /* ── stop ─────────────────────────────────────────────────────────────────
       Covers the whole viewport rather than scrolling to a panel, so there is
       no moment where half the old screen is still showing. The theme colour
       goes red too, which turns the browser chrome on a phone. */
    const stop = (n) => {
        const item = QUESTIONS[n];

        $('#sqHaltReason').textContent = item.r;
        $('#sqHaltBody').innerHTML = item.e
            ? 'Do not wait for a call back, and do not drive yourself. '
              + '<b>Alpha Vital Elite is not an emergency or urgent-care facility.</b>'
            : 'Based on your answers, <b>Alpha Vital Elite cannot provide an elective '
              + 'infusion at this time</b>, and no appointment has been scheduled. '
              + 'Nothing has been sent to the practice. Questions about this result: '
              + '<a href="tel:' + PHONE + '">(929) 201-0740</a>.';
        $('#sqHaltRef').textContent = 'Question ' + (n + 1) + ' of 24 \u00B7 Screening ended';
        $('#sqHaltCall').hidden = !item.e;

        if (theme) theme.content = '#6E120C';
        document.documentElement.style.overflow = 'hidden';
        $('#main')?.setAttribute('aria-hidden', 'true');
        $('#head')?.setAttribute('aria-hidden', 'true');
        halt.hidden = false;

        /* Land the keyboard on the one control that matters. */
        (item.e ? $('#sqCall') : $('#sqHaltBack')).focus({ preventScroll: true });
    };

    /* Backing out of a stop. Offered because a mis-tap is far more likely than
       a fabricated symptom — not because the stop is negotiable. It returns to
       the question that triggered it, with that answer cleared. */
    const unstop = () => {
        halt.hidden = true;
        if (theme) theme.content = '#F6F1E7';
        document.documentElement.style.overflow = '';
        $('#main')?.removeAttribute('aria-hidden');
        $('#head')?.removeAttribute('aria-hidden');
        ANSWERS.length = step;
        ask();
    };

    /* ── pass ─────────────────────────────────────────────────────────────── */
    const pass = () => {
        head.hidden = true;
        pane('sqPass');
        card.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
    };

    /* ── wiring ───────────────────────────────────────────────────────────── */
    $('#sqBegin').addEventListener('click', () => { step = 0; ANSWERS.length = 0; ask(); });

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

    submitForm();
};


/* ── THE CONTACT FORM ────────────────────────────────────────────────────────
   A real form POST into a hidden iframe, not fetch(). Jotform's submit
   endpoint sends no CORS headers, so fetch is blocked outright; a form POST
   is not. Neither can read the response, so the confirmation below is
   optimistic by design — the practice's own Jotform notification email is the
   real receipt, which is why the setup notes insist on sending a test. */
const submitForm = () => {
    const send = $('#sqSend');
    if (!send) return;

    const err = $('#sqErr');
    const val = (id) => ($(id).value || '').trim();

    send.addEventListener('click', () => {
        if (!val('#sqFirst') || !val('#sqLast') || !val('#sqEmail') || !val('#sqPhone')) {
            err.textContent = 'Add your name, email and phone so the practice can reach you.';
            err.hidden = false; return;
        }
        if (!$('#sqEmail').checkValidity()) {
            err.textContent = 'That email address does not look right.';
            err.hidden = false; return;
        }
        if (!JOTFORM.action) {
            err.textContent = 'This form is not connected yet \u2014 please call the practice on (929) 201-0740.';
            err.hidden = false; return;
        }
        err.hidden = true;
        send.disabled = true;

        const sink = document.createElement('iframe');
        sink.name = 'sqSink';
        sink.style.display = 'none';
        document.body.appendChild(sink);

        const f = document.createElement('form');
        f.method = 'POST';
        f.target = 'sqSink';
        f.action = JOTFORM.action;
        f.style.display = 'none';

        const put = (name, value) => {
            if (!name) return;
            const el = document.createElement('input');
            el.type = 'hidden'; el.name = name; el.value = value;
            f.appendChild(el);
        };

        put(JOTFORM.fields.first,  val('#sqFirst'));
        put(JOTFORM.fields.last,   val('#sqLast'));
        put(JOTFORM.fields.email,  val('#sqEmail'));
        put(JOTFORM.fields.phone,  val('#sqPhone'));
        put(JOTFORM.fields.drip,   $('#sqDrip').value || 'Not sure yet');
        put(JOTFORM.fields.result, PASS_NOTE);
        put('formID', JOTFORM.formID);

        document.body.appendChild(f);
        f.submit();

        $('#sqForm').hidden = true;
        $('#sqSent').hidden = false;
        $('#sqSent').scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'center' });
    });
};


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', screener, { once: true });
} else {
    screener();
}

export { QUESTIONS, JOTFORM };
