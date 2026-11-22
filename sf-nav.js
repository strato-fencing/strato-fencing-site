/* Strato Fencing family header: phone menu, avatar menu, and the logged-in user's details.
   Used by Xenophon's public pages (/, /faq) and by the app (/app/...). */
(function () {
  var SFNav = window.SFNav = window.SFNav || {};

  function closeMenus(except) {
    document.querySelectorAll('.sf-avatar[aria-expanded="true"]').forEach(function (btn) {
      if (btn === except) return;
      btn.setAttribute('aria-expanded', 'false');
      var m = document.getElementById(btn.getAttribute('aria-controls'));
      if (m) m.hidden = true;
    });
  }
  SFNav.closeMenus = function () { closeMenus(null); };

  function closeDrawer() {
    document.querySelectorAll('.sf-header.sf-open').forEach(function (h) {
      h.classList.remove('sf-open');
      var b = h.querySelector('.sf-burger');
      if (b) { b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'Open menu'); }
    });
    document.body.style.overflow = '';
  }
  SFNav.closeDrawer = closeDrawer;

  document.addEventListener('click', function (e) {
    var avatar = e.target.closest('.sf-avatar');
    if (avatar) {
      var menu = document.getElementById(avatar.getAttribute('aria-controls'));
      var open = avatar.getAttribute('aria-expanded') === 'true';
      closeMenus(avatar);
      avatar.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (menu) menu.hidden = open;
      return;
    }
    var burger = e.target.closest('.sf-burger');
    if (burger) {
      var header = burger.closest('.sf-header');
      var isOpen = header.classList.toggle('sf-open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      document.body.style.overflow = isOpen ? 'hidden' : '';
      return;
    }
    if (e.target.closest('[data-sf-logout]')) {
      closeMenus(null); closeDrawer();
      if (typeof SFNav.onLogout === 'function') SFNav.onLogout();
      return;
    }
    if (!e.target.closest('.sf-menu')) closeMenus(null);
    if (e.target.closest('.sf-menu a, .sf-links a')) { closeMenus(null); closeDrawer(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelector('.sf-avatar[aria-expanded="true"]');
    if (open) { closeMenus(null); open.focus(); }
    else if (document.querySelector('.sf-header.sf-open')) closeDrawer();
  });

  SFNav.setAuth = function (on) {
    document.documentElement.setAttribute('data-auth', on ? 'in' : 'out');
  };

  // user: the /api/user payload; isSuper: boolean
  SFNav.setUser = function (user, isSuper) {
    if (!user) return;
    var name = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.username || user.email || '';
    var initials = name.split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() || '?';
    var roles = (user.roles || (user.role ? [user.role] : [])).slice();
    if (isSuper) roles.push('Super user');
    document.querySelectorAll('[data-sf-initials]').forEach(function (el) { el.textContent = initials; });
    document.querySelectorAll('[data-sf-name]').forEach(function (el) { el.textContent = name; });
    document.querySelectorAll('[data-sf-role]').forEach(function (el) { el.textContent = roles.join(' · '); });
    document.querySelectorAll('[data-sf-super]').forEach(function (el) { el.hidden = !isSuper; });
    SFNav._isSuper = !!isSuper;
    SFNav.setServerStatus(SFNav._status || 'active');
  };

  SFNav.setInvites = function (n) {
    n = n || 0;
    document.querySelectorAll('.sf-badge').forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
    document.querySelectorAll('.sf-count').forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
    document.querySelectorAll('.sf-avatar').forEach(function (el) {
      el.setAttribute('aria-label', n ? 'Account menu, ' + n + ' pending invitation' + (n === 1 ? '' : 's') : 'Account menu');
    });
  };

  var STATUS = { checking: 'Checking server…', active: 'Server online', waking: 'Server starting…', offline: 'Server offline' };
  SFNav.setServerStatus = function (s) {
    SFNav._status = s;
    document.querySelectorAll('.sf-status-dot').forEach(function (el) {
      el.hidden = !SFNav._isSuper;
      el.className = 'sf-status-dot' + (s === 'active' ? '' : ' sf-dot-' + s);
    });
    document.querySelectorAll('.sf-menu-status').forEach(function (el) {
      var i = el.querySelector('i');
      if (i) i.className = s === 'active' ? '' : 'sf-dot-' + s;
      var t = el.querySelector('[data-sf-status-text]');
      if (t) t.textContent = STATUS[s] || STATUS.checking;
    });
  };

  // Public pages (not the app): look up the logged-in user to fill the avatar menu.
  SFNav.autofill = function () {
    var token = null;
    try { token = localStorage.getItem('xeno_token'); } catch (e) {}
    var opts = { credentials: 'same-origin', headers: token ? { Authorization: 'Bearer ' + token } : {} };
    fetch('/api/user', opts).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (u) {
      SFNav.setAuth(true);
      SFNav.setUser(u, !!u.is_super_user);
      return Promise.all(['/api/invitations/pending', '/api/acoan_shares/pending'].map(function (p) {
        return fetch(p, opts).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
      })).then(function (lists) { SFNav.setInvites(lists[0].length + lists[1].length); });
    }).catch(function () { SFNav.setAuth(false); });
  };
  if (!SFNav.onLogout) {
    SFNav.onLogout = function () {
      try { localStorage.removeItem('xeno_token'); localStorage.removeItem('xeno_token_super'); } catch (e) {}
      fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(function () {}).then(function () { location.href = '/'; });
    };
  }
})();
