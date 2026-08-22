/* =============================================================================
   ALPHA VITAL ELITE IV — DRIPS.JS   (ES module, deferred by type="module")
   -----------------------------------------------------------------------------
   This file is deliberately small. Almost all of the motion on a drip page is
   CSS scroll-driven animation and runs with this script deleted.

   What is left for JavaScript, and why each one earns its place:

     Flag       tell the stylesheet which path it is on (dx-sda / dx-fb)
     Split      cut the headline into characters and the closing line into
                words — CSS cannot do this, and the split has to happen before
                first paint of that element
     Fallback   Firefox does not ship scroll timelines in stable yet. An
                IntersectionObserver reveal engine + one scroll scrub stands in
     Counters   count a number up. Time-based in every browser, by choice: a
                price that changes as you scroll is a gimmick
     Readout    print the fill percentage. Reads the SAME animated custom
                property the bag uses, so the number can never drift from the
                fluid, whichever path is running
     Carousel   arrow buttons and pointer drag. The dots are ::scroll-marker,
                drawn and managed by the browser
     Rail       which section dot is lit

   The header, the mobile menu, the dock and "you are here" in the nav all
   come from /script.js, shared with the rest of the site. Nothing here
   duplicates them.
============================================================================= */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const clamp = (n, a, b) => (n < a ? a : n > b ? b : n);

const RM = matchMedia('(prefers-reduced-motion: reduce)');
const FINE = matchMedia('(hover: hover) and (pointer: fine)');

/* Chrome/Edge 115+ and Safari 26+ answer true. Firefox stable answers false
   until the flag flips, and then this file quietly does less work. */
const SDA = CSS.supports('animation-timeline', 'view()') && !RM.matches;


/* =============================================================================
   FLAG — one class, read by the whole stylesheet
============================================================================= */
const flag = () => {
    root.classList.add(SDA ? 'dx-sda' : 'dx-fb');
    if (RM.matches) root.classList.remove('dx-fb');   // nothing should hide
};


/* =============================================================================
   SPLIT — characters for the name, words for the closing line
   Words are wrapped in an overflow-hidden span so characters rise out of a
   mask rather than fading in place. Whitespace is preserved exactly, so the
   line still wraps and still reads to a screen reader as one sentence
   (the original text stays intact, we only wrap it).
============================================================================= */
const splitChars = (el) => {
    if (!el || el.dataset.split === 'done') return;
    el.dataset.split = 'done';
    let n = 0;
    const wrap = (text) => text.split(/(\s+)/).map((w) => {
        if (!w.trim()) return w;
        return `<span class="dx-word">${[...w]
            .map((c) => `<span class="dx-char" style="--c:${n++}">${c}</span>`)
            .join('')}</span>`;
    }).join('');

    el.innerHTML = [...el.childNodes].map((node) => {
        if (node.nodeType === 3) return wrap(node.textContent);
        if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase();
            const cls = node.getAttribute('class') || '';
            return `<${tag} class="${cls}">${wrap(node.textContent)}</${tag}>`;
        }
        return '';
    }).join('');
    root.classList.add('dx-split');
};

const splitWords = (el) => {
    if (!el || el.dataset.split === 'done') return;
    el.dataset.split = 'done';
    let n = 0;
    el.innerHTML = el.textContent.split(/(\s+)/).map((w) =>
        w.trim() ? `<span class="dx-w" style="--w:${n++}">${w}</span>` : w
    ).join('');
};


/* =============================================================================
   FALLBACK ENGINE — only constructed when SDA is unavailable
   Two pieces: an observer that adds .dx-in once, and one rAF-throttled scroll
   read that drives the two continuous values (--fill, --sweep).
============================================================================= */
const FB_SELECTOR = '[data-fx], .dx-ing, .dx-eyebrow, .dx-wk, .dx-say';

const fallbackReveal = () => {
    const els = $$(FB_SELECTOR);
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add('dx-in');
            io.unobserve(e.target);
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    els.forEach((el) => io.observe(el));
};

