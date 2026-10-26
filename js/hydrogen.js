/* =============================================================================
   ALPHA VITAL ELITE IV — HYDROGEN.JS
   The hydrogen session request on /hydrogen-inhalation/#request.

   One page, one submission: contact details + preferred times + the nine
   screening answers, posted together to the practice's HIPAA Jotform — the
   same "answers" form the IV screener uses (js/screening.js), with the
   infusion field set to "Hydrogen Inhalation" so the office can tell them
   apart.

   Outcomes, per Dr. Aronov's screening rules:
     BLOCK  — "Yes" to Q4 (cardiac event < 6 months) or Q8 (liver failure).
              The submit button is withdrawn; nothing is sent.
     HOLD   — "Yes" to Q1, 2, 3, 5, 6, 7 or 9. The request goes through,
              flagged for review; a physician's clearance note is needed
              before the first session.
     CLEAR  — "No" to all nine.
============================================================================= */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* Field names were read off the live form by screening.js — keep in sync. */
const JOTFORM = {
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
};

const REF = 'AVE-H2-' + Date.now().toString(36).toUpperCase().slice(-5)
          + Math.random().toString(36).toUpperCase().slice(2, 4);

const PHONE_LINK = '<a href="tel:+13477148660">347&#8202;·&#8202;714&#8202;·&#8202;8660</a>';


/* A real form POST into a hidden iframe — Jotform's endpoint sends no CORS
   headers, so fetch() is blocked. The response can't be read back. */
const post = (values) => {
    const sink = document.createElement('iframe');
    sink.style.display = 'none';
    sink.name = 'h2-' + Math.random().toString(36).slice(2, 9);
    document.body.appendChild(sink);

    const f = document.createElement('form');
    f.method = 'POST';
    f.target = sink.name;
    f.action = JOTFORM.action;
    f.style.display = 'none';

    const add = (name, value) => {
        const el = document.createElement('input');
        el.type = 'hidden'; el.name = name; el.value = value == null ? '' : String(value);
        f.appendChild(el);
    };

    Object.entries(values).forEach(([key, val]) => {
        if (JOTFORM.fields[key]) add(JOTFORM.fields[key], val);
    });
    add('formID', JOTFORM.formID);
    /* Jotform's spam check — without simple_spc the POST is silently dropped. */
    add('simple_spc', JOTFORM.formID + '-' + JOTFORM.formID);
    add('submitSource', 'form');
    add('jsExecutionTracker', 'build-date-' + Date.now());
    add('website', '');

    document.body.appendChild(f);
    try {
        f.submit();
        return true;
    } catch (err) {
        console.error('[hydrogen] post failed', err);
        return false;
    }
};


