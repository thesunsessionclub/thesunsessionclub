(function(){
  const explicit = (window.SUNSESH_API || '').trim();
 const currentPort = String(location.port || '');
 const hasLikelyDevPort = !!currentPort && !['80', '443', '4000'].includes(currentPort);
 const isLanIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(location.hostname);
 const preferLocalApi = isLanIp || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || hasLikelyDevPort;
  const origin = (location.origin && location.origin !== 'null') ? location.origin : '';
  const base = (window.__SUNSESH_API_BASE || explicit || (preferLocalApi ? (location.protocol + '//' + location.hostname + ':4000') : origin)).replace(/\/$/, '');

  function isHttpUrl(url){
    return /^https?:\/\//i.test(String(url || '').trim());
  }

  function shouldProxy(url){
    const value = String(url || '').trim();
    if (!isHttpUrl(value)) return false;
    if (value.startsWith(base + '/')) return false;
    return true;
  }

  function proxyImageUrl(url){
    const value = String(url || '').trim();
    if (!value) return value;
    if (value.startsWith('/uploads/')) return `${base}${value}`;
    if (value.startsWith('uploads/')) return `${base}/${value}`;
    if (!shouldProxy(value)) return value;
    return `${base}/api/proxy/image?url=${encodeURIComponent(value)}`;
  }

  function rewriteImageElement(img){
    if (!img || !img.getAttribute) return;
    const raw = img.getAttribute('src');
    if (!raw || img.dataset.sscProxied === '1') return;
    const next = proxyImageUrl(raw);
    if (next !== raw) {
      img.dataset.sscProxied = '1';
      img.src = next;
    }
  }

  window.__SUNSESH_PROXY_IMAGE = proxyImageUrl;

  const run = () => {
    document.querySelectorAll('img[src]').forEach(rewriteImageElement);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target && mutation.target.tagName === 'IMG') {
          rewriteImageElement(mutation.target);
        }
        mutation.addedNodes.forEach((node) => {
          if (!node || node.nodeType !== 1) return;
          if (node.tagName === 'IMG') rewriteImageElement(node);
          node.querySelectorAll && node.querySelectorAll('img[src]').forEach(rewriteImageElement);
        });
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();

(function(){
  const navs = document.querySelectorAll('nav');
  function onScroll(){
    const scrolled = window.scrollY > 10;
    navs.forEach(n=>{
      if(n.classList.contains('ssc-nav')){
        n.classList.toggle('scrolled', scrolled);
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

(function(){
  const explicit = (window.SUNSESH_API || '').trim();
 const currentPort = String(location.port || '');
 const hasLikelyDevPort = !!currentPort && !['80', '443', '4000'].includes(currentPort);
 const isLanIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(location.hostname);
 const preferLocalApi = isLanIp || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || hasLikelyDevPort;
  const origin = (location.origin && location.origin !== 'null') ? location.origin : '';
  const base = (window.__SUNSESH_API_BASE || explicit || (preferLocalApi ? (location.protocol + '//' + location.hostname + ':4000') : origin)).replace(/\/$/, '');
  const endpoint = `${base}/api/analytics/track`;

  function send(eventName, meta){
    const payload = {
      event: String(eventName || '').slice(0, 120),
      page: location.pathname,
      meta: meta && typeof meta === 'object' ? meta : {},
    };
    try{
      if(navigator.sendBeacon){
        const body = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(endpoint, body);
        return;
      }
    }catch{}
    fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(()=>{});
  }

  send('page_view', { title: document.title || '', referrer: document.referrer || '' });

  let depthSent = false;
  window.addEventListener('scroll', () => {
    if (depthSent) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;
    const pct = Math.round((window.scrollY / maxScroll) * 100);
    if (pct >= 70) {
      depthSent = true;
      send('scroll_depth_70', { path: location.pathname });
    }
  }, { passive: true });
})();

(function(){
  const SESSION_KEY = 'ssc_user_session';
  const ROLE_KEY = 'ssc_admin_role';
  const USER_KEY = 'ssc_admin_user';
  const explicit = (window.SUNSESH_API || '').trim();
 const currentPort = String(location.port || '');
 const hasLikelyDevPort = !!currentPort && !['80', '443', '4000'].includes(currentPort);
 const isLanIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(location.hostname);
 const preferLocalApi = isLanIp || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || hasLikelyDevPort;
  const origin = (location.origin && location.origin !== 'null') ? location.origin : '';
  const base = (window.__SUNSESH_API_BASE || explicit || (preferLocalApi ? (location.protocol + '//' + location.hostname + ':4000') : origin)).replace(/\/$/, '');
  const meUrl = `${base}/api/auth/me`;

  function injectBadgeStyle(){
    if (document.getElementById('ssc-auth-badge-style')) return;
    const style = document.createElement('style');
    style.id = 'ssc-auth-badge-style';
    style.textContent = `
      .ssc-auth-badge{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-width:46px;
        height:42px;
        border-radius:999px;
        padding:0 12px;
        background:linear-gradient(135deg,#00b43f,#00d36a);
        color:#02130a !important;
        font-weight:800;
        letter-spacing:.04em;
        text-transform:uppercase;
        box-shadow:0 8px 24px rgba(0,179,74,.24);
      }
      .ssc-auth-badge .ssc-vip{
        margin-left:7px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        color:#083d2a;
        font-size:15px;
      }
      .ssc-auth-badge:hover{
        filter:brightness(1.06);
      }
      .ssc-account-menu{
        position:fixed;
        z-index:9999;
        width:min(340px,calc(100vw - 24px));
        max-height:calc(100vh - 20px);
        overflow:auto;
        background:#14191f;
        border:1px solid rgba(255,255,255,.14);
        border-radius:18px;
        box-shadow:0 22px 60px rgba(0,0,0,.45);
        padding:14px;
        color:#f5f7fb;
      }
      .ssc-account-menu[hidden]{
        display:none !important;
      }
      .ssc-account-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:10px;
      }
      .ssc-account-mail{
        font-size:.88rem;
        color:#cfd6df;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .ssc-account-avatar{
        width:64px;
        height:64px;
        border-radius:999px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:1.5rem;
        font-weight:800;
        color:#03120d;
        background:linear-gradient(135deg,#00b43f,#00d36a);
        margin:8px auto 10px;
      }
      .ssc-account-name{
        text-align:center;
        font-weight:700;
        margin-bottom:4px;
      }
      .ssc-account-role{
        text-align:center;
        font-size:.78rem;
        letter-spacing:.08em;
        text-transform:uppercase;
        color:#93a2b4;
      }
      .ssc-account-actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin-top:14px;
      }
      .ssc-account-btn{
        border:none;
        border-radius:12px;
        padding:10px 12px;
        font-weight:700;
        cursor:pointer;
      }
      .ssc-account-btn-primary{
        background:#00ffaa;
        color:#03120d;
      }
      .ssc-account-btn-dark{
        background:#0f141a;
        color:#e7edf5;
        border:1px solid rgba(255,255,255,.12);
      }
      .ssc-account-links{
        margin-top:10px;
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }
      .ssc-account-link{
        font-size:.8rem;
        color:#9ddff0;
        text-decoration:none;
      }
    `;
    document.head.appendChild(style);
  }

  function isAdmin(user){
    return String(user && user.role || '').toUpperCase() === 'ADMIN';
  }

  function isVip(user){
    if (!user || typeof user !== 'object') return false;
    if (user.vip_status === true) return true;
    const role = String(user.role || '').toUpperCase();
    const level = String(user.membership_level || '').toLowerCase();
    return role === 'DIAMOND' || level === 'diamond';
  }

  function getInitials(user){
    const name = String(user && (user.name || '') || '').trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
      const txt = parts.map((p) => p.charAt(0)).join('');
      if (txt) return txt.toUpperCase();
    }
    const email = String(user && (user.email || '') || '').trim();
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'US';
  }

  let accountMenuEl = null;
  let activeAccountAnchor = null;

  function escapeHtml(txt){
    return String(txt || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function closeAccountMenu(){
    if (!accountMenuEl) return;
    accountMenuEl.hidden = true;
    if (activeAccountAnchor) {
      try { activeAccountAnchor.setAttribute('aria-expanded', 'false'); } catch {}
    }
    activeAccountAnchor = null;
  }

  async function logoutFromMenu(){
    try{
      await fetch(`${base}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    }catch{}
    cacheSession(null);
    syncLoginButtons(null);
    syncAdminVisibility(null);
    closeAccountMenu();
    try{
      window.location.href = 'login.html';
    }catch{}
  }

  function ensureAccountMenu(){
    if (accountMenuEl) return accountMenuEl;
    accountMenuEl = document.createElement('div');
    accountMenuEl.className = 'ssc-account-menu';
    accountMenuEl.hidden = true;
    document.body.appendChild(accountMenuEl);

    document.addEventListener('click', (ev) => {
      if (!accountMenuEl || accountMenuEl.hidden) return;
      const target = ev.target;
      if (accountMenuEl.contains(target)) return;
      if (activeAccountAnchor && activeAccountAnchor.contains(target)) return;
      closeAccountMenu();
    });

    window.addEventListener('resize', closeAccountMenu);
    window.addEventListener('scroll', closeAccountMenu, { passive: true });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeAccountMenu();
    });
    return accountMenuEl;
  }

  function renderAccountMenu(user){
    const menu = ensureAccountMenu();
    const name = escapeHtml(user && (user.name || user.email || 'Usuario'));
    const email = escapeHtml(user && (user.email || 'Sin correo'));
    const role = escapeHtml(String(user && user.role || 'USER').toUpperCase());
    const initials = escapeHtml(getInitials(user));
    const vip = isVip(user) ? ' - VIP' : '';
    const adminLink = isAdmin(user)
      ? '<a class="ssc-account-link" href="admin.html">Abrir panel admin</a>'
      : '';
    menu.innerHTML = `
      <div class="ssc-account-head">
        <div class="ssc-account-mail">${email}</div>
        <button class="ssc-account-btn ssc-account-btn-dark" data-account-close type="button">X</button>
      </div>
      <div class="ssc-account-avatar">${initials}</div>
      <div class="ssc-account-name">Hola, ${name}</div>
      <div class="ssc-account-role">${role}${vip}</div>
      <div class="ssc-account-actions">
        <button class="ssc-account-btn ssc-account-btn-dark" data-account-manage type="button">Mi cuenta</button>
        <button class="ssc-account-btn ssc-account-btn-primary" data-account-logout type="button">Cerrar sesion</button>
      </div>
      <div class="ssc-account-links">
        <a class="ssc-account-link" href="sunsessionesp_fixed_v3.html">Inicio</a>
        ${adminLink}
      </div>
    `;

    const closeBtn = menu.querySelector('[data-account-close]');
    if (closeBtn) closeBtn.addEventListener('click', closeAccountMenu);
    const manageBtn = menu.querySelector('[data-account-manage]');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        window.location.href = 'mi-cuenta.html';
      });
    }
    const logoutBtn = menu.querySelector('[data-account-logout]');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutFromMenu);
  }

  function openAccountMenu(anchor, user){
    if (!anchor || !user) return;
    renderAccountMenu(user);
    const menu = ensureAccountMenu();
    const rect = anchor.getBoundingClientRect();

    // Measure with visibility hidden (not display none) to get real dimensions.
    menu.hidden = false;
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';
    const menuWidth = menu.offsetWidth || 320;
    const menuHeight = menu.offsetHeight || 220;

    const preferredLeft = rect.left + (rect.width / 2) - (menuWidth / 2);
    const maxLeft = Math.max(10, window.innerWidth - menuWidth - 10);
    const left = Math.min(Math.max(10, preferredLeft), maxLeft);

    let top = rect.bottom + 10;
    if ((top + menuHeight) > (window.innerHeight - 10)) {
      top = Math.max(10, rect.top - menuHeight - 10);
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.visibility = 'visible';
    activeAccountAnchor = anchor;
  }

  function bindAccountTrigger(anchor, user){
    if (!anchor) return;
    if (anchor.__sscAccountClick) {
      anchor.removeEventListener('click', anchor.__sscAccountClick);
      anchor.__sscAccountClick = null;
    }
    if (!user) {
      anchor.href = 'login.html';
      anchor.removeAttribute('aria-haspopup');
      anchor.removeAttribute('aria-expanded');
      return;
    }
    anchor.href = '#';
    anchor.setAttribute('aria-haspopup', 'dialog');
    anchor.setAttribute('aria-expanded', 'false');
    const onClick = (ev) => {
      ev.preventDefault();
      const isOpen = accountMenuEl && !accountMenuEl.hidden && activeAccountAnchor === anchor;
      if (isOpen) {
        closeAccountMenu();
        anchor.setAttribute('aria-expanded', 'false');
        return;
      }
      openAccountMenu(anchor, user);
      anchor.setAttribute('aria-expanded', 'true');
    };
    anchor.__sscAccountClick = onClick;
    anchor.addEventListener('click', onClick);
  }

  function restoreLoginAnchor(anchor){
    if (!anchor || !anchor.dataset) return;
    if (anchor.dataset.originalLoginHtml != null) {
      anchor.innerHTML = anchor.dataset.originalLoginHtml;
    } else if (!anchor.textContent.trim()) {
      anchor.textContent = 'INICIAR SESION';
    }
    anchor.classList.remove('ssc-auth-badge');
    anchor.style.removeProperty('min-width');
    bindAccountTrigger(anchor, null);
  }

  function decorateLoginAnchor(anchor, user){
    if (!anchor) return;
    if (!anchor.dataset.originalLoginHtml) {
      anchor.dataset.originalLoginHtml = anchor.innerHTML;
    }
    if (!user) {
      restoreLoginAnchor(anchor);
      anchor.title = 'Iniciar sesion';
      return;
    }

    const initials = getInitials(user);
    const vip = isVip(user);
    anchor.classList.add('ssc-auth-badge');
    anchor.title = `Cuenta: ${String(user.name || user.email || 'usuario')}`;
    anchor.innerHTML = `${initials}${vip ? '<span class="ssc-vip" aria-label="VIP"><i class="ri-vip-diamond-fill"></i></span>' : ''}`;
    bindAccountTrigger(anchor, user);
  }

  function syncAdminVisibility(user){
    const admin = isAdmin(user);

    document.querySelectorAll('#adminLink').forEach((link) => {
      link.classList.toggle('hidden', !admin);
    });

    const footerAdminLinks = Array.from(document.querySelectorAll('a[href*="login.html"]')).filter((a) => {
      return !!a.querySelector('.ri-user-3-line');
    });
    footerAdminLinks.forEach((link) => {
      link.classList.toggle('hidden', !admin);
      link.style.display = admin ? '' : 'none';
    });
  }

  function syncLoginButtons(user){
    const links = Array.from(document.querySelectorAll('a[href*="login.html"]')).filter((a) => {
      if (!a) return false;
      if (a.id === 'adminLink') return false;
      if (a.querySelector('.ri-user-3-line')) return false;
      return true;
    });
    links.forEach((a) => decorateLoginAnchor(a, user));
  }

  function cacheSession(user){
    try {
      if (user && typeof user === 'object') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        if (isAdmin(user)) {
          localStorage.setItem(ROLE_KEY, 'admin');
          localStorage.setItem(USER_KEY, String(user.email || user.name || ''));
        } else {
          localStorage.removeItem(ROLE_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } else {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(USER_KEY);
      }
    } catch {}
  }

  async function fetchUser(){
    try {
      const res = await fetch(meUrl, {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.user ? data.user : null;
    } catch {
      return null;
    }
  }

  async function initSessionUi(){
    injectBadgeStyle();
    syncLoginButtons(null);
    syncAdminVisibility(null);

    const remote = await fetchUser();
    if (remote) {
      cacheSession(remote);
      syncLoginButtons(remote);
      syncAdminVisibility(remote);
      return;
    }

    cacheSession(null);
    syncLoginButtons(null);
    syncAdminVisibility(null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSessionUi, { once: true });
  } else {
    initSessionUi();
  }
})();






