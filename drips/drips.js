/* ALPHA VITAL ELITE IV — DRIPS.JS  ·  motion engine */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const clamp = (n, a, b) => n < a ? a : n > b ? b : n;
const lerp = (a, b, t) => a + (b - a) * t;

const RM   = matchMedia('(prefers-reduced-motion: reduce)');
const FINE = matchMedia('(hover: hover) and (pointer: fine)');
/* budget: old phones and 2-core tablets get the reveals but none of the
   per-frame work. deviceMemory is Chromium-only, hence the fallbacks. */
const LOW  = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 4;
const RICH = () => !RM.matches;

/* ── spring → linear() ─────────────────────────────────────────────────────
   samples a damped harmonic oscillator and emits it as a CSS linear() easing.
   real overshoot, not a cubic-bezier approximating one. cached by signature. */
const springCache = new Map();
const spring = (stiffness = 190, damping = 17, mass = 1, steps = 42) => {
    const key = `${stiffness}|${damping}|${mass}|${steps}`;
    if (springCache.has(key)) return springCache.get(key);
    const w0 = Math.sqrt(stiffness / mass);
    const z  = damping / (2 * Math.sqrt(stiffness * mass));
    const wd = z < 1 ? w0 * Math.sqrt(1 - z * z) : 0;
    const settle = z < 1 ? -Math.log(0.001) / (z * w0) : 6 / w0;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * settle;
        const v = z < 1
            ? 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t))
            : 1 - (1 + w0 * t) * Math.exp(-w0 * t);
        pts.push(Math.round(v * 1e4) / 1e4);
    }
    pts[pts.length - 1] = 1;
    const out = { ease: `linear(${pts.join(',')})`, ms: Math.round(settle * 1000) };
    springCache.set(key, out);
    return out;
};

const SPRING = {
    pop:   spring(210, 16),
    soft:  spring(150, 20),
    snap:  spring(320, 20),
    char:  spring(260, 19),
};

/* ── ticker: one rAF, one scroll read, every subscriber ───────────────────── */
const Ticker = {
    subs: new Set(), running: false, y: scrollY, last: scrollY, vel: 0, raw: 0,
    add(fn) { this.subs.add(fn); this.start(); return () => this.subs.delete(fn); },
    start() {
        if (this.running) return;
        this.running = true;
        addEventListener('scroll', () => { this.raw = scrollY; }, { passive: true });
        const loop = () => {
            this.y = this.raw;
            const d = this.y - this.last;
            this.last = this.y;
            this.vel = lerp(this.vel, clamp(d / 34, -1, 1), 0.14);
            if (Math.abs(this.vel) < 0.001) this.vel = 0;
            for (const fn of this.subs) fn(this.y, this.vel);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },
};

/* ── reveal: WAAPI, spring-eased, staggered, once ─────────────────────────── */
const OFFSET = { rise: 34, pop: 28, slide: -28, tilt: 42, scale: 0 };

const play = (el, i = 0, group = 60) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const kind = el.dataset.anim || 'rise';
    if (!RICH()) { el.style.opacity = '1'; el.style.transform = 'none'; el.classList.add('dx-is-in', 'dx-done'); return; }

    const s = kind === 'tilt' ? SPRING.soft : SPRING.pop;
    const from =
        kind === 'tilt'  ? 'perspective(900px) rotateX(-15deg) translate3d(0,42px,0)' :
        kind === 'pop'   ? 'translate3d(0,28px,0) scale(.93)' :
        kind === 'slide' ? 'translate3d(-28px,0,0)' :
        kind === 'scale' ? 'scale(.84)' :
                           'translate3d(0,34px,0)';
    const to =
        kind === 'tilt' ? 'perspective(900px) rotateX(0deg) translate3d(0,0,0)' :
        kind === 'pop'  ? 'translate3d(0,0,0) scale(1)' :
        kind === 'scale'? 'scale(1)' : 'translate3d(0,0,0)';

    const delay = i * group + (+el.dataset.delay || 0);
    const a = el.animate(
        [{ opacity: 0, transform: from }, { opacity: 1, transform: to }],
        { duration: s.ms, easing: s.ease, delay, fill: 'both' }
    );
    a.finished.then(() => {
        el.style.opacity = '1'; el.style.transform = '';
        el.classList.add('dx-done');
        a.cancel();
    }).catch(() => {});
    setTimeout(() => el.classList.add('dx-is-in'), delay + 40);
};

