/*
 * Adrian's showcase site: Deals the cards in once per load, morphs a card into its detail view (View Transitions
 * with a shared name; Fallback: FLIP on transform), and keeps the address at #app-<slug> so the back button closes
 * the detail. Also: theme toggle, tooltips on tap, product clips that play only in view. Everything reads without JS.
 */
(() => {
  const root = document.documentElement;
  const main = document.querySelector('main');
  const grid = document.getElementById('apps');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const card = (s) => grid.querySelector(`.card[data-slug="${s}"]`);
  const detail = (s) => document.getElementById(`app-${s}`);
  const slugOf = () => (/^#app-([a-z-]+)$/.exec(location.hash) || [])[1] || '';
  let open = '', inPage = false;

  // Theme: The button flips light and dark and remembers the choice on this device.
  document.getElementById('theme').addEventListener('click', () => {
    const t = getComputedStyle(root).colorScheme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) { /* private mode: the choice lasts for this visit */ }
  });

  function deal() {
    if (reduced()) return;
    const deck = document.querySelector('.hero .live').getBoundingClientRect();
    grid.querySelectorAll('.card').forEach((c, i) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--dx', `${deck.left + deck.width / 2 - (r.left + r.width / 2)}px`);
      c.style.setProperty('--dy', `${deck.top + deck.height / 2 - (r.top + r.height / 2)}px`);
      c.style.setProperty('--rot', `${(i % 2 ? 1 : -1) * (6 + i)}deg`);
    });
    grid.classList.add('deal');
    setTimeout(() => grid.classList.remove('deal'), 1500);
  }

  // Puts the page into the state of `slug` ('' = the grid).
  function set(slug) {
    main.classList.toggle('has-detail', !!slug);
    document.querySelectorAll('.detail').forEach((d) => d.classList.toggle('open', d.dataset.slug === slug));
    open = slug;
  }
  const name = (el, n) => { if (el) el.style.viewTransitionName = n || ''; };
  // The open detail starts right under the header (the hero stays above it, off screen).
  const show = (slug) => detail(slug).scrollIntoView({ block: 'start', behavior: 'instant' });

  // Opens `slug` ('' closes the detail; Then `to`, a place in the page, comes into view, else the card just closed).
  function go(slug, to) {
    const from = open, s = slug || from;
    const cardCover = card(s)?.querySelector('.cover'), detCover = detail(s)?.querySelector('.cover');
    const done = () => {
      if (slug) { show(slug); detail(slug).querySelector('h2').focus({ preventScroll: true }); }
      else if (to && to !== grid) to.scrollIntoView({ block: 'start', behavior: 'instant' });
      else card(from)?.scrollIntoView({ block: 'center', behavior: 'instant' });
    };
    if (reduced() || !cardCover || !detCover) { set(slug); done(); return; }
    detail(s).classList.toggle('enter', !!slug);
    if (document.startViewTransition) {
      // The shared name sits on the old view's cover, then moves to the new view's cover inside the update.
      name(slug ? cardCover : detCover, 'app-cover');
      const vt = document.startViewTransition(() => { name(cardCover); name(detCover); set(slug); done(); name(slug ? detCover : cardCover, 'app-cover'); });
      vt.finished.finally(() => { name(cardCover); name(detCover); });
      return;
    }
    // FLIP fallback: Measure, change, invert with transform, play.
    const a = (slug ? cardCover : detCover).getBoundingClientRect();
    set(slug); done();
    const el = slug ? detCover : cardCover, b = el.getBoundingClientRect();
    el.animate([{ transformOrigin: '0 0', transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})` }, { transformOrigin: '0 0', transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  function route() {
    const slug = slugOf(), to = slug ? null : document.getElementById(location.hash.slice(1));
    if (slug !== open) go(slug, to);
    else if (to) to.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }

  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href^="#"]');
    if (!a) return;
    // "All apps" goes back in history when the detail was opened from the grid, so the phone back button and the link agree.
    if (a.classList.contains('back') && inPage) { ev.preventDefault(); history.back(); return; }
    if (a.matches('.card')) inPage = true;
    // A link to the place already in the address (such as HOW I WORK? twice) still scrolls there.
    if (a.getAttribute('href') === location.hash) { ev.preventDefault(); route(); }
  });
  addEventListener('hashchange', () => { if (!slugOf()) inPage = false; route(); });

  // Tooltips: Hover and keyboard focus work in CSS; A tap toggles, Escape or a tap elsewhere closes.
  const tips = () => document.querySelectorAll('.tip[aria-expanded="true"]');
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('.tip');
    tips().forEach((o) => { if (o !== t) o.setAttribute('aria-expanded', 'false'); });
    if (t) t.setAttribute('aria-expanded', t.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') tips().forEach((o) => { o.setAttribute('aria-expanded', 'false'); o.blur(); }); });
  document.querySelectorAll('.tip').forEach((t) => t.setAttribute('aria-expanded', 'false'));

  // Product clips: Poster first; Play only while in view, pause off screen. Calm mode keeps the play controls.
  const clips = document.querySelectorAll('video.clip');
  if (!reduced() && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.preload = 'auto'; e.target.play().catch(() => {}); } else e.target.pause();
    }), { threshold: 0.4 });
    clips.forEach((v) => { v.controls = false; io.observe(v); });
  }

  // Report a problem (adrian-app-kit feedback): The kit loads on the first click only, so the page stays light.
  const rep = document.querySelector('[data-report]');
  if (rep) {
    let fb;
    rep.hidden = false;
    rep.addEventListener('click', async () => {
      // The kit pictures the whole page and waits for every picture and clip: Load them all first, or it runs past 8 s.
      document.querySelectorAll('video').forEach((v) => { v.preload = 'auto'; });
      await Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.decode().catch(() => {}); }));
      fb ??= (await import('./vendor/adrian-feedback/web/feedback.js')).mount({
        app: 'showcase', endpoint: rep.dataset.report, button: false, context: () => ({ screen: open ? `app-${open}` : 'home' }),
      });
      fb.report('bug');
    });
  }

  history.scrollRestoration = 'manual';
  const first = slugOf();
  if (first) { set(first); show(first); } else { route(); if (!location.hash) requestAnimationFrame(deal); }
})();
