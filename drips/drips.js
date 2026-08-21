/* =============================================================================
   ALPHA VITAL ELITE IV — DRIPS.JS   ·   REBUILD
   -----------------------------------------------------------------------------
   This file used to be six hundred lines: a scroll loop, an IntersectionObserver
   driving the bag, a GSAP timeline for the drop, another for the week markers,
   counters, and a carousel. All of it is gone.

   The bag fill, the ledger highlight, the week rule and the page transition are
   now CSS — animation-timeline and @view-transition — which run on the
   compositor rather than the main thread, ship no bytes of animation code, and
   degrade to a complete static page rather than a broken one.

   What is left is the one thing CSS genuinely cannot do: work out which row of
   the navigation belongs to the page you are on.

   The drip pages also no longer load GSAP. Every module in /script.js
   feature-detects it and stands down gracefully, so the header, mobile menu,
   dock and smooth-scroll all still work — roughly 70KB lighter per page.
============================================================================= */

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];


/* =============================================================================
   MARK — the nav row for the drip you are on
   -----------------------------------------------------------------------------
   Trail in script.js does this by matching location.pathname against each
   link's resolved href. That is exact and correct, and it produces nothing the
   moment the site is not served from its own root: previewed from a subfolder,
   `here` is /staging/drips/liver-support while the links resolve to
   /drips/liver-support, so no row matches and no row lights.

   This runs after Trail and matches on the LAST PATH SEGMENT instead, taken
   from data-drip on <body>. A segment has no prefix to get wrong, so the
   highlight is identical on file://, on localhost, in a staging subfolder and
   in production. Purely additive: where Trail already worked, this sets the
   same classes again and changes nothing.

   data-drip must match the segment the NAV LINKS use, not the filename on
   disk. Those are allowed to differ.
============================================================================= */
const Mark = () => {
    const slug = document.body.dataset.drip;
    if (!slug) return;

    const seg = (url) => (url || '').split('#')[0].split('?')[0]
        .replace(/\/index\.html?$/i, '/')
        .replace(/\.html?$/i, '')
        .replace(/\/+$/, '')
        .split('/').pop()
        .toLowerCase();

    const want = seg(slug) || slug.toLowerCase();

    $$('.hd-item, .menu__sub-item').forEach((a) => {
        if (seg(a.getAttribute('href')) !== want) return;
        a.classList.add('is-here');
        a.setAttribute('aria-current', 'page');
    });

    // the parent of the trail: Infusions stays lit as the section you are in,
    // so it takes the class but never aria-current
    $$('.head__drop > .head__link').forEach((a) => a.classList.add('is-here'));
    $('.menu__drop > summary')?.classList.add('is-here');

    // open the accordion so the lit row is visible on the first tap of the
    // burger rather than one tap further in
    const det = $('.menu__drop');
    if (det) det.open = true;
};


/* =============================================================================
   BOOT
============================================================================= */
const boot = () => {
    if (!document.body.classList.contains('page-drip')) return;
    try { Mark(); }
    catch (err) { console.error('[AVE·DX] Mark failed', err); }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
