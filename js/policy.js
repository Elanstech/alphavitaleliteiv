/* =============================================================================
   ALPHA VITAL ELITE IV — POLICY.JS
   Shared by all four policy pages: refund, privacy, disclaimer, terms.
   Loads AFTER ../script.js, which owns the header, menu, dock and nav trail.

   These pages are documents, not experiences. There is no scroll animation
   here on purpose — someone reading a refund policy is usually looking for one
   specific sentence, and motion gets in the way of that. Three small things
   only, each of which helps them find it:

     Spy      highlights the section you are level with in the contents list
     Anchor   offsets in-page jumps so a heading never lands under the header
     Stamp    fills in the "last updated" date from the file itself
============================================================================= */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const RM = matchMedia('(prefers-reduced-motion: reduce)');


/* ── SPY ────────────────────────────────────────────────────────────────────
   Marks the current section in the sticky contents list. The rootMargin box
   is deliberately narrow — a band across the upper third of the viewport — so
   the highlight tracks what you are actually reading rather than flickering
   between two headings at every scroll tick. */
const Spy = {
    init() {
        const links = $$('.pl-toc a');
        if (!links.length || !('IntersectionObserver' in window)) return;

        const heads = links
            .map((a) => ({ a, el: document.querySelector(a.getAttribute('href')) }))
            .filter((x) => x.el);
        if (!heads.length) return;

        const mark = (target) => {
            heads.forEach(({ a, el }) => a.classList.toggle('is-here', el === target));
        };

        const io = new IntersectionObserver((entries) => {
            const hit = entries.filter((e) => e.isIntersecting)
                               .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (hit) mark(hit.target);
        }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

        heads.forEach(({ el }) => io.observe(el));

        // at the very bottom the last section may never cross the band
        addEventListener('scroll', () => {
            const atEnd = innerHeight + scrollY >= document.body.scrollHeight - 4;
            if (atEnd) mark(heads[heads.length - 1].el);
        }, { passive: true });
    },
};


/* ── ANCHOR ─────────────────────────────────────────────────────────────────
   The shared header is fixed, so a raw #hash jump parks the heading behind it.
   CSS scroll-margin-top handles most of this, but not a hash present on first
   load — the browser jumps before the stylesheet has settled. Redo it once. */
const Anchor = {
    init() {
        const go = (hash, smooth) => {
            const el = hash && document.querySelector(hash);
            if (!el) return;
            el.scrollIntoView({ behavior: smooth && !RM.matches ? 'smooth' : 'auto', block: 'start' });
        };

        if (location.hash) {
            requestAnimationFrame(() => go(location.hash, false));
            addEventListener('load', () => go(location.hash, false));
        }

        $$('.pl-toc a, .pl-prose a[href^="#"]').forEach((a) => {
            a.addEventListener('click', (ev) => {
                const hash = a.getAttribute('href');
                if (!document.querySelector(hash)) return;
                ev.preventDefault();
                go(hash, true);
                history.replaceState(null, '', hash);
            });
        });
    },
};


/* ── STAMP ──────────────────────────────────────────────────────────────────
   Fills [data-pl-updated] from the document's own Last-Modified header, so the
   date on the page cannot silently drift out of step with the text above it.
   If the server does not send one, whatever is hard-coded stays put. */
const Stamp = {
    init() {
        const el = $('[data-pl-updated]');
        if (!el) return;

        const d = new Date(document.lastModified);
        if (isNaN(d) || d.getFullYear() < 2020) return;

        el.textContent = d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    },
};


/* ── BOOT ───────────────────────────────────────────────────────────────── */
const boot = () => {
    [['spy', Spy], ['anchor', Anchor], ['stamp', Stamp]].forEach(([name, mod]) => {
        try { mod.init(); }
        catch (err) { console.error(`[AVE · policy] ${name} failed`, err); }
    });
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.AVE_POLICY = { boot, Spy, Anchor, Stamp };
