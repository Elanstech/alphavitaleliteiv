/* =============================================================================
   FAQ PAGE — /faq/
   1. Search: filters questions and answers as you type; empty groups hide.
   2. Deep links: /faq/#question-slug opens that question and scrolls to it,
      so a single answer can be shared or linked from another page.
   Header, menu and footer behaviour all come from script.js.
============================================================================= */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const norm = (s) => s.toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ').trim();

const search = () => {
    const input = $('#fpSearch');
    if (!input) return;
    const items  = $$('.fp-group .fq').map((el) => ({ el, text: norm(el.textContent) }));
    const groups = $$('.fp-group');
    const count  = $('#fpCount');
    const empty  = $('#fpEmpty');

    const run = () => {
        const words = norm(input.value).split(' ').filter(Boolean);
        let shown = 0;
        items.forEach(({ el, text }) => {
            const hit = words.every((w) => text.includes(w));
            el.hidden = !hit;
            if (hit) shown += 1;
        });
        groups.forEach((g) => { g.hidden = !$$('.fq', g).some((el) => !el.hidden); });
        empty.hidden = shown > 0;
        count.textContent = words.length ? `${shown} ${shown === 1 ? 'answer' : 'answers'}` : '';
    };

    input.addEventListener('input', run);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { input.value = ''; run(); }
    });
};

const deepLink = () => {
    const open = () => {
        const id = decodeURIComponent(location.hash.slice(1));
        if (!id) return;
        const el = document.getElementById(id);
        if (!el || !el.matches('.fq')) return;
        $$('.fq.is-target').forEach((x) => x.classList.remove('is-target'));
        el.open = true;
        el.classList.add('is-target');
        requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    };
    open();
    window.addEventListener('hashchange', open);

    /* Opening a question puts its address in the bar (without a history entry
       per click), so "copy link" shares that exact answer. */
    $$('.fp-group .fq').forEach((el) => {
        el.addEventListener('toggle', () => {
            if (el.open) history.replaceState(null, '', '#' + el.id);
        });
    });
};

const boot = () => { search(); deepLink(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
