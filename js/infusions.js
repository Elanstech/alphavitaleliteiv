/* ═════════════════════════════════════════════════════════════════
   INFUSIONS.JS — the /infusions/ page
   Loads AFTER /script.js. Shares the site's GSAP + ScrollTrigger CDN.
   Guarded: bails instantly unless .page-infusions exists, so it is
   safe even if it ever ends up on another page.

     <script src="/script.js" type="module"></script>
     <script src="/infusions.js" type="module"></script>
   ═════════════════════════════════════════════════════════════════ */

(() => {
    const page = document.querySelector('.page-infusions');
    if (!page) return;

    const ixReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ixFine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const ixGsap = typeof gsap !== 'undefined';
    if (ixGsap) gsap.registerPlugin(ScrollTrigger);

    /* ── entrance: interior pages have no preloader, so is-ready is ours ── */
    if (!document.getElementById('preloader')) {
        requestAnimationFrame(() => document.body.classList.add('is-ready'));
    }

    /* ── hero counters ── */
    document.querySelectorAll('[data-count]').forEach((el) => {
        const end = +el.dataset.count;
        if (!ixGsap || ixReduced) { el.textContent = end; return; }
        const o = { v: 0 };
        gsap.to(o, {
            v: end, duration: 1.5, ease: 'expo.out', delay: 0.5,
            onUpdate: () => { el.textContent = Math.round(o.v); },
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        });
    });

    /* ── THE SELECTOR ── */
    const stage = document.getElementById('ixStage');
    const list = document.getElementById('ixList');
    if (!list) return;

    const items = [...list.querySelectorAll('.ix-item')];

    /* stage handles */
    const el = {
        wash: document.getElementById('ixWash'),
        no: document.getElementById('ixNo'),
        imgA: document.getElementById('ixImgA'),
        imgB: document.getElementById('ixImgB'),
        cat: document.getElementById('ixCat'),
        note: document.getElementById('ixNote'),
        time: document.getElementById('ixTime'),
        single: document.getElementById('ixSingle'),
        program: document.getElementById('ixProgram'),
        go: document.getElementById('ixGo'),
    };
    let front = el.imgA;
    let back = el.imgB;
    let liveIdx = -1;

    const paint = (i) => {
        if (i === liveIdx || !stage) return;
        liveIdx = i;
        const d = items[i].dataset;

        items.forEach((it, k) => {
            it.classList.toggle('is-live', k === i);
            it.style.setProperty('--ix-tone', it.dataset.tone);
        });

        stage.style.setProperty('--ix-tone', d.tone);
        el.no.textContent = d.no;
        el.cat.innerHTML = `<i class="ph ${d.ico}"></i><span>${d.cat}</span>`;
        el.time.textContent = d.time;
        el.single.textContent = d.single;
        el.program.innerHTML = d.program;
        el.go.href = d.href;

        /* crossfade the bag through two stacked imgs */
        if (back.getAttribute('src') !== d.img) back.src = d.img;
        back.classList.add('is-on');
        front.classList.remove('is-on');
        [front, back] = [back, front];

        /* the note swaps with a soft rise */
        if (ixGsap && !ixReduced) {
            el.note.textContent = d.note;
            gsap.fromTo(el.note, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, ease: 'expo.out' });
            gsap.fromTo([el.time, el.single, el.program],
                { opacity: 0 }, { opacity: 1, duration: .4, ease: 'power2.out', stagger: .05 });
        } else {
            el.note.textContent = d.note;
        }
    };

    /* scroll drives the stage — one trigger per row, centered band */
    if (stage && ixGsap && !ixReduced) {
        items.forEach((it, i) => {
            ScrollTrigger.create({
                trigger: it,
                start: 'top 55%',
                end: 'bottom 55%',
                onToggle: (st) => st.isActive && paint(i),
            });
        });
    }

    /* hover takes over instantly on fine pointers */
    if (stage && ixFine) {
        items.forEach((it, i) => it.addEventListener('pointerenter', () => paint(i)));
    }

    paint(0);

    /* rows cascade in */
    if (ixGsap && !ixReduced) {
        gsap.set(items, { opacity: 0, y: 26 });
        gsap.to(items, {
            opacity: 1, y: 0, duration: .6, ease: 'expo.out', stagger: .06,
            scrollTrigger: { trigger: list, start: 'top 84%', once: true },
        });
    }

    /* keep triggers honest after fonts and images land */
    if (ixGsap) {
        const ixRefresh = () => ScrollTrigger.refresh();
        if (document.fonts) document.fonts.ready.then(ixRefresh);
        addEventListener('load', ixRefresh);
    }
})();
