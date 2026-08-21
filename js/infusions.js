/* =============================================================================
   ALPHA VITAL ELITE IV — INFUSIONS.JS
   Loads after /script.js and shares its GSAP + ScrollTrigger.
   Bails immediately unless .page-infusions is present.

     Helpers
     Hero        masked lines, counters, the running index
     Cabinet     one relayout path — view, order and pricing all route here
     Cards       tilt, lift, arrival
     Rail        the line that draws as you read
     Reveal      section heads
============================================================================= */

(() => {
    const page = document.querySelector('.page-infusions');
    if (!page) return;

    /* ---------- helpers ---------- */
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];

    const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE    = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const GS      = typeof window.gsap !== 'undefined';
    const LIVE    = GS && !REDUCED;

    if (GS) gsap.registerPlugin(ScrollTrigger);
    if (!LIVE) document.documentElement.classList.remove('has-js');

    const rise = (els, trigger, opts = {}) => {
        if (!els.length || !LIVE) return;
        gsap.set(els, { opacity: 0, y: opts.y ?? 26 });
        ScrollTrigger.create({
            trigger: trigger || els[0],
            start: opts.start || 'top 84%',
            once: true,
            onEnter: () => gsap.to(els, {
                opacity: 1, y: 0, duration: .85, ease: 'expo.out', stagger: opts.stagger ?? .08,
            }),
        });
    };


    /* =========================================================================
       HERO
    ========================================================================= */
    if (LIVE) {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        gsap.set('.inf-anim', { y: 18 });
        tl.to('.inf-mask__in', { y: 0, duration: 1.2, stagger: .1 }, .1)
          .to('.inf-anim',     { opacity: 1, y: 0, duration: .9, stagger: .08 }, .4);
    }

    $$('[data-count]').forEach((el) => {
        const end = +el.dataset.count;
        if (!LIVE) { el.textContent = end; return; }
        const o = { v: 0 };
        gsap.to(o, {
            v: end, duration: 1.6, ease: 'expo.out', delay: .9,
            onUpdate: () => { el.textContent = Math.round(o.v); },
        });
    });

    const ticker = $('#infTicker');
    if (ticker && LIVE) {
        const roll = gsap.to(ticker, { xPercent: -50, duration: 44, ease: 'none', repeat: -1 });
        ticker.addEventListener('pointerenter', () => gsap.to(roll, { timeScale: .2, duration: .5 }));
        ticker.addEventListener('pointerleave', () => gsap.to(roll, { timeScale: 1, duration: .5 }));
    }


    /* =========================================================================
       CABINET — one relayout path
       Every control (view, order, pricing) measures, mutates, then animates the
       cards from where they were to where they now are. Nothing is re-rendered.
    ========================================================================= */
    const grid = $('#infGrid');
    if (!grid) return;

    const cards = $$('.inf-card', grid);
    const nums  = $$('.inf-num', grid);
    let view = 'cabinet', order = 'order', pricing = 'single';

    const box = () => cards.map((c) => c.getBoundingClientRect());

    const relayout = (mutate) => {
        if (!LIVE) { mutate(); return; }

        gsap.killTweensOf(cards);
        gsap.killTweensOf(grid);
        gsap.set(cards, { x: 0, y: 0 });
        gsap.set(grid, { clearProps: 'height' });

        const h0 = grid.offsetHeight;
        const first = box();
        mutate();
        const last = box();
        const h1 = grid.offsetHeight;

        gsap.fromTo(grid, { height: h0 }, {
            height: h1, duration: .7, ease: 'expo.out',
            clearProps: 'height',
            onComplete: () => ScrollTrigger.refresh(),
        });

        cards.forEach((c, i) => {
            const dx = first[i].left - last[i].left;
            const dy = first[i].top - last[i].top;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            gsap.fromTo(c, { x: dx, y: dy }, {
                x: 0, y: 0, duration: .8, ease: 'expo.out', clearProps: 'transform',
            });
        });

        gsap.fromTo(cards.map((c) => $('.inf-card__in', c)),
            { opacity: .3 },
            { opacity: 1, duration: .55, ease: 'power2.out', stagger: .015 });
    };

    /* ---------- view ---------- */
    const segView = $('#segView');
    $$('[data-view]', segView).forEach((b) => {
        b.addEventListener('click', () => {
            if (b.dataset.view === view) return;
            view = b.dataset.view;
            $$('[data-view]', segView).forEach((x) => x.classList.toggle('is-on', x === b));
            segView.classList.toggle('is-b', view === 'ledger');
            relayout(() => grid.classList.toggle('is-ledger', view === 'ledger'));
        });
    });

    /* ---------- order ---------- */
    $$('[data-sort]').forEach((b) => {
        b.addEventListener('click', () => {
            if (b.dataset.sort === order) return;
            order = b.dataset.sort;
            $$('[data-sort]').forEach((x) => x.classList.toggle('is-on', x === b));
            relayout(() => {
                [...cards]
                    .sort((a, z) => (+a.dataset[order]) - (+z.dataset[order]))
                    .forEach((c) => grid.appendChild(c));
            });
        });
    });

    /* ---------- pricing ---------- */
    const money = (v) => '$' + (Number.isInteger(v) ? v : v.toFixed(2));

    const setPricing = (mode) => {
        grid.classList.toggle('is-program', mode === 'program');
        nums.forEach((n) => {
            const to = parseFloat(n.dataset[mode]);
            if (!isFinite(to)) return;
            const from = parseFloat(n.dataset.now || n.dataset.single);
            n.dataset.now = to;
            if (!LIVE) { n.textContent = money(to); return; }
            const o = { v: from };
            gsap.to(o, {
                v: to, duration: .75, ease: 'expo.out',
                onUpdate: () => { n.textContent = '$' + Math.round(o.v); },
                onComplete: () => { n.textContent = money(to); },
            });
        });
    };

    const segPrice = $('#segPrice');
    $$('[data-price]', segPrice).forEach((b) => {
        b.addEventListener('click', () => {
            if (b.dataset.price === pricing) return;
            pricing = b.dataset.price;
            $$('[data-price]', segPrice).forEach((x) => x.classList.toggle('is-on', x === b));
            segPrice.classList.toggle('is-b', pricing === 'program');
            setPricing(pricing);
        });
    });


    /* =========================================================================
       CARDS — arrival, lift, tilt
    ========================================================================= */
    if (LIVE) {
        gsap.set(cards, { opacity: 0, y: 38 });
        ScrollTrigger.create({
            trigger: grid, start: 'top 84%', once: true,
            onEnter: () => gsap.to(cards, {
                opacity: 1, y: 0, duration: .9, ease: 'expo.out', stagger: .055,
                clearProps: 'transform',
            }),
        });
    }

    if (LIVE && FINE) {
        cards.forEach((card) => {
            const inner = $('.inf-card__in', card);
            const rx = gsap.quickTo(inner, 'rotationX', { duration: .5, ease: 'power3' });
            const ry = gsap.quickTo(inner, 'rotationY', { duration: .5, ease: 'power3' });
            const up = gsap.quickTo(inner, 'y', { duration: .5, ease: 'power3' });
            let rect = null;

            card.addEventListener('pointerenter', () => {
                rect = card.getBoundingClientRect();
                up(grid.classList.contains('is-ledger') ? 0 : -8);
            });

            card.addEventListener('pointermove', (e) => {
                if (grid.classList.contains('is-ledger')) return;
                if (!rect) rect = card.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width  - .5;
                const py = (e.clientY - rect.top)  / rect.height - .5;
                ry(px * 7);
                rx(-py * 7);
            });

            card.addEventListener('pointerleave', () => {
                rect = null;
                rx(0); ry(0); up(0);
            });
        });
    }


    /* =========================================================================
       RAIL
    ========================================================================= */
    const fill = $('.inf-rail__fill');
    if (fill && LIVE) {
        gsap.to(fill, {
            height: '100%', ease: 'none',
            scrollTrigger: { trigger: '.inf-cab', start: 'top 60%', end: 'bottom 85%', scrub: .6 },
        });
    }


    /* =========================================================================
       REVEAL
    ========================================================================= */
    rise($$('.inf-cab__head > *'), '.inf-cab__head', { start: 'top 86%' });
    rise($$('.inf-inc__item'), '.inf-inc__grid', { y: 30, stagger: .1 });
    rise($$('.inf-inc__title'), '.inf-inc', { y: 22 });

    if (LIVE) {
        gsap.to('.inf-begin__shot img', {
            yPercent: -7, ease: 'none',
            scrollTrigger: { trigger: '.inf-begin', start: 'top bottom', end: 'bottom top', scrub: .8 },
        });
    }

    if (GS) {
        const refresh = () => ScrollTrigger.refresh();
        if (document.fonts) document.fonts.ready.then(refresh);
        addEventListener('load', refresh);
    }
})();