const init = () => {
    const form = $('#h2Form');
    if (!form) return;

    const qs      = $$('.h2-q', form);
    const status  = $('#h2Status');
    const submit  = $('#h2Submit');
    const done    = $('#h2Done');
    const details = ['name', 'phone', 'email', 'times'].map((n) => form.elements[n]);

    const answer = (li) => {
        const on = $('input:checked', li);
        return on ? on.value : null;
    };

    const read = () => {
        const block = [], hold = [];
        qs.forEach((li, i) => {
            if (answer(li) !== 'yes') return;
            (li.dataset.kind === 'block' ? block : hold).push(i + 1);
        });
        return { block, hold };
    };

    const list = (ns) => ns.length === 1 ? 'question ' + ns[0]
        : 'questions ' + ns.slice(0, -1).join(', ') + ' and ' + ns[ns.length - 1];

    /* ── the box above the submit button ─────────────────────────────────── */
    const paint = () => {
        const { block, hold } = read();

        if (block.length) {
            status.hidden = false;
            status.className = 'h2-status is-block';
            status.innerHTML = '<i class="ph-duotone ph-prohibit"></i><div><b>We can&rsquo;t book this session online.</b>'
                + '<p>Because you answered &ldquo;Yes&rdquo; to ' + list(block) + ', our online booking system can&rsquo;t move '
                + 'forward, to preserve your health and safety. If you have questions, please call our office at ' + PHONE_LINK + '.</p></div>';
            submit.hidden = true;
            return;
        }

        submit.hidden = false;
        if (hold.length) {
            status.hidden = false;
            status.className = 'h2-status is-hold';
            status.innerHTML = '<i class="ph-duotone ph-flag"></i><div><b>Medical clearance hold</b>'
                + '<p>Because you answered &ldquo;Yes&rdquo; to ' + list(hold) + ', your request will be flagged for review. '
                + 'You will need to provide or bring a standard physician&rsquo;s clearance note before your first chair session can begin.</p></div>';
        } else {
            status.hidden = true;
            status.innerHTML = '';
        }
    };

    qs.forEach((li) => {
        li.addEventListener('change', () => {
            const yes = answer(li) === 'yes';
            li.classList.toggle('is-yes', yes);
            li.classList.toggle('is-no', !yes);
            li.classList.remove('is-missing');
            $('.h2-q__note', li).hidden = !yes;
            paint();
        });
    });

    /* ── contact details ──────────────────────────────────────────────────── */
    const okField = (el) => {
        const v = el.value.trim();
        if (!v) return false;
        if (el.name === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (el.name === 'phone') return v.replace(/\D/g, '').length >= 10;
        return true;
    };
    const checkDetails = () => {
        let first = null;
        details.forEach((el) => {
            const ok = okField(el);
            el.closest('.h2-field').classList.toggle('is-bad', !ok);
            el.setAttribute('aria-invalid', String(!ok));
            if (!ok && !first) first = el;
        });
        return first;
    };
    details.forEach((el) => el.addEventListener('input', () => {
        if (okField(el)) {
            el.closest('.h2-field').classList.remove('is-bad');
            el.setAttribute('aria-invalid', 'false');
        }
    }));

    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    $('#h2Next')?.addEventListener('click', () => {
        const bad = checkDetails();
        if (bad) { bad.focus(); return; }
        $('#screening').scrollIntoView({ behavior: smooth, block: 'start' });
        setTimeout(() => $('input', qs[0])?.focus({ preventScroll: true }), 450);
    });

    /* ── submit ───────────────────────────────────────────────────────────── */
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const bad = checkDetails();
        if (bad) { bad.focus(); bad.scrollIntoView({ behavior: smooth, block: 'center' }); return; }

        const missing = qs.filter((li) => !answer(li));
        qs.forEach((li) => li.classList.toggle('is-missing', !answer(li)));
        if (missing.length) {
            status.hidden = false;
            status.className = 'h2-status is-missing';
            status.innerHTML = '<i class="ph-duotone ph-warning-circle"></i><div><b>Please answer every question.</b>'
                + '<p>' + missing.length + ' of 9 still need a Yes or No answer.</p></div>';
            missing[0].scrollIntoView({ behavior: smooth, block: 'center' });
            $('input', missing[0]).focus({ preventScroll: true });
            return;
        }

        const { block, hold } = read();
        if (block.length) { paint(); return; }   /* belt and braces: never sent */

        const v = Object.fromEntries(details.map((el) => [el.name, el.value.trim()]));
        const log = 'Preferred days & times: ' + v.times + '\n\n'
            + qs.map((li, i) => (i + 1) + '. ' + $('.h2-q__ask span', li).textContent.trim()
                + '\n   ANSWER: ' + answer(li).toUpperCase()
                + (answer(li) === 'yes' ? '  → PHYSICIAN CLEARANCE NOTE REQUIRED' : '')).join('\n\n');

        submit.disabled = true;
        $('span', submit).textContent = 'Sending…';

        post({
            ref:       REF,
            name:      v.name,
            email:     v.email,
            phone:     v.phone,
            drip:      'Hydrogen Inhalation',
            outcome:   hold.length
                         ? 'HYDROGEN REQUEST — MEDICAL CLEARANCE HOLD (physician clearance note required)'
                         : 'HYDROGEN REQUEST — CLEAR (answered No to all 9)',
            stoppedAt: hold.length ? 'Yes to ' + hold.map((n) => 'Q' + n).join(', ') : 'None',
            reason:    'Preferred days & times: ' + v.times
                         + (hold.length ? '\nClearance hold — answered Yes to ' + list(hold) + '.' : '\nAnswered No to all screening questions.'),
            emergency: 'No',
            log,
        });

        /* the iframe can't report back; give the POST a moment to leave */
        setTimeout(() => {
            form.hidden = true;
            const first = v.name.split(/\s+/)[0];
            $('#h2DoneName').textContent = first ? ', ' + first : '';
            if (hold.length) {
                const h = $('#h2DoneHold');
                h.hidden = false;
                h.textContent = 'Because you answered “Yes” to ' + list(hold)
                    + ', please have a standard physician’s clearance note ready — it is required before your first chair session can begin.';
            }
            done.hidden = false;
            done.scrollIntoView({ behavior: smooth, block: 'center' });
            done.focus({ preventScroll: true });
        }, 900);
    });
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