const Reveal = () => {
    const io = new IntersectionObserver((es) => {
        /* stagger by document order WITHIN a batch, so a group entering
           together pops one by one instead of all at once */
        const hits = es.filter(e => e.isIntersecting).map(e => e.target)
            .sort((a, b) => a.compareDocumentPosition(b) & 2 ? 1 : -1);
        hits.forEach((el, i) => {
            const g = +el.dataset.group || 60;
            play(el, i, g);
            io.unobserve(el);
        });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    $$('[data-anim]').forEach(el => io.observe(el));
};

/* ── split: words → chars, masked, each its own spring ────────────────────── */
const Split = () => {
    $$('[data-split]').forEach((el) => {
        if (el.dataset.splitDone) return;
        el.dataset.splitDone = '1';
        const html = [...el.childNodes].map((n) => {
            if (n.nodeType === 3) {
                return n.textContent.split(/(\s+)/).map((w) => {
                    if (!w.trim()) return w;
                    return `<span class="dx-word">${[...w].map(c => `<span class="dx-char">${c}</span>`).join('')}</span>`;
                }).join('');
            }
            if (n.nodeType === 1) {
                const inner = n.textContent.split(/(\s+)/).map((w) => {
                    if (!w.trim()) return w;
                    return `<span class="dx-word">${[...w].map(c => `<span class="dx-char">${c}</span>`).join('')}</span>`;
                }).join('');
                const t = n.tagName.toLowerCase();
                return `<${t} class="${n.className}">${inner}</${t}>`;
            }
            return '';
        }).join('');
        el.innerHTML = html;
    });
};

const runChars = (el, base = 0) => {
    const chars = $$('.dx-char', el);
    if (!chars.length) return;
    if (!RICH()) { chars.forEach(c => { c.style.opacity = '1'; c.style.transform = 'none'; }); return; }
    const s = SPRING.char;
    chars.forEach((c, i) => {
        const a = c.animate(
            [{ opacity: 0, transform: 'translate3d(0,.9em,0) rotate(5deg)' },
             { opacity: 1, transform: 'translate3d(0,0,0) rotate(0deg)' }],
            { duration: s.ms, easing: s.ease, delay: base + i * 26, fill: 'both' }
        );
        a.finished.then(() => { c.style.opacity = '1'; c.style.transform = ''; a.cancel(); }).catch(() => {});
    });
};

/* ── scrub: map an element's viewport progress onto a callback ─────────────── */
const scrub = (el, cb, opts = {}) => {
    const { start = 0.9, end = 0.25 } = opts;
    let raf = 0;
    const read = () => {
        const r = el.getBoundingClientRect();
        const h = innerHeight;
        const p = clamp((h * start - r.top) / (h * start - h * end + r.height), 0, 1);
        cb(p, r);
    };
    Ticker.add(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; read(); }); });
    addEventListener('resize', read, { passive: true });
    read();
};

/* ── bag: the ledger drives the fluid ─────────────────────────────────────── */
const Bag = () => {
    const list = $('#dxList'), bag = $('#dxBag'), pct = $('#dxPct');
    if (!list || !bag) return;
    if (!RICH()) { bag.style.setProperty('--fill', 1); if (pct) pct.textContent = '100'; return; }
    let shown = 0;
    scrub(list, (p) => {
        shown = lerp(shown, p, 0.16);
        if (Math.abs(p - shown) < 0.002) shown = p;
        bag.style.setProperty('--fill', shown.toFixed(4));
        if (pct) pct.textContent = Math.round(shown * 100);
    }, { start: 0.86, end: 0.34 });
};

/* ── weeks: rail sweeps, pins land as it passes ───────────────────────────── */
const Weeks = () => {
    const list = $('#dxWeeks');
    if (!list) return;
    const pins = $$('.dx-wk', list);
    if (!RICH()) { list.style.setProperty('--sweep', 1); pins.forEach(p => p.classList.add('is-on')); return; }
    list.style.setProperty('--sweep', 0);
    let shown = 0;
    scrub(list, (p) => {
        shown = lerp(shown, p, 0.13);
        list.style.setProperty('--sweep', shown.toFixed(4));
        pins.forEach((el, i) => {
            const at = (i + 0.6) / pins.length;
            const on = shown >= at;
            if (on === el.classList.contains('is-on')) return;
            el.classList.toggle('is-on', on);
            if (on) el.animate(
                [{ transform: 'scale(.4)' }, { transform: 'scale(1)' }],
                { duration: SPRING.snap.ms, easing: SPRING.snap.ease }
            );
        });
    }, { start: 0.82, end: 0.45 });
};

