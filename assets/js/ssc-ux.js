(function(){
  const body = document.body;
  if (!body) return;

  const reduceMotion = body.hasAttribute('data-no-anim') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactMotion = window.matchMedia('(max-width: 767px)').matches;
  const STAGGER_STEP = compactMotion ? 70 : 95;
  const STAGGER_LIMIT = compactMotion ? 6 : 9;

  let revealObserver = null;
  let parallaxItems = [];
  let isNavigating = false;
  let mutationFrame = 0;

  function inModal(el){
    return !!el.closest('[id*="Modal"], [id*="modal"], .modal, [role="dialog"], #lightbox, #videoModal');
  }

  function addNoise(){
    if (document.getElementById('ssc-noise')) return;
    const noise = document.createElement('div');
    noise.id = 'ssc-noise';
    document.body.appendChild(noise);
  }

  function addOrbs(){
    if (document.querySelector('.ssc-float-lights')) return;
    const wrap = document.createElement('div');
    wrap.className = 'ssc-float-lights';
    wrap.innerHTML = `
      <span class="ssc-orb orb-1"></span>
      <span class="ssc-orb orb-2"></span>
      <span class="ssc-orb orb-3"></span>
      <span class="ssc-orb orb-4"></span>
    `;
    document.body.appendChild(wrap);
  }

  function setupNav(){
    const nav = document.querySelector('.ssc-nav');
    if (!nav) return;
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function setupHero(){
    const heroes = document.querySelectorAll('.ssc-page-hero, .ssc-hero');
    heroes.forEach((hero) => {
      hero.classList.add('ssc-hero', 'parallax');
      if (!hero.dataset.parallaxMode) hero.dataset.parallaxMode = 'bg';
      if (!hero.dataset.parallax) hero.dataset.parallax = '0.08';

      const targets = hero.querySelectorAll('h1, h2, p, .ssc-btn, .btn, .btn-outline, button, a');
      targets.forEach((el, i) => {
        if (el.closest('nav')) return;
        el.classList.add('hero-anim');
        el.style.transitionDelay = `${120 + i * 90}ms`;
      });
      requestAnimationFrame(() => hero.classList.add('is-ready'));
    });
  }

  function shouldStagger(group){
    if (!group || group.hasAttribute('data-no-stagger')) return false;
    const children = Array.from(group.children).filter((el) => !el.classList.contains('hidden'));
    if (children.length < 2) return false;
    if (group.id && /artistGrid|eventsGrid|featuredEventsGrid|videosGrid|tracksGrid|vinylGrid|productsGrid|featuredTrack|masonryGrid/i.test(group.id)) {
      return true;
    }
    if (group.classList.contains('masonry') || group.classList.contains('ssc-mosaic')) return true;
    const richChildren = children.filter((el) =>
      el.matches('.card, .card-hover, .ssc-card, .glass, .product-card, .featured-slide, .masonry-item, article') ||
      !!el.querySelector('img')
    );
    return richChildren.length >= Math.min(2, children.length);
  }

  function normalizeAnimationTargets(root){
    const scope = root && root.querySelectorAll ? root : document;

    scope.querySelectorAll('.ssc-page-hero, .ssc-parallax, [data-parallax], .hero-bg').forEach((el) => {
      el.classList.add('parallax');
      if (el.classList.contains('hero-bg')) {
        if (!el.dataset.parallaxMode) el.dataset.parallaxMode = 'bg';
        if (!el.dataset.parallax) el.dataset.parallax = compactMotion ? '0.2' : '0.28';
      }
    });

    const cardSelectors = [
      '.card',
      '.card-hover',
      '.ssc-card',
      '.glass',
      '.product-card',
      '.featured-slide',
      '.masonry-item',
      '.artist-card'
    ];
    scope.querySelectorAll(cardSelectors.join(',')).forEach((el) => {
      if (inModal(el) || el.closest('nav') || el.closest('footer')) return;
      if (el.hasAttribute('data-no-anim')) return;
      el.classList.add('ssc-unified-card');
      if (!el.classList.contains('reveal') && !el.classList.contains('fade-in') && !el.classList.contains('slide-up')) {
        el.classList.add('slide-up');
      }
    });

    const groups = scope.querySelectorAll('.grid, .ssc-stagger, .stagger, .masonry, #featuredTrack');
    groups.forEach((group) => {
      if (shouldStagger(group)) group.classList.add('stagger');
    });
  }

  function shouldIgnoreReveal(el){
    if (!el) return true;
    if (el.hasAttribute('data-no-reveal') || el.hasAttribute('data-no-anim')) return true;
    if (el.closest('[data-no-anim]')) return true;
    if (el.closest('.hidden')) return true;
    if (el.closest('nav')) return true;
    if (inModal(el)) return true;
    if (el.id && /modal/i.test(el.id)) return true;
    return false;
  }

  function addRevealTargets(root){
    const scope = root && root.querySelectorAll ? root : document;
    const selectors = [
      'section',
      'header',
      'footer',
      '.card',
      '.card-hover',
      '.ssc-card',
      '.glass',
      '.product-card',
      '.featured-slide',
      '.masonry-item',
      '.ssc-story-block',
      '.ssc-story-break',
      '.ssc-story-hero',
      '.ssc-story-banner',
      '.stagger > *',
      'section img'
    ];
    scope.querySelectorAll(selectors.join(',')).forEach((el) => {
      if (shouldIgnoreReveal(el)) return;
      if (el.classList.contains('reveal') || el.classList.contains('fade-in') || el.classList.contains('slide-up')) return;
      el.classList.add('reveal');
    });
  }

  function getAnimationTargets(root){
    const scope = root && root.querySelectorAll ? root : document;
    return scope.querySelectorAll('.reveal, .fade-in, .slide-up');
  }

  function applyStagger(root){
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.stagger, .ssc-stagger, .grid').forEach((group) => {
      if (!shouldStagger(group)) return;
      if (!group.classList.contains('stagger')) group.classList.add('stagger');
      const items = Array.from(group.children).filter((el) => {
        if (el.classList.contains('hidden')) return false;
        if (shouldIgnoreReveal(el)) return false;
        return el.classList.contains('reveal') || el.classList.contains('fade-in') || el.classList.contains('slide-up') ||
          el.classList.contains('ssc-unified-card');
      });
      items.forEach((el, idx) => {
        const delay = Math.min(idx, STAGGER_LIMIT) * STAGGER_STEP;
        el.style.setProperty('--stagger-delay', `${delay}ms`);
        if (!el.style.transitionDelay || el.style.transitionDelay === '0ms') {
          el.style.transitionDelay = `${delay}ms`;
        }
      });
    });
  }

  function revealNow(el){
    el.classList.add('reveal-visible', 'in-view');
  }

  function setupObserver(){
    if (reduceMotion) {
      getAnimationTargets(document).forEach(revealNow);
      return;
    }
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, {
      threshold: compactMotion ? 0.12 : 0.18,
      rootMargin: '0px 0px -8% 0px'
    });

    getAnimationTargets(document).forEach((el) => {
      if (!el.classList.contains('in-view')) revealObserver.observe(el);
    });
  }

  function refreshReveals(root){
    normalizeAnimationTargets(root);
    addRevealTargets(root);
    applyStagger(root);
    const targets = getAnimationTargets(root);
    if (reduceMotion) {
      targets.forEach(revealNow);
      return;
    }
    if (revealObserver) {
      targets.forEach((el) => {
        if (!el.classList.contains('in-view')) revealObserver.observe(el);
      });
    }
  }

  function setupParallax(){
    if (reduceMotion) return;

    const nodes = Array.from(document.querySelectorAll('[data-parallax], .ssc-parallax, .parallax, .hero-bg'))
      .filter((el) => !el.hasAttribute('data-no-global-parallax') && !el.closest('[data-no-global-parallax]'));
    parallaxItems = nodes.map((el) => ({
      el,
      speed: parseFloat(el.dataset.parallax || (el.classList.contains('ssc-page-hero') ? '0.08' : '0.12')),
      range: parseFloat(el.dataset.parallaxRange || (el.matches('.hero-bg, .ssc-hero-video, .ssc-hero-layer') ? '210' : (compactMotion ? '90' : '125'))),
      targetSelector: String(el.dataset.parallaxTarget || '').trim(),
      mode: el.dataset.parallaxMode || (
        (window.getComputedStyle(el).backgroundImage && window.getComputedStyle(el).backgroundImage !== 'none')
          ? 'bg'
          : 'translate'
      )
    }));

    if (!parallaxItems.length) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const viewport = window.innerHeight || 800;
        parallaxItems.forEach((item) => {
          const rect = item.el.getBoundingClientRect();
          if (rect.bottom < -100 || rect.top > viewport + 100) return;
          const progress = (rect.top + rect.height * 0.3) / viewport;
          const offset = (progress - 0.5) * item.speed * item.range;
          const target = item.targetSelector ? item.el.querySelector(item.targetSelector) : null;
          if (item.mode === 'bg') {
            item.el.style.backgroundPosition = `center calc(50% + ${offset}px)`;
          } else if (target) {
            target.style.transform = `translate3d(0, ${offset}px, 0)`;
          } else {
            item.el.style.transform = `translate3d(0, ${offset}px, 0)`;
          }
        });
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function setupPageTransitions(){
    if (reduceMotion) return;

    body.classList.add('ssc-page-enter');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.classList.add('ssc-page-enter-active');
      });
    });
    window.setTimeout(() => {
      body.classList.remove('ssc-page-enter', 'ssc-page-enter-active');
    }, compactMotion ? 260 : 520);

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = event.target.closest('a[href]');
      if (!link) return;
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download') || link.closest('[data-no-page-transition]')) return;

      const rawHref = link.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#')) return;
      if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) return;

      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (_) {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      if (isNavigating) return;
      isNavigating = true;
      body.classList.add('ssc-page-leave');
      window.setTimeout(() => {
        window.location.assign(url.href);
      }, compactMotion ? 220 : 290);
    }, true);
  }

  function setupMutationObserver(){
    const mo = new MutationObserver(() => {
      if (mutationFrame) return;
      mutationFrame = requestAnimationFrame(() => {
        mutationFrame = 0;
        refreshReveals(document);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function boot(){
    if (!reduceMotion) {
      addNoise();
      addOrbs();
    }
    document.querySelectorAll('img:not([loading])').forEach((img) => {
      if (!img.closest('[data-no-lazy]')) img.loading = 'lazy';
    });

    setupNav();
    setupHero();
    refreshReveals(document);
    setupObserver();
    setupParallax();
    setupPageTransitions();
    setupMutationObserver();

    window.sscRefreshReveals = () => refreshReveals(document);
    window.sscRefreshUx = () => refreshReveals(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
