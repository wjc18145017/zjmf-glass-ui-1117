/* ==========================================================================
   智简魔方 · 前台页面
   路由：首页 / 产品列表 / 产品详情 / 购物车 / 结算 / 支付结果
        / 登录 / 注册 / 找回密码 / 公告 / 帮助 / 错误页
   ========================================================================== */
(function () {
  'use strict';

  var V = window.View = window.View || {};

  function terms() {
    var commerce = Store.state.config && Store.state.config.commerce;
    return (commerce && commerce.terms) || [
      { months: 1, factor: 1 },
      { months: 3, factor: 2.88 },
      { months: 6, factor: 5.4 },
      { months: 12, factor: 9.6 }
    ];
  }

  function factorOf(months) {
    var list = terms();
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i].months) === Number(months)) return Number(list[i].factor);
    }
    return Number(months) || 1;
  }

  function priceOf(plan, months) {
    return Math.round(Number(plan.price) * factorOf(months) * 100) / 100;
  }

  function termOptionsHtml(months) {
    return terms().map(function (t) {
      var m = Number(t.months);
      var label = t.label || (m + ' 个月');
      var save = t.save || (t.factor ? Math.round((m - Number(t.factor)) / m * 100) : 0);
      return '<button type="button" class="term-option' + (m === Number(months) ? ' is-active' : '') + '" data-months="' + m + '">' +
        '<span>' + UI.esc(label) + '</span>' +
        (save > 0 ? '<span class="term-option__save">省 ' + save + '%</span>' : '') +
        '</button>';
    }).join('');
  }

  function specsInline(plan) {
    return (plan.specs || []).map(function (s) {
      return s.value ? (s.label + ' ' + s.value) : s.value;
    }).join(' · ');
  }

  V.breadcrumb = function (items) {
    var parts = ['<a href="#/">首页</a>'];
    items.forEach(function (item, idx) {
      parts.push(UI.icon('chevron-right', 13));
      if (idx === items.length - 1 || !item.href) {
        parts.push('<span class="breadcrumb__current">' + UI.esc(item.label) + '</span>');
      } else {
        parts.push('<a href="' + item.href + '">' + UI.esc(item.label) + '</a>');
      }
    });
    return '<nav class="breadcrumb">' + parts.join('') + '</nav>';
  };

  V.productCard = function (p) {
    var features = (p.features || []).slice(0, 3).map(function (f) {
      return '<li>' + UI.icon('check', 14) + '<span>' + UI.esc(f) + '</span></li>';
    }).join('');
    return '<a class="product-card glass" href="#/products/' + UI.attr(p.slug || p.id) + '">' +
      '<div class="product-card__top">' +
        '<span class="product-card__icon">' + UI.icon(UI.productIconName(p), 24) + '</span>' +
        (p.badge ? '<span class="product-card__badge">' + UI.esc(p.badge) + '</span>' : '') +
      '</div>' +
      '<div class="product-card__name">' + UI.esc(p.name) + '</div>' +
      '<div class="product-card__tagline">' + UI.esc(p.tagline) + '</div>' +
      '<ul class="product-card__features">' + features + '</ul>' +
      '<div class="product-card__foot">' +
        '<div class="product-card__price"><small>' + UI.esc(p.categoryName || '') + ' · 月付</small><b>¥' + UI.num(p.minPrice, 0) + '</b><small> 起</small></div>' +
        '<span class="product-card__link">查看详情' + UI.icon('arrow-right', 14) + '</span>' +
      '</div>' +
    '</a>';
  };

  function requireLogin(nextPath) {
    if (API.token()) return true;
    UI.toast('请先登录后再继续操作', 'warning');
    App.go('/login?next=' + encodeURIComponent(nextPath || App.currentPath()));
    return false;
  }

  /* ======================================================================
     首页
     ====================================================================== */
  App.page('/', async function () {
    var results = await Promise.all([
      API.get('/products'),
      API.get('/announcements')
    ]);
    var products = results[0].items || [];
    var announcements = results[1].items || [];
    var recommended = products.filter(function (p) { return p.recommended; });
    if (recommended.length < 4) {
      products.forEach(function (p) {
        if (recommended.length < 4 && recommended.indexOf(p) === -1) recommended.push(p);
      });
    }
    recommended = recommended.slice(0, 4);
    var notice = announcements.slice(0, 3);

    var tiers = [
      {
        name: '轻量入门', desc: '个人博客、小型站点与边缘 API', price: 49, featured: false, flag: '',
        items: ['2 核 vCPU / 4 GB 内存', '60 GB NVMe 全闪存', '5 Mbps 带宽 · 流量不限', '每日自动快照', '基础 DDoS 防护']
      },
      {
        name: '标准业务', desc: '中小型业务系统与容器集群', price: 129, featured: true, flag: '最受欢迎',
        items: ['4 核 vCPU / 8 GB 内存', '120 GB NVMe 全闪存', '10 Mbps CN2 GIA', '多可用区容灾', '10 Gbps DDoS 防护', '工单 7×24 响应']
      },
      {
        name: '旗舰算力', desc: '高并发数据库与 AI 推理前置', price: 329, featured: false, flag: '',
        items: ['8 核 vCPU / 16 GB 内存', '240 GB NVMe 全闪存', '20 Mbps 独享带宽', '私有网络编排', '快照与回滚不限次']
      }
    ];

    var heroRows = [
      { name: 'CPU', value: '18%', pct: 18 },
      { name: '内存', value: '42%', pct: 42 },
      { name: '带宽', value: '63%', pct: 63 },
      { name: '存储', value: '27%', pct: 27 }
    ].map(function (r) {
      return '<div class="hero-row"><span class="hero-row__name">' + r.name + '</span>' +
        '<span class="hero-row__bar"><i style="width:' + r.pct + '%"></i></span>' +
        '<span class="hero-row__val">' + r.value + '</span></div>';
    }).join('');

    var version = (Store.state.config && Store.state.config.version) || '1.0.0';

    return {
      title: '首页',
      html:
        '<section class="hero">' +
          '<div class="container hero__inner">' +
            '<div>' +
              '<span class="hero__badge"><span class="hero__badge-dot">' + UI.icon('sparkles', 12) + '</span>' +
                '<b>玻璃拟态主题</b> v' + UI.esc(version) + ' · 前后台统一主题引擎</span>' +
              '<h1 class="hero__title">把复杂的 IDC 控制台，<br><span class="text-gradient">做成一层通透的玻璃</span></h1>' +
              '<p class="hero__desc">智简魔方把云服务器、独立服务器、GPU 算力与对象存储收进同一个界面。玻璃层级、光斑与噪点构成深度，所有主题参数由管理员在后台实时配置。</p>' +
              '<div class="hero__actions">' +
                '<a class="btn btn--primary btn--lg" href="#/products">' + UI.icon('rocket', 18) + '开始选购</a>' +
                '<a class="btn btn--ghost btn--lg" href="#/help">' + UI.icon('book', 18) + '查看帮助</a>' +
              '</div>' +
              '<div class="hero__note">' +
                '<span>' + UI.icon('check', 14) + '秒级自动开通</span>' +
                '<span>' + UI.icon('check', 14) + '支持余额与在线支付</span>' +
                '<span>' + UI.icon('check', 14) + '主题实时切换</span>' +
              '</div>' +
              '<div class="hero__stats">' +
                '<div class="hero-stat"><strong>99.95%</strong><span>服务可用性 SLA</span></div>' +
                '<div class="hero-stat"><strong>30+</strong><span>全球机房节点</span></div>' +
                '<div class="hero-stat"><strong>42s</strong><span>平均自动交付</span></div>' +
              '</div>' +
            '</div>' +
            '<div class="hero-visual">' +
              '<div class="hero-ring"></div>' +
              '<div class="hero-panel glass glass--strong">' +
                '<div class="hero-panel__head">' +
                  '<span class="hero-panel__title">' + UI.icon('activity', 16) + 'web-prod-01 · 实时负载</span>' +
                  UI.statusBadge('running') +
                '</div>' +
                '<div class="hero-panel__rows">' + heroRows + '</div>' +
                '<div class="hero-panel__chart">' + UI.sparkline([12, 18, 15, 24, 22, 30, 28, 34, 31, 38, 42, 40], { height: 46 }) + '</div>' +
              '</div>' +
              '<div class="hero-float hero-float--a glass">' + UI.icon('zap', 16) +
                '<div><b>自动开通完成</b><span>耗时 42 秒</span></div></div>' +
              '<div class="hero-float hero-float--b glass">' + UI.icon('shield-check', 16) +
                '<div><b>DDoS 已拦截</b><span>今日 12,480 次</span></div></div>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section">' +
          '<div class="container">' +
            '<div class="section-head"><div class="section-head__text">' +
              '<span class="eyebrow">Why ZJMF</span>' +
              '<h2 class="section-title">为稳定性与可读性而设计</h2>' +
              '<p class="section-desc">不是把卡片涂白，而是用背景层、玻璃层与内容层建立真实的空间关系。</p>' +
            '</div><a class="link" href="#/products">浏览全部产品' + UI.icon('arrow-right', 15) + '</a></div>' +
            '<div class="feature-grid">' +
              [
                ['cpu', '全闪存 NVMe', '随机读写 IOPS 相比 SATA 提升 3 倍，数据库与容器启动更快。'],
                ['network', 'CN2 GIA 精品线路', '大陆与海外双向优化，晚高峰依然稳定低延迟。'],
                ['zap', '秒级自动交付', '支付完成后自动创建实例、分配 IP 并推送通知。'],
                ['shield-check', '多层 DDoS 防护', '从边缘清洗到源站隐藏，默认开启 10 Gbps 防护。']
              ].map(function (f) {
                return '<div class="feature-card glass"><span class="feature-card__icon">' + UI.icon(f[0], 22) + '</span>' +
                  '<h3 class="feature-card__title">' + f[1] + '</h3>' +
                  '<p class="feature-card__desc">' + f[2] + '</p></div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section section--tight">' +
          '<div class="container">' +
            '<div class="section-head"><div class="section-head__text">' +
              '<span class="eyebrow">Products</span>' +
              '<h2 class="section-title">推荐产品</h2>' +
              '<p class="section-desc">按业务形态选择：弹性云主机、GPU 算力、独立服务器与对象存储。</p>' +
            '</div><a class="link" href="#/products">全部产品' + UI.icon('arrow-right', 15) + '</a></div>' +
            '<div class="product-grid product-grid--four">' + recommended.map(V.productCard).join('') + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section">' +
          '<div class="container">' +
            '<div class="section-head"><div class="section-head__text">' +
              '<span class="eyebrow">Pricing</span>' +
              '<h2 class="section-title">按月付费，长周期更省</h2>' +
              '<p class="section-desc">价格透明，支持 1 / 3 / 6 / 12 个月周期，最长可省 20%。</p>' +
            '</div><a class="link" href="#/products/cloud-ecs">查看完整套餐' + UI.icon('arrow-right', 15) + '</a></div>' +
            '<div class="pricing-grid">' +
              tiers.map(function (t) {
                return '<div class="pricing-card glass' + (t.featured ? ' is-featured' : '') + '">' +
                  (t.flag ? '<span class="pricing-card__flag">' + t.flag + '</span>' : '') +
                  '<div class="pricing-card__name">' + t.name + '</div>' +
                  '<div class="pricing-card__desc">' + t.desc + '</div>' +
                  '<div class="pricing-card__price"><b>¥' + t.price + '</b><small> / 月起</small></div>' +
                  '<ul class="pricing-card__list">' + t.items.map(function (i) {
                    return '<li>' + UI.icon('check', 14) + '<span>' + i + '</span></li>';
                  }).join('') + '</ul>' +
                  '<a class="btn ' + (t.featured ? 'btn--primary' : 'btn--outline') + ' btn--block" href="#/products/cloud-ecs">立即选购</a>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section section--tight">' +
          '<div class="container">' +
            '<div class="section-head"><div class="section-head__text">' +
              '<span class="eyebrow">Newsroom</span>' +
              '<h2 class="section-title">最新公告</h2>' +
            '</div><a class="link" href="#/announcements">全部公告' + UI.icon('arrow-right', 15) + '</a></div>' +
            '<div class="news-list glass">' + (notice.length ? notice.map(function (n) {
              return '<a class="news-row" href="#/announcements/' + n.id + '">' +
                '<span class="news-row__tag">' + UI.esc(n.category || '公告') + '</span>' +
                '<span class="news-row__title">' + UI.esc(n.title) + '</span>' +
                '<span class="news-row__date">' + UI.date(n.publishedAt || n.createdAt) + '</span>' +
              '</a>';
            }).join('') : UI.empty({ title: '暂无公告', icon: 'megaphone' })) + '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section">' +
          '<div class="container">' +
            '<div class="cta-band glass glass--strong">' +
              '<div><h2 class="cta-band__title">准备好创建第一台服务器了吗？</h2>' +
              '<p class="cta-band__desc">注册即可获得演示余额；管理员账号可体验完整后台与主题编辑器。</p></div>' +
              '<div class="row">' +
                '<a class="btn btn--primary btn--lg" href="#/register">' + UI.icon('user', 17) + '免费注册</a>' +
                '<a class="btn btn--ghost btn--lg" href="#/login">' + UI.icon('login', 17) + '登录演示</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>',
      mount: function (root) {
        UI.on(root, '[data-demo-login]', 'click', function (e, el) {
          e.preventDefault();
          var user = el.getAttribute('data-user');
          var pass = el.getAttribute('data-pass');
          App.go('/login?u=' + encodeURIComponent(user) + '&p=' + encodeURIComponent(pass));
        });
      }
    };
  });

  /* ======================================================================
     产品列表
     ====================================================================== */
  App.page('/products', async function (ctx) {
    var state = {
      category: ctx.query.category || 'all',
      q: ctx.query.q || '',
      sort: ctx.query.sort || 'recommended'
    };

    function sortItems(items) {
      var list = items.slice();
      if (state.sort === 'price-asc') list.sort(function (a, b) { return a.minPrice - b.minPrice; });
      else if (state.sort === 'price-desc') list.sort(function (a, b) { return b.minPrice - a.minPrice; });
      else list.sort(function (a, b) { return (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0); });
      return list;
    }

    var first = await API.get('/products', { category: state.category === 'all' ? '' : state.category, q: state.q });
    var allCategories = first.categories || [];

    function gridHtml(items) {
      var sorted = sortItems(items);
      if (!sorted.length) {
        return UI.empty({
          icon: 'search',
          title: '没有找到匹配的产品',
          desc: '试试更换分类，或清空搜索关键词。',
          actions: '<button class="btn btn--ghost" data-reset>重置筛选</button>'
        });
      }
      return '<div class="product-grid product-grid--four">' + sorted.map(V.productCard).join('') + '</div>';
    }

    function chipsHtml() {
      var all = '<button class="chip' + (state.category === 'all' ? ' is-active' : '') + '" data-cat="all">全部 <span class="faint">' + (first.total || 0) + '</span></button>';
      var rest = allCategories.map(function (c) {
        return '<button class="chip' + (state.category === c.id ? ' is-active' : '') + '" data-cat="' + UI.attr(c.id) + '">' +
          UI.esc(c.name) + ' <span class="faint">' + c.count + '</span></button>';
      }).join('');
      return all + rest;
    }

    return {
      title: '产品与服务',
      html:
        '<div class="page-head">' +
          '<div>' + V.breadcrumb([{ label: '产品与服务' }]) +
            '<h1 class="page-head__title">云产品与套餐</h1>' +
            '<p class="page-head__desc">从轻量站点到 GPU 推理集群，按需选择规格与计费周期，支持在线开通。</p>' +
          '</div>' +
          '<div class="page-head__actions">' +
            '<a class="btn btn--ghost" href="#/cart">' + UI.icon('cart', 16) + '购物车</a>' +
          '</div>' +
        '</div>' +

        '<div class="toolbar glass glass--flat">' +
          '<div class="toolbar__left">' +
            '<div class="toolbar__search">' + UI.icon('search', 16) +
              '<input class="input" id="product-search" placeholder="搜索产品名称、描述…" value="' + UI.attr(state.q) + '">' +
            '</div>' +
            '<select class="input input--auto" id="product-sort" style="width:auto;min-width:150px">' +
              '<option value="recommended"' + (state.sort === 'recommended' ? ' selected' : '') + '>推荐优先</option>' +
              '<option value="price-asc"' + (state.sort === 'price-asc' ? ' selected' : '') + '>价格从低到高</option>' +
              '<option value="price-desc"' + (state.sort === 'price-desc' ? ' selected' : '') + '>价格从高到低</option>' +
            '</select>' +
          '</div>' +
          '<span class="toolbar__count" id="product-count">共 ' + (first.total || 0) + ' 个产品</span>' +
        '</div>' +

        '<div class="chips" id="product-chips" style="margin-top:var(--space-4)">' + chipsHtml() + '</div>' +
        '<div id="product-list" style="margin-top:var(--space-5)">' + gridHtml(first.items || []) + '</div>',
      mount: function (root) {
        var listEl = root.querySelector('#product-list');
        var countEl = root.querySelector('#product-count');
        var chipsEl = root.querySelector('#product-chips');
        var searchEl = root.querySelector('#product-search');
        var sortEl = root.querySelector('#product-sort');
        var current = first;

        function reload() {
          listEl.innerHTML = UI.skeleton(4, { lg: true });
          API.get('/products', { category: state.category === 'all' ? '' : state.category, q: state.q }).then(function (res) {
            current = res;
            listEl.innerHTML = gridHtml(res.items || []);
            if (countEl) countEl.textContent = '共 ' + (res.total || 0) + ' 个产品';
            var hash = '#/products' + App.qs({
              category: state.category === 'all' ? '' : state.category,
              q: state.q,
              sort: state.sort === 'recommended' ? '' : state.sort
            });
            if (location.hash !== hash) history.replaceState(null, '', hash);
          }, function (err) {
            listEl.innerHTML = UI.alert('error', '加载失败：' + err.message);
          });
        }

        UI.on(root, '[data-cat]', 'click', function (e, el) {
          state.category = el.getAttribute('data-cat');
          chipsEl.innerHTML = chipsHtml();
          reload();
        });
        UI.on(root, '[data-reset]', 'click', function () {
          state.category = 'all';
          state.q = '';
          if (searchEl) searchEl.value = '';
          chipsEl.innerHTML = chipsHtml();
          reload();
        });
        if (searchEl) {
          searchEl.addEventListener('input', UI.debounce(function () {
            state.q = searchEl.value.trim();
            reload();
          }, 320));
        }
        if (sortEl) {
          sortEl.addEventListener('change', function () {
            state.sort = sortEl.value;
            listEl.innerHTML = gridHtml(current.items || []);
          });
        }
      }
    };
  });

  /* ======================================================================
     产品详情 / 购买配置
     ====================================================================== */
  App.page('/products/:id', async function (ctx) {
    var product = await API.get('/products/' + encodeURIComponent(ctx.params.id));
    var plans = product.plans || [];
    if (!plans.length) {
      return { title: product.name, html: UI.empty({ title: '该产品暂无可用套餐', icon: 'box', actions: '<a class="btn btn--ghost" href="#/products">返回产品列表</a>' }) };
    }
    var defaultPlan = plans.filter(function (p) { return p.recommended; })[0] || plans[0];
    var months = 1;
    var region = (product.regions && product.regions[0]) || '';
    var os = (product.os && product.os[0]) || '';
    var qty = 1;

    var planOptions = plans.map(function (p, idx) {
      return '<button type="button" class="plan-option' + (p.id === defaultPlan.id ? ' is-active' : '') + '" data-plan="' + UI.attr(p.id) + '">' +
        '<span class="plan-option__check">' + UI.icon('check', 11) + '</span>' +
        '<div class="plan-option__head"><span class="plan-option__name">' + UI.esc(p.name) + '</span>' +
        '<span class="plan-option__price">¥' + UI.num(p.price, 0) + '<small>/月</small></span></div>' +
        '<div class="plan-option__desc">' + UI.esc(p.desc || '') + '</div>' +
        '<div class="plan-option__specs">' + (p.specs || []).map(function (s) {
          return '<span>' + UI.esc(s.label) + ' ' + UI.esc(s.value) + '</span>';
        }).join('') + '</div>' +
        (p.stock <= 10 ? '<div class="plan-option__desc" style="color:var(--warning)">仅剩 ' + p.stock + ' 台</div>' : '') +
      '</button>';
    }).join('');

    var regionOptions = (product.regions || []).map(function (r) {
      return '<option value="' + UI.attr(r) + '">' + UI.esc(r) + '</option>';
    }).join('');
    var osOptions = (product.os || []).map(function (o) {
      return '<option value="' + UI.attr(o) + '">' + UI.esc(o) + '</option>';
    }).join('');

    var related = (product.related || []).map(function (r) {
      return '<a class="news-row" href="#/products/' + UI.attr(r.slug || r.id) + '">' +
        '<span class="news-row__tag">相关</span><span class="news-row__title">' + UI.esc(r.name) + '</span>' +
        '<span class="news-row__date">¥' + UI.num(r.minPrice, 0) + '/月</span></a>';
    }).join('');

    return {
      title: product.name,
      html:
        '<div class="page-head">' +
          '<div>' + V.breadcrumb([{ label: '产品与服务', href: '#/products' }, { label: product.name }]) +
            '<h1 class="page-head__title">' + UI.esc(product.name) + '</h1>' +
          '</div>' +
        '</div>' +

        '<div class="product-hero glass glass--strong">' +
          '<div class="product-hero__main">' +
            '<div class="product-hero__meta">' +
              '<span>' + UI.icon('tag', 14) + UI.esc(product.categoryName) + '</span>' +
              '<span>' + UI.icon('star', 14) + product.rating + ' 分 · ' + UI.num(product.sold || 0) + ' 已售</span>' +
              '<span>' + UI.icon('server', 14) + plans.length + ' 个套餐</span>' +
              (product.badge ? '<span class="badge badge--accent">' + UI.esc(product.badge) + '</span>' : '') +
            '</div>' +
            '<h2 class="product-hero__title">' + UI.esc(product.tagline) + '</h2>' +
            '<p class="product-hero__desc">' + UI.esc(product.description || '') + '</p>' +
          '</div>' +
          '<div class="product-hero__price"><small>低至</small><b>¥' + UI.num(product.minPrice || plans[0].price, 0) + '</b><small> / 月起</small></div>' +
        '</div>' +

        '<div class="product-layout" style="margin-top:var(--space-5)">' +
          '<div class="buy-card glass">' +
            '<div class="buy-card__section">' +
              '<div class="buy-card__label">选择套餐 <small>共 ' + plans.length + ' 款</small></div>' +
              '<div class="stack" style="gap:10px" id="plan-list">' + planOptions + '</div>' +
            '</div>' +
            '<div class="buy-card__section">' +
              '<div class="buy-card__label">购买时长 <small>周期越长单价越低</small></div>' +
              '<div class="term-options" id="term-options">' + termOptionsHtml(months) + '</div>' +
            '</div>' +
            '<div class="buy-card__section">' +
              '<div class="form-grid">' +
                '<label class="field"><span class="field__label">机房地域</span><select class="select" id="buy-region">' + regionOptions + '</select></label>' +
                '<label class="field"><span class="field__label">操作系统</span><select class="select" id="buy-os">' + osOptions + '</select></label>' +
              '</div>' +
              '<div class="buy-card__label" style="margin-top:var(--space-4)">购买数量</div>' +
              '<div class="stepper" id="buy-qty">' +
                '<button class="stepper__btn" type="button" data-step="-1">' + UI.icon('minus', 15) + '</button>' +
                '<span class="stepper__value" id="qty-value">1</span>' +
                '<button class="stepper__btn" type="button" data-step="1">' + UI.icon('plus', 15) + '</button>' +
              '</div>' +
            '</div>' +
            '<div class="buy-card__section">' +
              '<div class="buy-summary" id="buy-summary"></div>' +
              '<div class="buy-actions">' +
                '<button class="btn btn--primary btn--lg" id="btn-buy">' + UI.icon('zap', 17) + '立即购买</button>' +
                '<button class="btn btn--ghost btn--lg" id="btn-cart">' + UI.icon('cart', 17) + '加入购物车</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="stack">' +
            '<div class="card glass">' +
              '<h3 class="card-head__title">规格参数</h3>' +
              '<div class="spec-grid" id="spec-grid"></div>' +
              '<h3 class="card-head__title" style="margin-top:var(--space-4)">产品特性</h3>' +
              '<ul class="feature-list">' + (product.features || []).map(function (f) {
                return '<li>' + UI.icon('check-circle', 16) + '<span>' + UI.esc(f) + '</span></li>';
              }).join('') + '</ul>' +
            '</div>' +
            '<div class="card glass"><h3 class="card-head__title">同类产品</h3>' +
              (related ? '<div class="news-list">' + related + '</div>' : UI.empty({ title: '暂无同类产品', icon: 'box' })) +
            '</div>' +
          '</div>' +
        '</div>',
      mount: function (root) {
        var planList = root.querySelector('#plan-list');
        var termEl = root.querySelector('#term-options');
        var summary = root.querySelector('#buy-summary');
        var specGrid = root.querySelector('#spec-grid');
        var qtyValue = root.querySelector('#qty-value');
        var regionEl = root.querySelector('#buy-region');
        var osEl = root.querySelector('#buy-os');

        function currentPlan() {
          for (var i = 0; i < plans.length; i++) if (plans[i].id === defaultPlan.id) return plans[i];
          return plans[0];
        }

        function paintSummary() {
          var plan = currentPlan();
          var unit = Number(plan.price);
          var total = priceOf(plan, months) * qty;
          var save = Math.round((unit * months - priceOf(plan, months)) * qty * 100) / 100;
          var perMonth = total / months;
          summary.innerHTML =
            '<div class="buy-summary__row"><span>套餐</span><b>' + UI.esc(plan.name) + '</b></div>' +
            '<div class="buy-summary__row"><span>周期</span><b>' + months + ' 个月 × ' + qty + ' 台</b></div>' +
            '<div class="buy-summary__row"><span>折后月单价</span><b>¥' + UI.num(perMonth) + '</b></div>' +
            (save > 0 ? '<div class="buy-summary__row"><span>长周期优惠</span><b style="color:var(--success)">-¥' + UI.num(save) + '</b></div>' : '') +
            '<div class="buy-summary__total"><span>应付总额</span><b>¥' + UI.num(total) + '</b></div>';

          specGrid.innerHTML = (plan.specs || []).map(function (s) {
            return '<div class="spec-item"><div class="spec-item__label">' + UI.esc(s.label) + '</div>' +
              '<div class="spec-item__value">' + UI.esc(s.value) + '</div></div>';
          }).join('');
        }

        UI.on(root, '[data-plan]', 'click', function (e, el) {
          defaultPlan = plans.filter(function (p) { return p.id === el.getAttribute('data-plan'); })[0] || plans[0];
          Array.prototype.forEach.call(planList.querySelectorAll('.plan-option'), function (n) {
            n.classList.toggle('is-active', n === el);
          });
          paintSummary();
        });

        UI.on(root, '[data-months]', 'click', function (e, el) {
          months = Number(el.getAttribute('data-months'));
          Array.prototype.forEach.call(termEl.querySelectorAll('.term-option'), function (n) {
            n.classList.toggle('is-active', n === el);
          });
          paintSummary();
        });

        UI.on(root, '[data-step]', 'click', function (e, el) {
          var delta = Number(el.getAttribute('data-step'));
          qty = Math.min(20, Math.max(1, qty + delta));
          qtyValue.textContent = qty;
          paintSummary();
        });

        function payload() {
          return {
            productId: product.id,
            planId: currentPlan().id,
            months: months,
            region: regionEl ? regionEl.value : region,
            os: osEl ? osEl.value : os,
            qty: qty
          };
        }

        function addToCart() {
          return API.post('/cart', payload()).then(function (res) {
            Store.setCartCount(res.count);
            return res;
          });
        }

        var btnCart = root.querySelector('#btn-cart');
        var btnBuy = root.querySelector('#btn-buy');

        if (btnCart) {
          btnCart.addEventListener('click', function () {
            if (!requireLogin('/products/' + (product.slug || product.id))) return;
            UI.busy(btnCart, function () { return addToCart(); }).then(function () {
              UI.toast('已加入购物车', 'success');
            }, function (err) { UI.toast(err.message, 'error'); });
          });
        }

        if (btnBuy) {
          btnBuy.addEventListener('click', function () {
            if (!requireLogin('/products/' + (product.slug || product.id))) return;
            UI.busy(btnBuy, function () {
              return addToCart().then(function () { App.go('/checkout'); });
            }).then(null, function (err) { UI.toast(err.message, 'error'); });
          });
        }

        paintSummary();
      }
    };
  });

  /* ======================================================================
     购物车
     ====================================================================== */
  App.page('/cart', async function (ctx) {
    if (!API.token()) {
      return {
        title: '购物车',
        html: '<div class="page-head"><div>' + V.breadcrumb([{ label: '购物车' }]) + '<h1 class="page-head__title">购物车</h1></div></div>' +
          UI.empty({
            icon: 'cart',
            title: '登录后查看购物车',
            desc: '购物车与账户绑定，登录后可跨设备同步。',
            actions: '<a class="btn btn--primary" href="#/login?next=' + encodeURIComponent('/cart') + '">登录</a>' +
              '<a class="btn btn--ghost" href="#/products">去选购</a>'
          })
      };
    }

    var cart = await API.get('/cart');

    function cartHtml(data) {
      if (!data.items.length) {
        return UI.empty({
          icon: 'cart',
          title: '购物车还是空的',
          desc: '挑选一台云服务器，或从产品列表开始浏览。',
          actions: '<a class="btn btn--primary" href="#/products">去选购产品</a>'
        });
      }
      var rows = data.items.map(function (it) {
        return '<div class="cart-item" data-item="' + UI.attr(it.key) + '">' +
          '<span class="cart-item__icon">' + UI.icon(UI.productIconName({ id: it.slug }), 21) + '</span>' +
          '<div class="cart-item__main">' +
            '<div class="cart-item__name">' + UI.esc(it.productName) + ' · ' + UI.esc(it.planName) + '</div>' +
            '<div class="cart-item__meta">' +
              '<span>' + UI.icon('globe', 12) + UI.esc(it.region) + '</span>' +
              '<span>' + UI.icon('box', 12) + UI.esc(it.os) + '</span>' +
              '<span>' + UI.icon('calendar', 12) + it.months + ' 个月</span>' +
              '<span>' + UI.icon('cpu', 12) + UI.esc(specsInline({ specs: it.specs })) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="stepper">' +
            '<button class="stepper__btn" type="button" data-qty="-1" data-key="' + UI.attr(it.key) + '">' + UI.icon('minus', 15) + '</button>' +
            '<span class="stepper__value">' + it.qty + '</span>' +
            '<button class="stepper__btn" type="button" data-qty="1" data-key="' + UI.attr(it.key) + '">' + UI.icon('plus', 15) + '</button>' +
          '</div>' +
          '<div class="cart-item__price"><b>¥' + UI.num(it.amount) + '</b><small>¥' + UI.num(it.unitPrice) + ' / ' + it.months + ' 个月</small></div>' +
          '<button class="btn btn--icon btn--ghost" data-remove="' + UI.attr(it.key) + '" title="移除">' + UI.icon('trash', 16) + '</button>' +
        '</div>';
      }).join('');

      return '<div class="cart-layout">' +
        '<div class="stack">' +
          '<div class="card glass glass--flat"><div class="row row--between">' +
            '<h2 class="card-head__title">已选 ' + data.items.length + ' 项</h2>' +
            '<button class="btn btn--sm btn--ghost" data-clear>' + UI.icon('trash', 14) + '清空购物车</button>' +
          '</div></div>' +
          '<div class="cart-list">' + rows + '</div>' +
          '<div class="row"><a class="link" href="#/products">' + UI.icon('arrow-left', 15) + '继续选购</a></div>' +
        '</div>' +
        '<div class="summary-card glass glass--strong">' +
          '<h3 class="card-head__title">订单摘要</h3>' +
          '<div class="summary-row"><span>商品数量</span><b>' + data.items.reduce(function (s, i) { return s + i.qty; }, 0) + ' 台</b></div>' +
          '<div class="summary-row"><span>计费周期</span><b>按项计算</b></div>' +
          '<div class="summary-row"><span>优惠</span><b style="color:var(--success)">已含长周期折扣</b></div>' +
          '<div class="summary-row summary-row--total"><span>合计</span><b>¥' + UI.num(data.total) + '</b></div>' +
          '<p class="summary-note">价格由服务端按套餐与周期实时计算，提交订单后余额支付立即开通。</p>' +
          '<a class="btn btn--primary btn--lg btn--block" href="#/checkout">' + UI.icon('arrow-right', 17) + '去结算</a>' +
        '</div>' +
      '</div>';
    }

    return {
      title: '购物车',
      html: '<div class="page-head"><div>' + V.breadcrumb([{ label: '购物车' }]) +
        '<h1 class="page-head__title">购物车</h1>' +
        '<p class="page-head__desc">确认套餐、地域与周期后再结算，支持随时移除或调整数量。</p></div>' +
        '<div class="page-head__actions"><a class="btn btn--ghost" href="#/products">继续选购</a></div></div>' +
        '<div id="cart-page">' + cartHtml(cart) + '</div>',
      mount: function (root) {
        var box = root.querySelector('#cart-page');

        function repaint(data) {
          box.innerHTML = cartHtml(data);
          Store.setCartCount(data.count);
        }

        function update(key, qty) {
          return API.put('/cart', { key: key, qty: qty }).then(repaint);
        }

        UI.on(root, '[data-qty]', 'click', function (e, el) {
          var key = el.getAttribute('data-key');
          var delta = Number(el.getAttribute('data-qty'));
          var row = cart.items.filter(function (i) { return i.key === key; })[0];
          if (!row) return;
          var next = Math.min(20, Math.max(1, row.qty + delta));
          if (next === row.qty) return;
          UI.busy(el, function () {
            return update(key, next).then(function (data) { cart = data; });
          }).then(null, function (err) { UI.toast(err.message, 'error'); });
        });

        UI.on(root, '[data-remove]', 'click', function (e, el) {
          var key = el.getAttribute('data-remove');
          UI.confirm({ title: '移除商品', message: '确认从购物车移除该商品？', confirmText: '移除', danger: true }).then(function (ok) {
            if (!ok) return;
            API.del('/cart/' + encodeURIComponent(key)).then(function (data) {
              cart = data;
              repaint(data);
              UI.toast('已移除', 'success');
            }, function (err) { UI.toast(err.message, 'error'); });
          });
        });

        UI.on(root, '[data-clear]', 'click', function () {
          UI.confirm({ title: '清空购物车', message: '将移除所有已选商品，此操作不可撤销。', confirmText: '清空', danger: true }).then(function (ok) {
            if (!ok) return;
            API.del('/cart').then(function () {
              cart = { items: [], total: 0, count: 0 };
              repaint(cart);
              UI.toast('购物车已清空', 'success');
            }, function (err) { UI.toast(err.message, 'error'); });
          });
        });
      }
    };
  });

  /* ======================================================================
     结算下单
     ====================================================================== */
  App.page('/checkout', async function (ctx) {
    if (!API.token()) {
      return { title: '结算', html: UI.empty({ title: '请先登录', icon: 'lock', actions: '<a class="btn btn--primary" href="#/login?next=' + encodeURIComponent('/checkout') + '">登录后结算</a>' }) };
    }

    var cart = await API.get('/cart');
    if (!cart.items.length) {
      return {
        title: '结算',
        html: '<div class="page-head"><div>' + V.breadcrumb([{ label: '购物车', href: '#/cart' }, { label: '结算' }]) +
          '<h1 class="page-head__title">结算</h1></div></div>' +
          UI.empty({ icon: 'cart', title: '没有可结算的商品', desc: '购物车为空，请先选择产品。', actions: '<a class="btn btn--primary" href="#/products">去选购</a>' })
      };
    }

    var user = Store.state.user || {};
    var methods = [
      { key: 'balance', name: '余额支付', desc: '账户余额 ¥' + UI.num(user.credits) + '，即时扣款并自动开通', icon: 'wallet' },
      { key: 'alipay', name: '支付宝', desc: '演示环境模拟跳转，确认后立即回调成功', icon: 'credit-card' },
      { key: 'wechat', name: '微信支付', desc: '演示环境模拟扫码支付，立即到账', icon: 'sparkles' }
    ];
    var selected = 'balance';
    var enough = Number(user.credits) >= Number(cart.total);

    var itemsHtml = cart.items.map(function (it) {
      return '<div class="order-item"><div class="order-item__name"><b>' + UI.esc(it.productName) + ' · ' + UI.esc(it.planName) + '</b>' +
        '<small>' + UI.esc(it.region) + ' · ' + UI.esc(it.os) + ' · ' + it.months + ' 个月 × ' + it.qty + '</small></div>' +
        '<b class="mono">¥' + UI.num(it.amount) + '</b></div>';
    }).join('');

    var methodHtml = methods.map(function (m) {
      var disabled = m.key === 'balance' && !enough;
      return '<button type="button" class="pay-method' + (m.key === selected ? ' is-active' : '') + '" data-method="' + m.key + '"' +
        (disabled ? ' disabled style="opacity:.55;cursor:not-allowed"' : '') + '>' +
        '<span class="pay-method__icon">' + UI.icon(m.icon, 19) + '</span>' +
        '<span class="pay-method__main"><span class="pay-method__name">' + m.name + (disabled ? '（余额不足）' : '') + '</span>' +
        '<span class="pay-method__desc">' + m.desc + '</span></span>' +
        '<span class="pay-method__radio"></span>' +
      '</button>';
    }).join('');

    return {
      title: '结算',
      html: '<div class="page-head"><div>' + V.breadcrumb([{ label: '购物车', href: '#/cart' }, { label: '结算' }]) +
        '<h1 class="page-head__title">确认订单</h1><p class="page-head__desc">核对配置与金额，选择支付方式后提交订单。</p></div></div>' +
        '<div class="steps" style="margin-bottom:var(--space-5)">' +
          '<div class="step"><span class="step__num">1</span>购物车</div>' + UI.icon('chevron-right', 14) +
          '<div class="step is-active"><span class="step__num">2</span>确认订单</div>' + UI.icon('chevron-right', 14) +
          '<div class="step"><span class="step__num">3</span>支付结果</div>' +
        '</div>' +
        '<div class="checkout-layout">' +
          '<div class="stack">' +
            '<div class="card glass"><h3 class="card-head__title">商品明细</h3><div class="order-items">' + itemsHtml + '</div></div>' +
            '<div class="card glass"><h3 class="card-head__title">支付方式</h3><div id="pay-methods">' + methodHtml + '</div></div>' +
            '<div class="card glass"><h3 class="card-head__title">订单备注</h3>' +
              '<label class="field"><textarea class="textarea" id="order-remark" rows="3" placeholder="选填，例如：请在工作日 10:00 后开通"></textarea>' +
              '<span class="field__hint">备注将展示在订单详情中，便于客服跟进。</span></label>' +
            '</div>' +
          '</div>' +
          '<div class="summary-card glass glass--strong">' +
            '<h3 class="card-head__title">支付摘要</h3>' +
            '<div class="summary-row"><span>商品小计</span><b>¥' + UI.num(cart.total) + '</b></div>' +
            '<div class="summary-row"><span>优惠</span><b style="color:var(--success)">已含</b></div>' +
            '<div class="summary-row"><span>账户余额</span><b>¥' + UI.num(user.credits) + '</b></div>' +
            '<div class="summary-row summary-row--total"><span>应付</span><b>¥' + UI.num(cart.total) + '</b></div>' +
            '<p class="summary-note">提交后订单进入支付流程；余额支付将立即开通服务器并生成账单。</p>' +
            '<button class="btn btn--primary btn--lg btn--block" id="submit-order">' + UI.icon('shield-check', 17) + '提交订单</button>' +
            '<div class="summary-note" style="margin-top:10px">点击提交即表示同意《服务条款》与《退款政策》。</div>' +
          '</div>' +
        '</div>',
      mount: function (root) {
        var methodsEl = root.querySelector('#pay-methods');
        var submit = root.querySelector('#submit-order');
        var remarkEl = root.querySelector('#order-remark');

        UI.on(root, '[data-method]', 'click', function (e, el) {
          if (el.hasAttribute('disabled')) return;
          selected = el.getAttribute('data-method');
          Array.prototype.forEach.call(methodsEl.querySelectorAll('.pay-method'), function (n) {
            n.classList.toggle('is-active', n === el);
          });
        });

        submit.addEventListener('click', function () {
          var remark = (remarkEl && remarkEl.value.trim()) || '';
          UI.busy(submit, function () {
            return API.post('/orders', {
              remark: remark,
              payWithBalance: selected === 'balance'
            }).then(function (order) {
              var orderNo = order.no || order.orderNo || order.id;
              if (selected === 'balance') {
                Store.refreshMe();
                App.go('/pay/result?order=' + encodeURIComponent(orderNo) + '&status=success');
                return order;
              }
              return API.post('/orders/' + order.id + '/pay', { method: selected }).then(function () {
                Store.refreshMe();
                App.go('/pay/result?order=' + encodeURIComponent(orderNo) + '&status=success');
              });
            });
          }).then(function () {
            Store.setCartCount(0);
          }, function (err) {
            if (err.code === 409) {
              UI.toast(err.message, 'error');
            } else {
              UI.toast('下单失败：' + err.message, 'error');
            }
          });
        });
      }
    };
  });

  /* ======================================================================
     支付结果
     ====================================================================== */
  App.page('/pay/result', async function (ctx) {
    var orderNo = ctx.query.order || '';
    var forced = ctx.query.status || '';
    var order = null;
    var errMsg = '';
    if (orderNo) {
      try {
        order = await API.get('/orders/' + encodeURIComponent(orderNo));
      } catch (err) {
        errMsg = err.message;
      }
    }
    var status = forced === 'success' ? 'paid' : forced === 'fail' ? 'cancelled' : (forced || (order ? order.status : 'pending'));
    var ok = status === 'paid';
    var fail = status === 'cancelled' || status === 'refunded' || (!order && !forced);
    var iconCls = ok ? '' : fail ? ' result-icon--fail' : ' result-icon--pending';
    var iconName = ok ? 'check' : fail ? 'close' : 'clock';
    var title = ok ? '支付成功，服务器正在开通' : fail ? '支付未完成' : '订单待支付';
    var desc = errMsg ? errMsg : ok
      ? '订单已支付，系统已自动创建实例并分配 IP，可在「我的服务器」查看。'
      : fail ? '订单已取消或退款，若需继续购买请重新下单。'
        : '订单已创建但尚未支付，可继续完成支付以开通服务。';

    var meta = order ? (
      '<div class="result-meta">' +
        '<div class="result-meta__item"><div class="result-meta__label">订单号</div><div class="result-meta__value mono">' + UI.esc(order.no || order.orderNo) + '</div></div>' +
        '<div class="result-meta__item"><div class="result-meta__label">订单金额</div><div class="result-meta__value">¥' + UI.num(order.amount != null ? order.amount : order.total) + '</div></div>' +
        '<div class="result-meta__item"><div class="result-meta__label">创建时间</div><div class="result-meta__value">' + UI.datetime(order.createdAt) + '</div></div>' +
      '</div>'
    ) : '';

    return {
      title: '支付结果',
      html:
        '<div class="result-hero glass glass--strong">' +
          '<div class="result-icon' + iconCls + '">' + UI.icon(iconName, 38) + '</div>' +
          '<h1 class="result-title">' + title + '</h1>' +
          '<p class="result-desc">' + UI.esc(desc) + '</p>' +
          '<div class="result-actions">' +
            (ok
              ? '<a class="btn btn--primary" href="#/user/servers">' + UI.icon('server', 17) + '查看我的服务器</a>' +
                '<a class="btn btn--ghost" href="#/user/orders">' + UI.icon('file-text', 17) + '订单详情</a>'
              : fail
                ? '<a class="btn btn--primary" href="#/products">' + UI.icon('cart', 17) + '重新选购</a>' +
                  '<a class="btn btn--ghost" href="#/user/orders">返回订单列表</a>'
                : '<button class="btn btn--primary" id="pay-now">' + UI.icon('wallet', 17) + '继续支付</button>' +
                  '<a class="btn btn--ghost" href="#/user/orders">稍后处理</a>') +
            '<a class="btn btn--ghost" href="#/">返回首页</a>' +
          '</div>' +
          meta +
        '</div>',
      mount: function (root) {
        var btn = root.querySelector('#pay-now');
        if (!btn || !order) return;
        btn.addEventListener('click', function () {
          UI.busy(btn, function () {
            return API.post('/orders/' + order.id + '/pay', { method: 'balance' }).then(function () {
              UI.toast('支付成功', 'success');
              App.go('/pay/result?order=' + encodeURIComponent(order.no || order.orderNo) + '&status=success');
            });
          }).then(null, function (err) { UI.toast(err.message, 'error'); });
        });
      }
    };
  });

  /* ======================================================================
     登录 / 注册 / 找回密码
     ====================================================================== */
  function authShell(innerHtml, asideHtml) {
    return '<div class="auth-wrap glass glass--strong">' +
      '<div class="auth-brand">' +
        '<a class="brand" href="#/"><span class="brand__mark">' + UI.icon('logo', 22) + '</span>' +
          '<span class="brand__text"><span class="brand__name">智简魔方</span><span class="brand__sub">ZJMF CLOUD</span></span></a>' +
        (asideHtml || '') +
      '</div>' +
      '<div class="auth-panel">' + innerHtml + '</div>' +
    '</div>';
  }

  App.page('/login', function (ctx) {
    var next = ctx.query.next || '';
    next = next.replace(/^#/, '');
    if (next && next.charAt(0) !== '/') next = '/' + next;
    var prefillUser = ctx.query.u || '';
    var prefillPass = ctx.query.p || '';

    return {
      title: '登录',
      html: authShell(
        '<h1 class="auth-panel__title">欢迎回来</h1>' +
        '<p class="auth-panel__desc">登录后可管理服务器、查看账单与提交工单。</p>' +
        '<form class="auth-form" id="login-form" autocomplete="off">' +
          UI.field('账号 / 邮箱', '<input class="input" name="username" placeholder="admin 或 demo" value="' + UI.attr(prefillUser) + '" data-autofocus>') +
          UI.field('密码', '<input class="input" type="password" name="password" placeholder="至少 6 位" value="' + UI.attr(prefillPass) + '">') +
          '<div class="auth-form__foot"><span>' + UI.icon('shield', 13) + ' 演示环境，数据存放在本机</span>' +
            '<a class="link" href="#/forgot">忘记密码？</a></div>' +
          '<button class="btn btn--primary btn--lg btn--block" type="submit">' + UI.icon('login', 17) + '登录</button>' +
        '</form>' +
        '<div class="demo-accounts">演示账号：管理员 <b>admin / admin123</b>；普通用户 <b>demo / demo123</b><br>' +
          '<div class="row" style="gap:8px;margin-top:10px">' +
            '<button class="btn btn--sm btn--ghost" data-fill="admin" data-pass="admin123">填入管理员</button>' +
            '<button class="btn btn--sm btn--ghost" data-fill="demo" data-pass="demo123">填入用户</button>' +
          '</div>' +
        '</div>' +
        '<div class="auth-form__foot" style="margin-top:var(--space-4)">还没有账号？<a class="link" href="#/register">免费注册' + UI.icon('arrow-right', 14) + '</a></div>',
        '<div><p class="auth-brand__quote">玻璃不是装饰，<br><em>而是层次本身</em>。</p>' +
          '<p class="auth-brand__desc">统一的主题令牌驱动前台、用户中心与后台；管理员改一处配置，整站实时生效。</p>' +
          '<div class="auth-brand__stats">' +
            '<div class="auth-brand__stat"><strong>4</strong><span>预设主题</span></div>' +
            '<div class="auth-brand__stat"><strong>28</strong><span>可调参数</span></div>' +
            '<div class="auth-brand__stat"><strong>0s</strong><span>刷新延迟</span></div>' +
          '</div></div>'
      ),
      mount: function (root) {
        var form = root.querySelector('#login-form');
        root.querySelectorAll('[data-fill]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            form.username.value = btn.getAttribute('data-fill');
            form.password.value = btn.getAttribute('data-pass');
          });
        });

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = form.querySelector('button[type="submit"]');
          var values = UI.values(form);
          if (!values.username || !values.password) {
            UI.toast('请输入账号与密码', 'warning');
            return;
          }
          UI.busy(btn, function () {
            return API.post('/auth/login', values).then(function (res) {
              API.setToken(res.token);
              return Store.refreshMe().then(function () {
                UI.toast('登录成功，欢迎回来', 'success');
                var target = next || (Store.state.isAdmin ? '/admin' : '/user');
                setTimeout(function () { App.go(target); }, 200);
              });
            });
          }).then(null, function (err) {
            UI.toast(err.message, 'error');
          });
        });
      }
    };
  });

  App.page('/register', function () {
    return {
      title: '注册',
      html: authShell(
        '<h1 class="auth-panel__title">创建账户</h1>' +
        '<p class="auth-panel__desc">注册即获得演示环境，可体验完整下单与工单流程。</p>' +
        '<form class="auth-form" id="register-form" autocomplete="off">' +
          '<div class="form-grid">' +
            UI.field('用户名', '<input class="input" name="username" placeholder="3-20 位字母/数字/下划线" data-autofocus>') +
            UI.field('昵称', '<input class="input" name="name" placeholder="选填，展示名称">') +
          '</div>' +
          UI.field('邮箱', '<input class="input" name="email" placeholder="you@example.com">') +
          UI.field('密码', '<input class="input" type="password" name="password" placeholder="6-32 位">') +
          '<button class="btn btn--primary btn--lg btn--block" type="submit">' + UI.icon('user', 17) + '注册并登录</button>' +
        '</form>' +
        '<div class="auth-form__foot" style="margin-top:var(--space-4)">已有账号？<a class="link" href="#/login">直接登录' + UI.icon('arrow-right', 14) + '</a></div>',
        '<div><p class="auth-brand__quote">从第一台实例开始，<br><em>建立你的云上基础设施</em>。</p>' +
          '<p class="auth-brand__desc">注册后可购买云服务器、提交工单、申请 API 密钥，并在用户中心查看所有资源。</p></div>'
      ),
      mount: function (root) {
        var form = root.querySelector('#register-form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = form.querySelector('button[type="submit"]');
          var v = UI.values(form);
          var ok = UI.validate(form, {
            username: { required: true, pattern: /^[a-zA-Z0-9_]{3,20}$/, patternMessage: '用户名需为 3-20 位字母、数字或下划线' },
            email: { required: true, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, patternMessage: '请输入有效邮箱' },
            password: { required: true, min: 6, minMessage: '密码至少 6 位' }
          });
          if (!ok) return;
          UI.busy(btn, function () {
            return API.post('/auth/register', v).then(function (res) {
              API.setToken(res.token);
              return Store.refreshMe().then(function () {
                UI.toast('注册成功，已自动登录', 'success');
                setTimeout(function () { App.go('/user'); }, 200);
              });
            });
          }).then(null, function (err) { UI.toast(err.message, 'error'); });
        });
      }
    };
  });

  App.page('/forgot', function () {
    var step = 1;
    var emailValue = '';
    var demoCode = '';

    return {
      title: '找回密码',
      html: authShell(
        '<h1 class="auth-panel__title">重置密码</h1>' +
        '<p class="auth-panel__desc">演示环境不发送邮件，验证码会直接显示在页面上。</p>' +
        '<form class="auth-form" id="forgot-form">' +
          UI.field('注册邮箱', '<input class="input" name="email" placeholder="you@example.com" data-autofocus>') +
          '<button class="btn btn--primary btn--lg btn--block" type="submit" id="forgot-send">' + UI.icon('mail', 17) + '发送验证码</button>' +
        '</form>' +
        '<div id="reset-area"></div>' +
        '<div class="auth-form__foot" style="margin-top:var(--space-4)"><a class="link" href="#/login">' + UI.icon('arrow-left', 14) + '返回登录</a></div>',
        '<div><p class="auth-brand__quote">忘记密码不是问题，<br><em>关键是能安全地找回来</em>。</p>' +
          '<p class="auth-brand__desc">重置成功后所有设备上的登录令牌会立即失效，需要重新登录。</p></div>'
      ),
      mount: function (root) {
        var form = root.querySelector('#forgot-form');
        var area = root.querySelector('#reset-area');

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var email = form.email.value.trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { UI.toast('请输入有效的邮箱地址', 'warning'); return; }
          var btn = root.querySelector('#forgot-send');
          UI.busy(btn, function () {
            return API.post('/auth/forgot', { email: email }).then(function (res) {
              emailValue = email;
              demoCode = res.demoCode || '';
              step = 2;
              UI.toast(res.message, 'success', 5000);
              area.innerHTML =
                '<form class="auth-form" id="reset-form" style="margin-top:var(--space-4)">' +
                  UI.field('验证码', '<input class="input" name="code" placeholder="6 位数字" value="' + UI.attr(demoCode) + '">' +
                    (demoCode ? '' : '<span class="field__hint">该邮箱未注册时不会返回验证码</span>')) +
                  UI.field('新密码', '<input class="input" type="password" name="password" placeholder="6-32 位">') +
                  '<button class="btn btn--primary btn--block" type="submit">' + UI.icon('lock', 16) + '确认重置</button>' +
                '</form>';
              var rf = area.querySelector('#reset-form');
              rf.addEventListener('submit', function (ev) {
                ev.preventDefault();
                var pwd = rf.password.value;
                if (pwd.length < 6) { UI.toast('密码至少 6 位', 'warning'); return; }
                var b = rf.querySelector('button[type="submit"]');
                UI.busy(b, function () {
                  return API.post('/auth/reset', { email: emailValue, code: rf.code.value.trim(), password: pwd }).then(function () {
                    UI.toast('密码已重置，请重新登录', 'success');
                    setTimeout(function () { App.go('/login'); }, 400);
                  });
                }).then(null, function (err) { UI.toast(err.message, 'error'); });
              });
            });
          }).then(null, function (err) { UI.toast(err.message, 'error'); });
        });
      }
    };
  });

  /* ======================================================================
     公告列表 / 详情
     ====================================================================== */
  App.page('/announcements', async function (ctx) {
    var category = ctx.query.category || '';
    var res = await API.get('/announcements', { category: category });
    var items = res.items || [];

    function listHtml(list) {
      if (!list.length) return UI.empty({ icon: 'megaphone', title: '暂无公告', desc: '新的产品与维护信息会在这里发布。' });
      return '<div class="article-list glass" style="padding:0 var(--space-4)">' + list.map(function (n) {
        var d = UI.date(n.publishedAt || n.createdAt).split('-');
        return '<a class="article-row" href="#/announcements/' + n.id + '">' +
          '<span class="article-row__date"><b>' + (d[2] || '01') + '</b><small>' + (d[0] + '.' + d[1]) + '</small></span>' +
          '<span class="article-row__main">' +
            '<span class="article-row__title">' + UI.esc(n.title) +
              (n.pinned ? ' <span class="badge badge--accent">置顶</span>' : '') + '</span>' +
            '<span class="article-row__excerpt">' + UI.esc(n.excerpt || '') + '</span>' +
            '<span class="article-row__meta"><span>' + UI.esc(n.category || '公告') + '</span>' +
              '<span>' + UI.icon('eye', 12) + (n.views || 0) + ' 次阅读</span></span>' +
          '</span>' +
          UI.icon('chevron-right', 16) +
        '</a>';
      }).join('') + '</div>';
    }

    var cats = (res.categories || []).map(function (c) {
      return '<a href="#/announcements?category=' + encodeURIComponent(c) + '" class="' + (category === c ? 'is-active' : '') + '">' +
        '<span>' + UI.esc(c) + '</span>' + UI.icon('chevron-right', 13) + '</a>';
    }).join('');

    return {
      title: '公告中心',
      html: '<div class="page-head"><div>' + V.breadcrumb([{ label: '公告中心' }]) +
        '<h1 class="page-head__title">公告中心</h1>' +
        '<p class="page-head__desc">产品更新、机房维护与活动通知。共 ' + items.length + ' 条公告。</p></div></div>' +
        '<div class="news-layout">' +
          '<div id="news-list">' + listHtml(items) + '</div>' +
          '<aside>' +
            '<div class="side-card glass"><div class="side-card__title">分类</div><div class="category-list">' +
              '<a href="#/announcements" class="' + (category ? '' : 'is-active') + '"><span>全部公告</span>' + UI.icon('chevron-right', 13) + '</a>' + cats +
            '</div></div>' +
            '<div class="side-card glass"><div class="side-card__title">需要帮助？</div>' +
              '<p class="muted" style="font-size:var(--fs-sm);line-height:1.7">遇到问题可提交工单，技术支持 7×24 小时响应。</p>' +
              '<a class="btn btn--ghost btn--block" style="margin-top:var(--space-3)" href="#/user/tickets/new">提交工单</a></div>' +
          '</aside>' +
        '</div>',
      mount: function (root) {
        UI.on(root, '[data-cat]', 'click', function (e, el) {
          var c = el.getAttribute('data-cat');
          API.get('/announcements', { category: c }).then(function (data) {
            root.querySelector('#news-list').innerHTML = listHtml(data.items || []);
            Array.prototype.forEach.call(root.querySelectorAll('.category-list a'), function (a) {
              a.classList.toggle('is-active', a.getAttribute('data-cat') === c);
            });
          });
        });
      }
    };
  });

  App.page('/announcements/:id', async function (ctx) {
    var res = await API.get('/announcements/' + encodeURIComponent(ctx.params.id));
    var n = res.announcement || res;
    return {
      title: n.title,
      html: '<div class="container--narrow" style="max-width:840px;margin:0 auto">' +
        '<div style="margin-bottom:var(--space-4)">' + V.breadcrumb([{ label: '公告中心', href: '#/announcements' }, { label: '公告详情' }]) + '</div>' +
        '<article class="article glass glass--strong">' +
          '<h1 class="article__title">' + UI.esc(n.title) + '</h1>' +
          '<div class="article__meta">' +
            '<span>' + UI.icon('tag', 13) + UI.esc(n.category || '公告') + '</span>' +
            '<span>' + UI.icon('calendar', 13) + UI.date(n.publishedAt || n.createdAt) + '</span>' +
            '<span>' + UI.icon('eye', 13) + (n.views || 0) + ' 次阅读</span>' +
            '<span>' + UI.icon('user', 13) + UI.esc(n.author || '运营团队') + '</span>' +
          '</div>' +
          '<div class="md">' + UI.markdown(n.content || '') + '</div>' +
          '<div class="row" style="margin-top:var(--space-7);padding-top:var(--space-5);border-top:1px solid var(--line)">' +
            '<a class="btn btn--ghost" href="#/announcements">' + UI.icon('arrow-left', 16) + '返回公告列表</a>' +
          '</div>' +
        '</article>' +
      '</div>'
    };
  });

  /* ======================================================================
     帮助中心
     ====================================================================== */
  App.page('/help', async function () {
    var res = await API.get('/help');
    var categories = res.categories || [];

    function cardHtml(cat) {
      var articles = cat.articles || [];
      return '<div class="help-card glass">' +
        '<div class="row"><span class="help-card__icon">' + UI.icon(cat.icon || 'book', 20) + '</span>' +
        '<div><div class="help-card__title">' + UI.esc(cat.title || cat.name) + '</div>' +
        '<div class="help-card__count">' + articles.length + ' 篇文档</div></div></div>' +
        '<div class="help-card__links">' + articles.map(function (a, idx) {
          return '<span data-article="' + UI.attr(cat.id + '-' + idx) + '" data-cat="' + UI.attr(cat.id) + '" role="button">' +
            UI.esc(a.q || a.title) + UI.icon('chevron-right', 12) + '</span>';
        }).join('') + '</div>' +
      '</div>';
    }

    var payload = {};
    categories.forEach(function (cat) {
      (cat.articles || []).forEach(function (a, idx) {
        payload[cat.id + '-' + idx] = { title: a.q || a.title, body: a.a || a.answer || '', cat: cat.title };
      });
    });

    return {
      title: '帮助中心',
      html:
        '<div class="help-hero glass glass--strong">' +
          '<span class="eyebrow">Help Center</span>' +
          '<h1 class="help-hero__title">需要什么帮助？</h1>' +
          '<p class="help-hero__desc">从开通、计费到安全策略，先在这里查找答案；找不到可提交工单。</p>' +
          '<div class="help-search">' + UI.icon('search', 17) +
            '<input class="input" id="help-search" placeholder="搜索问题关键词，例如 快照 / 续费 / 实名…">' +
          '</div>' +
        '</div>' +
        '<div class="help-grid" id="help-grid">' + categories.map(cardHtml).join('') + '</div>' +
        '<div class="help-contact glass">' +
          '<div class="help-contact__item">' + UI.icon('mail', 20) + '<b>邮件支持</b><small>support@zjmf.demo</small></div>' +
          '<div class="help-contact__item">' + UI.icon('phone', 20) + '<b>电话支持</b><small>400-800-1117</small></div>' +
          '<div class="help-contact__item">' + UI.icon('ticket', 20) + '<b>工单支持</b><small><a class="link" href="#/user/tickets/new">提交工单</a></small></div>' +
        '</div>',
      mount: function (root) {
        var searchEl = root.querySelector('#help-search');
        var grid = root.querySelector('#help-grid');

        function openArticle(key) {
          var item = payload[key];
          if (!item) return;
          UI.modal({
            title: item.title,
            sub: item.cat,
            size: 'lg',
            body: '<div class="md">' + UI.markdown(item.body) + '</div>',
            footer: '<button class="btn btn--ghost" data-modal-close>关闭</button>' +
              '<a class="btn btn--primary" href="#/user/tickets/new" data-modal-close>仍未解决？提交工单</a>'
          });
        }

        UI.on(root, '[data-article]', 'click', function (e, el) {
          openArticle(el.getAttribute('data-article'));
        });

        if (searchEl) {
          searchEl.addEventListener('input', UI.debounce(function () {
            var q = searchEl.value.trim().toLowerCase();
            if (!q) { grid.innerHTML = categories.map(cardHtml).join(''); return; }
            var hits = Object.keys(payload).filter(function (k) {
              return (payload[k].title + payload[k].body).toLowerCase().indexOf(q) !== -1;
            });
            grid.innerHTML = hits.length
              ? '<div class="glass" style="padding:var(--space-3);grid-column:1/-1">' + hits.slice(0, 20).map(function (k) {
                return '<button class="news-row" style="width:100%" data-article="' + UI.attr(k) + '">' +
                  '<span class="news-row__tag">' + UI.esc(payload[k].cat) + '</span>' +
                  '<span class="news-row__title">' + UI.esc(payload[k].title) + '</span>' +
                  '<span class="news-row__date">' + UI.icon('arrow-right', 14) + '</span></button>';
              }).join('') + '</div>'
              : UI.empty({ icon: 'search', title: '没有匹配的答案', desc: '换个关键词，或直接提交工单联系技术支持。', actions: '<a class="btn btn--primary" href="#/user/tickets/new">提交工单</a>' });
          }, 300));
        }
      }
    };
  });

  /* ======================================================================
     错误页 / 404
     ====================================================================== */
  function errorPage(code, title, desc, actions) {
    return {
      title: title,
      html: '<div class="error-page">' +
        '<div class="error-ring"></div>' +
        '<div class="error-code">' + code + '</div>' +
        '<div class="error-title">' + title + '</div>' +
        '<div class="error-desc">' + UI.esc(desc) + '</div>' +
        '<div class="error-actions">' + (actions ||
          '<a class="btn btn--primary" href="#/">返回首页</a><a class="btn btn--ghost" href="#/help">查看帮助</a>') +
        '</div>' +
      '</div>'
    };
  }

  App.page('/403', function () {
    return errorPage('403', '没有访问权限', '你的账户无权访问该资源。若为误判，请联系管理员调整权限。',
      '<a class="btn btn--primary" href="#/user">返回用户中心</a><a class="btn btn--ghost" href="#/login?next=' + encodeURIComponent('/admin') + '">切换账号</a>');
  });

  App.page('/404', function () {
    return errorPage('404', '页面走丢了', '你访问的地址不存在，可能已被移动或删除。');
  });

  App.page('/500', function () {
    return errorPage('500', '服务出现异常', '请稍后重试；若问题持续，可提交工单反馈。',
      '<a class="btn btn--primary" href="#/" data-retry>重新加载</a><a class="btn btn--ghost" href="#/user/tickets/new">提交工单</a>');
  });

  App.setNotFound(function (ctx) {
    return errorPage('404', '页面走丢了', '地址 ' + (location.hash || '#/') + ' 未匹配到任何页面。');
  });
})();
