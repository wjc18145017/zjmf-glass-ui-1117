/* ==========================================================================
   智简魔方 · 全局状态
   维护站点配置、当前用户、未读数、购物车数量；向视图广播变更。
   ========================================================================== */
window.Store = (function () {
  'use strict';

  var THEME_CACHE_KEY = 'zjmf:themeCache';
  var MODE_KEY = 'zjmf:mode';

  var state = {
    config: null,
    configError: '',
    user: null,
    isAdmin: false,
    unread: 0,
    cartCount: 0,
    booted: false
  };

  var listeners = [];

  function notify(type) {
    listeners.forEach(function (fn) {
      try { fn(state, type || 'change'); } catch (e) { console.error('[Store] listener failed', e); }
    });
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  function cacheTheme(cfg) {
    try {
      if (cfg && cfg.theme) localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cfg.theme));
    } catch (e) { /* noop */ }
  }

  function readThemeCache() {
    try {
      var raw = localStorage.getItem(THEME_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function applyMe(me) {
    if (!me) {
      state.user = null;
      state.isAdmin = false;
      state.unread = 0;
      state.cartCount = 0;
      return;
    }
    state.user = me.user || null;
    state.isAdmin = !!(me.isAdmin || (me.user && me.user.role === 'admin'));
    state.unread = me.unread || 0;
    state.cartCount = me.cartCount || 0;
  }

  async function refreshConfig() {
    var cfg = await API.get('/config');
    state.config = cfg;
    state.configError = '';
    cacheTheme(cfg);
    notify('config');
    return cfg;
  }

  async function refreshMe() {
    if (!API.token()) {
      applyMe(null);
      notify('me');
      return null;
    }
    try {
      var me = await API.get('/auth/me');
      applyMe(me);
      notify('me');
      return state.user;
    } catch (err) {
      if (err && err.status === 401) {
        API.clearToken();
        applyMe(null);
        notify('me');
      }
      return null;
    }
  }

  async function init() {
    var jobs = [];
    jobs.push(
      API.get('/config').then(function (cfg) {
        state.config = cfg;
        cacheTheme(cfg);
      }).catch(function (err) {
        state.configError = err && err.message ? err.message : '站点配置加载失败';
      })
    );
    if (API.token()) {
      jobs.push(
        API.get('/auth/me').then(function (me) {
          applyMe(me);
        }).catch(function (err) {
          if (err && err.status === 401) {
            API.clearToken();
            applyMe(null);
          }
        })
      );
    }
    await Promise.all(jobs);
    state.booted = true;
    notify('boot');
    return state;
  }

  function setCartCount(n) {
    state.cartCount = Math.max(0, Number(n) || 0);
    notify('cart');
  }

  function setUnread(n) {
    state.unread = Math.max(0, Number(n) || 0);
    notify('unread');
  }

  function setUser(user) {
    state.user = user || null;
    state.isAdmin = !!(user && user.role === 'admin');
    notify('me');
  }

  async function logout() {
    try { await API.post('/auth/logout', {}); } catch (e) { /* 忽略退出失败 */ }
    API.clearToken();
    applyMe(null);
    notify('me');
  }

  function modeOverride() {
    try { return localStorage.getItem(MODE_KEY) || ''; } catch (e) { return ''; }
  }

  function setModeOverride(mode) {
    try {
      if (mode) localStorage.setItem(MODE_KEY, mode);
      else localStorage.removeItem(MODE_KEY);
    } catch (e) { /* noop */ }
  }

  return {
    state: state,
    get: function (k) { return state[k]; },
    subscribe: subscribe,
    notify: notify,
    init: init,
    refreshConfig: refreshConfig,
    refreshMe: refreshMe,
    setCartCount: setCartCount,
    setUnread: setUnread,
    setUser: setUser,
    logout: logout,
    cacheTheme: cacheTheme,
    readThemeCache: readThemeCache,
    modeOverride: modeOverride,
    setModeOverride: setModeOverride
  };
})();