/* ── counters: odometer, scrub-linked ─────────────────────────────────────── */
const money = (v) => '$' + (v % 1 ? v.toFixed(2) : Math.round(v).toLocaleString('en-US'));
const Counters = () => {
    const els = $$('[data-count]');
    if (!els.length) return;
    els.forEach((el) => {
        const to = parseFloat(el.dataset.count);
        const fmt = el.dataset.fmt === 'plain' ? (v) => Math.round(v).toString() : money;
        if (!RICH()) { el.textContent = fmt(to); return; }
        let fired = false;
        const io = new IntersectionObserver((es) => {
            if (!es[0].isIntersecting || fired) return;
            fired = true; io.disconnect();
            const t0 = performance.now(), dur = 1150;
            const step = (t) => {
                const k = clamp((t - t0) / dur, 0, 1);
                const e = 1 - Math.pow(1 - k, 4);
                el.textContent = fmt(to * e);
                if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
            };
            requestAnimationFrame(step);
        }, { threshold: 0.4 });
        io.observe(el);
    });
    $$('.dx-sum__bar i').forEach((b) => {
        const w = +b.dataset.w || 1;
        b.style.setProperty('--w', 0);
        const io = new IntersectionObserver((es) => {
            if (!es[0].isIntersecting) return;
            io.disconnect();
            requestAnimationFrame(() => b.style.setProperty('--w', w));
        }, { threshold: 0.5 });
        io.observe(b);
    });
};

/* ── velocity skew + parallax ─────────────────────────────────────────────── */
const Velocity = () => {
    if (!RICH() || LOW) return;
    const par = $$('[data-par]').map(el => ({ el, k: +el.dataset.par || 0.08 }));
    Ticker.add((y, v) => {
        root.style.setProperty('--vel', v.toFixed(3));
        for (const p of par) {
            const r = p.el.getBoundingClientRect();
            if (r.bottom < -200 || r.top > innerHeight + 200) continue;
            const off = (r.top + r.height / 2 - innerHeight / 2) * -p.k;
            p.el.style.translate = `0 ${off.toFixed(1)}px`;
        }
    });
};

