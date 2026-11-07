/* ==========================================================================
   智简魔方 · 应用外壳与路由
   - Hash 路由（#/path?query）
   - 三种布局：public / user / admin
   - 站点头、页脚、侧栏、弹层、徽标同步
   ========================================================================== */
window.App = (function () {
  'use strict';

  var routes = [];
  var notFound = null;
  var cleanupFns = [];
  var renderSeq = 0;
  var currentCtx = null;
  var booted = false;
  var root = null;

  var NAV = [
    { label: '首页', href: '#/', match: '/' },
    { label: '云服务器', href: '#/products?category=cloud', match: '/products', query: 'category=cloud' },
    { label: '产品与服务', href: '#/products', match: '/products' },
    { label: '公告', href: '#/announcements', match: '/announcements' },
    { label: '帮助中心', href: '#/help', match: '/help' }
  ];

  var USER_NAV = [
    { group: '总览', items: [
      { label: '概览', href: '#/user', icon: 'gauge', match: '/user', exact: true },
      { label: '我的服务器', href: '#/user/servers', icon: 'server', match: '/user/servers' },
      { label: '订单管理', href: '#/user/orders', icon: 'file-text', match: '/user/orders' }
    ] },
    { group: '财务与支持', items: [
      { label: '账单与充值', href: '#/user/billing', icon: 'wallet', match: '/user/billing' },
      { label: '工单支持', href: '#/user/tickets', icon: 'ticket', match: '/user/tickets' },
      { label: '消息通知', href: '#/user/notifications', icon: 'bell', match: '/user/notifications', badge: 'unread' }
    ] },
    { group: '账户', items: [
      { label: '实名认证', href: '#/user/realname', icon: 'id-card', match: '/user/realname' },
      { label: '账户安全', href: '#/user/security', icon: 'shield-check', match: '/user/security' },
      { label: 'API 密钥', href: '#/user/apikeys', icon: 'key', match: '/user/apikeys' },
      { label: '个人资料', href: '#/user/profile', icon: 'user', match: '/user/profile' },
      { label: '主题偏好', href: '#/user/theme', icon: 'palette', match: '/user/theme' }
    ] }
  ];

  var ADMIN_NAV = [
    { group: '总览', items: [
      { label: '仪表盘', href: '#/admin', icon: 'gauge', match: '/admin', exact: true },
      { label: '操作日志', href: '#/admin/logs', icon: 'activity', match: '/admin/logs' }
    ] },
    { group: '业务管理', items: [
      { label: '用户管理', href: '#/admin/users', icon: 'users', match: '/admin/users' },
      { label: '产品与套餐', href: '#/admin/products', icon: 'box', match: '/admin/products' },
      { label: '订单管理', href: '#/admin/orders', icon: 'file-text', match: '/admin/orders' },
      { label: '工单管理', href: '#/admin/tickets', icon: 'ticket', match: '/admin/tickets' },
      { label: '财务审核', href: '#/admin/finance', icon: 'wallet', match: '/admin/finance', badge: 'recharge' }
    ] },
    { group: '站点', items: [
      { label: '公告管理', href: '#/admin/announcements', icon: 'megaphone', match: '/admin/announcements' },
      { label: '系统设置', href: '#/admin/settings', icon: 'sliders', match: '/admin/settings' }
    ] }
  ];

  /* ---------------- 路由 ---------------- */
  function page(path, handler, opts) {
    routes.push({ path: path, handler: handler, opts: opts || {} });
  }

  function setNotFound(handler) { notFound = handler; }

  function segs(path) {
    return String(path || '/').split('/').filter(function (s) { return s !== ''; });
  }

  function findRoute(path) {
    var target = segs(path);
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      var rs = segs(r.path);
      if (rs.length !== target.length) continue;
      var params = {};
      var ok = true;
      for (var j = 0; j < rs.length; j++) {
        if (rs[j].charAt(0) === ':') {
          params[rs[j].slice(1)] = decodeURIComponent(target[j]);
        } else if (rs[j] !== target[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return { route: r, params: params };
    }
    return null;
  }

  function parseHash() {
    var raw = location.hash || '';
    var hash = raw.replace(/^#/, '');
    if (!hash) return { path: '/', query: {}, raw: '' };
    var qIndex = hash.indexOf('?');
    var path = qIndex === -1 ? hash : hash.slice(0, qIndex);
    var queryStr = qIndex === -1 ? '' : hash.slice(qIndex + 1);
    var query = parseQuery(queryStr);
    return { path: path || '/', query: query, raw: hash };
  }

  function parseQuery(str) {
    var out = {};
    if (!str) return out;
    str.split('&').forEach(function (pair) {
      if (!pair) return;
      var idx = pair.indexOf('=');
      var k = idx === -1 ? pair : pair.slice(0, idx);
      var v = idx === -1 ? '' : pair.slice(idx + 1);
      try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); }
      catch (e) { out[k] = v; }
    });
    return out;
  }

  function qs(query) {
    var parts = [];
    Object.keys(query || {}).forEach(function (k) {
      if (query[k] === undefined || query[k] === null || query[k] === '') return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(query[k]));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  function go(path, opts) {
    var target = '#' + (path.charAt(0) === '/' ? path : '/' + path);
    if (opts && opts.replace) {
      location.replace(target);
    } else if (location.hash === target) {
      render();
    } else {
      location.hash = target;
    }
  }

  /* ---------------- 头部片段 ---------------- */
  function themeIconFor(mode) {
    return mode === 'light' ? 'sun' : 'moon';
  }

  function siteHeader(area) {
    var st = Store.state;
    var user = st.user;
    var mode = document.documentElement.getAttribute('data-mode') || 'dark';
    var navHtml = area === 'admin'
      ? '<span class="admin-brand-chip">' + UI.icon('shield', 14) + '管理后台</span>'
      : '<nav class="main-nav">' + NAV.map(function (item) {
        return '<a class="main-nav__link" data-nav-match="' + item.match + '" href="' + item.href + '">' + UI.esc(item.label) + '</a>';
      }).join('') + '</nav>';

    var themeOverride = Theme.userOverride();
    var themeItems = [
      { key: 'light', label: '浅色模式', icon: 'sun' },
      { key: 'dark', label: '深色模式', icon: 'moon' },
      { key: 'system', label: '跟随系统', icon: 'monitor' }
    ].map(function (it) {
      var active = themeOverride === it.key;
      return '<button class="popover__item" data-set-mode="' + it.key + '"' + (active ? ' style="color:var(--accent)"' : '') + '>' +
        UI.icon(it.icon, 16) + '<span>' + it.label + '</span>' +
        (active ? '<span style="margin-left:auto">' + UI.icon('check', 13) + '</span>' : '') + '</button>';
    }).join('');

    var adminModeNote = (st.config && st.config.theme && st.config.theme.preset) || 'deepsea';
    var presetLabel = '深海';
    if (st.config && st.config.presets && st.config.presets[adminModeNote]) presetLabel = st.config.presets[adminModeNote].label || presetLabel;

    var themePop =
      '<div class="popover" data-pop="theme" hidden>' +
        '<div class="popover__label">界面模式</div>' + themeItems +
        '<div class="popover__sep"></div>' +
        '<a class="popover__item" href="#/user/theme">' + UI.icon('palette', 16) + '<span>主题偏好设置</span></a>' +
        '<div class="popover__sep"></div>' +
        '<div class="popover__label" style="letter-spacing:0;text-transform:none;font-weight:400">管理员默认：' + UI.esc(presetLabel) + (themeOverride ? '（已本地覆盖）' : '') + '</div>' +
      '</div>';

    var userArea;
    if (user) {
      userArea =
        '<div style="position:relative">' +
          '<button class="header-user" data-pop-trigger="user">' +
            UI.avatar(user.name || user.username, { size: 'sm', ring: true }) +
            '<span class="header-user__name">' + UI.esc(user.name || user.username) + '</span>' +
            UI.icon('chevron-down', 13) +
          '</button>' +
          '<div class="popover" data-pop="user" hidden style="min-width:214px">' +
            '<div class="popover__label">' + UI.esc(user.name || user.username) + ' · ' + (st.isAdmin ? '管理员' : '会员') + '</div>' +
            '<a class="popover__item" href="#/user">' + UI.icon('gauge', 16) + '<span>用户中心</span></a>' +
            '<a class="popover__item" href="#/user/servers">' + UI.icon('server', 16) + '<span>我的服务器</span></a>' +
            '<a class="popover__item" href="#/user/orders">' + UI.icon('file-text', 16) + '<span>订单管理</span></a>' +
            '<a class="popover__item" href="#/user/billing">' + UI.icon('wallet', 16) + '<span>账单与充值</span></a>' +
            (st.isAdmin ? '<div class="popover__sep"></div><a class="popover__item" href="#/admin">' + UI.icon('sliders', 16) + '<span>后台管理</span></a>' : '') +
            '<div class="popover__sep"></div>' +
            '<button class="popover__item" data-action="logout">' + UI.icon('logout', 16) + '<span>退出登录</span></button>' +
          '</div>' +
        '</div>';
    } else {
      userArea =
        '<a class="btn btn--sm btn--ghost" href="#/login">登录</a>' +
        '<a class="btn btn--sm btn--primary" href="#/register">免费注册</a>';
    }

    return '<header class="site-header" id="site-header">' +
      '<div class="site-header__inner">' +
        '<a class="brand" href="#/">' +
          '<span class="brand__mark">' + UI.icon('logo', 22) + '</span>' +
          '<span class="brand__text"><span class="brand__name">智简魔方</span><span class="brand__sub">ZJMF CLOUD</span></span>' +
        '</a>' +
        navHtml +
        '<div class="header-actions">' +
          '<div style="position:relative">' +
            '<button class="icon-btn" data-pop-trigger="theme" aria-label="外观设置" title="外观设置">' +
              UI.icon(themeIconFor(mode), 18, 'js-theme-icon') +
            '</button>' + themePop +
          '</div>' +
          '<a class="icon-btn" href="#/cart" aria-label="购物车" title="购物车">' +
            UI.icon('cart', 18) +
            '<span class="icon-btn__badge" data-cart-count' + (st.cartCount ? '' : ' hidden') + '>' + UI.num(st.cartCount) + '</span>' +
          '</a>' +
          '<span class="header-divider"></span>' +
          userArea +
          '<button class="icon-btn nav-toggle" data-action="toggle-nav" aria-label="菜单">' + UI.icon('menu', 20) + '</button>' +
        '</div>' +
      '</div>' +
      mobileNav(area) +
    '</header>';
  }

  function mobileNav(area) {
    var links = area === 'admin'
      ? [{ label: '仪表盘', href: '#/admin' }, { label: '用户管理', href: '#/admin/users' }, { label: '订单管理', href: '#/admin/orders' }, { label: '系统设置', href: '#/admin/settings' }]
      : NAV;
    var extra = Store.state.user
      ? '<a class="btn btn--ghost btn--block" href="#/user">进入用户中心</a>'
      : '<div class="row" style="gap:8px"><a class="btn btn--ghost" style="flex:1" href="#/login">登录</a><a class="btn btn--primary" style="flex:1" href="#/register">注册</a></div>';
    return '<div class="mobile-nav" id="mobile-nav">' +
      links.map(function (l) { return '<a class="mobile-nav__link" href="' + l.href + '">' + UI.esc(l.label) + '</a>'; }).join('') +
      '<div style="margin-top:var(--space-3)">' + extra + '</div>' +
      '</div>';
  }

  function siteFooter() {
    var st = Store.state;
    var site = (st.config && st.config.site) || {};
    var version = (st.config && st.config.version) || '1.0.0';
    var cols = [
      { title: '产品', links: [['云服务器', '#/products?category=cloud'], ['GPU 算力', '#/products?category=gpu'], ['香港服务器', '#/products?category=vps'], ['对象存储', '#/products?category=storage']] },
      { title: '支持', links: [['帮助中心', '#/help'], ['公告中心', '#/announcements'], ['提交工单', '#/user/tickets/new'], ['服务状态', '#/help']] },
      { title: '账户', links: [['用户中心', '#/user'], ['实名认证', '#/user/realname'], ['账单充值', '#/user/billing'], ['API 密钥', '#/user/apikeys']] }
    ];
    return '<footer class="site-footer">' +
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' +
            '<a class="brand" href="#/">' +
              '<span class="brand__mark">' + UI.icon('logo', 20) + '</span>' +
              '<span class="brand__text"><span class="brand__name">智简魔方</span><span class="brand__sub">ZJMF CLOUD</span></span>' +
            '</a>' +
            '<p class="footer-desc">以玻璃拟态的层次语言重构 IDC 控制台：云服务器、独立服务器、GPU 算力与对象存储，一套主题贯穿前后台。</p>' +
            '<div class="footer-contact">' +
              '<span>' + UI.icon('mail', 15) + ' support@zjmf.demo</span>' +
              '<span>' + UI.icon('phone', 15) + ' 400-800-1117</span>' +
            '</div>' +
          '</div>' +
          cols.map(function (c) {
            return '<div><div class="footer-title">' + c.title + '</div><div class="footer-links">' +
              c.links.map(function (l) { return '<a href="' + l[1] + '">' + l[0] + '</a>'; }).join('') +
              '</div></div>';
          }).join('') +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>© 2026 ' + UI.esc(site.name || '智简魔方') + ' · 演示工程，数据均为本地模拟</span>' +
          '<span class="footer-bottom__right">' +
            '<span class="version-badge">' + UI.icon('sparkles', 12) + '玻璃拟态主题 v' + UI.esc(version) + '</span>' +
            '<span>ZJMF Glass UI</span>' +
          '</span>' +
        '</div>' +
      '</div>' +
    '</footer>';
  }

  /* ---------------- 侧栏片段 ---------------- */
  function navItemsHtml(items, path) {
    return items.map(function (item) {
      var active = item.exact ? path === item.match : (path === item.match || path.indexOf(item.match + '/') === 0);
      var badge = '';
      if (item.badge === 'unread' && Store.state.unread) badge = '<span class="badge badge--danger">' + UI.num(Store.state.unread) + '</span>';
      return '<a class="dash-nav__item' + (active ? ' is-active' : '') + '" href="' + item.href + '">' +
        UI.icon(item.icon, 17) + '<span>' + UI.esc(item.label) + '</span>' + badge + '</a>';
    }).join('');
  }

  function userAside(path) {
    var user = Store.state.user || {};
    return '<aside class="dash-side glass glass--strong">' +
      '<div class="dash-side__user">' +
        UI.avatar(user.name || user.username || '?', { size: 'lg', ring: true }) +
        '<div class="dash-side__user-info">' +
          '<div class="dash-side__name">' + UI.esc(user.name || user.username || '未登录') + '</div>' +
          '<div class="dash-side__meta">' + UI.statusBadge(user.realname && user.realname.status === 'verified' ? 'verified' : 'none', user.realname && user.realname.status === 'verified' ? '已实名' : '未实名') + '</div>' +
        '</div>' +
      '</div>' +
      '<nav class="dash-nav">' + USER_NAV.map(function (g) {
        return '<div class="dash-nav__group">' + g.group + '</div>' + navItemsHtml(g.items, path);
      }).join('') + '</nav>' +
      '<div class="dash-side__foot">' +
        '<a class="dash-nav__item" href="#/help">' + UI.icon('help', 17) + '<span>帮助中心</span></a>' +
        '<button class="dash-nav__item" data-action="logout">' + UI.icon('logout', 17) + '<span>退出登录</span></button>' +
      '</div>' +
    '</aside>';
  }

  function adminAside(path) {
    return '<aside class="dash-side glass glass--strong">' +
      '<div class="dash-side__user">' +
        '<span class="brand__mark" style="width:38px;height:38px">' + UI.icon('logo', 20) + '</span>' +
        '<div class="dash-side__user-info">' +
          '<div class="dash-side__name">智简魔方 · 控制台</div>' +
          '<div class="dash-side__meta">' + UI.statusBadge('approved', '管理员') + '</div>' +
        '</div>' +
      '</div>' +
      '<nav class="dash-nav">' + ADMIN_NAV.map(function (g) {
        return '<div class="dash-nav__group">' + g.group + '</div>' + navItemsHtml(g.items, path);
      }).join('') + '</nav>' +
      '<div class="dash-side__foot">' +
        '<a class="dash-nav__item" href="#/">' + UI.icon('external', 17) + '<span>返回前台</span></a>' +
        '<button class="dash-nav__item" data-action="logout">' + UI.icon('logout', 17) + '<span>退出登录</span></button>' +
      '</div>' +
    '</aside>';
  }

  function adminTopbar(route) {
    var version = (Store.state.config && Store.state.config.version) || '1.0.0';
    var titles = {
      '/admin': ['运营仪表盘', '全局收入、资源与工单概览'],
      '/admin/users': ['用户管理', '账户状态、余额与实名审核'],
      '/admin/products': ['产品与套餐', '产品目录、套餐价格与库存'],
      '/admin/orders': ['订单管理', '订单状态流转与退款'],
      '/admin/tickets': ['工单管理', '客户问题处理与回复'],
      '/admin/finance': ['财务审核', '充值申请人工审核'],
      '/admin/announcements': ['公告管理', '站点公告发布与置顶'],
      '/admin/settings': ['系统设置', '站点信息与主题引擎配置'],
      '/admin/logs': ['操作日志', '安全审计与行为追踪']
    };
    var t = titles[route.path] || ['后台管理', 'ZJMF 控制台'];
    return '<div class="admin-topbar glass glass--flat">' +
      '<div class="admin-topbar__left"><div class="admin-topbar__title"><strong>' + t[0] + '</strong><span>' + t[1] + '</span></div></div>' +
      '<div class="admin-topbar__right admin-topbar__meta">' +
        '<span class="admin-version"><i></i>v' + UI.esc(version) + '</span>' +
        '<a class="btn btn--sm btn--ghost" href="#/">' + UI.icon('external', 14) + '前台</a>' +
      '</div>' +
    '</div>';
  }

  /* ---------------- 渲染 ---------------- */
  function shell(area, path) {
    var header = siteHeader(area);
    if (area === 'admin') {
      return header + '<div class="dash dash--admin">' + adminAside(path) +
        '<div class="dash-main">' + adminTopbar({ path: path }) + '<div id="page-root" class="stack">' + UI.loadingPage() + '</div></div>' +
        '</div>' + siteFooter();
    }
    if (area === 'user') {
      return header + '<div class="dash">' + userAside(path) +
        '<div class="dash-main"><div id="page-root" class="stack">' + UI.loadingPage() + '</div></div>' +
        '</div>' + siteFooter();
    }
    return header + '<main class="site-main"><div class="container" id="page-root" style="padding-top:var(--space-6);padding-bottom:var(--space-6)">' +
      UI.loadingPage() + '</div></main>' + siteFooter();
  }

  function currentPath() { return parseHash().path; }

  function markNav(path) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav-match]'), function (el) {
      var match = el.getAttribute('data-nav-match');
      var active = match === '/' ? path === '/' : (path === match || path.indexOf(match + '/') === 0);
      el.classList.toggle('is-active', active);
    });
  }

  function syncBadges() {
    var cart = document.querySelectorAll('[data-cart-count]');
    Array.prototype.forEach.call(cart, function (el) {
      el.textContent = UI.num(Store.state.cartCount);
      el.hidden = !Store.state.cartCount;
    });
    var unread = document.querySelectorAll('[data-unread]');
    Array.prototype.forEach.call(unread, function (el) {
      el.textContent = UI.num(Store.state.unread);
      el.hidden = !Store.state.unread;
    });
  }

  function syncThemeIcon() {
    var mode = document.documentElement.getAttribute('data-mode') || 'dark';
    Array.prototype.forEach.call(document.querySelectorAll('.js-theme-icon'), function (el) {
      var node = document.createElement('span');
      node.innerHTML = UI.icon(themeIconFor(mode), 18);
      var svg = node.firstChild;
      el.replaceWith(svg);
      svg.classList.add('js-theme-icon');
    });
  }

  function renderForbidden(returnPath) {
    root.innerHTML = shell('public', currentPath());
    var el = document.getElementById('page-root');
    el.innerHTML =
      '<div class="error-page">' +
        '<div class="error-code">403</div>' +
        '<div class="error-title">没有访问权限</div>' +
        '<div class="error-desc">当前账户没有访问该页面的权限。若你需要后台能力，请使用管理员账号登录。</div>' +
        '<div class="error-actions">' +
          '<a class="btn btn--primary" href="#/">返回首页</a>' +
          '<a class="btn btn--ghost" href="#/login?next=' + encodeURIComponent(returnPath) + '">切换账号</a>' +
        '</div>' +
      '</div>';
    bindShellEvents();
    return el;
  }

  function renderNotFoundPage(path) {
    root.innerHTML = shell('public', currentPath());
    var el = document.getElementById('page-root');
    if (notFound) {
      var res = notFound({ path: path });
      el.innerHTML = res && res.html ? res.html : String(res || '');
      if (res && res.mount) res.mount(el, { path: path });
    } else {
      el.innerHTML = '<div class="error-page"><div class="error-code">404</div>' +
        '<div class="error-title">页面走丢了</div>' +
        '<div class="error-desc">地址 ' + UI.esc(location.hash || '#/') + ' 未匹配到任何页面。</div>' +
        '<div class="error-actions"><a class="btn btn--primary" href="#/">返回首页</a>' +
        '<a class="btn btn--ghost" href="#/help">查看帮助中心</a></div></div>';
    }
    bindShellEvents();
  }

  function render() {
    var seq = ++renderSeq;
    cleanupFns.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
    cleanupFns = [];

    var loc = parseHash();
    var matched = findRoute(loc.path);
    var path = loc.path;

    if (!matched) {
      renderNotFoundPage(path);
      document.title = '页面不存在 · 智简魔方';
      window.scrollTo(0, 0);
      return;
    }

    var opts = matched.route.opts || {};

    if (opts.auth && !API.token()) {
      go('/login?next=' + encodeURIComponent(loc.raw || '/'));
      return;
    }
    if (opts.guestOnly && API.token()) {
      go(Store.state.isAdmin ? '/admin' : '/user', { replace: true });
      return;
    }
    if (opts.area === 'admin' && !Store.state.isAdmin) {
      renderForbidden(path);
      document.title = '权限不足 · 智简魔方';
      window.scrollTo(0, 0);
      return;
    }

    var area = opts.area || 'public';
    document.body.setAttribute('data-area', area);
    root.innerHTML = shell(area, path);
    markNav(path);

    var ctx = {
      params: matched.params,
      query: loc.query,
      path: path,
      raw: loc.raw,
      area: area,
      go: go,
      rerender: function () { render(); },
      updateTitle: function (t) { document.title = t + ' · 智简魔方'; }
    };
    currentCtx = ctx;

    bindShellEvents();
    if (path !== '/' || !booted) window.scrollTo(0, 0);

    var el = document.getElementById('page-root');
    var result;
    try {
      result = matched.route.handler(ctx);
    } catch (err) {
      showError(el, err, ctx);
      return;
    }

    Promise.resolve(result).then(function (res) {
      if (seq !== renderSeq) return;
      if (!res) res = { html: UI.empty({ title: '页面为空', desc: '该路由未返回任何内容' }) };
      el.innerHTML = res.html == null ? String(res) : res.html;
      document.title = (res.title ? res.title + ' · ' : '') + '智简魔方';
      if (typeof res.mount === 'function') {
        try { res.mount(el, ctx); } catch (err) { console.error('[mount]', err); UI.toast('页面交互初始化失败：' + (err.message || err), 'error'); }
      }
      syncBadges();
      markNav(path);
    }, function (err) {
      if (seq !== renderSeq) return;
      showError(el, err, ctx);
    });
  }

  function showError(el, err, ctx) {
    console.error('[route error]', err);
    var status = err && err.status ? err.status : 0;
    var title = status === 403 ? '没有访问权限' : status === 404 ? '请求的内容不存在' : '页面加载失败';
    var desc = (err && err.message) || '未知错误';
    el.innerHTML = '<div class="error-page">' +
      '<div class="error-code">' + (status === 403 ? '403' : status === 404 ? '404' : '500') + '</div>' +
      '<div class="error-title">' + title + '</div>' +
      '<div class="error-desc">' + UI.esc(desc) + '</div>' +
      '<div class="error-actions"><button class="btn btn--primary" data-action="retry">重新加载</button>' +
      '<a class="btn btn--ghost" href="#/">返回首页</a></div></div>';
    var retry = el.querySelector('[data-action="retry"]');
    if (retry) retry.addEventListener('click', function () { if (ctx && ctx.rerender) ctx.rerender(); else render(); });
  }

  /* ---------------- 外壳事件 ---------------- */
  function closePops() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pop]'), function (p) { p.hidden = true; });
  }

  function bindShellEvents() {
    var header = document.getElementById('site-header');
    if (!header) return;

    on(header, '[data-pop-trigger]', 'click', function (e, btn) {
      e.stopPropagation();
      var key = btn.getAttribute('data-pop-trigger');
      var pop = header.querySelector('[data-pop="' + key + '"]');
      if (!pop) return;
      var isOpen = !pop.hidden;
      closePops();
      pop.hidden = isOpen;
    });

    on(header, '[data-set-mode]', 'click', function (e, btn) {
      e.stopPropagation();
      var value = btn.getAttribute('data-set-mode');
      Theme.setUserMode(value);
      closePops();
      UI.toast(value === 'system' ? '已切换为跟随系统' : ('已切换为' + (value === 'light' ? '浅色' : '深色') + '模式'), 'success');
      render();
    });

    on(header, '[data-action="toggle-nav"]', 'click', function () {
      var nav = document.getElementById('mobile-nav');
      if (nav) nav.classList.toggle('is-open');
    });

    on(header, '[data-action="logout"]', 'click', function () {
      closePops();
      UI.confirm({ title: '退出登录', message: '确认退出当前账户？', confirmText: '退出' }).then(function (ok) {
        if (!ok) return;
        Store.logout().then(function () {
          UI.toast('已退出登录', 'success');
          go('/');
          render();
        });
      });
    });

    if (header._bound) return;
    header._bound = true;
  }

  function on(rootEl, selector, event, handler) {
    var fn = function (e) {
      var target = e.target;
      var el = target && target.closest ? target.closest(selector) : null;
      if (el && rootEl.contains(el)) handler(e, el);
    };
    rootEl.addEventListener(event, fn);
    cleanupFns.push(function () { rootEl.removeEventListener(event, fn); });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    root = document.getElementById('app');
    if (!root) return;

    Theme.bootFromCache();

    document.addEventListener('click', function () { closePops(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePops();
    });

    window.addEventListener('scroll', function () {
      var h = document.getElementById('site-header');
      if (h) h.classList.toggle('is-scrolled', window.scrollY > 8);
    }, { passive: true });

    Store.subscribe(function (state, type) {
      syncBadges();
      if (type === 'me' || type === 'config') {
        var area = document.body.getAttribute('data-area');
        if (area) render();
      }
    });

    Theme.onChange(function () {
      syncThemeIcon();
    });

    API.onUnauthorized(function () {
      UI.toast('登录状态已失效，请重新登录', 'warning');
      go('/login?next=' + encodeURIComponent(location.hash.replace(/^#/, '') || '/'));
    });

    window.addEventListener('hashchange', function () { render(); });

    Store.init().then(function () {
      booted = true;
      var cfgTheme = Store.state.config && Store.state.config.theme;
      if (cfgTheme) {
        var cached = Store.readThemeCache();
        if (!cached || JSON.stringify(cached) !== JSON.stringify(cfgTheme)) {
          Theme.apply(cfgTheme, { silent: true });
        }
      }
      if (!Store.state.user && Store.state.config && location.hash.replace(/^#/, '') === '') {
        // 保持默认首页
      }
      document.body.setAttribute('data-area', 'public');
      render();
      var h = document.getElementById('site-header');
      if (h) h.classList.toggle('is-scrolled', window.scrollY > 8);
    }, function () {
      booted = true;
      render();
    });
  }

  return {
    page: page,
    setNotFound: setNotFound,
    go: go,
    boot: boot,
    render: render,
    refresh: render,
    parseQuery: parseQuery,
    qs: qs,
    currentPath: currentPath,
    getCtx: function () { return currentCtx; },
    syncBadges: syncBadges,
    routes: routes
  };
})();