/** progress of an element through the viewport, 0 → 1 */
const progress = (el, startVh = 0.86, endVh = 0.3) => {
    const r = el.getBoundingClientRect();
    const h = innerHeight;
    return clamp((h * startVh - r.top) / (h * startVh - h * endVh + r.height), 0, 1);
};

const fallbackScrub = () => {
    const jobs = [];
    const bag = $('#dxBag');
    const list = $('#dxList');
    const weeks = $('#dxWeeks');

    if (bag && list) {
        let shown = 0;
        jobs.push(() => {
            const p = progress(list, 0.84, 0.36);
            shown += (p - shown) * 0.18;
            if (Math.abs(p - shown) < 0.002) shown = p;
            bag.style.setProperty('--fill', shown.toFixed(4));
        });
    }
    if (weeks) {
        const pins = $$('.dx-wk', weeks);
        let shown = 0;
        jobs.push(() => {
            const p = progress(weeks, 0.8, 0.46);
            shown += (p - shown) * 0.15;
            weeks.style.setProperty('--sweep', shown.toFixed(4));
            pins.forEach((el, i) => {
                el.classList.toggle('dx-in', shown >= (i + 0.6) / pins.length);
            });
        });
    }
    if (!jobs.length) return;

    let ticking = false;
    const run = () => { jobs.forEach((j) => j()); ticking = false; };
    const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick, { passive: true });
    /* the two eased values need a few frames to settle after a jump */
    const settle = setInterval(run, 1000 / 30);
    setTimeout(() => clearInterval(settle), 1200);
    run();
};


/* =============================================================================
   COUNTERS — figures count up once, when they arrive
============================================================================= */
const money = (v) => '$' + (v % 1 ? v.toFixed(2) : Math.round(v).toLocaleString('en-US'));

const counters = () => {
    $$('[data-count]').forEach((el) => {
        const to = parseFloat(el.dataset.count);
        const fmt = el.dataset.fmt === 'plain' ? (v) => Math.round(v).toString() : money;
        if (RM.matches) { el.textContent = fmt(to); return; }

        const io = new IntersectionObserver((es) => {
            if (!es[0].isIntersecting) return;
            io.disconnect();
            const t0 = performance.now(), dur = 1100;
            const step = (t) => {
                const k = clamp((t - t0) / dur, 0, 1);
                el.textContent = fmt(to * (1 - Math.pow(1 - k, 4)));
                if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
            };
            requestAnimationFrame(step);
        }, { threshold: 0.4 });
        io.observe(el);
    });

    /* the two price bars: CSS owns the transition, we only say when */
    $$('.dx-sum__bar').forEach((bar) => {
        const io = new IntersectionObserver((es) => {
            if (!es[0].isIntersecting) return;
            io.disconnect();
            requestAnimationFrame(() => bar.classList.add('dx-in'));
        }, { threshold: 0.5 });
        io.observe(bar);
    });
};


/* =============================================================================
   READOUT — the fill percentage beside the bag
   It reads the computed value of --fill off the bag, so it is the same number
   the fluid is drawn from no matter which path is running. Only ticks while
   the formulation section is on screen.
============================================================================= */
const readout = () => {
    const bag = $('#dxBag');
    const out = $('#dxPct');
    const mix = $('#formulation');
    if (!bag || !out || !mix) return;
    if (RM.matches) { out.textContent = '100'; return; }

    let live = false, last = -1;
    const tick = () => {
        if (!live) return;
        const v = Math.round(parseFloat(getComputedStyle(bag).getPropertyValue('--fill') || 1) * 100);
        if (v !== last && Number.isFinite(v)) { last = v; out.textContent = v; }
        requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e]) => {
        live = e.isIntersecting;
        if (live) requestAnimationFrame(tick);
    }, { threshold: 0 }).observe(mix);
};