/* ── magnetic + 3d tilt (fine pointers only) ──────────────────────────────── */
const Pointer = () => {
    if (!FINE.matches || !RICH() || LOW) return;

    $$('[data-mag]').forEach((el) => {
        const k = +el.dataset.mag || 0.28;
        let box = null, x = 0, y = 0, tx = 0, ty = 0, raf = 0;
        const run = () => {
            x = lerp(x, tx, 0.18); y = lerp(y, ty, 0.18);
            el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
            raf = (Math.abs(x - tx) > 0.1 || Math.abs(y - ty) > 0.1) ? requestAnimationFrame(run) : 0;
        };
        const kick = () => { if (!raf) raf = requestAnimationFrame(run); };
        el.addEventListener('pointerenter', () => { box = el.getBoundingClientRect(); });
        el.addEventListener('pointermove', (e) => {
            if (!box) box = el.getBoundingClientRect();
            tx = (e.clientX - box.left - box.width / 2) * k;
            ty = (e.clientY - box.top - box.height / 2) * k;
            kick();
        });
        el.addEventListener('pointerleave', () => { box = null; tx = ty = 0; kick(); });
    });

    $$('.dx-nxt').forEach((card) => {
        const inner = $('a', card);
        if (!inner) return;
        let box = null, raf = 0, rx = 0, ry = 0, trx = 0, tryy = 0, lift = 0, tlift = 0;
        const run = () => {
            rx = lerp(rx, trx, 0.16); ry = lerp(ry, tryy, 0.16); lift = lerp(lift, tlift, 0.16);
            inner.style.transform = `translate3d(0,${lift.toFixed(2)}px,0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
            raf = (Math.abs(rx - trx) > 0.05 || Math.abs(ry - tryy) > 0.05 || Math.abs(lift - tlift) > 0.1)
                ? requestAnimationFrame(run) : 0;
        };
        const kick = () => { if (!raf) raf = requestAnimationFrame(run); };
        card.addEventListener('pointerenter', () => { box = card.getBoundingClientRect(); tlift = -8; kick(); });
        card.addEventListener('pointermove', (e) => {
            if (!box) box = card.getBoundingClientRect();
            const px = clamp((e.clientX - box.left) / box.width, 0, 1) - 0.5;
            const py = clamp((e.clientY - box.top) / box.height, 0, 1) - 0.5;
            tryy = px * 11; trx = -py * 11; kick();
        });
        card.addEventListener('pointerleave', () => { box = null; trx = tryy = 0; tlift = 0; kick(); });
    });
};

/* ── rail: drag to scroll on fine pointers ────────────────────────────────── */
const Drag = () => {
    const t = $('#dxTrack');
    if (!t || !FINE.matches) return;
    let down = false, moved = false, x0 = 0, l0 = 0;
    t.addEventListener('pointerdown', (e) => {
        if (e.button) return;
        down = true; moved = false; x0 = e.clientX; l0 = t.scrollLeft;
    });
    t.addEventListener('pointermove', (e) => {
        if (!down) return;
        const d = e.clientX - x0;
        if (!moved && Math.abs(d) < 6) return;
        if (!moved) { moved = true; t.classList.add('is-drag'); t.setPointerCapture(e.pointerId); }
        t.scrollLeft = l0 - d;
    });
    const up = (e) => {
        if (!down) return;
        down = false;
        if (!moved) return;
        t.classList.remove('is-drag');
        if (e?.pointerId != null && t.hasPointerCapture?.(e.pointerId)) t.releasePointerCapture(e.pointerId);
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => t.addEventListener(k, up));
    t.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
};

/* ── section dots ─────────────────────────────────────────────────────────── */
const Dots = () => {
    const dots = $$('.dx-dots a');
    if (!dots.length) return;
    const secs = dots.map(d => $(d.getAttribute('href'))).filter(Boolean);
    const io = new IntersectionObserver((es) => {
        es.forEach((e) => {
            const i = secs.indexOf(e.target);
            if (i < 0) return;
            if (e.isIntersecting) { dots.forEach(d => d.classList.remove('is-on')); dots[i].classList.add('is-on'); }
        });
    }, { rootMargin: '-45% 0px -45% 0px' });
    secs.forEach(s => io.observe(s));
    dots.forEach(d => d.addEventListener('click', (e) => {
        e.preventDefault();
        $(d.getAttribute('href'))?.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
    }));
};

/* ── nav highlight: segment match, prefix-proof ───────────────────────────── */
const Mark = () => {
    const slug = document.body.dataset.drip;
    if (!slug) return;
    const seg = (u) => (u || '').split('#')[0].split('?')[0]
        .replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '').replace(/\/+$/, '')
        .split('/').pop().toLowerCase();
    const want = seg(slug) || slug.toLowerCase();
    $$('.hd-item, .menu__sub-item').forEach((a) => {
        if (seg(a.getAttribute('href')) !== want) return;
        a.classList.add('is-here'); a.setAttribute('aria-current', 'page');
    });
    $$('.head__drop > .head__link').forEach(a => a.classList.add('is-here'));
    $('.menu__drop > summary')?.classList.add('is-here');
    const d = $('.menu__drop'); if (d) d.open = true;
};

/* ── boot ─────────────────────────────────────────────────────────────────── */
const boot = () => {
    if (!document.body.classList.contains('page-drip')) return;
    root.classList.add('dx-on');

    try { Mark(); } catch (e) { console.error('[dx] mark', e); }
    try { Split(); } catch (e) { console.error('[dx] split', e); }

    const start = () => {
        try { Reveal(); } catch (e) { console.error('[dx] reveal', e); }
        try { Bag(); } catch (e) { console.error('[dx] bag', e); }
        try { Weeks(); } catch (e) { console.error('[dx] weeks', e); }
        try { Counters(); } catch (e) { console.error('[dx] counters', e); }
        try { Velocity(); } catch (e) { console.error('[dx] velocity', e); }
        try { Pointer(); } catch (e) { console.error('[dx] pointer', e); }
        try { Drag(); } catch (e) { console.error('[dx] drag', e); }
        try { Dots(); } catch (e) { console.error('[dx] dots', e); }
        runChars($('#dxName'), 180);
    };

    /* wait for the display face or the split lands on fallback metrics and
       reflows mid-animation. 700ms cap so a slow CDN never blocks the page. */
    if (document.fonts?.ready) {
        Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 700))]).then(start);
    } else start();

    /* the page came back from bfcache with animations already finished */
    addEventListener('pageshow', (e) => { if (e.persisted) $$('[data-anim]').forEach(el => { el.style.opacity = '1'; el.style.transform = ''; }); });

    RM.addEventListener?.('change', () => location.reload());
};

document.readyState === 'loading'
    ? addEventListener('DOMContentLoaded', boot)
    : boot();
