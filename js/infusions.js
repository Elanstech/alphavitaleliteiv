/* ═════════════════════════════════════════════════════════════════
   INFUSIONS.JS — /htmls/infusions.html
   Loads AFTER /script.js and shares its GSAP + ScrollTrigger CDN.
   Bails immediately unless .page-ix is present.

     Helpers
     Opening    aura, counters, the belt
     Cabinet    the ten slats — open, pin, deep-link
     Sort       menu order · chair time · rate
     Field      the plot, built from the slats' own data
   ═════════════════════════════════════════════════════════════════ */

(() => {
    const page = document.querySelector('.page-ix');
    if (!page) return;

    /* ── HELPERS ── */
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];

    const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE    = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const GS      = typeof window.gsap !== 'undefined';
    if (GS) gsap.registerPlugin(ScrollTrigger);

    const isRail = () => matchMedia('(min-width: 1025px)').matches;

    // if the shared script never booted, nothing here should stay hidden
    requestAnimationFrame(() => document.body.classList.add('is-ready'));

    // set the start state, then tween to the end — a ScrollTrigger refresh
    // can never strand an element at opacity 0
    const rise = (targets, opts = {}, trigger, start = 'top 86%') => {
        const els = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
        if (!els.length || !GS) return;
        if (REDUCED) { gsap.set(els, { opacity: 1, y: 0, scale: 1 }); return; }
        const { y = 30, scale = 1, duration = .7, ease = 'expo.out', stagger = 0 } = opts;
        gsap.set(els, { opacity: 0, y, scale });
        gsap.to(els, {
            opacity: 1, y: 0, scale: 1, duration, ease, stagger,
            scrollTrigger: { trigger: trigger || els[0], start, once: true },
        });
    };

    // the shared Nav is the only thing allowed to scroll the page
    const goTo = (el) => {
        const nav = window.AVE?.modules?.nav;
        if (nav) nav.to(el);
        else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    };


    /* ── OPENING ── */
    const open = $('.ix-open');
    const aura = $('#ixAura');

    if (open && aura && FINE && !REDUCED) {
        let tx = 76, ty = 26, cx = 76, cy = 26, live = false;

        const loop = () => {
            if (!live && Math.abs(tx - cx) < .2 && Math.abs(ty - cy) < .2) return;
            cx += (tx - cx) * .07;
            cy += (ty - cy) * .07;
            aura.style.setProperty('--ax', cx.toFixed(2) + '%');
            aura.style.setProperty('--ay', cy.toFixed(2) + '%');
            requestAnimationFrame(loop);
        };

        open.addEventListener('pointermove', (e) => {
            const b = open.getBoundingClientRect();
            tx = ((e.clientX - b.left) / b.width) * 100;
            ty = ((e.clientY - b.top) / b.height) * 100;
        });
        open.addEventListener('pointerenter', () => { live = true; open.classList.add('is-warm'); loop(); });
        open.addEventListener('pointerleave', () => { live = false; open.classList.remove('is-warm'); });
    }

    $$('[data-count]').forEach((el) => {
        const end = +el.dataset.count;
        if (!GS || REDUCED) { el.textContent = end; return; }
        const o = { v: 0 };
        gsap.to(o, {
            v: end, duration: 1.6, ease: 'expo.out', delay: .55,
            onUpdate: () => { el.textContent = Math.round(o.v); },
        });
    });

    /* the belt runs slowly and slows further under the pointer */
    const belt = $('#ixBelt');
    const tape = $('#ixTape');
    if (belt && tape && GS && !REDUCED) {
        const run = gsap.to(belt, { xPercent: -50, duration: 64, ease: 'none', repeat: -1 });
        tape.addEventListener('pointerenter', () => gsap.to(run, { timeScale: .12, duration: .5 }));
        tape.addEventListener('pointerleave', () => gsap.to(run, { timeScale: 1, duration: .8 }));
        document.addEventListener('visibilitychange', () => (document.hidden ? run.pause() : run.play()));
    }


    /* ── CABINET ── */
    const rack  = $('#ixRack');
    const slats = rack ? $$('.ix-slat', rack) : [];
    if (!rack || !slats.length) return;

    /* the field's readout — declared here because the cabinet writes to it
       from the moment the first slat opens */
    const dots = new Map();
    const read = {
        box:  $('#ixRead'),
        cat:  $('#ixReadCat'),
        name: $('#ixReadName'),
        time: $('#ixReadTime'),
        fee:  $('#ixReadFee'),
        go:   $('#ixReadGo'),
    };

    const syncField = (el) => {
        if (!read.box || !el) return;
        const d = el.dataset;
        read.box.style.setProperty('--ix-tone', el.style.getPropertyValue('--tone') || '#C1963F');
        read.cat.textContent  = d.cat;
        read.name.textContent = d.name;
        read.time.textContent = d.time;
        read.fee.textContent  = d.fee;
        read.go.setAttribute('href', '#' + el.id);
        dots.forEach((slat, dot) => dot.classList.toggle('is-live', slat === el));
    };

    let liveEl = null;
    let pinEl  = slats[0];

    const openSlat = (el, animate = true) => {
        if (!el) return;
        liveEl = el;

        slats.forEach((s) => {
            const on = s === el;
            s.classList.toggle('is-open', on);
            $('.ix-slat__spine', s)?.setAttribute('aria-expanded', String(on));
        });

        syncField(el);

        if (!animate || !GS || REDUCED) return;

        const bits = $$('[data-bit]', el);
        const bag  = $('.ix-slat__bag', el);
        gsap.killTweensOf([...bits, bag].filter(Boolean));
        gsap.set(bits, { opacity: 0, y: 20 });
        gsap.to(bits, { opacity: 1, y: 0, duration: .55, ease: 'expo.out', stagger: .05, delay: .16 });
        if (bag) {
            gsap.set(bag, { opacity: 0, y: 30, rotate: 2 });
            gsap.to(bag, { opacity: 1, y: 0, rotate: 0, duration: .95, ease: 'expo.out', delay: .14 });
        }
    };

    const closeAll = () => {
        liveEl = null;
        slats.forEach((s) => {
            s.classList.remove('is-open');
            $('.ix-slat__spine', s)?.setAttribute('aria-expanded', 'false');
        });
    };

    slats.forEach((slat) => {
        const spine = $('.ix-slat__spine', slat);

        spine?.addEventListener('click', () => {
            if (isRail()) { pinEl = slat; openSlat(slat); return; }
            if (slat === liveEl) { closeAll(); return; }        // tap again to close
            openSlat(slat);
        });

        if (FINE) {
            slat.addEventListener('pointerenter', () => { if (isRail()) openSlat(slat); });
        }
        spine?.addEventListener('focus', () => { if (isRail()) openSlat(slat); });
    });

    rack.addEventListener('pointerleave', () => { if (isRail() && pinEl !== liveEl) openSlat(pinEl); });

    /* deep links: /htmls/infusions.html#drip-06 opens VI */
    const fromHash = () => slats.find((s) => '#' + s.id === location.hash);
    const landing = fromHash();
    openSlat(landing || slats[0], false);
    pinEl = landing || slats[0];
    if (landing) setTimeout(() => goTo(landing), 160);

    // the belt and the plot both link by hash — open what they point at
    document.addEventListener('click', (e) => {
        const a = e.target.closest?.('a[href^="#drip-"]');
        if (!a) return;
        const el = document.getElementById(a.getAttribute('href').slice(1));
        if (!el) return;
        pinEl = el;
        openSlat(el);
    });
    addEventListener('hashchange', () => {
        const el = fromHash();
        if (el) { pinEl = el; openSlat(el); }
    });

    rise(slats, { y: 40, duration: .8, stagger: .05 }, rack, 'top 84%');


    /* ── SORT ── */
    const sortBox = $('#ixSort');
    let sortKey = 'order';
    let sortDir = 1;

    const value = (el, key) => {
        const v = parseFloat(el.dataset[key]);
        return Number.isFinite(v) ? v : null;
    };

    const arrange = () => {
        const order = [...slats].sort((a, b) => {
            const va = value(a, sortKey);
            const vb = value(b, sortKey);
            if (va === null) return 1;                 // the customized one always sits last
            if (vb === null) return -1;
            return (va - vb) * sortDir;
        });

        const land = () => {
            order.forEach((s) => rack.appendChild(s));
            pinEl = order[0];
            openSlat(order[0], false);
        };

        if (!GS || REDUCED) { land(); return; }

        gsap.to(slats, {
            opacity: 0, y: 18, duration: .3, ease: 'power2.in', stagger: .025,
            onComplete: () => {
                land();
                gsap.set(slats, { opacity: 0, y: 18 });
                gsap.to(slats, { opacity: 1, y: 0, duration: .6, ease: 'expo.out', stagger: .04 });
            },
        });
    };

    $$('.ix-sort__pill', sortBox ?? document).forEach((pill) => {
        pill.addEventListener('click', () => {
            const key = pill.dataset.sort;
            if (key === sortKey && key !== 'order') sortDir *= -1;
            else { sortKey = key; sortDir = 1; }

            $$('.ix-sort__pill', sortBox).forEach((p) => {
                p.classList.toggle('is-on', p === pill);
                if (p !== pill) p.classList.remove('is-desc');
            });
            pill.classList.toggle('is-desc', sortDir === -1);

            arrange();
        });
    });


    /* ── FIELD ── */
    const plot = $('#ixPlot');

    if (plot) {
        const T0 = 30, T1 = 180, P0 = 125, P1 = 850, PAD = 9;
        const px = (m) => PAD + ((m - T0) / (T1 - T0)) * (100 - PAD * 2);
        const py = (p) => PAD + ((p - P0) / (P1 - P0)) * (100 - PAD * 2);

        [[30, '30m'], [60, '1h'], [90, '1h30'], [120, '2h'], [150, '2h30'], [180, '3h']].forEach(([m, label]) => {
            const t = document.createElement('span');
            t.className = 'ix-tick ix-tick--x';
            t.style.left = px(m).toFixed(2) + '%';
            t.textContent = label;
            plot.appendChild(t);
        });

        [125, 350, 600, 850].forEach((p) => {
            const t = document.createElement('span');
            t.className = 'ix-tick ix-tick--y';
            t.style.bottom = py(p).toFixed(2) + '%';
            t.textContent = '$' + p;
            plot.appendChild(t);
        });

        slats.forEach((slat) => {
            const m = value(slat, 'min');
            const p = value(slat, 'price');
            if (m === null || p === null) return;                 // customized has no coordinates

            const dot = document.createElement('button');
            dot.className = 'ix-dot';
            dot.type = 'button';
            dot.style.left = px(m).toFixed(2) + '%';
            dot.style.bottom = py(p).toFixed(2) + '%';
            dot.style.setProperty('--tone', slat.style.getPropertyValue('--tone'));
            dot.setAttribute('aria-label', `${slat.dataset.name} — ${slat.dataset.time}, ${slat.dataset.fee}`);
            dot.innerHTML = `<span class="ix-dot__pin"></span>
                <span class="ix-dot__tag">${slat.dataset.name}<b>${slat.dataset.fee}</b></span>`;

            dot.addEventListener('pointerenter', () => syncField(slat));
            dot.addEventListener('focus', () => syncField(slat));
            dot.addEventListener('click', () => { pinEl = slat; openSlat(slat); goTo(slat); });

            plot.appendChild(dot);
            dots.set(dot, slat);
        });

        if (GS && !REDUCED) {
            const pins = $$('.ix-dot', plot);
            gsap.set(pins, { opacity: 0, scale: .3 });
            gsap.to(pins, {
                opacity: 1, scale: 1, duration: .7, ease: 'back.out(2.2)', stagger: .06,
                scrollTrigger: { trigger: plot, start: 'top 82%', once: true },
            });
            rise($('#ixRead'), { y: 26 }, '.ix-field__grid', 'top 84%');
        }

        syncField(liveEl || slats[0]);
    }


    /* ── keep triggers honest once fonts and bags land ── */
    if (GS) {
        const refresh = () => ScrollTrigger.refresh();
        if (document.fonts) document.fonts.ready.then(refresh);
        addEventListener('load', refresh);
    }
})();