/* =============================================================================
   CAROUSEL — arrows and drag
   The dots are ::scroll-marker: browser-drawn, correctly roled, keyboard
   reachable, and in sync without a line of code here. Where those are not
   supported the CSS shows these arrows instead.
============================================================================= */
const carousel = () => {
    const track = $('#dxTrack');
    if (!track) return;
    const prev = $('#dxPrev'), next = $('#dxNext');

    const stepBy = () => {
        const card = $('.dx-nxt', track);
        if (!card) return track.clientWidth * 0.8;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return card.offsetWidth + gap;
    };
    const edges = () => {
        const max = track.scrollWidth - track.clientWidth;
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= max - 2;
    };
    const go = (dir) => track.scrollBy({
        left: dir * stepBy(), behavior: RM.matches ? 'auto' : 'smooth',
    });

    prev?.addEventListener('click', () => go(-1));
    next?.addEventListener('click', () => go(1));

    let ticking = false;
    track.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { edges(); ticking = false; });
    }, { passive: true });
    edges();

    /* grab and pull, the way you would slide a card across a desk.
       Touch already scrolls natively, so this is pointer-only. */
    if (!FINE.matches) return;
    let down = false, moved = false, x0 = 0, l0 = 0;
    track.addEventListener('pointerdown', (e) => {
        if (e.button || e.pointerType === 'touch') return;
        down = true; moved = false; x0 = e.clientX; l0 = track.scrollLeft;
    });
    track.addEventListener('pointermove', (e) => {
        if (!down) return;
        const d = e.clientX - x0;
        if (!moved && Math.abs(d) < 6) return;
        if (!moved) { moved = true; track.classList.add('is-drag'); track.setPointerCapture(e.pointerId); }
        track.scrollLeft = l0 - d;
    });
    const release = (e) => {
        if (!down) return;
        down = false;
        if (!moved) return;
        track.classList.remove('is-drag');
        if (e?.pointerId != null && track.hasPointerCapture?.(e.pointerId)) track.releasePointerCapture(e.pointerId);
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((k) => track.addEventListener(k, release));
    /* a drag that ends on a card must not also open the link */
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
};


/* =============================================================================
   RAIL — which section dot is lit
   Clicking is not handled here: /script.js already owns every in-page anchor
   so the scroll is smooth and lands clear of the fixed header.
============================================================================= */
const rail = () => {
    const dots = $$('.dx-rail a');
    if (!dots.length) return;
    const secs = dots.map((d) => $(d.getAttribute('href'))).filter(Boolean);
    if (!secs.length) return;

    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const i = secs.indexOf(e.target);
            if (i < 0) return;
            dots.forEach((d) => d.classList.remove('is-on'));
            dots[i].classList.add('is-on');
        });
    }, { rootMargin: '-45% 0px -45% 0px' });
    secs.forEach((s) => io.observe(s));
};


/* =============================================================================
   BOOT
============================================================================= */
const boot = () => {
    if (!document.body.classList.contains('page-drip')) return;

    const safely = (name, fn) => { try { fn(); } catch (err) { console.error(`[dx] ${name}`, err); } };

    safely('flag', flag);
    safely('split', () => {
        splitChars($('#dxName'));
        $$('.dx-say').forEach(splitWords);
    });

    const start = () => {
        if (!SDA && !RM.matches) {
            safely('fallback:reveal', fallbackReveal);
            safely('fallback:scrub', fallbackScrub);
        }
        safely('counters', counters);
        safely('readout', readout);
        safely('carousel', carousel);
        safely('rail', rail);
    };

    /* Wait for the display face, or the character split lands on fallback
       metrics and reflows mid-animation. 700ms cap, so a slow font CDN can
       never hold the page. */
    if (document.fonts?.ready) {
        Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(start);
    } else {
        start();
    }

    /* back from bfcache: nothing should be mid-reveal */
    addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        $$('[data-fx], .dx-ing, .dx-eyebrow, .dx-wk, .dx-say').forEach((el) => el.classList.add('dx-in'));
    });

    /* if someone turns reduced motion on while reading, start clean */
    RM.addEventListener?.('change', () => location.reload());
};

document.readyState === 'loading'
    ? addEventListener('DOMContentLoaded', boot)
    : boot();

export { boot };
