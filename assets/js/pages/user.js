/* ==========================================================================
   智简魔方 · 用户中心页面
   路由：概览 / 实例 / 订单 / 账单充值 / 工单 / 实名 / 安全 / 密钥 /
        通知 / 资料 / 主题偏好
   ========================================================================== */
(function () {
  'use strict';

  var V = window.View = window.View || {};

  /* ---------------- 通用片段 ---------------- */

  function pageHead(title, desc, actions) {
    return '<div class="page-head"><div class="page-head__text">' +
      '<h1 class="page-head__title">' + UI.esc(title) + '</h1>' +
      (desc ? '<p class="page-head__desc">' + UI.esc(desc) + '</p>' : '') +
      '</div>' + (actions ? '<div class="page-head__actions">' + actions + '</div>' : '') + '</div>';
  }

  function greetWord() {
    var h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 11) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  function dot(status) {
    var tone = status === 'running' || status === 'paid' ? 'running'
      : status === 'expired' || status === 'error' ? 'expired' : 'stopped';
    return '<span class="status-dot status-dot--' + tone + '"></span>';
  }

  function serverIconName(s) {
    var text = (s.productName || '') + ' ' + (s.name || '');
    if (/GPU|A10|A100/i.test(text)) return 'cpu';
    if (/香港|CN2|海外|海外/i.test(text)) return 'globe';
    if (/存储|对象|OSS/i.test(text)) return 'database';
    if (/CDN|防护|DDoS/i.test(text)) return 'shield';
    if (/VPS|轻量/i.test(text)) return 'layers';
    return 'server';
  }

  function serverLabel(s) {
    var status = s.status;
    var text = status === 'running' ? '运行中' : status === 'stopped' ? '已停止'
      : status === 'expired' ? '已到期' : status === 'error' ? '异常' : '未知';
    return UI.statusBadge(status, text);
  }

  function serverCard(s) {
    return '<a class="server-card" href="#/user/servers/' + s.id + '">' +
      '<span class="server-card__icon">' + UI.icon(serverIconName(s), 22) + '</span>' +
      '<div class="server-card__main">' +
        '<div class="server-card__name">' + dot(s.status) + UI.esc(s.name) + serverLabel(s) + '</div>' +
        '<div class="server-card__meta">' +
          '<span class="mono">' + UI.esc(s.ip || '未分配') + '</span>' +
          '<span>' + UI.esc(s.planName || '') + '</span>' +
          '<span>' + UI.esc(s.region || '') + '</span>' +
          '<span>' + UI.icon('clock', 12) + '到期 ' + UI.date(s.expireAt) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="server-card__side"><b>' + UI.esc(s.cpu || '') + ' / ' + UI.esc(s.ram || '') + '</b>' +
        UI.esc(s.os || '') + '</div>' +
      UI.icon('chevron-right', 16) +
    '</a>';
  }

  function statCard(opts) {
    return '<div class="stat glass">' +
      '<div class="stat__label">' + UI.icon(opts.icon, 15) + UI.esc(opts.label) + '</div>' +
      '<div class="stat__value">' + opts.value + '</div>' +
      '<div class="stat__meta">' + opts.meta + '</div>' +
      (opts.spark ? '<div class="stat__spark">' + opts.spark + '</div>' : '') +
    '</div>';
  }

  function itemSummary(order) {
    return (order.items || []).map(function (it) {
      return UI.esc(it.productName) + ' <span class="faint">/ ' + UI.esc(it.planName) + ' × ' + it.qty + '</span>';
    }).join('<br>');
  }

  function terms() {
    var commerce = Store.state.config && Store.state.config.commerce;
    return (commerce && commerce.terms) || [
      { months: 1, factor: 1 }, { months: 3, factor: 2.88 },
      { months: 6, factor: 5.4 }, { months: 12, factor: 9.6 }
    ];
  }

  function factorOf(months) {
    var list = terms();
    for (var i = 0; i < list.length; i++) {
      if (Number(list[i].months) === Number(months)) return Number(list[i].factor);
    }
    return Number(months) || 1;
  }

  /* ---------------- 订单弹层 ---------------- */

  function openOrderDetail(id) {
    return API.get('/orders/' + encodeURIComponent(id)).then(function (o) {
      var items = (o.items || []).map(function (it) {
        return '<div class="order-item"><div class="order-item__name"><b>' + UI.esc(it.productName) +
          ' <span class="faint">/ ' + UI.esc(it.planName) + '</span></b><small>' +
          UI.esc(it.region) + ' · ' + UI.esc(it.os) + ' · ' + it.months + ' 个月 × ' + it.qty +
          '</small></div><b class="mono">' + UI.money(it.amount) + '</b></div>';
      }).join('');
      var servers = (o.servers || []).map(function (s) {
        return '<a class="server-card" href="#/user/servers/' + s.id + '">' +
          '<span class="server-card__icon">' + UI.icon('server', 22) + '</span>' +
          '<div class="server-card__main"><div class="server-card__name">' + dot(s.status) + UI.esc(s.name) + serverLabel(s) + '</div>' +
          '<div class="server-card__meta"><span class="mono">' + UI.esc(s.ip) + '</span><span>' + UI.esc(s.planName) + '</span></div></div>' +
          UI.icon('chevron-right', 16) + '</a>';
      }).join('');
      UI.modal({
        title: '订单详情',
        sub: o.no + ' · ' + (o.statusText || o.status),
        size: 'lg',
        body: '<div class="stack">' +
          '<div class="row row--between"><span class="muted">订单号</span><b class="mono">' + UI.esc(o.no) + '</b></div>' +
          '<div class="row row--between"><span class="muted">金额</span><b class="mono accent">' + UI.money(o.amount) + '</b></div>' +
          '<div class="row row--between"><span class="muted">状态</span>' + UI.statusBadge(o.status, o.statusText) + '</div>' +
          '<div class="row row--between"><span class="muted">创建时间</span><span>' + UI.datetime(o.createdAt) + '</span></div>' +
          (o.paidAt ? '<div class="row row--between"><span class="muted">支付时间</span><span>' + UI.datetime(o.paidAt) + '</span></div>' : '') +
          (o.payMethod ? '<div class="row row--between"><span class="muted">支付方式</span><span>' + UI.esc(UI.payMethod(o.payMethod)) + '</span></div>' : '') +
          (o.remark ? '<div class="row row--between"><span class="muted">备注</span><span>' + UI.esc(o.remark) + '</span></div>' : '') +
          '<hr class="divider">' +
          '<div class="order-items">' + items + '</div>' +
          (servers ? '<hr class="divider"><div class="card-head__title">关联实例</div><div class="server-list">' + servers + '</div>' : '') +
        '</div>',
        footer: '<button class="btn btn--ghost" data-modal-close>关闭</button>' +
          (o.status === 'pending' ? '<button class="btn btn--primary" data-modal-pay="' + o.id + '">去支付 ' + UI.money(o.amount) + '</button>' : '')
      });
      var payBtn = document.querySelector('[data-modal-pay]');
      if (payBtn) {
        payBtn.addEventListener('click', function () {
          UI.closeTopModal();
          openPayModal(o, null);
        });
      }
    }).catch(function (err) { UI.toast(err.message, 'error'); });
  }

  function openPayModal(order, onDone) {
    var user = Store.state.user || {};
    var balance = Number(user.credits || 0);
    var methods = [
      { key: 'balance', name: '账户余额', desc: '余额 ' + UI.money(balance), icon: 'wallet', disabled: balance < Number(order.amount) },
      { key: 'alipay', name: '支付宝', desc: '演示环境即时确认', icon: 'credit-card' },
      { key: 'wechat', name: '微信支付', desc: '演示环境即时确认', icon: 'sparkles' }
    ];
    var selected = methods.filter(function (m) { return !m.disabled; })[0].key;
    function methodHtml() {
      return methods.map(function (m) {
        return '<button type="button" class="pay-method' + (m.key === selected ? ' is-active' : '') + '" data-pay="' + m.key + '"' +
          (m.disabled ? ' disabled style="opacity:.55;cursor:not-allowed"' : '') + '>' +
          '<span class="pay-method__icon">' + UI.icon(m.icon, 19) + '</span>' +
          '<span class="pay-method__main"><span class="pay-method__name">' + m.name + (m.disabled ? '（余额不足）' : '') + '</span>' +
          '<span class="pay-method__desc">' + m.desc + '</span></span>' +
          '<span class="pay-method__radio"></span></button>';
      }).join('');
    }
    UI.modal({
      title: '支付订单',
      sub: '订单 ' + order.no + ' · 应付 ' + UI.money(order.amount),
      body: '<div class="stack"><div id="pay-list">' + methodHtml() + '</div>' +
        UI.alert('info', '演示环境不会真实扣款，选择任意渠道都会直接完成支付并开通实例。', 'info') + '</div>',
      footer: '<button class="btn btn--ghost" data-modal-close>取消</button>' +
        '<button class="btn btn--primary" id="pay-confirm">' + UI.icon('check', 16) + '确认支付 ' + UI.money(order.amount) + '</button>',
      onMount: function (root, close) {
        UI.on(root, '[data-pay]', 'click', function (e, el) {
          if (el.hasAttribute('disabled')) return;
          selected = el.getAttribute('data-pay');
          root.querySelector('#pay-list').innerHTML = methodHtml();
        });
        root.querySelector('#pay-confirm').addEventListener('click', function (e) {
          var btn = e.currentTarget;
          UI.busy(btn, function () {
            return API.post('/orders/' + order.id + '/pay', { method: selected }).then(function (res) {
              close();
              UI.toast('支付成功，订单 ' + res.no + ' 已生效', 'success');
              Store.refreshMe();
              if (onDone) onDone(res);
            });
          }).catch(function (err) { UI.toast(err.message, 'error'); });
        });
      }
    });
  }

  /* ======================================================================
     概览仪表盘
     ====================================================================== */
  App.page('/user', async function () {
    var d = await API.get('/user/summary');
    var user = Store.state.user || {};
    var running = Number(d.serverRunning || 0);

    var quick = [
      { icon: 'cloud', title: '购买云服务器', desc: '云主机 / GPU / 香港节点', href: '#/products?category=cloud' },
      { icon: 'ticket', title: '提交工单', desc: '技术支持 7 x 24 响应', href: '#/user/tickets/new' },
      { icon: 'wallet', title: '账户充值', desc: '余额支付立减等待时间', href: '#/user/billing' },
      { icon: 'key', title: 'API 密钥', desc: '自动化管理你的实例', href: '#/user/apikeys' }
    ].map(function (q) {
      return '<a class="quick-action" href="' + q.href + '">' +
        '<span class="quick-action__icon">' + UI.icon(q.icon, 19) + '</span>' +
        '<span class="quick-action__title">' + UI.esc(q.title) + '</span>' +
        '<span class="quick-action__desc">' + UI.esc(q.desc) + '</span>' +
        '<span class="quick-action__arrow">' + UI.icon('arrow-right', 15) + '</span></a>';
    }).join('');

    var servers = (d.servers || []).map(serverCard).join('');
    var orders = (d.orders || []).map(function (o) {
      return '<a class="mini-order" href="#/user/orders">' +
        '<span class="mini-order__main"><b class="mono">' + UI.esc(o.no) + '</b>' +
        '<small>' + UI.date(o.createdAt) + ' · ' + (o.items || []).length + ' 项商品</small></span>' +
        '<span class="mini-order__side">' + UI.money(o.amount) + UI.statusBadge(o.status, o.statusText) + '</span></a>';
    }).join('');

    var notes = (d.notifications || []).map(function (n) {
      return '<div class="notification-item' + (n.read ? '' : ' is-unread') + '">' +
        '<span class="notification-item__icon">' + UI.icon(n.type === 'billing' ? 'wallet' : n.type === 'ticket' ? 'ticket' : n.type === 'system' ? 'shield' : 'bell', 18) + '</span>' +
        '<div class="notification-item__main"><div class="notification-item__title">' + UI.esc(n.title) + '</div>' +
        '<div class="notification-item__content">' + UI.esc(n.content) + '</div>' +
        '<div class="notification-item__time">' + UI.fromNow(n.at) + '</div></div></div>';
    }).join('');

    return {
      title: '用户中心',
      html: '<div class="welcome-strip glass glass--strong">' +
        '<div><h1 class="welcome__title">' + greetWord() + '，' + UI.esc(user.name || user.username || '') + '</h1>' +
          '<p class="welcome__desc">' + (running > 0 ? '你有 ' + running + ' 台实例正在运行' : '当前没有运行中的实例') +
          (d.unpaidOrders > 0 ? '，另有 ' + d.unpaidOrders + ' 笔订单待支付。' : '，一切正常。') + '</p></div>' +
        '<div class="welcome__balance"><small>账户余额（元）</small><b>' + UI.num(d.balance) + '</b></div>' +
      '</div>' +

      '<div class="stat-grid">' +
        statCard({ icon: 'wallet', label: '账户余额', value: UI.num(d.balance), meta: '<span class="accent">可用额度</span> · 支持余额支付' }) +
        statCard({ icon: 'server', label: '云服务器', value: d.serverTotal, meta: (d.serverRunning || 0) + ' 台运行中 · ' + ((d.serverTotal || 0) - running) + ' 台停止' }) +
        statCard({ icon: 'file-text', label: '订单总数', value: d.orderTotal, meta: (d.unpaidOrders || 0) + ' 笔待支付' }) +
        statCard({ icon: 'ticket', label: '进行中工单', value: d.ticketOpen, meta: '技术支持 7 x 24 小时' }) +
      '</div>' +

      '<div class="quick-actions">' + quick + '</div>' +

      '<div class="dash-cols">' +
        '<div class="card glass">' +
          '<div class="card-head"><h3 class="card-head__title">我的服务器</h3>' +
            '<a class="link" href="#/user/servers">全部实例' + UI.icon('arrow-right', 14) + '</a></div>' +
          (servers ? '<div class="server-list">' + servers + '</div>'
            : UI.empty({ icon: 'server', title: '还没有实例', desc: '选购一台云服务器，几分钟内完成开通。',
              actions: '<a class="btn btn--primary btn--sm" href="#/products?category=cloud">选购服务器</a>' })) +
        '</div>' +
        '<div class="card glass">' +
          '<div class="card-head"><h3 class="card-head__title">最近订单</h3>' +
            '<a class="link" href="#/user/orders">订单管理' + UI.icon('arrow-right', 14) + '</a></div>' +
          (orders ? '<div class="mini-orders">' + orders + '</div>'
            : UI.empty({ icon: 'file-text', title: '暂无订单', desc: '下单后可在这里跟踪支付与开通状态。' })) +
        '</div>' +
      '</div>' +

      '<div class="card glass">' +
        '<div class="card-head"><h3 class="card-head__title">消息通知</h3>' +
          '<a class="link" href="#/user/notifications">全部通知' + UI.icon('arrow-right', 14) + '</a></div>' +
        (notes ? '<div class="notification-list">' + notes + '</div>'
          : UI.empty({ icon: 'bell', title: '没有新消息', desc: '续费提醒、工单回复与审核结果会出现在这里。' })) +
      '</div>'
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     我的服务器
     ====================================================================== */
  App.page('/user/servers', async function (ctx) {
    var filter = ctx.query.status || 'all';
    var res = await API.get('/servers');
    var all = res.items || [];
    var counts = {
      all: all.length,
      running: all.filter(function (s) { return s.status === 'running'; }).length,
      stopped: all.filter(function (s) { return s.status === 'stopped'; }).length,
      expired: all.filter(function (s) { return s.status === 'expired'; }).length
    };
    var tabs = [['all', '全部'], ['running', '运行中'], ['stopped', '已停止'], ['expired', '已到期']].map(function (t) {
      return '<button class="chip' + (filter === t[0] ? ' is-active' : '') + '" data-filter="' + t[0] + '">' +
        UI.esc(t[1]) + '<span class="chip__count">' + counts[t[0]] + '</span></button>';
    }).join('');

    function listHtml(items) {
      if (!items.length) {
        return UI.empty({ icon: 'server', title: '没有符合条件的实例', desc: '调整筛选条件，或选购新的云服务器。',
          actions: '<a class="btn btn--primary btn--sm" href="#/products?category=cloud">选购服务器</a>' });
      }
      return '<div class="server-list">' + items.map(serverCard).join('') + '</div>';
    }

    var visible = filter === 'all' ? all : all.filter(function (s) { return s.status === filter; });

    return {
      title: '我的服务器',
      html: pageHead('我的服务器', '共 ' + all.length + ' 台实例，' + counts.running + ' 台运行中。',
        '<a class="btn btn--soft" href="#/products?category=cloud">' + UI.icon('plus', 15) + '购买新实例</a>') +
        '<div class="chips">' + tabs + '</div>' +
        '<div class="card glass" id="server-list-wrap">' + listHtml(visible) + '</div>',
      mount: function (root) {
        UI.on(root, '[data-filter]', 'click', function (e, el) {
          var f = el.getAttribute('data-filter');
          Array.prototype.forEach.call(root.querySelectorAll('[data-filter]'), function (b) {
            b.classList.toggle('is-active', b === el);
          });
          var items = f === 'all' ? all : all.filter(function (s) { return s.status === f; });
          root.querySelector('#server-list-wrap').innerHTML = listHtml(items);
          if (history.replaceState) {
            history.replaceState(null, '', '#/user/servers' + (f === 'all' ? '' : '?status=' + f));
          }
        });
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     实例详情
     ====================================================================== */
  App.page('/user/servers/:id', async function (ctx) {
    var s = await API.get('/servers/' + encodeURIComponent(ctx.params.id));
    var product = null;
    try { product = await API.get('/products/' + s.productId); } catch (err) { product = null; }
    var plan = null;
    if (product) {
      (product.plans || []).forEach(function (p) { if (p.id === s.planId) plan = p; });
    }
    var expireDays = UI.daysLeft(s.expireAt);
    var traffic = Number(s.trafficUsed || 0);
    var trafficText = s.trafficLimit && s.trafficLimit !== '不限' ? (traffic + ' GB / ' + s.trafficLimit) : (traffic + ' GB / 不限流量');
    var trafficPct = s.trafficLimit && s.trafficLimit !== '不限'
      ? Math.min(100, Math.round(traffic / Math.max(1, parseFloat(s.trafficLimit)) * 100)) : 12;

    function heroHtml(server) {
      return '<div class="server-hero glass glass--strong" id="server-hero">' +
        '<div class="server-hero__main">' +
          '<span class="server-hero__icon">' + UI.icon(serverIconName(server), 26) + '</span>' +
          '<div><div class="server-hero__name">' + UI.esc(server.name) + ' <span id="server-status">' + serverLabel(server) + '</span></div>' +
            '<div class="server-hero__meta">' +
              '<span>' + UI.icon('globe', 13) + UI.esc(server.ip || '未分配 IP') + '</span>' +
              '<span>' + UI.icon('layers', 13) + UI.esc(server.planName) + '</span>' +
              '<span>' + UI.icon('monitor', 13) + UI.esc(server.os) + '</span>' +
              '<span>' + UI.icon('clock', 13) + '剩余 ' + expireDays + ' 天</span>' +
            '</div></div>' +
        '</div>' +
        '<div class="server-hero__actions">' +
          '<a class="btn btn--soft btn--sm" href="#/user/servers/' + server.id + '/console">' + UI.icon('terminal', 15) + '控制台</a>' +
          (server.status === 'stopped'
            ? '<button class="btn btn--primary btn--sm" data-power="start">' + UI.icon('play', 15) + '开机</button>'
            : '<button class="btn btn--soft btn--sm" data-power="restart">' + UI.icon('refresh', 15) + '重启</button>' +
              '<button class="btn btn--danger btn--sm" data-power="stop">' + UI.icon('power', 15) + '关机</button>') +
        '</div>' +
      '</div>';
    }

    var renewOptions = terms().map(function (t) {
      var m = Number(t.months);
      var cost = plan ? Math.round(Number(plan.price) * factorOf(m) * 100) / 100 : null;
      return '<button type="button" class="term-option" data-renew="' + m + '">' +
        '<span>' + m + ' 个月</span>' +
        (cost != null ? '<span class="term-option__save">' + UI.money(cost) + '</span>' : '') + '</button>';
    }).join('');

    return {
      title: '实例 ' + s.name,
      html: V.breadcrumb([{ label: '用户中心', href: '#/user' }, { label: '我的服务器', href: '#/user/servers' }, { label: s.name }]) +
        heroHtml(s) +
        (expireDays <= 15 ? '<div class="alert alert--warning">' + UI.icon('alert-triangle', 18) +
          '<span>实例将在 ' + UI.date(s.expireAt) + ' 到期（剩余 ' + expireDays + ' 天），请及时续费以免服务中断。</span></div>' : '') +
        '<div class="server-stat-grid">' +
          '<div class="mini-stat"><div class="mini-stat__label">CPU</div><div class="mini-stat__value">' + UI.esc(s.cpu) + '</div></div>' +
          '<div class="mini-stat"><div class="mini-stat__label">内存</div><div class="mini-stat__value">' + UI.esc(s.ram) + '</div></div>' +
          '<div class="mini-stat"><div class="mini-stat__label">磁盘</div><div class="mini-stat__value">' + UI.esc(s.disk) + '</div></div>' +
          '<div class="mini-stat"><div class="mini-stat__label">带宽</div><div class="mini-stat__value">' + UI.esc(s.bandwidth) + '</div></div>' +
        '</div>' +
        '<div class="dash-cols">' +
          '<div class="stack">' +
            '<div class="card glass"><div class="card-head"><h3 class="card-head__title">配置信息</h3>' +
              '<span class="badge badge--neutral">' + UI.esc(s.region) + '</span></div>' +
              UI.kv([
                ['实例 ID', String(s.id), true],
                ['产品套餐', s.productName + ' / ' + s.planName],
                ['操作系统', s.os],
                ['主 IP', s.ip, true],
                ['IPv6', s.ipv6 || '未分配', true],
                ['SSH 端口', String(s.sshPort || 22), true],
                ['创建时间', UI.datetime(s.createdAt)],
                ['到期时间', UI.datetime(s.expireAt)],
                ['关联订单', s.orderNo, true],
                ['运行时长', s.uptime || '—']
              ]) +
              (s.note ? '<div class="divider"></div><div class="muted" style="font-size:var(--fs-xs);line-height:1.7">' + UI.esc(s.note) + '</div>' : '') +
            '</div>' +
            '<div class="card glass"><div class="card-head"><h3 class="card-head__title">流量使用</h3>' +
              '<span class="faint mono">' + UI.esc(trafficText) + '</span></div>' +
              '<div class="progress"><div class="progress__bar" style="width:' + trafficPct + '%"></div></div>' +
              '<div class="row row--between" style="margin-top:8px"><span class="faint">本月已用 ' + traffic + ' GB</span>' +
              '<span class="faint">' + (s.trafficLimit === '不限' ? '不限流量' : '套餐上限 ' + UI.esc(s.trafficLimit)) + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="stack">' +
            '<div class="card glass"><div class="card-head"><h3 class="card-head__title">续费实例</h3></div>' +
              (plan ? '<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + renewOptions + '</div>' +
                '<div class="buy-summary__row" style="margin-top:var(--space-4)"><span>续费金额</span><b id="renew-cost">' + UI.money(plan.price) + '</b></div>' +
                '<button class="btn btn--primary btn--block" id="btn-renew" style="margin-top:var(--space-4)">' + UI.icon('refresh', 16) + '确认续费 1 个月</button>' +
                '<p class="summary-note">续费从当前到期时间开始顺延；余额不足时请先充值。</p>'
                : UI.alert('warning', '该套餐已下线，暂不支持自助续费，请联系客服。', 'alert-triangle')) +
            '</div>' +
            '<div class="card glass"><div class="card-head"><h3 class="card-head__title">快捷操作</h3></div>' +
              '<div class="stack">' +
                '<a class="btn btn--soft btn--block" href="#/user/servers/' + s.id + '/console">' + UI.icon('terminal', 16) + '打开控制台</a>' +
                '<a class="btn btn--ghost btn--block" href="#/user/tickets/new">' + UI.icon('ticket', 16) + '提交技术支持工单</a>' +
                '<a class="btn btn--ghost btn--block" href="#/user/billing">' + UI.icon('wallet', 16) + '账户充值</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>',
      mount: function (root) {
        var months = 1;
        var hero = root.querySelector('#server-hero');

        function repaintHero(server) {
          var wrap = document.createElement('div');
          wrap.innerHTML = heroHtml(server);
          var next = wrap.firstChild;
          hero.parentNode.replaceChild(next, hero);
          hero = next;
          bindPower();
        }

        function bindPower() {
          UI.on(hero, '[data-power]', 'click', function (e, el) {
            var action = el.getAttribute('data-power');
            var labels = { start: '开机', stop: '关机', restart: '重启' };
            var run = function () {
              UI.busy(el, function () { return API.post('/servers/' + s.id + '/power', { action: action }); })
                .then(function (res) {
                  s.status = res.server.status;
                  repaintHero(res.server);
                  UI.toast(res.message, 'success');
                }).catch(function (err) { UI.toast(err.message, 'error'); });
            };
            if (action === 'stop') {
              UI.confirm({ title: '确认关机', message: '关机将中断业务，确认对实例 ' + s.name + ' 执行关机？', confirmText: '关机', danger: true })
                .then(function (ok) { if (ok) run(); });
            } else {
              run();
            }
          });
        }
        bindPower();

        UI.on(root, '[data-renew]', 'click', function (e, el) {
          months = Number(el.getAttribute('data-renew'));
          Array.prototype.forEach.call(root.querySelectorAll('[data-renew]'), function (b) {
            b.classList.toggle('is-active', b === el);
          });
          var cost = plan ? Math.round(Number(plan.price) * factorOf(months) * 100) / 100 : 0;
          var costEl = root.querySelector('#renew-cost');
          if (costEl) costEl.textContent = UI.money(cost);
          var btn = root.querySelector('#btn-renew');
          if (btn) btn.innerHTML = UI.icon('refresh', 16) + '确认续费 ' + months + ' 个月';
        });

        var renewBtn = root.querySelector('#btn-renew');
        if (renewBtn) {
          renewBtn.addEventListener('click', function () {
            UI.confirm({ title: '确认续费', message: '将从账户余额扣费并顺延 ' + months + ' 个月的到期时间。', confirmText: '确认续费' })
              .then(function (ok) {
                if (!ok) return;
                UI.busy(renewBtn, function () { return API.post('/servers/' + s.id + '/renew', { months: months }); })
                  .then(function (res) {
                    UI.toast('续费成功，费用 ' + UI.money(res.cost) + '，新到期时间 ' + UI.datetime(res.expireAt), 'success', 5000);
                    Store.refreshMe();
                    App.go('/user/servers/' + s.id);
                  }).catch(function (err) { UI.toast(err.message, 'error'); });
              });
          });
        }
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     实例控制台
     ====================================================================== */
  App.page('/user/servers/:id/console', async function (ctx) {
    var s = await API.get('/servers/' + encodeURIComponent(ctx.params.id));
    var stopped = s.status === 'stopped';

    return {
      title: '控制台 ' + s.name,
      html: V.breadcrumb([{ label: '用户中心', href: '#/user' }, { label: '我的服务器', href: '#/user/servers' }, { label: s.name, href: '#/user/servers/' + s.id }, { label: '控制台' }]) +
        '<div class="page-head"><div class="page-head__text">' +
          '<h1 class="page-head__title">实例控制台</h1>' +
          '<p class="page-head__desc">' + UI.esc(s.name) + ' · ' + UI.esc(s.ip) + ' · ' + UI.esc(s.os) +
          '。演示环境为模拟终端，电源指令会真实作用于实例状态。</p></div>' +
          '<div class="page-head__actions"><a class="btn btn--ghost btn--sm" href="#/user/servers/' + s.id + '">' + UI.icon('arrow-left', 15) + '返回详情</a></div>' +
        '</div>' +
        '<div class="card glass">' +
          '<div class="console" id="console">' +
            '<div class="console__bar"><span class="console__dots"><i></i><i></i><i></i></span>' +
              '<span class="mono" id="console-title">root@' + UI.esc(s.name) + ': ~</span>' +
              '<span style="margin-left:auto" class="faint">' + (stopped ? '实例已关机' : 'SSH 已连接') + '</span></div>' +
            '<div class="console__body" id="console-body"></div>' +
            '<div class="console__input-row">' +
              '<span class="console__prompt" id="console-prompt">' + (stopped ? '离线' : 'root@' + UI.esc(s.name) + ':~#') + '</span>' +
              '<input class="console__input" id="console-input" autocomplete="off" spellcheck="false" placeholder="' +
                (stopped ? '实例已停止，请先开机' : '输入命令，help 查看可用指令') + '"' + (stopped ? ' disabled' : '') + '>' +
            '</div>' +
            '<div class="console__hint">可用指令：help / status / ls / df / free / uptime / top / whoami / ping / clear / start / stop / reboot</div>' +
          '</div>' +
          '<div class="chips" style="margin-top:var(--space-4)">' +
            ['help', 'status', 'df -h', 'free -m', 'uptime'].map(function (c) {
              return '<button class="chip" data-cmd="' + UI.attr(c) + '">' + UI.esc(c) + '</button>';
            }).join('') +
          '</div>' +
        '</div>',
      mount: function (root) {
        var body = root.querySelector('#console-body');
        var input = root.querySelector('#console-input');
        var promptEl = root.querySelector('#console-prompt');
        var titleEl = root.querySelector('#console-title');
        var busy = false;

        function append(text, cls) {
          var line = document.createElement('div');
          line.className = 'console__line' + (cls ? ' console__line--' + cls : '');
          line.textContent = text;
          body.appendChild(line);
          body.scrollTop = body.scrollHeight;
        }

        function appendHtml(html, cls) {
          var line = document.createElement('div');
          line.className = 'console__line' + (cls ? ' console__line--' + cls : '');
          line.innerHTML = html;
          body.appendChild(line);
          body.scrollTop = body.scrollHeight;
        }

        var boot = stopped ? [
          ['[ 提示 ] 实例当前处于关机状态，控制台不可交互。', 'dim'],
          ['[ 提示 ] 使用上方「开机」或将 status 查看电源状态。', 'dim']
        ] : [
          ['Last login: ' + UI.datetime(s.createdAt) + ' from 10.0.0.1', 'dim'],
          ['[  OK  ] Connected to ' + s.name + ' (' + s.ip + ')', 'ok'],
          ['[  OK  ] Kernel 5.15.0-zjmf  x86_64  ' + s.cpu + ' / ' + s.ram, 'dim'],
          ['[  OK  ] System load: 0.08   Memory usage: 31.4%   Disk usage: 24.7%', 'dim'],
          ['Welcome to ZJMF Cloud Console (demo). Type "help" for commands.', 'warn'],
          ['root@' + s.name + ':~# ', 'cmd']
        ];
        boot.forEach(function (row, i) {
          setTimeout(function () { append(row[0], row[1]); }, i * 90);
        });

        function power(action, label, nextStatus) {
          if (busy) return;
          busy = true;
          append('$ systemctl ' + (action === 'start' ? 'start' : action === 'stop' ? 'poweroff' : 'reboot') + ' zjmf-guest', 'cmd');
          API.post('/servers/' + s.id + '/power', { action: action }).then(function (res) {
            busy = false;
            s.status = res.server.status;
            append('[  OK  ] ' + label + '指令执行成功，实例当前状态：' + (res.server.status === 'running' ? 'running' : 'stopped'), 'ok');
            var isStopped = res.server.status === 'stopped';
            input.disabled = isStopped;
            input.placeholder = isStopped ? '实例已停止，请先开机' : '输入命令，help 查看可用指令';
            promptEl.textContent = isStopped ? '离线' : 'root@' + s.name + ':~#';
            titleEl.textContent = 'root@' + s.name + ': ~';
            UI.toast(res.message, 'success');
            if (!isStopped) input.focus();
          }).catch(function (err) {
            busy = false;
            append(err.message, 'warn');
            UI.toast(err.message, 'error');
          });
        }

        function exec(raw) {
          var cmd = raw.trim();
          if (!cmd) return;
          append('root@' + s.name + ':~# ' + cmd, 'cmd');
          var parts = cmd.split(/\s+/);
          var base = parts[0];
          if (base === 'help') {
            append('可用指令：', 'dim');
            ['help      显示本帮助', 'status    查看实例电源与运行状态', 'ls        列出当前目录',
              'df -h     查看磁盘占用', 'free -m   查看内存使用', 'uptime    查看运行时长',
              'top       查看负载概览', 'whoami    当前登录用户', 'ping      网络连通性测试',
              'start     开机', 'stop      关机', 'reboot    重启', 'clear     清屏'].forEach(function (t) {
              append('  ' + t);
            });
          } else if (base === 'status') {
            append('实例名称：' + s.name);
            append('电源状态：' + (s.status === 'running' ? 'running (运行中)' : 'stopped (已停止)'), s.status === 'running' ? 'ok' : 'warn');
            append('主 IP：' + s.ip + '   SSH 端口：' + (s.sshPort || 22));
            append('规格：' + s.cpu + ' / ' + s.ram + ' / ' + s.disk);
            append('到期时间：' + UI.datetime(s.expireAt) + '（剩余 ' + UI.daysLeft(s.expireAt) + ' 天）');
          } else if (base === 'ls') {
            append('bin  boot  dev  etc  home  lib  opt  proc  root  srv  tmp  usr  var  www');
          } else if (base === 'df') {
            append('Filesystem      Size  Used Avail Use% Mounted on');
            append('/dev/vda1       ' + (s.disk || '40G') + '   24%   /');
            append('tmpfs           512M     0  512M   0% /dev/shm');
          } else if (base === 'free') {
            append('              total        used        free      shared  buff/cache');
            append('Mem:          ' + (s.ram || '8GB') + '       31.4%       48.2%        4.1%       16.3%');
            append('Swap:           2Gi          0B         2Gi');
          } else if (base === 'uptime') {
            append(' ' + new Date().toTimeString().slice(0, 8) + ' up ' + (s.uptime || '0 天 0 小时') + ',  load average: 0.08, 0.11, 0.09');
          } else if (base === 'top') {
            append('top - ' + new Date().toTimeString().slice(0, 8) + ' up ' + (s.uptime || '0 天 0 小时') + ',  1 user,  load average: 0.08');
            append('Tasks: 42 total,   1 running,  41 sleeping,   0 stopped');
            append('%Cpu(s):  2.4 us,  0.6 sy, 97.0 id');
            append('MiB Mem :   ' + (s.ram || '8GB') + ' total,  31.4% used');
          } else if (base === 'whoami') {
            append('root');
          } else if (base === 'ping') {
            var host = parts[1] || 'www.zjmf-demo.local';
            append('PING ' + host + ' 56(84) bytes of data.');
            append('64 bytes from ' + host + ': icmp_seq=1 ttl=54 time=8.3 ms', 'ok');
            append('64 bytes from ' + host + ': icmp_seq=2 ttl=54 time=8.1 ms', 'ok');
            append('--- ' + host + ' ping statistics ---');
            append('2 packets transmitted, 2 received, 0% packet loss');
          } else if (base === 'clear') {
            body.innerHTML = '';
          } else if (base === 'start') {
            power('start', '开机', 'running');
          } else if (base === 'stop' || base === 'poweroff') {
            power('stop', '关机', 'stopped');
          } else if (base === 'reboot') {
            power('restart', '重启', 'running');
          } else {
            append('bash: ' + base + ': command not found', 'warn');
          }
        }

        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            var value = input.value;
            input.value = '';
            exec(value);
          }
        });

        UI.on(root, '[data-cmd]', 'click', function (e, el) {
          if (input.disabled) { UI.toast('实例已停止，请先开机', 'warning'); return; }
          input.value = '';
          exec(el.getAttribute('data-cmd'));
          input.focus();
        });

        root.querySelector('#console').addEventListener('click', function () {
          if (!input.disabled) input.focus();
        });
        if (!stopped) setTimeout(function () { input.focus(); }, 300);
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     订单管理
     ====================================================================== */
  App.page('/user/orders', async function (ctx) {
    var status = ctx.query.status || 'all';
    var res = await API.get('/orders');
    var all = res.items || [];
    var tabs = [['all', '全部'], ['pending', '待支付'], ['paid', '已支付'], ['cancelled', '已取消']].map(function (t) {
      var count = t[0] === 'all' ? all.length : all.filter(function (o) { return o.status === t[0]; }).length;
      return '<button class="chip' + (status === t[0] ? ' is-active' : '') + '" data-ostatus="' + t[0] + '">' +
        UI.esc(t[1]) + '<span class="chip__count">' + count + '</span></button>';
    }).join('');

    function rowsHtml(items) {
      if (!items.length) {
        return UI.empty({ icon: 'file-text', title: '没有订单', desc: '选择产品后提交订单，可在这里跟踪支付与开通进度。',
          actions: '<a class="btn btn--primary btn--sm" href="#/products">去选购产品</a>' });
      }
      return UI.table({
        head: ['订单号', '商品', '金额', { label: '状态', right: false }, '下单时间', { label: '操作', right: true }],
        rows: items.map(function (o) {
          return '<tr>' +
            '<td><div class="table__primary mono">' + UI.esc(o.no) + '</div><div class="table__sub">' + UI.esc(UI.payMethod(o.payMethod)) + '</div></td>' +
            '<td>' + itemSummary(o) + '</td>' +
            '<td class="mono">' + UI.money(o.amount) + '</td>' +
            '<td>' + UI.statusBadge(o.status, o.statusText) + '</td>' +
            '<td class="faint">' + UI.datetime(o.createdAt) + '</td>' +
            '<td><div class="table-actions">' +
              '<button class="btn btn--ghost btn--sm" data-view="' + o.id + '">详情</button>' +
              (o.status === 'pending'
                ? '<button class="btn btn--primary btn--sm" data-payorder="' + o.id + '">支付</button>' +
                  '<button class="btn btn--ghost btn--sm" data-cancel="' + o.id + '">取消</button>' : '') +
            '</div></td>' +
          '</tr>';
        })
      });
    }

    var visible = status === 'all' ? all : all.filter(function (o) { return o.status === status; });

    return {
      title: '订单管理',
      html: pageHead('订单管理', '共 ' + all.length + ' 笔订单，订单支付后实例会自动开通。') +
        '<div class="chips">' + tabs + '</div>' +
        '<div class="card glass" id="order-table">' + rowsHtml(visible) + '</div>',
      mount: function (root) {
        var current = status;

        function repaint() {
          var items = current === 'all' ? all : all.filter(function (o) { return o.status === current; });
          root.querySelector('#order-table').innerHTML = rowsHtml(items);
        }

        function findOrder(id) {
          for (var i = 0; i < all.length; i++) {
            if (String(all[i].id) === String(id)) return all[i];
          }
          return null;
        }

        UI.on(root, '[data-ostatus]', 'click', function (e, el) {
          current = el.getAttribute('data-ostatus');
          Array.prototype.forEach.call(root.querySelectorAll('[data-ostatus]'), function (b) {
            b.classList.toggle('is-active', b === el);
          });
          repaint();
          if (history.replaceState) {
            history.replaceState(null, '', '#/user/orders' + (current === 'all' ? '' : '?status=' + current));
          }
        });

        UI.on(root, '[data-view]', 'click', function (e, el) {
          openOrderDetail(el.getAttribute('data-view'));
        });

        UI.on(root, '[data-payorder]', 'click', function (e, el) {
          var order = findOrder(el.getAttribute('data-payorder'));
          if (!order) return;
          openPayModal(order, function (res) {
            order.status = res.status;
            order.statusText = res.statusText;
            order.payMethod = res.payMethod;
            repaint();
          });
        });

        UI.on(root, '[data-cancel]', 'click', function (e, el) {
          var order = findOrder(el.getAttribute('data-cancel'));
          if (!order) return;
          UI.confirm({ title: '取消订单', message: '确认取消订单 ' + order.no + '？取消后需重新下单。', confirmText: '确认取消', danger: true })
            .then(function (ok) {
              if (!ok) return;
              API.post('/orders/' + order.id + '/cancel', { reason: '用户主动取消' }).then(function () {
                order.status = 'cancelled';
                order.statusText = '已取消';
                repaint();
                UI.toast('订单已取消', 'success');
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     账单与充值
     ====================================================================== */
  App.page('/user/billing', async function (ctx) {
    var res = await API.get('/bills');
    var bills = res.items || [];
    var recharges = res.recharges || [];

    function billsHtml() {
      if (!bills.length) return UI.empty({ icon: 'wallet', title: '暂无账单', desc: '充值或消费后会自动生成账单流水。' });
      return UI.table({
        head: ['时间', '类型', '说明', '金额', '余额', '状态'],
        compact: true,
        rows: bills.map(function (b) {
          var income = Number(b.amount) > 0;
          return '<tr>' +
            '<td class="faint">' + UI.datetime(b.at) + '</td>' +
            '<td>' + UI.badge(income ? '充值' : '消费', income ? 'success' : 'neutral') + '</td>' +
            '<td>' + UI.esc(b.note) + '</td>' +
            '<td class="mono" style="color:' + (income ? 'var(--success)' : 'var(--text-1)') + '">' +
              (income ? '+' : '') + UI.num(b.amount, 2) + '</td>' +
            '<td class="mono faint">' + UI.num(b.balanceAfter, 2) + '</td>' +
            '<td>' + UI.statusBadge(b.status, b.status === 'completed' ? '已完成' : '处理中') + '</td>' +
          '</tr>';
        })
      });
    }

    function rechargeHtml() {
      if (!recharges.length) return UI.empty({ icon: 'credit-card', title: '暂无充值记录', desc: '提交充值申请后可在这里查看审核进度。' });
      return UI.table({
        head: ['申请编号', '金额', '渠道', '状态', '提交时间'],
        compact: true,
        rows: recharges.map(function (r) {
          return '<tr>' +
            '<td class="mono">RC' + String(r.id).padStart(6, '0') + '</td>' +
            '<td class="mono">' + UI.money(r.amount) + '</td>' +
            '<td>' + UI.esc(r.method === 'wechat' ? '微信支付' : '支付宝') + '</td>' +
            '<td>' + UI.statusBadge(r.status, UI.statusInfo(r.status).text) + '</td>' +
            '<td class="faint">' + UI.datetime(r.createdAt) + '</td>' +
          '</tr>';
        })
      });
    }

    var amounts = [100, 300, 1000, 3000, 5000];
    var presets = amounts.map(function (a, i) {
      return '<button type="button" class="recharge-preset' + (i === 1 ? ' is-active' : '') + '" data-amount="' + a + '">' + UI.money(a) + '</button>';
    }).join('');

    return {
      title: '账单与充值',
      html: pageHead('账单与充值', '余额可用于支付订单与实例续费，充值申请由财务人工审核。') +
        '<div class="billing-hero">' +
          '<div class="balance-card glass glass--strong">' +
            '<div class="balance-card__label">当前账户余额（元）</div>' +
            '<div class="balance-card__value">' + UI.num(res.balance) + '</div>' +
            '<div class="balance-card__meta">' +
              '<span>累计充值 ' + UI.money(res.totalRecharge) + '</span>' +
              '<span>累计消费 ' + UI.money(res.totalConsume) + '</span>' +
              '<span>' + bills.length + ' 条账单流水</span>' +
            '</div>' +
          '</div>' +
          '<div class="card glass">' +
            '<div class="card-head"><h3 class="card-head__title">账户充值</h3>' +
              '<span class="badge badge--neutral">人工审核</span></div>' +
            '<form id="recharge-form" class="stack">' +
              '<div class="recharge-presets">' + presets + '</div>' +
              UI.field('充值金额（元）', '<input class="input" name="amount" type="number" min="1" max="50000" step="0.01" value="300" data-autofocus>',
                '单笔限额 1 - 50000 元，审核通过后自动入账') +
              UI.field('支付渠道', '<select class="select" name="method">' +
                '<option value="alipay">支付宝</option><option value="wechat">微信支付</option></select>') +
              '<button class="btn btn--primary btn--block" type="submit">' + UI.icon('wallet', 16) + '提交充值申请</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
        '<div class="card glass"><div class="card-head"><h3 class="card-head__title">账单流水</h3>' +
          '<span class="faint">共 ' + bills.length + ' 条</span></div>' +
          '<div id="bills-table">' + billsHtml() + '</div>' +
        '</div>' +
        '<div class="card glass"><div class="card-head"><h3 class="card-head__title">充值记录</h3></div>' +
          '<div id="recharge-table">' + rechargeHtml() + '</div>' +
        '</div>',
      mount: function (root) {
        var form = root.querySelector('#recharge-form');
        UI.on(root, '[data-amount]', 'click', function (e, el) {
          Array.prototype.forEach.call(root.querySelectorAll('[data-amount]'), function (b) {
            b.classList.toggle('is-active', b === el);
          });
          form.amount.value = el.getAttribute('data-amount');
        });

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var amount = Number(form.amount.value);
          if (!isFinite(amount) || amount < 1 || amount > 50000) {
            UI.toast('充值金额需在 1 - 50000 元之间', 'warning');
            return;
          }
          var btn = form.querySelector('button[type="submit"]');
          UI.busy(btn, function () {
            return API.post('/recharge', { amount: amount, method: form.method.value });
          }).then(function () {
            UI.toast('充值申请已提交，财务审核通过后自动入账', 'success', 4500);
            Store.refreshMe();
            return API.get('/bills').then(function (data) {
              bills = data.items || [];
              recharges = data.recharges || [];
              root.querySelector('#bills-table').innerHTML = billsHtml();
              root.querySelector('#recharge-table').innerHTML = rechargeHtml();
              var balanceEl = root.querySelector('.balance-card__value');
              if (balanceEl) balanceEl.textContent = UI.num(data.balance);
            });
          }).catch(function (err) { UI.toast(err.message, 'error'); });
        });
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     工单列表
     ====================================================================== */
  App.page('/user/tickets', async function (ctx) {
    var res = await API.get('/tickets');
    var items = res.items || [];

    function listHtml() {
      if (!items.length) {
        return UI.empty({ icon: 'ticket', title: '还没有工单', desc: '遇到技术或账单问题，提交工单后由工程师跟进。',
          actions: '<a class="btn btn--primary btn--sm" href="#/user/tickets/new">提交工单</a>' });
      }
      return '<div class="ticket-list">' + items.map(function (t) {
        return '<a class="ticket-item" href="#/user/tickets/' + t.id + '">' +
          '<div class="ticket-item__head"><span class="ticket-item__title">#' + t.id + ' ' + UI.esc(t.title) + '</span>' +
          UI.statusBadge(t.status, t.status === 'open' ? '待处理' : t.status === 'answered' ? '已回复' : '已关闭') + '</div>' +
          '<div class="ticket-item__meta"><span>' + UI.esc(t.category) + '</span>' +
          '<span>' + UI.priorityLabel(t.priority) + '</span>' +
          '<span>' + UI.fromNow(t.updatedAt) + '</span>' +
          '<span>' + (t.messageCount || 1) + ' 条对话</span></div>' +
        '</a>';
      }).join('') + '</div>';
    }

    return {
      title: '工单支持',
      html: pageHead('工单支持', '共 ' + items.length + ' 个工单，技术支持团队 7 x 24 小时轮值。',
        '<a class="btn btn--primary" href="#/user/tickets/new">' + UI.icon('plus', 16) + '提交工单</a>') +
        '<div class="card glass">' + listHtml() + '</div>',
      mount: function (root) { }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     新建工单
     ====================================================================== */
  App.page('/user/tickets/new', function () {
    var categories = ['技术支持', '账单问题', '售前咨询', '备案问题', '其他问题'];
    var priorities = [['low', '低'], ['normal', '普通'], ['high', '高'], ['urgent', '紧急']];

    return {
      title: '提交工单',
      html: V.breadcrumb([{ label: '用户中心', href: '#/user' }, { label: '工单支持', href: '#/user/tickets' }, { label: '提交工单' }]) +
        '<div class="page-head"><div class="page-head__text">' +
          '<h1 class="page-head__title">提交工单</h1>' +
          '<p class="page-head__desc">请尽量提供实例名称、报错信息与复现步骤，便于工程师快速定位。</p></div></div>' +
        '<div class="dash-cols">' +
          '<div class="card glass">' +
            '<form id="ticket-form" class="stack">' +
              UI.field('工单标题', '<input class="input" name="title" placeholder="一句话描述问题（4-60 字）" data-autofocus>') +
              '<div class="form-grid">' +
                UI.field('问题分类', '<select class="select" name="category">' +
                  categories.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select>') +
                UI.field('紧急程度', '<select class="select" name="priority">' +
                  priorities.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === 'normal' ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select>') +
              '</div>' +
              UI.field('问题描述', '<textarea class="textarea" name="content" rows="8" placeholder="请描述现象、发生时间、已尝试的操作，以及相关实例名称或订单号"></textarea>',
                '至少 10 个字符，最多 2000 个字符') +
              '<div class="row row--end">' +
                '<a class="btn btn--ghost" href="#/user/tickets">取消</a>' +
                '<button class="btn btn--primary" type="submit">' + UI.icon('send', 16) + '提交工单</button>' +
              '</div>' +
            '</form>' +
          '</div>' +
          '<div class="card glass">' +
            '<div class="card-head"><h3 class="card-head__title">提交须知</h3></div>' +
            '<div class="stack" style="font-size:var(--fs-xs);color:var(--text-2);line-height:1.8">' +
              '<p>1. 紧急故障请优先在工单中注明实例 IP 与影响范围。</p>' +
              '<p>2. 涉及账单与退款的问题，请附上订单号。</p>' +
              '<p>3. 工单提交后可在「工单支持」中查看工程师回复并继续对话。</p>' +
              '<p>4. 工作日 10 分钟内响应，夜间紧急故障 30 分钟内响应。</p>' +
            '</div>' +
          '</div>' +
        '</div>',
      mount: function (root) {
        var form = root.querySelector('#ticket-form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var v = UI.values(form);
          var ok = UI.validate(form, {
            title: { required: true, min: 4, minMessage: '标题至少 4 个字符' },
            content: { required: true, min: 10, minMessage: '问题描述至少 10 个字符' }
          });
          if (!ok) return;
          var btn = form.querySelector('button[type="submit"]');
          UI.busy(btn, function () { return API.post('/tickets', v); })
            .then(function (res) {
              UI.toast('工单已提交，编号 #' + res.id, 'success');
              setTimeout(function () { App.go('/user/tickets/' + res.id); }, 300);
            }).catch(function (err) { UI.toast(err.message, 'error'); });
        });
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     工单详情对话
     ====================================================================== */
  App.page('/user/tickets/:id', async function (ctx) {
    var id = ctx.params.id;
    var ticket = await API.get('/tickets/' + encodeURIComponent(id));
    var listRes = await API.get('/tickets');
    var items = listRes.items || [];

    function chatHtml(t) {
      return (t.messages || []).map(function (m) {
        return UI.chatMsg({ from: m.from, authorName: m.author, content: m.content, at: m.at });
      }).join('');
    }

    function listHtml() {
      return '<div class="ticket-list">' + items.map(function (t) {
        return '<a class="ticket-item' + (String(t.id) === String(id) ? ' is-active' : '') + '" href="#/user/tickets/' + t.id + '">' +
          '<div class="ticket-item__head"><span class="ticket-item__title">#' + t.id + ' ' + UI.esc(t.title) + '</span>' +
          UI.statusBadge(t.status, t.status === 'open' ? '待处理' : t.status === 'answered' ? '已回复' : '已关闭') + '</div>' +
          '<div class="ticket-item__meta"><span>' + UI.esc(t.category) + '</span><span>' + UI.fromNow(t.updatedAt) + '</span></div>' +
        '</a>';
      }).join('') + '</div>';
    }

    var closed = ticket.status === 'closed';

    return {
      title: '工单 #' + id,
      html: V.breadcrumb([{ label: '用户中心', href: '#/user' }, { label: '工单支持', href: '#/user/tickets' }, { label: '#' + id }]) +
        '<div class="page-head"><div class="page-head__text">' +
          '<h1 class="page-head__title">' + UI.esc(ticket.title) + '</h1>' +
          '<p class="page-head__desc">工单编号 #' + id + ' · ' + UI.esc(ticket.category) + ' · 优先级 ' + UI.priorityLabel(ticket.priority) + '</p></div>' +
          '<div class="page-head__actions"><a class="btn btn--soft btn--sm" href="#/user/tickets/new">' + UI.icon('plus', 15) + '新建工单</a></div></div>' +
        '<div class="ticket-layout">' +
          '<div class="card glass"><div class="card-head"><h3 class="card-head__title">我的工单</h3>' +
            '<span class="faint">' + items.length + ' 个</span></div>' + listHtml() + '</div>' +
          '<div class="ticket-detail glass glass--strong">' +
            '<div class="ticket-detail__head"><div class="row row--between">' +
              '<h3 class="ticket-detail__title">' + UI.esc(ticket.title) + '</h3>' +
              UI.statusBadge(ticket.status, ticket.status === 'open' ? '待处理' : ticket.status === 'answered' ? '已回复' : '已关闭') + '</div>' +
              '<div class="ticket-detail__meta"><span>#' + id + '</span><span>' + UI.esc(ticket.category) + '</span>' +
                '<span>创建于 ' + UI.datetime(ticket.createdAt) + '</span>' +
                '<span>最近更新 ' + UI.fromNow(ticket.updatedAt) + '</span></div>' +
            '</div>' +
            '<div class="chat" id="ticket-chat" style="flex:1">' + chatHtml(ticket) + '</div>' +
            (closed
              ? '<div class="ticket-reply">' + UI.alert('info', '该工单已关闭。如需继续处理，请新建工单。', 'info') +
                '<a class="btn btn--soft btn--sm" style="margin-top:var(--space-3)" href="#/user/tickets/new">新建工单</a></div>'
              : '<div class="ticket-reply"><form id="reply-form">' +
                  '<textarea class="textarea" name="content" rows="3" placeholder="补充说明或追问，工程师会收到通知"></textarea>' +
                  '<div class="row row--between" style="margin-top:var(--space-3)">' +
                    '<button class="btn btn--ghost btn--sm" type="button" id="close-ticket">' + UI.icon('x-circle', 15) + '关闭工单</button>' +
                    '<button class="btn btn--primary btn--sm" type="submit">' + UI.icon('send', 15) + '发送回复</button>' +
                  '</div></form></div>') +
          '</div>' +
        '</div>',
      mount: function (root) {
        var chat = root.querySelector('#ticket-chat');
        chat.scrollTop = chat.scrollHeight;

        var form = root.querySelector('#reply-form');
        if (form) {
          form.addEventListener('submit', function (e) {
            e.preventDefault();
            var content = form.content.value.trim();
            if (content.length < 2) { UI.toast('回复内容至少 2 个字符', 'warning'); return; }
            var btn = form.querySelector('button[type="submit"]');
            UI.busy(btn, function () { return API.post('/tickets/' + id + '/reply', { content: content }); })
              .then(function (res) {
                ticket = res;
                chat.innerHTML = chatHtml(res);
                chat.scrollTop = chat.scrollHeight;
                form.content.value = '';
                UI.toast('回复已发送', 'success');
              }).catch(function (err) { UI.toast(err.message, 'error'); });
          });
        }

        var closeBtn = root.querySelector('#close-ticket');
        if (closeBtn) {
          closeBtn.addEventListener('click', function () {
            UI.confirm({ title: '关闭工单', message: '关闭后将无法继续回复，确认关闭工单 #' + id + '？', confirmText: '关闭工单', danger: true })
              .then(function (ok) {
                if (!ok) return;
                API.post('/tickets/' + id + '/close').then(function () {
                  UI.toast('工单已关闭', 'success');
                  App.go('/user/tickets/' + id);
                }).catch(function (err) { UI.toast(err.message, 'error'); });
              });
          });
        }
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     实名认证
     ====================================================================== */
  App.page('/user/realname', async function () {
    var res = await API.get('/user/realname');
    var rn = res.realname || { status: 'none' };
    var verified = rn.status === 'verified';
    var pending = rn.status === 'pending';

    var statusBlock = '';
    if (verified) {
      statusBlock = '<div class="realname-hero glass glass--strong">' +
        '<span class="realname-hero__icon">' + UI.icon('shield-check', 30) + '</span>' +
        '<div style="flex:1"><div class="row" style="gap:10px"><h2 class="card-head__title">已完成实名认证</h2>' +
          UI.statusBadge('verified', '已认证') + '</div>' +
          '<p class="muted" style="margin-top:6px;font-size:var(--fs-sm)">认证信息不可自行修改，如需变更请联系客服提交材料。</p></div></div>' +
        '<div class="card glass"><div class="card-head"><h3 class="card-head__title">认证信息</h3></div>' +
          UI.kv([
            ['真实姓名', rn.name || '—'],
            ['证件号码', rn.idno || '—', true],
            ['认证时间', UI.datetime(rn.at)],
            ['备注', rn.note || '认证通过']
          ]) + '</div>';
    } else if (pending) {
      statusBlock = '<div class="realname-hero glass glass--strong">' +
        '<span class="realname-hero__icon">' + UI.icon('clock', 30) + '</span>' +
        '<div style="flex:1"><div class="row" style="gap:10px"><h2 class="card-head__title">资料审核中</h2>' +
          UI.statusBadge('reviewing', '审核中') + '</div>' +
          '<p class="muted" style="margin-top:6px;font-size:var(--fs-sm)">预计 1 个工作日内完成审核，结果会通过站内消息通知。</p></div></div>' +
        '<div class="card glass"><div class="card-head"><h3 class="card-head__title">已提交资料</h3></div>' +
          UI.kv([
            ['真实姓名', rn.name || '—'],
            ['证件号码', rn.idno || '—', true],
            ['提交时间', UI.datetime(rn.at)],
            ['审核状态', rn.note || '资料已提交，等待人工审核']
          ]) + '</div>';
    } else {
      statusBlock = '<div class="realname-hero glass glass--strong">' +
        '<span class="realname-hero__icon">' + UI.icon('id-card', 30) + '</span>' +
        '<div style="flex:1"><h2 class="card-head__title">完成实名认证</h2>' +
          '<p class="muted" style="margin-top:6px;font-size:var(--fs-sm)">根据法规要求，购买中国大陆节点实例前需完成实名认证。资料仅用于合规审核。</p></div></div>' +
        (rn.status === 'rejected' ? UI.alert('warning', '上次提交未通过：' + (rn.note || '资料不清晰'), 'alert-triangle') : '') +
        '<div class="dash-cols">' +
          '<div class="card glass"><div class="card-head"><h3 class="card-head__title">提交认证资料</h3></div>' +
            '<form id="realname-form" class="stack">' +
              '<div class="form-grid">' +
                UI.field('真实姓名', '<input class="input" name="name" placeholder="与证件保持一致" data-autofocus>') +
                UI.field('手机号码', '<input class="input" name="phone" placeholder="11 位手机号">') +
              '</div>' +
              UI.field('身份证号码', '<input class="input" name="idno" placeholder="演示环境可填写任意 8-30 位字符">',
                '证件号码仅保留前 4 位与后 4 位用于展示') +
              '<label class="row" style="gap:8px;font-size:var(--fs-xs);color:var(--text-2)">' +
                '<input type="checkbox" name="agree" style="width:16px;height:16px">我已阅读并同意《实名认证服务协议》</label>' +
              '<button class="btn btn--primary" type="submit">' + UI.icon('shield-check', 16) + '提交认证</button>' +
            '</form>' +
          '</div>' +
          '<div class="card glass"><div class="card-head"><h3 class="card-head__title">认证说明</h3></div>' +
            '<div class="stack" style="font-size:var(--fs-xs);color:var(--text-2);line-height:1.8">' +
              '<p>1. 姓名与证件号需保持一致，否则审核不通过。</p>' +
              '<p>2. 手机号用于接收审核结果与安全提醒。</p>' +
              '<p>3. 演示环境不会真实校验证件，提交即进入人工审核队列。</p>' +
              '<p>4. 认证通过后可购买大陆节点实例并申请发票。</p>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    return {
      title: '实名认证',
      html: pageHead('实名认证', '实名信息用于合规审核，认证通过后不可自行修改。') + statusBlock,
      mount: function (root) {
        var form = root.querySelector('#realname-form');
        if (!form) return;
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var v = UI.values(form);
          if (!v.agree) { UI.toast('请先同意实名认证服务协议', 'warning'); return; }
          var ok = UI.validate(form, {
            name: { required: true, min: 2, minMessage: '请输入真实姓名' },
            phone: { required: true, pattern: /^1[3-9]\d{9}$/, patternMessage: '请输入有效手机号' },
            idno: { required: true, min: 8, minMessage: '证件号码至少 8 位' }
          });
          if (!ok) return;
          var btn = form.querySelector('button[type="submit"]');
          UI.busy(btn, function () {
            return API.post('/user/realname', { name: v.name, idno: v.idno, phone: v.phone });
          }).then(function () {
            UI.toast('资料已提交，等待人工审核', 'success');
            Store.refreshMe();
            App.go('/user/realname');
          }).catch(function (err) { UI.toast(err.message, 'error'); });
        });
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     账户安全
     ====================================================================== */
  App.page('/user/security', async function () {
    var sec = await API.get('/user/security');
    var user = Store.state.user || {};
    var sessions = sec.sessions || [];

    var sessionRows = sessions.length ? sessions.map(function (s) {
      return '<div class="session-row">' +
        '<span class="session-row__icon">' + UI.icon(/Mobile|iPhone|Android/i.test(s.ua || '') ? 'phone' : 'monitor', 18) + '</span>' +
        '<div class="session-row__main"><div class="session-row__title">' + UI.esc(s.ua || '未知设备') +
          (s.current ? ' ' + UI.badge('当前会话', 'accent') : '') + '</div>' +
          '<div class="session-row__meta">' + UI.esc(s.ip || '') + ' · 登录于 ' + UI.datetime(s.createdAt) +
          ' · 最近活跃 ' + UI.fromNow(s.lastActive) + '</div></div>' +
        (s.current ? '' : '<button class="btn btn--ghost btn--sm" data-revoke="' + s.id + '">注销</button>') +
      '</div>';
    }).join('') : UI.empty({ icon: 'monitor', title: '没有其他登录会话', desc: '当前仅有一个活跃会话。' });

    return {
      title: '账户安全',
      html: pageHead('账户安全', '管理登录密码、两步验证与活跃会话。') +
        '<div class="dash-cols">' +
          '<div class="card glass"><div class="card-head"><h3 class="card-head__title">修改登录密码</h3></div>' +
            '<form id="password-form" class="stack">' +
              UI.field('当前密码', '<input class="input" type="password" name="oldPassword" autocomplete="current-password" placeholder="输入当前登录密码">') +
              '<div class="form-grid">' +
                UI.field('新密码', '<input class="input" type="password" name="newPassword" autocomplete="new-password" placeholder="6-32 位">') +
                UI.field('确认新密码', '<input class="input" type="password" name="confirmPassword" autocomplete="new-password" placeholder="再次输入新密码">') +
              '</div>' +
              '<button class="btn btn--primary" type="submit">' + UI.icon('lock', 16) + '更新密码</button>' +
              '<p class="summary-note">上次修改：' + (sec.lastPasswordChange ? UI.datetime(sec.lastPasswordChange) : '从未修改') + '</p>' +
            '</form>' +
          '</div>' +
          '<div class="stack">' +
            '<div class="card glass"><div class="card-head"><h3 class="card-head__title">安全选项</h3></div>' +
              '<div class="settings-row"><div class="settings-row__main">' +
                '<div class="settings-row__title">两步验证</div>' +
                '<div class="settings-row__desc">登录时需要额外验证，降低账号被盗风险。</div></div>' +
                '<button class="btn ' + (sec.twofa ? 'btn--soft' : 'btn--primary') + ' btn--sm" data-twofa="' + (sec.twofa ? 'off' : 'on') + '">' +
                  (sec.twofa ? '关闭两步验证' : '开启两步验证') + '</button></div>' +
              '<div class="settings-row"><div class="settings-row__main">' +
                '<div class="settings-row__title">实名认证</div>' +
                '<div class="settings-row__desc">完成实名后可购买大陆节点实例。</div></div>' +
                UI.statusBadge(user.realname && user.realname.status === 'verified' ? 'verified' : 'none',
                  user.realname && user.realname.status === 'verified' ? '已实名' : '未实名') +
                '<a class="btn btn--ghost btn--sm" href="#/user/realname">管理</a></div>' +
              '<div class="settings-row"><div class="settings-row__main">' +
                '<div class="settings-row__title">API 访问</div>' +
                '<div class="settings-row__desc">使用密钥在外部系统调用实例与订单接口。</div></div>' +
                '<a class="btn btn--ghost btn--sm" href="#/user/apikeys">密钥管理</a></div>' +
            '</div>' +
            '<div class="card glass"><div class="card-head"><h3 class="card-head__title">活跃会话</h3>' +
              '<span class="faint">' + sessions.length + ' 个</span></div>' + sessionRows + '</div>' +
          '</div>' +
        '</div>',
      mount: function (root) {
        var form = root.querySelector('#password-form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var v = UI.values(form);
          if (v.newPassword !== v.confirmPassword) { UI.toast('两次输入的新密码不一致', 'warning'); return; }
          var ok = UI.validate(form, {
            oldPassword: { required: true },
            newPassword: { required: true, min: 6, minMessage: '新密码至少 6 位' }
          });
          if (!ok) return;
          var btn = form.querySelector('button[type="submit"]');
          UI.busy(btn, function () {
            return API.post('/user/security/password', { oldPassword: v.oldPassword, newPassword: v.newPassword });
          }).then(function (res) {
            form.reset();
            UI.toast(res.message, 'success');
          }).catch(function (err) { UI.toast(err.message, 'error'); });
        });

        UI.on(root, '[data-twofa]', 'click', function (e, el) {
          var enabled = el.getAttribute('data-twofa') === 'on';
          UI.busy(el, function () { return API.post('/user/security/twofa', { enabled: enabled }); })
            .then(function () {
              UI.toast(enabled ? '两步验证已开启' : '两步验证已关闭', 'success');
              Store.refreshMe();
              App.go('/user/security');
            }).catch(function (err) { UI.toast(err.message, 'error'); });
        });

        UI.on(root, '[data-revoke]', 'click', function (e, el) {
          var sid = el.getAttribute('data-revoke');
          UI.confirm({ title: '注销会话', message: '该设备将立即退出登录，确认继续？', confirmText: '注销', danger: true })
            .then(function (ok) {
              if (!ok) return;
              API.del('/user/sessions/' + sid).then(function () {
                UI.toast('会话已注销', 'success');
                App.go('/user/security');
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     API 密钥
     ====================================================================== */
  App.page('/user/apikeys', async function () {
    var res = await API.get('/user/apikeys');
    var items = res.items || [];

    var SCOPES = [
      ['servers:read', '读取实例'],
      ['servers:power', '电源操作'],
      ['orders:read', '读取订单'],
      ['billing:read', '读取账单'],
      ['tickets:read', '读取工单']
    ];

    function listHtml() {
      if (!items.length) {
        return UI.empty({ icon: 'key', title: '还没有 API 密钥', desc: '创建密钥后可在脚本或 CI 中调用接口。',
          actions: '<button class="btn btn--primary btn--sm" data-create-key>创建密钥</button>' });
      }
      return items.map(function (k) {
        return '<div class="key-row">' +
          '<span class="server-card__icon">' + UI.icon('key', 20) + '</span>' +
          '<div class="key-row__main">' +
            '<div class="key-row__name">' + UI.esc(k.name) +
              (k.status === 'disabled' ? UI.badge('已停用', 'neutral') : UI.badge('启用中', 'success')) + '</div>' +
            '<div class="key-code"><span>' + UI.esc(k.masked || k.key) + '</span>' +
              '<button class="btn btn--icon btn--sm" data-copy="' + UI.attr(k.masked || k.key) + '" title="复制">' + UI.icon('copy', 14) + '</button></div>' +
            '<div class="key-row__scopes">' + (k.scopes || []).map(function (s) {
              return UI.badge(s, 'neutral');
            }).join('') + '</div>' +
            '<div class="ticket-item__meta" style="margin-top:6px"><span>创建于 ' + UI.date(k.createdAt) + '</span>' +
              '<span>最近使用 ' + (k.lastUsed ? UI.fromNow(k.lastUsed) : '从未使用') + '</span></div>' +
          '</div>' +
          '<div class="key-row__actions">' +
            '<button class="btn btn--icon btn--sm" data-rotate="' + k.id + '" title="轮换密钥">' + UI.icon('refresh', 15) + '</button>' +
            '<button class="btn btn--icon btn--sm" data-toggle="' + k.id + '" title="' + (k.status === 'active' ? '停用' : '启用') + '">' +
              UI.icon(k.status === 'active' ? 'pause' : 'play', 15) + '</button>' +
            '<button class="btn btn--icon btn--sm" data-delete="' + k.id + '" title="删除密钥">' + UI.icon('trash', 15) + '</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function showKeyModal(title, key) {
      UI.modal({
        title: title,
        sub: '请立即复制并妥善保存，密钥仅在此处完整展示一次。',
        body: '<div class="key-code" style="margin-top:0"><span>' + UI.esc(key) + '</span>' +
          '<button class="btn btn--icon btn--sm" data-copy="' + UI.attr(key) + '">' + UI.icon('copy', 14) + '</button></div>' +
          UI.alert('warning', '不要把密钥提交到公开仓库；泄露后请立即轮换或删除。', 'alert-triangle'),
        footer: '<button class="btn btn--primary" data-modal-close>我已保存</button>',
        onMount: function (root) {
          UI.on(root, '[data-copy]', 'click', function (e, el) {
            UI.copy(el.getAttribute('data-copy'));
          });
        }
      });
    }

    return {
      title: 'API 密钥',
      html: pageHead('API 密钥', '密钥用于调用实例、订单与账单接口，可随时轮换或停用。',
        '<button class="btn btn--primary" id="new-key">' + UI.icon('plus', 16) + '创建密钥</button>') +
        '<div class="alert alert--info">' + UI.icon('info', 18) +
          '<span>请求头格式：<b class="mono">Authorization: Bearer &lt;key&gt;</b>。演示环境密钥不会真实调用外部服务。</span></div>' +
        '<div class="card glass" id="key-list">' + listHtml() + '</div>',
      mount: function (root) {
        function reload() {
          return API.get('/user/apikeys').then(function (data) {
            items = data.items || [];
            root.querySelector('#key-list').innerHTML = listHtml();
          });
        }

        function openCreate() {
          UI.modal({
            title: '创建 API 密钥',
            sub: '为密钥命名并选择最小必要权限',
            body: '<form id="key-form" class="stack">' +
              UI.field('密钥名称', '<input class="input" name="name" placeholder="例如：CI 部署密钥" data-autofocus>') +
              '<div class="field"><span class="field__label">权限范围</span><div class="stack" style="gap:8px">' +
                SCOPES.map(function (s, i) {
                  return '<label class="row" style="gap:8px;font-size:var(--fs-xs);color:var(--text-2)">' +
                    '<input type="checkbox" name="scopes" value="' + s[0] + '"' + (i === 0 ? ' checked' : '') + ' style="width:16px;height:16px">' +
                    '<span class="mono">' + s[0] + '</span><span class="faint">' + s[1] + '</span></label>';
                }).join('') + '</div></div>' +
            '</form>',
            footer: '<button class="btn btn--ghost" data-modal-close>取消</button>' +
              '<button class="btn btn--primary" id="key-submit">' + UI.icon('key', 16) + '创建密钥</button>',
            onMount: function (mask, close) {
              mask.querySelector('#key-submit').addEventListener('click', function (e) {
                var form = mask.querySelector('#key-form');
                var name = form.name.value.trim();
                if (name.length < 2) { UI.toast('密钥名称需为 2-30 个字符', 'warning'); return; }
                var scopes = Array.prototype.filter.call(form.querySelectorAll('input[name="scopes"]:checked'), function (el) { return true; })
                  .map(function (el) { return el.value; });
                if (!scopes.length) { UI.toast('请至少选择一个权限', 'warning'); return; }
                UI.busy(e.currentTarget, function () { return API.post('/user/apikeys', { name: name, scopes: scopes }); })
                  .then(function (created) {
                    close();
                    reload().then(function () { showKeyModal('密钥创建成功', created.key); });
                  }).catch(function (err) { UI.toast(err.message, 'error'); });
              });
            }
          });
        }

        root.querySelector('#new-key').addEventListener('click', openCreate);
        UI.on(root, '[data-create-key]', 'click', openCreate);
        UI.on(root, '[data-copy]', 'click', function (e, el) {
          UI.copy(el.getAttribute('data-copy'));
        });

        UI.on(root, '[data-rotate]', 'click', function (e, el) {
          var id = el.getAttribute('data-rotate');
          UI.confirm({ title: '轮换密钥', message: '轮换后旧密钥立即失效，所有调用方需更新配置。', confirmText: '确认轮换', danger: true })
            .then(function (ok) {
              if (!ok) return;
              API.post('/user/apikeys/' + id + '/rotate').then(function (r) {
                reload().then(function () { showKeyModal('密钥已轮换', r.key); });
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });

        UI.on(root, '[data-toggle]', 'click', function (e, el) {
          API.post('/user/apikeys/' + el.getAttribute('data-toggle') + '/toggle')
            .then(function (r) {
              UI.toast(r.status === 'active' ? '密钥已启用' : '密钥已停用', 'success');
              reload();
            }).catch(function (err) { UI.toast(err.message, 'error'); });
        });

        UI.on(root, '[data-delete]', 'click', function (e, el) {
          UI.confirm({ title: '删除密钥', message: '删除后使用该密钥的调用会立即失败，且不可恢复。', confirmText: '删除密钥', danger: true })
            .then(function (ok) {
              if (!ok) return;
              API.del('/user/apikeys/' + el.getAttribute('data-delete')).then(function () {
                UI.toast('密钥已删除', 'success');
                reload();
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     消息通知
     ====================================================================== */
  App.page('/user/notifications', async function () {
    var res = await API.get('/notifications');
    var items = res.items || [];

    function listHtml() {
      if (!items.length) {
        return UI.empty({ icon: 'bell', title: '暂无通知', desc: '续费提醒、工单回复与审核结果会出现在这里。' });
      }
      return '<div class="notification-list">' + items.map(function (n) {
        return '<div class="notification-item' + (n.read ? '' : ' is-unread') + '" data-note="' + n.id + '">' +
          '<span class="notification-item__icon">' + UI.icon(n.type === 'billing' ? 'wallet' : n.type === 'ticket' ? 'ticket' : n.type === 'system' ? 'shield' : 'bell', 18) + '</span>' +
          '<div class="notification-item__main"><div class="notification-item__title">' + UI.esc(n.title) + '</div>' +
            '<div class="notification-item__content">' + UI.esc(n.content) + '</div>' +
            '<div class="notification-item__time">' + UI.datetime(n.at) + '</div></div>' +
          (n.link ? '<a class="btn btn--ghost btn--sm" href="' + UI.attr(n.link) + '">查看</a>' : '') +
        '</div>';
      }).join('') + '</div>';
    }

    return {
      title: '消息通知',
      html: pageHead('消息通知', (res.unread || 0) + ' 条未读消息。',
        '<button class="btn btn--soft" id="read-all">' + UI.icon('check-circle', 16) + '全部标记已读</button>') +
        '<div class="card glass" id="note-list">' + listHtml() + '</div>',
      mount: function (root) {
        function reload() {
          return API.get('/notifications').then(function (data) {
            items = data.items || [];
            root.querySelector('#note-list').innerHTML = listHtml();
            Store.refreshMe();
          });
        }
        root.querySelector('#read-all').addEventListener('click', function (e) {
          UI.busy(e.currentTarget, function () { return API.post('/notifications/read', {}); })
            .then(function () { UI.toast('已全部标记为已读', 'success'); reload(); })
            .catch(function (err) { UI.toast(err.message, 'error'); });
        });
        UI.on(root, '[data-note]', 'click', function (e, el) {
          if (e.target.closest('a')) return;
          var id = el.getAttribute('data-note');
          API.post('/notifications/read', { id: id }).then(function () {
            el.classList.remove('is-unread');
            Store.refreshMe();
          });
        });
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     个人资料
     ====================================================================== */
  App.page('/user/profile', async function () {
    var me = await API.get('/user/profile');
    var createdAt = me.createdAt ? UI.date(me.createdAt) : '—';

    return {
      title: '个人资料',
      html: pageHead('个人资料', '更新昵称、邮箱与手机号，邮箱用于接收重要通知。') +
        '<div class="profile-hero glass glass--strong">' +
          UI.avatar(me.name || me.username, { size: 'lg', ring: true }) +
          '<div class="profile-hero__info">' +
            '<div class="profile-hero__name">' + UI.esc(me.name || me.username) + '</div>' +
            '<div class="profile-hero__meta"><span>用户名 ' + UI.esc(me.username) + '</span>' +
              '<span>注册于 ' + createdAt + '</span>' +
              '<span>' + UI.esc(me.role === 'admin' ? '管理员' : '普通用户') + '</span></div>' +
          '</div>' +
          '<div class="row">' + UI.statusBadge(me.realname && me.realname.status === 'verified' ? 'verified' : 'none',
            me.realname && me.realname.status === 'verified' ? '已实名' : '未实名') +
            '<a class="btn btn--soft btn--sm" href="#/user/security">' + UI.icon('lock', 15) + '账户安全</a></div>' +
        '</div>' +
        '<div class="dash-cols">' +
          '<div class="card glass"><div class="card-head"><h3 class="card-head__title">基本资料</h3></div>' +
            '<form id="profile-form" class="stack">' +
              UI.field('用户名', '<input class="input" value="' + UI.attr(me.username) + '" disabled>', '用户名注册后不可修改') +
              '<div class="form-grid">' +
                UI.field('昵称', '<input class="input" name="name" value="' + UI.attr(me.name || '') + '">') +
                UI.field('手机号码', '<input class="input" name="phone" value="' + UI.attr(me.phone || '') + '" placeholder="选填">') +
              '</div>' +
              UI.field('邮箱', '<input class="input" name="email" value="' + UI.attr(me.email || '') + '">') +
              '<button class="btn btn--primary" type="submit">' + UI.icon('save', 16) + '保存资料</button>' +
            '</form>' +
          '</div>' +
          '<div class="card glass"><div class="card-head"><h3 class="card-head__title">账户信息</h3></div>' +
            UI.kv([
              ['账户 ID', String(me.id), true],
              ['角色', me.role === 'admin' ? '管理员' : '普通用户'],
              ['账户余额', UI.money(me.credits)],
              ['实名状态', me.realname && me.realname.status === 'verified' ? '已认证' : '未认证'],
              ['注册时间', UI.datetime(me.createdAt)]
            ]) +
            '<div class="divider"></div>' +
            '<a class="btn btn--ghost btn--block" href="#/user/theme">' + UI.icon('palette', 16) + '外观与主题偏好</a>' +
            '<a class="btn btn--ghost btn--block" href="#/user/apikeys">' + UI.icon('key', 16) + 'API 密钥管理</a>' +
          '</div>' +
        '</div>',
      mount: function (root) {
        var form = root.querySelector('#profile-form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var v = UI.values(form);
          var ok = UI.validate(form, {
            name: { required: true, min: 1, minMessage: '请输入昵称' },
            email: { required: true, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, patternMessage: '请输入有效邮箱' },
            phone: { pattern: /^1[3-9]\d{9}$/, patternMessage: '请输入有效手机号' }
          });
          if (!ok) return;
          var btn = form.querySelector('button[type="submit"]');
          UI.busy(btn, function () { return API.put('/user/profile', v); })
            .then(function (updated) {
              Store.setUser(updated);
              UI.toast('资料已保存', 'success');
            }).catch(function (err) { UI.toast(err.message, 'error'); });
        });
      }
    };
  }, { area: 'user', auth: true });

  /* ======================================================================
     外观与主题偏好（本地覆盖）
     ====================================================================== */
  App.page('/user/theme', function () {
    var cfg = Store.state.config || {};
    var theme = cfg.theme || {};
    var presets = cfg.presets || {};
    var current = Theme.mode();
    var adminMode = theme.mode || 'dark';
    var adminPreset = presets[theme.preset];
    var override = Store.modeOverride();

    var choices = [
      { key: 'light', name: '浅色模式', desc: '明亮背景，适合白天', icon: 'sun' },
      { key: 'dark', name: '深色模式', desc: '低亮度，夜间友好', icon: 'moon' },
      { key: 'system', name: '跟随系统', desc: '随系统外观自动切换', icon: 'monitor' }
    ].map(function (c) {
      return '<button class="theme-choice' + (c.key === current ? ' is-active' : '') + '" data-mode="' + c.key + '">' +
        '<span class="theme-choice__icon">' + UI.icon(c.icon, 17) + '</span>' +
        '<span class="theme-choice__name">' + c.name + '</span>' +
        '<span class="theme-choice__desc">' + c.desc + '</span></button>';
    }).join('');

    var presetCards = Object.keys(presets).map(function (key) {
      var p = presets[key];
      return '<div class="theme-choice' + (key === theme.preset ? ' is-active' : '') + '" style="cursor:default">' +
        '<span class="theme-choice__icon">' + UI.icon(key === 'morning' ? 'sun' : key === 'polar' ? 'moon' : key === 'aurora' ? 'sparkles' : 'cloud', 17) + '</span>' +
        '<span class="theme-choice__name">' + UI.esc(p.label || key) + (key === theme.preset ? '（当前）' : '') + '</span>' +
        '<span class="theme-choice__desc">' + UI.esc(p.desc || '') + '</span></div>';
    }).join('');

    return {
      title: '外观偏好',
      html: pageHead('外观与主题偏好', '管理员设定的主题对全站生效；你的深浅色偏好仅保存在本机，可随时恢复默认。') +
        '<div class="dash-cols">' +
          '<div class="stack">' +
            '<div class="card glass"><div class="card-head"><h3 class="card-head__title">显示模式</h3>' +
              '<span class="badge badge--neutral">本地偏好</span></div>' +
              '<div class="theme-choices" id="mode-choices">' + choices + '</div>' +
              '<p class="summary-note" style="margin-top:var(--space-4)">管理员默认：' +
                (adminMode === 'system' ? '跟随系统' : adminMode === 'light' ? '浅色' : '深色') +
                (override ? '；你已本地覆盖为 ' + (current === 'system' ? '跟随系统' : current === 'light' ? '浅色' : '深色') : '；当前使用管理员默认值') + '。</p>' +
              (override ? '<button class="btn btn--soft btn--sm" id="reset-mode" style="margin-top:var(--space-3)">' +
                UI.icon('refresh', 15) + '恢复管理员默认</button>' : '') +
            '</div>' +
            '<div class="card glass"><div class="card-head"><h3 class="card-head__title">管理员主题预设</h3></div>' +
              '<div class="theme-choices" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + presetCards + '</div>' +
              '<p class="summary-note" style="margin-top:var(--space-4)">预设的玻璃质感与背景由管理员在后台「系统设置 - 主题」统一配置，' +
                '当前站点使用「' + UI.esc(adminPreset ? adminPreset.label : '自定义主题') + '」。</p>' +
            '</div>' +
          '</div>' +
          '<div class="card glass"><div class="card-head"><h3 class="card-head__title">主题参数预览</h3></div>' +
            UI.kv([
              ['背景类型', theme.background && theme.background.type === 'image' ? '图片' : theme.background && theme.background.type === 'solid' ? '纯色' : '渐变'],
              ['玻璃不透明度', Math.round((theme.glass ? theme.glass.alpha : 0) * 100) + '%'],
              ['模糊半径', (theme.glass ? theme.glass.blur : 0) + ' px'],
              ['边框强度', Math.round((theme.glass ? theme.glass.border : 0) * 100) + '%'],
              ['圆角', (theme.glass ? theme.glass.radius : 0) + ' px'],
              ['主色', (theme.accent && theme.accent.primary) || '—', true]
            ]) +
            '<p class="summary-note" style="margin-top:var(--space-4)">如需修改站点主题，请使用管理员账户进入后台系统设置。</p>' +
            (Store.state.isAdmin ? '<a class="btn btn--primary btn--block" style="margin-top:var(--space-3)" href="#/admin/settings">' +
              UI.icon('sliders', 16) + '进入后台主题设置</a>' : '') +
          '</div>' +
        '</div>',
      mount: function (root) {
        UI.on(root, '[data-mode]', 'click', function (e, el) {
          var mode = el.getAttribute('data-mode');
          Theme.setUserMode(mode);
          UI.toast('已切换为' + (mode === 'system' ? '跟随系统' : mode === 'light' ? '浅色模式' : '深色模式') + '（仅本机生效）', 'success');
          App.go('/user/theme');
        });
        var reset = root.querySelector('#reset-mode');
        if (reset) {
          reset.addEventListener('click', function () {
            Theme.resetUserMode();
            UI.toast('已恢复管理员默认主题', 'success');
            App.go('/user/theme');
          });
        }
      }
    };
  }, { area: 'user', auth: true });

  /* ---------------- 附加工具（供其它模块复用） ---------------- */

  UI.priorityLabel = function (p) {
    var map = { low: '低', normal: '普通', high: '高', urgent: '紧急' };
    return '<span class="badge badge--' + (p === 'urgent' ? 'danger' : p === 'high' ? 'warning' : 'neutral') + '">' +
      (map[p] || '普通') + '</span>';
  };
})();
