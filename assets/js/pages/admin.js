/* ==========================================================================
   智简魔方 · 后台管理页面
   路由：仪表盘 / 用户 / 产品套餐 / 订单 / 工单 / 财务 / 公告 / 设置 / 日志
   ========================================================================== */
(function () {
  'use strict';

  var V = window.View = window.View || {};

  function pageHead(title, desc, actions) {
    return '<div class="page-head"><div class="page-head__text">' +
      '<h1 class="page-head__title">' + UI.esc(title) + '</h1>' +
      (desc ? '<p class="page-head__desc">' + UI.esc(desc) + '</p>' : '') +
      '</div>' + (actions ? '<div class="page-head__actions">' + actions + '</div>' : '') + '</div>';
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function getPath(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function setPath(obj, path, value) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    var key = parts[parts.length - 1];
    cur[key] = typeof cur[key] === 'number' ? Number(value) : value;
    return obj;
  }

  function metricCard(opts) {
    return '<div class="metric-card glass">' +
      '<div class="metric-card__top"><span class="metric-card__label">' + UI.esc(opts.label) + '</span>' +
        '<span class="metric-card__icon">' + UI.icon(opts.icon, 17) + '</span></div>' +
      '<div class="metric-card__value">' + opts.value + (opts.unit ? '<small>' + UI.esc(opts.unit) + '</small>' : '') + '</div>' +
      '<div class="metric-card__foot"><span class="metric-card__delta ' + (opts.up ? 'is-up' : 'is-down') + '">' +
        (opts.up ? UI.icon('arrow-up', 11) : UI.icon('arrow-down', 11)) + UI.esc(opts.delta) + '</span>' +
        '<span>' + UI.esc(opts.meta) + '</span></div>' +
      (opts.spark ? '<div class="metric-card__spark">' + opts.spark + '</div>' : '') +
    '</div>';
  }

  function userLabel(row) {
    return '<div class="cell-user">' + UI.avatar(row.name || row.username, { size: 'sm' }) +
      '<div class="cell-main"><strong>' + UI.esc(row.name || row.username) + '</strong>' +
      '<span class="faint">@' + UI.esc(row.username) + '</span></div></div>';
  }

  /* ======================================================================
     运营仪表盘
     ====================================================================== */
  App.page('/admin', async function () {
    var d = await API.get('/admin/stats');
    var chart = d.revenueChart || [];
    var values = chart.map(function (c) { return c.revenue; });
    var labels = chart.map(function (c) { return c.date.slice(5); });
    var total7 = values.reduce(function (a, b) { return a + Number(b || 0); }, 0);
    var status = d.serverStatus || { running: 0, stopped: 0, expired: 0 };
    var serverTotal = (status.running || 0) + (status.stopped || 0) + (status.expired || 0);

    var recent = (d.recentOrders || []).map(function (o) {
      return '<tr>' +
        '<td><div class="table__primary mono">' + UI.esc(o.no) + '</div><div class="table__sub">' + UI.datetime(o.createdAt) + '</div></td>' +
        '<td>' + UI.esc((o.items && o.items[0] ? o.items[0].productName : '—') +
          (o.items && o.items.length > 1 ? ' 等 ' + o.items.length + ' 项' : '')) + '</td>' +
        '<td class="mono">' + UI.money(o.amount) + '</td>' +
        '<td>' + UI.statusBadge(o.status, o.statusText) + '</td>' +
      '</tr>';
    }).join('');

    var quick = [
      { icon: 'users', title: '用户管理', desc: '账户与实名审核', href: '#/admin/users' },
      { icon: 'box', title: '产品套餐', desc: '价格、库存与上架', href: '#/admin/products' },
      { icon: 'wallet', title: '财务审核', desc: (d.pendingRecharges || 0) + ' 笔充值待处理', href: '#/admin/finance' },
      { icon: 'sliders', title: '主题引擎', desc: '玻璃质感与背景', href: '#/admin/settings?tab=theme' }
    ].map(function (q) {
      return '<a class="quick-action" href="' + q.href + '"><span class="quick-action__icon">' + UI.icon(q.icon, 18) + '</span>' +
        '<span class="quick-action__title">' + q.title + '</span><span class="quick-action__desc">' + q.desc + '</span>' +
        '<span class="quick-action__arrow">' + UI.icon('arrow-right', 15) + '</span></a>';
    }).join('');

    return {
      title: '运营仪表盘',
      html: '<div class="admin-metrics">' +
        metricCard({ icon: 'chart', label: '累计收入', value: UI.money(d.revenue), up: true, delta: total7 > 0 ? '近 7 日 ' + UI.moneyShort(total7) : '暂无成交', meta: d.orderPaid + ' 笔已支付', spark: UI.sparkline(values) }) +
        metricCard({ icon: 'users', label: '注册用户', value: d.userTotal, up: true, delta: d.userActive + ' 活跃', meta: '账户总数', spark: UI.sparkline([3, 5, 4, 7, 6, 9, d.userTotal]) }) +
        metricCard({ icon: 'server', label: '资源实例', value: d.serverTotal, up: true, delta: d.serverRunning + ' 运行中', meta: '云主机与专属服务器', spark: UI.sparkline([2, 3, 5, 4, 6, 7, d.serverTotal]) }) +
        metricCard({ icon: 'ticket', label: '待处理工单', value: d.ticketOpen, up: false, delta: (d.pendingRecharges || 0) + ' 待审充值', meta: '需要跟进的请求', spark: UI.sparkline([1, 2, 1, 3, 2, 4, d.ticketOpen]) }) +
      '</div>' +

      '<div class="grid" style="grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)">' +
        '<div class="chart-card glass">' +
          '<div class="chart-card__head"><div><h3>近 7 日收入</h3><p>按支付完成时间统计，单位：元</p></div>' +
            '<div class="chart-legend"><span><i></i>每日收入</span></div></div>' +
          UI.chartBars(values, labels, { format: function (v) { return UI.moneyShort(v); } }) +
        '</div>' +
        '<div class="chart-card glass">' +
          '<div class="chart-card__head"><div><h3>实例状态分布</h3><p>共 ' + serverTotal + ' 台实例</p></div></div>' +
          '<div class="stack">' +
            [['运行中', status.running || 0, 'var(--success)'], ['已停止', status.stopped || 0, 'var(--text-3)'], ['已到期', status.expired || 0, 'var(--danger)']].map(function (row) {
              var pct = serverTotal ? Math.round(row[1] / serverTotal * 100) : 0;
              return '<div class="control-row"><div class="control-label"><b>' + row[0] + '</b><em>' + row[1] + ' 台 · ' + pct + '%</em></div>' +
                '<div class="progress"><div class="progress__bar" style="width:' + pct + '%;background:' + row[2] + '"></div></div></div>';
            }).join('') +
          '</div>' +
          '<div class="card-foot" style="margin-top:auto"><a class="link" href="#/admin/users">用户 ' + d.userTotal + ' 位' + UI.icon('arrow-right', 14) + '</a>' +
            '<a class="link" href="#/admin/orders">订单 ' + d.orderTotal + ' 笔' + UI.icon('arrow-right', 14) + '</a></div>' +
        '</div>' +
      '</div>' +

      '<div class="quick-actions">' + quick + '</div>' +

      '<div class="card glass">' +
        '<div class="card-head"><h3 class="card-head__title">最近订单</h3>' +
          '<a class="link" href="#/admin/orders">订单管理' + UI.icon('arrow-right', 14) + '</a></div>' +
        UI.table({ head: ['订单号', '商品', { label: '金额', right: true }, '状态'], rows: recent, emptyTitle: '暂无订单' }) +
      '</div>'
    };
  }, { area: 'admin', auth: true });

  /* ======================================================================
     用户管理
     ====================================================================== */
  App.page('/admin/users', async function () {
    var res = await API.get('/admin/users');
    var all = res.items || [];
    var filters = { q: '', status: 'all', role: 'all' };

    function filtered() {
      return all.filter(function (u) {
        if (filters.status !== 'all' && u.status !== filters.status) return false;
        if (filters.role !== 'all' && u.role !== filters.role) return false;
        if (filters.q) {
          var hay = [u.username, u.name, u.email, u.phone].join(' ').toLowerCase();
          if (hay.indexOf(filters.q.toLowerCase()) === -1) return false;
        }
        return true;
      });
    }

    function rowsHtml() {
      var list = filtered();
      if (!list.length) return UI.empty({ icon: 'users', title: '没有匹配的用户', desc: '调整搜索或筛选条件后重试。' });
      return UI.table({
        head: ['用户', '联系方式', '角色', '余额', { label: '实例', right: true }, '实名', '状态', { label: '操作', right: true }],
        compact: true,
        rows: list.map(function (u) {
          return '<tr>' +
            '<td>' + userLabel(u) + '</td>' +
            '<td><div class="cell-main"><span>' + UI.esc(u.email) + '</span><span class="faint">' + UI.esc(u.phone || '未填写手机') + '</span></div></td>' +
            '<td>' + (u.role === 'admin' ? UI.badge('管理员', 'accent') : UI.badge('会员', 'neutral')) + '</td>' +
            '<td class="mono">' + UI.num(u.credits, 2) + '</td>' +
            '<td class="mono" style="text-align:right">' + (u.serverCount || 0) + '</td>' +
            '<td>' + (u.realname && u.realname.status === 'verified' ? UI.statusBadge('verified', '已认证')
              : u.realname && u.realname.status === 'pending' ? UI.statusBadge('reviewing', '审核中')
              : UI.badge('未认证', 'neutral')) + '</td>' +
            '<td>' + (u.status === 'active' ? UI.badge('正常', 'success') : UI.badge('已禁用', 'danger')) + '</td>' +
            '<td><div class="table-actions">' +
              '<button class="btn btn--ghost btn--sm" data-edit="' + u.id + '">编辑</button>' +
              '<button class="btn btn--ghost btn--sm" data-toggle="' + u.id + '">' + (u.status === 'active' ? '禁用' : '启用') + '</button>' +
              '<button class="btn btn--ghost btn--sm" data-delete="' + u.id + '">删除</button>' +
            '</div></td>' +
          '</tr>';
        })
      });
    }

    function openEdit(user) {
      var isNew = !user;
      user = user || { role: 'user', status: 'active', credits: 0, realname: { status: 'unverified' } };
      UI.modal({
        title: isNew ? '新建用户' : '编辑用户',
        sub: isNew ? '创建后用户可使用初始密码登录' : '@' + user.username,
        size: 'lg',
        body: '<form id="user-form" class="stack">' +
          '<div class="form-grid">' +
            UI.field('用户名', '<input class="input" name="username" value="' + UI.attr(user.username || '') + '"' + (isNew ? '' : ' disabled') + ' placeholder="3-20 位字母数字下划线">') +
            UI.field('昵称', '<input class="input" name="name" value="' + UI.attr(user.name || '') + '">') +
          '</div>' +
          '<div class="form-grid">' +
            UI.field('邮箱', '<input class="input" name="email" value="' + UI.attr(user.email || '') + '">') +
            UI.field('手机号', '<input class="input" name="phone" value="' + UI.attr(user.phone || '') + '">') +
          '</div>' +
          (isNew ? UI.field('初始密码', '<input class="input" name="password" type="password" value="demo123456">', '至少 6 位') : '') +
          '<div class="form-grid">' +
            UI.field('角色', '<select class="select" name="role"><option value="user"' + (user.role === 'user' ? ' selected' : '') + '>普通用户</option>' +
              '<option value="admin"' + (user.role === 'admin' ? ' selected' : '') + '>管理员</option></select>') +
            UI.field('账户状态', '<select class="select" name="status"><option value="active"' + (user.status === 'active' ? ' selected' : '') + '>正常</option>' +
              '<option value="disabled"' + (user.status === 'disabled' ? ' selected' : '') + '>禁用</option></select>') +
          '</div>' +
          (!isNew ? '<div class="form-grid">' +
            UI.field('账户余额（元）', '<input class="input" name="credits" type="number" step="0.01" value="' + UI.attr(user.credits) + '">', '调整余额会自动写入账单流水') +
            UI.field('实名状态', '<select class="select" name="realnameStatus">' +
              [['unverified', '未认证'], ['pending', '审核中'], ['verified', '已认证'], ['rejected', '已驳回']].map(function (r) {
                return '<option value="' + r[0] + '"' + (user.realname && user.realname.status === r[0] ? ' selected' : '') + '>' + r[1] + '</option>';
              }).join('') + '</select>') +
          '</div>' : '') +
        '</form>',
        footer: '<button class="btn btn--ghost" data-modal-close>取消</button>' +
          '<button class="btn btn--primary" id="user-submit">' + UI.icon('save', 16) + (isNew ? '创建用户' : '保存修改') + '</button>',
        onMount: function (root, close) {
          root.querySelector('#user-submit').addEventListener('click', function (e) {
            var form = root.querySelector('#user-form');
            var v = UI.values(form);
            var url = isNew ? '/admin/users' : '/admin/users/' + user.id;
            var method = isNew ? 'post' : 'put';
            if (isNew && (!v.username || !v.email)) { UI.toast('用户名与邮箱为必填项', 'warning'); return; }
            UI.busy(e.currentTarget, function () { return API[method](url, v); })
              .then(function (saved) {
                close();
                UI.toast(isNew ? '用户已创建' : '用户资料已更新', 'success');
                reload(saved);
              }).catch(function (err) { UI.toast(err.message, 'error'); });
          });
        }
      });
    }

    function reload() {
      return API.get('/admin/users').then(function (data) {
        all = data.items || [];
        var wrap = document.getElementById('user-table');
        if (wrap) wrap.innerHTML = rowsHtml();
        var count = document.getElementById('user-count');
        if (count) count.textContent = '共 ' + filtered().length + ' / ' + all.length + ' 位用户';
      });
    }

    return {
      title: '用户管理',
      html: pageHead('用户管理', '管理账户状态、余额、角色与实名审核。',
        '<button class="btn btn--primary" id="new-user">' + UI.icon('plus', 16) + '新建用户</button>') +
        '<div class="admin-toolbar">' +
          '<div class="admin-toolbar__search"><input class="input" id="user-search" placeholder="搜索用户名 / 昵称 / 邮箱 / 手机"></div>' +
          '<select class="input" id="user-status"><option value="all">全部状态</option><option value="active">正常</option><option value="disabled">已禁用</option></select>' +
          '<select class="input" id="user-role"><option value="all">全部角色</option><option value="user">会员</option><option value="admin">管理员</option></select>' +
          '<span class="admin-toolbar__count" id="user-count">共 ' + all.length + ' 位用户</span>' +
        '</div>' +
        '<div class="card glass" id="user-table">' + rowsHtml() + '</div>',
      mount: function (root) {
        root.querySelector('#new-user').addEventListener('click', function () { openEdit(null); });

        var search = root.querySelector('#user-search');
        search.addEventListener('input', UI.debounce(function () {
          filters.q = search.value.trim();
          root.querySelector('#user-table').innerHTML = rowsHtml();
          root.querySelector('#user-count').textContent = '共 ' + filtered().length + ' / ' + all.length + ' 位用户';
        }, 220));

        root.querySelector('#user-status').addEventListener('change', function (e) {
          filters.status = e.target.value;
          root.querySelector('#user-table').innerHTML = rowsHtml();
        });
        root.querySelector('#user-role').addEventListener('change', function (e) {
          filters.role = e.target.value;
          root.querySelector('#user-table').innerHTML = rowsHtml();
        });

        UI.on(root, '[data-edit]', 'click', function (e, el) {
          var id = el.getAttribute('data-edit');
          var user = all.filter(function (u) { return String(u.id) === String(id); })[0];
          if (user) openEdit(user);
        });

        UI.on(root, '[data-toggle]', 'click', function (e, el) {
          var id = el.getAttribute('data-toggle');
          var user = all.filter(function (u) { return String(u.id) === String(id); })[0];
          if (!user) return;
          API.put('/admin/users/' + id, { status: user.status === 'active' ? 'disabled' : 'active' })
            .then(function () {
              UI.toast(user.status === 'active' ? '账户已禁用' : '账户已启用', 'success');
              reload();
            }).catch(function (err) { UI.toast(err.message, 'error'); });
        });

        UI.on(root, '[data-delete]', 'click', function (e, el) {
          var id = el.getAttribute('data-delete');
          var user = all.filter(function (u) { return String(u.id) === String(id); })[0];
          UI.confirm({ title: '删除用户', message: '确认删除用户 ' + (user ? user.name : '#' + id) + '？该操作不可恢复。', confirmText: '删除用户', danger: true })
            .then(function (ok) {
              if (!ok) return;
              API.del('/admin/users/' + id).then(function () {
                UI.toast('用户已删除', 'success');
                reload();
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });
      }
    };
  }, { area: 'admin', auth: true });

  /* ======================================================================
     产品与套餐管理
     ====================================================================== */
  App.page('/admin/products', async function () {
    var res = await API.get('/admin/products');
    var all = res.items || [];

    function minPrice(p) {
      var prices = (p.plans || []).map(function (pl) { return Number(pl.price) || 0; });
      return prices.length ? Math.min.apply(null, prices) : 0;
    }

    function rowsHtml() {
      if (!all.length) return UI.empty({ icon: 'box', title: '还没有产品', desc: '创建第一个产品并配置套餐价格。',
        actions: '<button class="btn btn--primary btn--sm" id="empty-create">新建产品</button>' });
      return UI.table({
        head: ['产品', '分类', '套餐', { label: '起价', right: true }, { label: '库存', right: true }, '推荐', { label: '操作', right: true }],
        compact: true,
        rows: all.map(function (p) {
          var stock = (p.plans || []).reduce(function (sum, pl) { return sum + (Number(pl.stock) || 0); }, 0);
          return '<tr>' +
            '<td><div class="cell-user"><span class="product-card__icon" style="width:34px;height:34px;border-radius:10px">' +
              UI.icon(UI.productIconName(p), 17) + '</span>' +
              '<div class="cell-main"><strong>' + UI.esc(p.name) + '</strong><span class="faint mono">' + UI.esc(p.slug) + '</span></div></div></td>' +
            '<td>' + UI.badge(p.categoryName || p.category, 'neutral') + '</td>' +
            '<td class="mono">' + (p.plans || []).length + ' 个</td>' +
            '<td class="mono" style="text-align:right">' + UI.money(minPrice(p)) + '</td>' +
            '<td class="mono" style="text-align:right">' + stock + '</td>' +
            '<td>' + (p.recommended ? UI.badge('推荐', 'accent') : '<span class="faint">—</span>') + '</td>' +
            '<td><div class="table-actions">' +
              '<button class="btn btn--ghost btn--sm" data-edit="' + p.id + '">编辑</button>' +
              '<button class="btn btn--ghost btn--sm" data-delete="' + p.id + '">删除</button>' +
            '</div></td>' +
          '</tr>';
        })
      });
    }

    function planRowHtml(plan) {
      plan = plan || {};
      var specs = (plan.specs || []).map(function (s) { return s.label + ': ' + s.value; }).join('\n');
      return '<div class="plan-row" data-plan-row data-plan-id="' + UI.attr(plan.id || '') + '">' +
        '<label class="field"><span class="field__label">套餐名</span><input class="input" data-plan-name value="' + UI.attr(plan.name || '') + '"></label>' +
        '<label class="field"><span class="field__label">规格（每行 label: value）</span><textarea class="textarea" data-plan-specs style="min-height:44px;height:44px;padding:10px 12px">' + UI.esc(specs) + '</textarea></label>' +
        '<label class="field"><span class="field__label">月价</span><input class="input" type="number" min="0" step="0.01" data-plan-price value="' + UI.attr(plan.price != null ? plan.price : 0) + '"></label>' +
        '<label class="field"><span class="field__label">库存</span><input class="input" type="number" min="0" data-plan-stock value="' + UI.attr(plan.stock != null ? plan.stock : 0) + '"></label>' +
        '<label class="field"><span class="field__label">推荐</span><select class="select" data-plan-recommended>' +
          '<option value="0"' + (!plan.recommended ? ' selected' : '') + '>否</option>' +
          '<option value="1"' + (plan.recommended ? ' selected' : '') + '>是</option></select></label>' +
        '<button type="button" class="btn btn--icon btn--sm plan-row__remove" data-plan-remove title="移除套餐">' + UI.icon('trash', 14) + '</button>' +
      '</div>';
    }

    function openEditor(product) {
      var isNew = !product;
      product = product || { name: '', slug: '', category: 'cloud', categoryName: '云服务器', tagline: '', description: '', features: [], regions: ['华东-上海'], os: ['Ubuntu 22.04 LTS'], recommended: false, badge: '', plans: [{}] };
      UI.modal({
        title: isNew ? '新建产品' : '编辑产品',
        sub: isNew ? '配置产品信息与套餐价格，保存后立即上架' : product.slug,
        size: 'xl',
        body: '<form id="product-form" class="stack">' +
          '<div class="form-grid">' +
            UI.field('产品名称', '<input class="input" name="name" value="' + UI.attr(product.name) + '">') +
            UI.field('URL 标识（slug）', '<input class="input" name="slug" value="' + UI.attr(product.slug) + '" placeholder="小写字母与连字符">') +
          '</div>' +
          '<div class="form-grid">' +
            UI.field('分类标识', '<input class="input" name="category" value="' + UI.attr(product.category) + '" placeholder="cloud / gpu / vps / storage">') +
            UI.field('分类名称', '<input class="input" name="categoryName" value="' + UI.attr(product.categoryName) + '">') +
          '</div>' +
          UI.field('一句话卖点', '<input class="input" name="tagline" value="' + UI.attr(product.tagline) + '">') +
          UI.field('产品描述', '<textarea class="textarea" name="description" rows="3">' + UI.esc(product.description || '') + '</textarea>') +
          UI.field('产品特性（每行一条）', '<textarea class="textarea" name="features" rows="4">' + UI.esc((product.features || []).join('\n')) + '</textarea>') +
          '<div class="form-grid">' +
            UI.field('可选地域（英文逗号分隔）', '<input class="input" name="regions" value="' + UI.attr((product.regions || []).join(', ')) + '">') +
            UI.field('可选系统（英文逗号分隔）', '<input class="input" name="os" value="' + UI.attr((product.os || []).join(', ')) + '">') +
          '</div>' +
          '<div class="form-grid">' +
            UI.field('角标文案', '<input class="input" name="badge" value="' + UI.attr(product.badge || '') + '" placeholder="如：限时特惠">') +
            UI.field('推荐位', '<select class="select" name="recommended"><option value="0"' + (!product.recommended ? ' selected' : '') + '>不推荐</option>' +
              '<option value="1"' + (product.recommended ? ' selected' : '') + '>推荐到首页</option></select>') +
          '</div>' +
          '<div class="form-section__head" style="margin-top:var(--space-3)"><div><h4>套餐配置</h4><p>套餐 ID 保持稳定，避免影响已售实例与订单。</p></div>' +
            '<button type="button" class="btn btn--soft btn--sm" id="add-plan">' + UI.icon('plus', 14) + '添加套餐</button></div>' +
          '<div class="plan-editor" id="plan-editor">' + (product.plans || []).map(planRowHtml).join('') + '</div>' +
        '</form>',
        footer: '<button class="btn btn--ghost" data-modal-close>取消</button>' +
          '<button class="btn btn--primary" id="product-submit">' + UI.icon('save', 16) + (isNew ? '创建产品' : '保存产品') + '</button>',
        onMount: function (root, close) {
          root.querySelector('#add-plan').addEventListener('click', function () {
            root.querySelector('#plan-editor').insertAdjacentHTML('beforeend', planRowHtml());
          });
          UI.on(root, '[data-plan-remove]', 'click', function (e, el) {
            var rows = root.querySelectorAll('[data-plan-row]');
            if (rows.length <= 1) { UI.toast('至少保留一个套餐', 'warning'); return; }
            el.closest('[data-plan-row]').remove();
          });
          root.querySelector('#product-submit').addEventListener('click', function (e) {
            var form = root.querySelector('#product-form');
            var v = UI.values(form);
            var plans = Array.prototype.map.call(root.querySelectorAll('[data-plan-row]'), function (row) {
              var specs = row.querySelector('[data-plan-specs]').value.split('\n').map(function (line) {
                var idx = line.indexOf(':');
                if (idx === -1) return null;
                return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
              }).filter(Boolean);
              return {
                id: row.getAttribute('data-plan-id') || undefined,
                name: row.querySelector('[data-plan-name]').value.trim(),
                desc: '',
                specs: specs,
                price: Number(row.querySelector('[data-plan-price]').value) || 0,
                stock: Number(row.querySelector('[data-plan-stock]').value) || 0,
                recommended: row.querySelector('[data-plan-recommended]').value === '1'
              };
            });
            if (!v.name) { UI.toast('产品名称不能为空', 'warning'); return; }
            if (plans.some(function (p) { return !p.name; })) { UI.toast('套餐名称不能为空', 'warning'); return; }
            v.plans = plans;
            v.recommended = v.recommended === '1';
            var url = isNew ? '/admin/products' : '/admin/products/' + product.id;
            UI.busy(e.currentTarget, function () { return API[isNew ? 'post' : 'put'](url, v); })
              .then(function () {
                close();
                UI.toast(isNew ? '产品已创建' : '产品已更新', 'success');
                reload();
              }).catch(function (err) { UI.toast(err.message, 'error'); });
          });
        }
      });
    }

    function reload() {
      return API.get('/admin/products').then(function (data) {
        all = data.items || [];
        var wrap = document.getElementById('product-table');
        if (wrap) wrap.innerHTML = rowsHtml();
      });
    }

    return {
      title: '产品与套餐',
      html: pageHead('产品与套餐', '共 ' + all.length + ' 个产品，套餐价格按月计费。',
        '<button class="btn btn--primary" id="new-product">' + UI.icon('plus', 16) + '新建产品</button>') +
        '<div class="card glass" id="product-table">' + rowsHtml() + '</div>',
      mount: function (root) {
        root.querySelector('#new-product').addEventListener('click', function () { openEditor(null); });
        UI.on(root, '#empty-create', 'click', function () { openEditor(null); });
        UI.on(root, '[data-edit]', 'click', function (e, el) {
          var id = el.getAttribute('data-edit');
          var product = all.filter(function (p) { return String(p.id) === String(id); })[0];
          if (product) openEditor(product);
        });
        UI.on(root, '[data-delete]', 'click', function (e, el) {
          var id = el.getAttribute('data-delete');
          var product = all.filter(function (p) { return String(p.id) === String(id); })[0];
          UI.confirm({ title: '删除产品', message: '确认删除产品「' + (product ? product.name : id) + '」？存在待支付订单时无法删除。', confirmText: '删除产品', danger: true })
            .then(function (ok) {
              if (!ok) return;
              API.del('/admin/products/' + id).then(function () {
                UI.toast('产品已删除', 'success');
                reload();
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });
      }
    };
  }, { area: 'admin', auth: true });

  /* ======================================================================
     订单管理
     ====================================================================== */
  App.page('/admin/orders', async function () {
    var res = await API.get('/admin/orders');
    var all = res.items || [];
    var filters = { status: 'all', q: '' };

    function filtered() {
      return all.filter(function (o) {
        if (filters.status !== 'all' && o.status !== filters.status) return false;
        if (filters.q) {
          var hay = (o.no + ' ' + o.userName).toLowerCase();
          if (hay.indexOf(filters.q.toLowerCase()) === -1) return false;
        }
        return true;
      });
    }

    function rowsHtml() {
      var list = filtered();
      if (!list.length) return UI.empty({ icon: 'file-text', title: '没有匹配的订单', desc: '调整筛选条件后重试。' });
      return UI.table({
        head: ['订单号', '用户', '商品', { label: '金额', right: true }, '状态', '下单时间', { label: '操作', right: true }],
        compact: true,
        rows: list.map(function (o) {
          return '<tr>' +
            '<td><div class="table__primary mono">' + UI.esc(o.no) + '</div><div class="table__sub">' + UI.esc(UI.payMethod(o.payMethod)) + '</div></td>' +
            '<td>' + UI.esc(o.userName) + '</td>' +
            '<td><div class="cell-main"><span>' + UI.esc(o.items && o.items[0] ? o.items[0].productName : '—') + '</span>' +
              '<span class="faint">' + (o.itemCount || (o.items || []).length) + ' 项商品</span></div></td>' +
            '<td class="mono" style="text-align:right">' + UI.money(o.amount) + '</td>' +
            '<td>' + UI.statusBadge(o.status, o.statusText) + '</td>' +
            '<td class="faint">' + UI.datetime(o.createdAt) + '</td>' +
            '<td><div class="table-actions">' +
              '<button class="btn btn--ghost btn--sm" data-view="' + o.id + '">详情</button>' +
              (o.status === 'pending' ? '<button class="btn btn--soft btn--sm" data-paid="' + o.id + '">标记支付</button>' : '') +
              (o.status === 'paid' ? '<button class="btn btn--ghost btn--sm" data-refund="' + o.id + '">退款</button>' : '') +
            '</div></td>' +
          '</tr>';
        })
      });
    }

    function showDetail(o) {
      var items = (o.items || []).map(function (it) {
        return '<div class="order-item"><div class="order-item__name"><b>' + UI.esc(it.productName) +
          ' <span class="faint">/ ' + UI.esc(it.planName) + '</span></b><small>' + UI.esc(it.region) + ' · ' + UI.esc(it.os) +
          ' · ' + it.months + ' 个月 × ' + it.qty + '</small></div><b class="mono">' + UI.money(it.amount) + '</b></div>';
      }).join('');
      UI.modal({
        title: '订单详情', sub: o.no + ' · ' + o.userName, size: 'lg',
        body: '<div class="stack">' +
          UI.kv([['订单号', o.no, true], ['用户', o.userName], ['金额', UI.money(o.amount), true],
            ['状态', o.statusText || o.status], ['支付方式', UI.payMethod(o.payMethod)],
            ['创建时间', UI.datetime(o.createdAt)], ['支付时间', o.paidAt ? UI.datetime(o.paidAt) : '—'],
            ['备注', o.remark || '—']]) +
          '<hr class="divider"><div class="order-items">' + items + '</div></div>',
        footer: '<button class="btn btn--ghost" data-modal-close>关闭</button>'
      });
    }

    function reload() {
      return API.get('/admin/orders').then(function (data) {
        all = data.items || [];
        var wrap = document.getElementById('order-table');
        if (wrap) wrap.innerHTML = rowsHtml();
        var count = document.getElementById('order-count');
        if (count) count.textContent = '共 ' + filtered().length + ' / ' + all.length + ' 笔订单';
      });
    }

    return {
      title: '订单管理',
      html: pageHead('订单管理', '查看订单明细、标记支付与退款（退款金额回到用户余额）。') +
        '<div class="admin-toolbar">' +
          '<div class="admin-toolbar__search"><input class="input" id="order-search" placeholder="搜索订单号或用户"></div>' +
          '<select class="input" id="order-status"><option value="all">全部状态</option><option value="pending">待支付</option>' +
            '<option value="paid">已支付</option><option value="cancelled">已取消</option><option value="refunded">已退款</option></select>' +
          '<span class="admin-toolbar__count" id="order-count">共 ' + all.length + ' 笔订单</span>' +
        '</div>' +
        '<div class="card glass" id="order-table">' + rowsHtml() + '</div>',
      mount: function (root) {
        var search = root.querySelector('#order-search');
        search.addEventListener('input', UI.debounce(function () {
          filters.q = search.value.trim();
          root.querySelector('#order-table').innerHTML = rowsHtml();
          root.querySelector('#order-count').textContent = '共 ' + filtered().length + ' / ' + all.length + ' 笔订单';
        }, 220));
        root.querySelector('#order-status').addEventListener('change', function (e) {
          filters.status = e.target.value;
          root.querySelector('#order-table').innerHTML = rowsHtml();
        });

        UI.on(root, '[data-view]', 'click', function (e, el) {
          var o = all.filter(function (x) { return String(x.id) === String(el.getAttribute('data-view')); })[0];
          if (o) showDetail(o);
        });

        UI.on(root, '[data-paid]', 'click', function (e, el) {
          var id = el.getAttribute('data-paid');
          UI.confirm({ title: '标记为已支付', message: '将订单置为已支付并自动开通实例，确认继续？', confirmText: '确认收款' })
            .then(function (ok) {
              if (!ok) return;
              API.post('/admin/orders/' + id + '/status', { status: 'paid' }).then(function () {
                UI.toast('订单已标记支付并开通实例', 'success');
                reload();
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });

        UI.on(root, '[data-refund]', 'click', function (e, el) {
          var id = el.getAttribute('data-refund');
          UI.confirm({ title: '订单退款', message: '退款金额将全额退回用户账户余额，并记录账单流水。确认退款？', confirmText: '确认退款', danger: true })
            .then(function (ok) {
              if (!ok) return;
              API.post('/admin/orders/' + id + '/status', { status: 'refunded' }).then(function () {
                UI.toast('订单已退款', 'success');
                reload();
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });
      }
    };
  }, { area: 'admin', auth: true });

  /* ======================================================================
     工单管理
     ====================================================================== */
  App.page('/admin/tickets', async function () {
    var res = await API.get('/admin/tickets');
    var all = res.items || [];
    var currentId = all.length ? all[0].id : null;

    function listHtml() {
      if (!all.length) return '<div class="admin-empty">' + UI.icon('inbox', 36) + '<p>暂无工单</p></div>';
      return all.map(function (t) {
        return '<button class="admin-ticket-item' + (String(t.id) === String(currentId) ? ' is-active' : '') + '" data-ticket="' + t.id + '">' +
          '<div class="admin-ticket-item__top"><span class="admin-ticket-item__title">#' + t.id + ' ' + UI.esc(t.title) + '</span>' +
            UI.statusBadge(t.status, t.status === 'open' ? '待处理' : t.status === 'answered' ? '已回复' : '已关闭') + '</div>' +
          '<div class="admin-ticket-item__meta"><span>' + UI.esc(t.userName) + '</span>' +
            '<span>' + UI.esc(t.category) + '</span><span>' + UI.fromNow(t.updatedAt) + '</span></div>' +
        '</button>';
      }).join('');
    }

    function detailHtml(t) {
      return '<div class="ticket-detail__head"><div class="row row--between">' +
          '<h3 class="ticket-detail__title">' + UI.esc(t.title) + '</h3>' +
          UI.statusBadge(t.status, t.status === 'open' ? '待处理' : t.status === 'answered' ? '已回复' : '已关闭') + '</div>' +
          '<div class="ticket-detail__meta"><span>#' + t.id + '</span><span>' + UI.esc(t.userName) + '</span>' +
          '<span>' + UI.esc(t.category) + '</span><span>优先级 ' + UI.priorityLabel(t.priority) + '</span>' +
          '<span>' + UI.datetime(t.createdAt) + '</span></div></div>' +
        '<div class="chat" id="admin-chat" style="flex:1">' +
          (t.messages || []).map(function (m) {
            return UI.chatMsg({ from: m.from, authorName: m.author, content: m.content, at: m.at });
          }).join('') + '</div>' +
        '<div class="ticket-reply"><form id="admin-reply">' +
          '<textarea class="textarea" name="content" rows="3" placeholder="回复客户，提交后工单状态变为「已回复」并通知用户"></textarea>' +
          '<div class="row row--between" style="margin-top:var(--space-3)">' +
            '<div class="row">' +
              '<button class="btn btn--ghost btn--sm" type="button" data-close-ticket="' + t.id + '">' + UI.icon('x-circle', 15) + '关闭工单</button>' +
              (t.status === 'closed' ? '<button class="btn btn--ghost btn--sm" type="button" data-open-ticket="' + t.id + '">' + UI.icon('refresh', 15) + '重新打开</button>' : '') +
            '</div>' +
            '<button class="btn btn--primary btn--sm" type="submit">' + UI.icon('send', 15) + '发送回复</button>' +
          '</div></form></div>';
    }

    function selectTicket(id) {
      currentId = id;
      Array.prototype.forEach.call(document.querySelectorAll('.admin-ticket-item'), function (el) {
        el.classList.toggle('is-active', el.getAttribute('data-ticket') === String(id));
      });
      var detail = document.getElementById('admin-ticket-detail');
      if (!detail) return;
      detail.innerHTML = '<div class="admin-empty">' + UI.icon('refresh', 30) + '<p>加载工单内容…</p></div>';
      API.get('/admin/tickets/' + id).then(function (t) {
        detail.innerHTML = detailHtml(t);
        var chat = detail.querySelector('#admin-chat');
        if (chat) chat.scrollTop = chat.scrollHeight;

        var form = detail.querySelector('#admin-reply');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var content = form.content.value.trim();
          if (content.length < 2) { UI.toast('回复内容至少 2 个字符', 'warning'); return; }
          var btn = form.querySelector('button[type="submit"]');
          UI.busy(btn, function () { return API.post('/admin/tickets/' + id + '/reply', { content: content }); })
            .then(function () {
              UI.toast('回复已发送，用户将收到通知', 'success');
              return reloadList().then(function () { selectTicket(id); });
            }).catch(function (err) { UI.toast(err.message, 'error'); });
        });

        UI.on(detail, '[data-close-ticket]', 'click', function (e, el) {
          setStatus(el.getAttribute('data-close-ticket'), 'closed');
        });
        UI.on(detail, '[data-open-ticket]', 'click', function (e, el) {
          setStatus(el.getAttribute('data-open-ticket'), 'open');
        });
      }).catch(function (err) {
        detail.innerHTML = '<div class="admin-empty">' + UI.icon('alert-circle', 32) + '<p>' + UI.esc(err.message) + '</p></div>';
      });
    }

    function setStatus(id, status) {
      UI.confirm({ title: status === 'closed' ? '关闭工单' : '重新打开工单', message: '工单状态将变更为「' + (status === 'closed' ? '已关闭' : '待处理') + '」，确认继续？', confirmText: '确认', danger: status === 'closed' })
        .then(function (ok) {
          if (!ok) return;
          API.post('/admin/tickets/' + id + '/status', { status: status }).then(function () {
            UI.toast('工单状态已更新', 'success');
            reloadList().then(function () { selectTicket(id); });
          }).catch(function (err) { UI.toast(err.message, 'error'); });
        });
    }

    function reloadList() {
      return API.get('/admin/tickets').then(function (data) {
        all = data.items || [];
        var list = document.getElementById('admin-ticket-list');
        if (list) list.innerHTML = listHtml();
      });
    }

    return {
      title: '工单管理',
      html: pageHead('工单管理', '共 ' + all.length + ' 个工单，回复后用户会收到站内通知。') +
        '<div class="admin-ticket-grid">' +
          '<div class="admin-ticket-list glass" id="admin-ticket-list">' + listHtml() + '</div>' +
          '<div class="ticket-detail glass glass--strong" id="admin-ticket-detail"><div class="admin-empty">' +
            UI.icon('ticket', 34) + '<p>' + (all.length ? '选择左侧工单查看对话' : '暂无工单') + '</p></div></div>' +
        '</div>',
      mount: function (root) {
        UI.on(root, '[data-ticket]', 'click', function (e, el) {
          selectTicket(el.getAttribute('data-ticket'));
        });
        if (currentId != null) selectTicket(currentId);
      }
    };
  }, { area: 'admin', auth: true });

  /* ======================================================================
     财务审核
     ====================================================================== */
  App.page('/admin/finance', async function () {
    var res = await API.get('/admin/recharges');
    var all = res.items || [];
    var pending = all.filter(function (r) { return r.status === 'pending'; });

    function pendingHtml() {
      if (!pending.length) return '<div class="admin-empty">' + UI.icon('check-circle', 34) + '<p>没有待审核的充值申请</p></div>';
      return '<div class="review-list">' + pending.map(function (r) {
        return '<div class="review-card">' +
          '<div class="review-card__user">' + UI.avatar(r.userName || '用户', { size: 'sm' }) +
            '<div class="cell-main"><strong>' + UI.esc(r.userName) + '</strong>' +
              '<span class="faint mono">RC' + String(r.id).padStart(6, '0') + '</span></div></div>' +
          '<div class="review-card__amount">' + UI.money(r.amount) + '</div>' +
          '<div class="review-card__meta"><span>' + (r.method === 'wechat' ? '微信支付' : '支付宝') + '</span>' +
            '<span>' + UI.datetime(r.createdAt) + '</span></div>' +
          '<div class="review-card__actions">' +
            '<button class="btn btn--ghost btn--sm" data-reject="' + r.id + '">驳回</button>' +
            '<button class="btn btn--primary btn--sm" data-approve="' + r.id + '">通过并入账</button>' +
          '</div></div>';
      }).join('') + '</div>';
    }

    function historyHtml() {
      var done = all.filter(function (r) { return r.status !== 'pending'; });
      if (!done.length) return UI.empty({ icon: 'wallet', title: '暂无审核记录', desc: '处理充值申请后会出现在这里。' });
      return UI.table({
        head: ['申请编号', '用户', { label: '金额', right: true }, '渠道', '状态', '提交时间', '审核时间'],
        compact: true,
        rows: done.map(function (r) {
          return '<tr>' +
            '<td class="mono">RC' + String(r.id).padStart(6, '0') + '</td>' +
            '<td>' + UI.esc(r.userName) + '</td>' +
            '<td class="mono" style="text-align:right">' + UI.money(r.amount) + '</td>' +
            '<td>' + (r.method === 'wechat' ? '微信支付' : '支付宝') + '</td>' +
            '<td>' + UI.statusBadge(r.status, r.status === 'approved' ? '已通过' : '已驳回') + '</td>' +
            '<td class="faint">' + UI.datetime(r.createdAt) + '</td>' +
            '<td class="faint">' + (r.reviewedAt ? UI.datetime(r.reviewedAt) : '—') + '</td>' +
          '</tr>';
        })
      });
    }

    function reload() {
      return API.get('/admin/recharges').then(function (data) {
        all = data.items || [];
        pending = all.filter(function (r) { return r.status === 'pending'; });
        document.getElementById('review-wrap').innerHTML = pendingHtml();
        document.getElementById('recharge-history').innerHTML = historyHtml();
        var badge = document.getElementById('pending-count');
        if (badge) badge.textContent = pending.length + ' 笔待审核';
      });
    }

    return {
      title: '财务审核',
      html: pageHead('财务审核', '充值申请审核通过后金额自动入账并写入账单。',
        '<span class="badge badge--warning" id="pending-count">' + pending.length + ' 笔待审核</span>') +
        '<div class="card glass"><div class="card-head"><h3 class="card-head__title">待审核申请</h3>' +
          '<span class="faint">按提交时间倒序</span></div><div id="review-wrap">' + pendingHtml() + '</div></div>' +
        '<div class="card glass"><div class="card-head"><h3 class="card-head__title">审核记录</h3></div>' +
          '<div id="recharge-history">' + historyHtml() + '</div></div>',
      mount: function (root) {
        UI.on(root, '[data-approve]', 'click', function (e, el) {
          var id = el.getAttribute('data-approve');
          UI.confirm({ title: '通过充值申请', message: '确认通过并立即将金额计入用户余额？', confirmText: '通过并入账' })
            .then(function (ok) {
              if (!ok) return;
              API.post('/admin/recharges/' + id + '/review', { status: 'approved' }).then(function () {
                UI.toast('充值已通过并入账', 'success');
                reload();
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });

        UI.on(root, '[data-reject]', 'click', function (e, el) {
          var id = el.getAttribute('data-reject');
          UI.modal({
            title: '驳回充值申请',
            sub: '请填写驳回原因，用户会在通知中看到',
            body: '<label class="field"><span class="field__label">驳回原因</span>' +
              '<textarea class="textarea" id="reject-note" rows="3" placeholder="例如：支付凭证与金额不一致"></textarea></label>',
            footer: '<button class="btn btn--ghost" data-modal-close>取消</button>' +
              '<button class="btn btn--danger" id="reject-submit">确认驳回</button>',
            onMount: function (root2, close) {
              root2.querySelector('#reject-submit').addEventListener('click', function (ev) {
                var note = root2.querySelector('#reject-note').value.trim();
                if (note.length < 2) { UI.toast('请填写驳回原因', 'warning'); return; }
                UI.busy(ev.currentTarget, function () { return API.post('/admin/recharges/' + id + '/review', { status: 'rejected', note: note }); })
                  .then(function () {
                    close();
                    UI.toast('充值申请已驳回', 'success');
                    reload();
                  }).catch(function (err) { UI.toast(err.message, 'error'); });
              });
            }
          });
        });
      }
    };
  }, { area: 'admin', auth: true });

  /* ======================================================================
     公告管理
     ====================================================================== */
  App.page('/admin/announcements', async function () {
    var res = await API.get('/admin/announcements');
    var all = res.items || [];

    function rowsHtml() {
      if (!all.length) return UI.empty({ icon: 'megaphone', title: '还没有公告', desc: '发布公告后展示在前台公告中心与首页。',
        actions: '<button class="btn btn--primary btn--sm" id="empty-create-ann">发布公告</button>' });
      return UI.table({
        head: ['标题', '分类', '置顶', { label: '阅读', right: true }, '发布时间', { label: '操作', right: true }],
        compact: true,
        rows: all.map(function (a) {
          return '<tr>' +
            '<td><div class="cell-main"><strong>' + UI.esc(a.title) + '</strong>' +
              '<span class="faint">' + UI.esc(a.content.slice(0, 46)) + (a.content.length > 46 ? '…' : '') + '</span></div></td>' +
            '<td>' + UI.badge(a.category, 'neutral') + '</td>' +
            '<td>' + (a.pinned ? UI.badge('置顶', 'accent') : '<span class="faint">—</span>') + '</td>' +
            '<td class="mono" style="text-align:right">' + (a.views || 0) + '</td>' +
            '<td class="faint">' + UI.datetime(a.createdAt) + '</td>' +
            '<td><div class="table-actions">' +
              '<button class="btn btn--ghost btn--sm" data-edit="' + a.id + '">编辑</button>' +
              '<button class="btn btn--ghost btn--sm" data-delete="' + a.id + '">删除</button>' +
            '</div></td>' +
          '</tr>';
        })
      });
    }

    function openEditor(item) {
      var isNew = !item;
      item = item || { title: '', category: '产品公告', pinned: false, content: '' };
      var categories = ['产品公告', '维护通知', '优惠活动', '安全公告', '帮助更新'];
      UI.modal({
        title: isNew ? '发布公告' : '编辑公告',
        size: 'lg',
        body: '<form id="ann-form" class="stack">' +
          UI.field('公告标题', '<input class="input" name="title" value="' + UI.attr(item.title) + '" placeholder="4-60 个字符">') +
          '<div class="form-grid">' +
            UI.field('分类', '<select class="select" name="category">' + categories.map(function (c) {
              return '<option' + (c === item.category ? ' selected' : '') + '>' + c + '</option>';
            }).join('') + '</select>') +
            UI.field('置顶', '<select class="select" name="pinned"><option value="0"' + (!item.pinned ? ' selected' : '') + '>不置顶</option>' +
              '<option value="1"' + (item.pinned ? ' selected' : '') + '>置顶展示</option></select>') +
          '</div>' +
          UI.field('正文内容', '<textarea class="textarea" name="content" rows="10" placeholder="支持换行与简单 Markdown（## 标题、- 列表）">' + UI.esc(item.content) + '</textarea>') +
        '</form>',
        footer: '<button class="btn btn--ghost" data-modal-close>取消</button>' +
          '<button class="btn btn--primary" id="ann-submit">' + UI.icon('save', 16) + (isNew ? '发布公告' : '保存修改') + '</button>',
        onMount: function (root, close) {
          root.querySelector('#ann-submit').addEventListener('click', function (e) {
            var form = root.querySelector('#ann-form');
            var v = UI.values(form);
            v.pinned = v.pinned === '1';
            if (v.title.length < 4) { UI.toast('公告标题至少 4 个字符', 'warning'); return; }
            if (v.content.length < 10) { UI.toast('公告内容至少 10 个字符', 'warning'); return; }
            UI.busy(e.currentTarget, function () {
              return API[isNew ? 'post' : 'put'](isNew ? '/admin/announcements' : '/admin/announcements/' + item.id, v);
            }).then(function () {
              close();
              UI.toast(isNew ? '公告已发布' : '公告已更新', 'success');
              reload();
            }).catch(function (err) { UI.toast(err.message, 'error'); });
          });
        }
      });
    }

    function reload() {
      return API.get('/admin/announcements').then(function (data) {
        all = data.items || [];
        var wrap = document.getElementById('ann-table');
        if (wrap) wrap.innerHTML = rowsHtml();
      });
    }

    return {
      title: '公告管理',
      html: pageHead('公告管理', '共 ' + all.length + ' 条公告，置顶公告优先展示。',
        '<button class="btn btn--primary" id="new-ann">' + UI.icon('plus', 16) + '发布公告</button>') +
        '<div class="card glass" id="ann-table">' + rowsHtml() + '</div>',
      mount: function (root) {
        root.querySelector('#new-ann').addEventListener('click', function () { openEditor(null); });
        UI.on(root, '#empty-create-ann', 'click', function () { openEditor(null); });
        UI.on(root, '[data-edit]', 'click', function (e, el) {
          var item = all.filter(function (a) { return String(a.id) === String(el.getAttribute('data-edit')); })[0];
          if (item) openEditor(item);
        });
        UI.on(root, '[data-delete]', 'click', function (e, el) {
          var id = el.getAttribute('data-delete');
          UI.confirm({ title: '删除公告', message: '删除后前台将不再展示该公告，确认继续？', confirmText: '删除公告', danger: true })
            .then(function (ok) {
              if (!ok) return;
              API.del('/admin/announcements/' + id).then(function () {
                UI.toast('公告已删除', 'success');
                reload();
              }).catch(function (err) { UI.toast(err.message, 'error'); });
            });
        });
      }
    };
  }, { area: 'admin', auth: true });

  /* ======================================================================
     操作日志
     ====================================================================== */
  App.page('/admin/logs', async function () {
    var res = await API.get('/admin/logs');
    var all = res.items || [];
    var filters = { level: 'all', q: '' };

    function typeOf(action) {
      var prefix = (action || '').split('.')[0];
      if (prefix === 'auth') return ['auth', '登录'];
      if (prefix === 'order') return ['order', '订单'];
      if (prefix === 'ticket') return ['ticket', '工单'];
      if (prefix === 'user' || prefix === 'product' || prefix === 'theme' || prefix === 'site' || prefix === 'finance' || prefix === 'announcement') return ['admin', '管理'];
      return ['system', '系统'];
    }

    function filtered() {
      return all.filter(function (row) {
        if (filters.level !== 'all' && row.level !== filters.level) return false;
        if (filters.q) {
          var hay = [row.userName, row.action, row.detail, row.ip].join(' ').toLowerCase();
          if (hay.indexOf(filters.q.toLowerCase()) === -1) return false;
        }
        return true;
      });
    }

    function feedHtml() {
      var list = filtered();
      if (!list.length) return UI.empty({ icon: 'activity', title: '没有匹配的日志', desc: '调整筛选条件后重试。' });
      return '<div class="log-feed">' + list.map(function (row) {
        var t = typeOf(row.action);
        return '<div class="log-row">' +
          '<span class="log-row__time">' + UI.datetime(row.at) + '</span>' +
          '<span class="log-row__actor"><strong>' + UI.esc(row.userName) + '</strong>' +
            '<span class="log-type log-type--' + t[0] + '">' + t[1] + '</span></span>' +
          '<span class="log-row__action">' + UI.esc(row.detail) + '<span>' + UI.esc(row.action) + '</span></span>' +
          '<span class="log-row__ip">' + UI.esc(row.ip) + '</span>' +
        '</div>';
      }).join('') + '</div>';
    }

    return {
      title: '操作日志',
      html: pageHead('操作日志', '共 ' + all.length + ' 条审计记录，覆盖登录、订单、工单与后台操作。') +
        '<div class="admin-toolbar">' +
          '<div class="admin-toolbar__search"><input class="input" id="log-search" placeholder="搜索操作人、动作、详情或 IP"></div>' +
          '<select class="input" id="log-level"><option value="all">全部级别</option><option value="info">常规</option>' +
            '<option value="warning">重要</option><option value="error">异常</option></select>' +
          '<span class="admin-toolbar__count" id="log-count">共 ' + all.length + ' 条</span>' +
        '</div>' +
        '<div class="card glass" id="log-wrap" style="padding:0">' + feedHtml() + '</div>',
      mount: function (root) {
        var search = root.querySelector('#log-search');
        search.addEventListener('input', UI.debounce(function () {
          filters.q = search.value.trim();
          root.querySelector('#log-wrap').innerHTML = feedHtml();
          root.querySelector('#log-count').textContent = '共 ' + filtered().length + ' 条';
        }, 220));
        root.querySelector('#log-level').addEventListener('change', function (e) {
          filters.level = e.target.value;
          root.querySelector('#log-wrap').innerHTML = feedHtml();
          root.querySelector('#log-count').textContent = '共 ' + filtered().length + ' 条';
        });
      }
    };
  }, { area: 'admin', auth: true });

  /* ======================================================================
     系统设置（主题引擎 / 站点信息 / 商务配置）
     ====================================================================== */
  App.page('/admin/settings', async function (ctx) {
    var data = await API.get('/admin/settings');
    var tab = ctx.query.tab || 'theme';
    var draft = clone(data.theme);
    var saved = clone(data.theme);
    var presets = data.presets || {};
    var presetKeys = Object.keys(presets);

    function fmtValue(path, v) {
      if (/alpha|border|glow|shadow|veil$/.test(path)) return Math.round(Number(v) * 100) + '%';
      if (/blur$|radius$/.test(path)) return Number(v) + ' px';
      if (path === 'glass.saturation') return Number(v).toFixed(2) + ' x';
      if (path === 'background.angle') return Number(v) + '°';
      return String(v);
    }

    function rangeRow(label, path, min, max, step, hint) {
      var v = Number(getPath(draft, path));
      var pct = Math.max(0, Math.min(100, (v - min) / (max - min) * 100));
      return '<div class="control-row"><div class="control-label"><b>' + label + '</b>' +
        '<em data-out="' + path + '">' + fmtValue(path, v) + '</em></div>' +
        '<input class="range" type="range" min="' + min + '" max="' + max + '" step="' + step +
        '" value="' + v + '" data-tpath="' + path + '" style="--fill:' + pct + '%">' +
        (hint ? '<div class="control-hint">' + hint + '</div>' : '') + '</div>';
    }

    function colorRow(label, path, hint) {
      var v = getPath(draft, path);
      return '<div class="control-row"><div class="control-label"><b>' + label + '</b></div>' +
        '<div class="color-field"><input type="color" data-tpath="' + path + '" value="' + UI.attr(v) + '">' +
        '<input class="input" type="text" data-tpath="' + path + '" value="' + UI.attr(v) + '"></div>' +
        (hint ? '<div class="control-hint">' + hint + '</div>' : '') + '</div>';
    }

    function presetThumb(key) {
      var p = presets[key];
      var t = p.theme || {};
      var bg = t.background || {};
      if (bg.type === 'image' && bg.image) return 'background-image:url(' + UI.attr(bg.image) + ');background-size:cover;background-position:center';
      if (bg.type === 'solid') return 'background:' + (bg.color || '#0b1626');
      return 'background:linear-gradient(' + (bg.angle || 140) + 'deg,' + (bg.from || '#04121d') + ',' + (bg.to || '#0b3550') + ')';
    }

    var bg = draft.background;
    var bgControls = '';
    if (bg.type === 'solid') {
      bgControls = colorRow('背景颜色', 'background.color', '纯色背景会关闭渐变与图片层');
    } else if (bg.type === 'gradient') {
      bgControls = '<div class="form-grid">' + colorRow('渐变起始色', 'background.from') + colorRow('渐变结束色', 'background.to') + '</div>' +
        rangeRow('渐变角度', 'background.angle', 0, 360, 1, '0° 从下往上，90° 从左往右');
    } else {
      bgControls = '<div class="control-row"><div class="control-label"><b>背景图片 URL</b></div>' +
        '<div class="image-row"><input class="input" data-tpath="background.image" value="' + UI.attr(bg.image || '') + '" placeholder="https://… 或上传本地图片">' +
          '<button class="btn btn--soft btn--sm" type="button" data-upload>' + UI.icon('upload', 15) + '上传</button>' +
          '<input type="file" id="bg-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>' +
        '</div><div class="control-hint">支持 PNG / JPG / WEBP / GIF，单张不超过 4 MB</div></div>' +
        rangeRow('图片模糊', 'background.blur', 0, 40, 1, '模糊背景图片可提升玻璃层次与文字可读性') +
        colorRow('遮罩颜色', 'background.veilColor', '在图片上叠加的底色，深色遮罩更利于浅色文字');
    }

    function previewHtml() {
      return '<div class="theme-preview">' +
        '<div class="preview-frame">' +
          '<div class="preview-frame__bg" style="background-image:var(--bg-image);filter:blur(var(--bg-blur));transform:scale(1.08)"></div>' +
          '<div class="preview-frame__veil"></div>' +
          '<div class="preview-frame__inner">' +
            '<div class="preview-bar"><span class="preview-bar__dots"><i></i><i></i><i></i></span>' +
              '<span class="preview-bar__url">zjmf-demo.local</span></div>' +
            '<div class="preview-hero">' +
              '<div class="preview-hero__eyebrow">ZJMF CLOUD</div>' +
              '<div class="preview-hero__title">弹性算力，随时启程</div>' +
              '<div class="preview-hero__desc">玻璃质感、背景层次与文字对比度的实时预览。</div>' +
              '<div class="preview-actions"><span class="preview-mini-btn">立即购买</span>' +
                '<span class="preview-mini-btn preview-mini-btn--ghost">了解详情</span></div>' +
            '</div>' +
            '<div class="preview-grid">' +
              '<div class="preview-tile"><div class="preview-tile__label">本月收入</div><div class="preview-tile__value">¥ 12,480</div></div>' +
              '<div class="preview-tile"><div class="preview-tile__label">运行实例</div><div class="preview-tile__value">28 台</div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="preview-frame__note">' + UI.icon('info', 12) + '预览使用当前编辑中的参数，保存后全站前台立即生效</div>' +
      '</div>';
    }

    function themeEditorHtml() {
      return '<div class="theme-layout">' +
        '<div class="theme-controls">' +
          '<div class="theme-panel glass"><div class="theme-panel__head"><h4>' + UI.icon('sparkles', 16) + '预设主题</h4>' +
            '<span>点击应用，可继续微调</span></div><div class="preset-grid">' +
            presetKeys.map(function (key) {
              var p = presets[key];
              return '<button type="button" class="preset-card' + (draft.preset === key ? ' is-active' : '') + '" data-preset="' + key + '">' +
                '<span class="preset-card__thumb" style="' + presetThumb(key) + '"></span>' +
                '<span class="preset-card__name">' + UI.esc(p.label || key) + UI.icon('check-circle', 14) + '</span>' +
                '<span class="preset-card__desc">' + UI.esc(p.desc || '') + '</span></button>';
            }).join('') + '</div></div>' +

          '<div class="theme-panel glass"><div class="theme-panel__head"><h4>' + UI.icon('image', 16) + '背景</h4>' +
            '<span>纯色 / 渐变 / 图片</span></div>' +
            '<div class="bg-tiles">' +
              '<button type="button" class="bg-tile' + (bg.type === 'gradient' ? ' is-active' : '') + '" data-bgtype="gradient">' +
                '<span class="bg-tile__swatch bg-tile__swatch--gradient"></span>渐变背景</button>' +
              '<button type="button" class="bg-tile' + (bg.type === 'solid' ? ' is-active' : '') + '" data-bgtype="solid">' +
                '<span class="bg-tile__swatch bg-tile__swatch--solid"></span>纯色背景</button>' +
              '<button type="button" class="bg-tile' + (bg.type === 'image' ? ' is-active' : '') + '" data-bgtype="image">' +
                '<span class="bg-tile__swatch bg-tile__swatch--image"></span>图片背景</button>' +
            '</div>' + bgControls +
            rangeRow('遮罩强度', 'background.veil', 0, 0.9, 0.01, '遮罩越强，背景越暗/越实，文字越清晰') +
          '</div>' +

          '<div class="theme-panel glass"><div class="theme-panel__head"><h4>' + UI.icon('layers', 16) + '玻璃质感</h4>' +
            '<span>透明度 / 模糊 / 边框 / 圆角</span></div>' +
            rangeRow('玻璃不透明度', 'glass.alpha', 0.25, 0.95, 0.01, '数值越高卡片越实，越低越通透') +
            rangeRow('背景模糊半径', 'glass.blur', 0, 40, 1, '0 为完全不模糊，20 以上毛玻璃感更强') +
            rangeRow('边框光晕强度', 'glass.border', 0, 0.9, 0.01, '控制玻璃卡片高光边框的可见度') +
            rangeRow('主色辉光', 'glass.glow', 0, 0.9, 0.01, '按钮与强调元素的发光强度') +
            rangeRow('卡片圆角', 'glass.radius', 0, 40, 1, '建议 16 - 24 px，保持整体统一') +
            rangeRow('阴影强度', 'glass.shadow', 0, 1, 0.01, '提升悬浮感，过强会显脏') +
            rangeRow('色彩饱和度', 'glass.saturation', 1, 2.5, 0.01, '对背景与玻璃做色彩增益') +
          '</div>' +

          '<div class="theme-panel glass"><div class="theme-panel__head"><h4>' + UI.icon('palette', 16) + '品牌色</h4>' +
            '<span>强调色与辅助色</span></div>' +
            '<div class="form-grid">' + colorRow('强调色', 'accent.primary') + colorRow('辅助色', 'accent.secondary') + '</div>' +
          '</div>' +

          '<div class="theme-panel glass"><div class="theme-panel__head"><h4>' + UI.icon('moon', 16) + '默认显示模式</h4>' +
            '<span>用户可在个人中心本地覆盖</span></div>' +
            '<div class="mode-choices">' +
              ['light', 'dark', 'system'].map(function (m) {
                var label = m === 'light' ? '浅色' : m === 'dark' ? '深色' : '跟随系统';
                var icon = m === 'light' ? 'sun' : m === 'dark' ? 'moon' : 'monitor';
                return '<button type="button" class="mode-choice' + (draft.mode === m ? ' is-active' : '') + '" data-mode="' + m + '">' +
                  UI.icon(icon, 18) + label + '</button>';
              }).join('') + '</div>' +
          '</div>' +
        '</div>' +
        '<div id="preview-slot">' + previewHtml() + '</div>' +
      '</div>' +
      '<div class="theme-actions glass">' +
        '<span class="theme-actions__note">' + UI.icon('info', 14) + '<span id="dirty-note">' +
          (JSON.stringify(draft) === JSON.stringify(saved) ? '当前参数与已保存配置一致' : '有未保存的修改，保存后下发到前台') +
        '</span></span>' +
        '<button class="btn btn--ghost" data-reset>' + UI.icon('refresh', 16) + '放弃修改</button>' +
        '<button class="btn btn--primary" data-save>' + UI.icon('save', 16) + '保存并下发</button>' +
      '</div>';
    }

    function siteHtml() {
      var s = data.site || {};
      var fields = [
        ['name', '站点名称', 'textarea'],
        ['fullName', '站点全称', 'text'],
        ['domain', '站点域名', 'text'],
        ['icp', 'ICP 备案号', 'text'],
        ['copyright', '版权信息', 'text'],
        ['phone', '客服电话', 'text'],
        ['email', '客服邮箱', 'text'],
        ['supportHours', '服务时间', 'text'],
        ['address', '公司地址', 'text']
      ];
      return '<div class="form-section glass"><div class="form-section__head"><div><h4>站点信息</h4>' +
        '<p>展示在前台页脚、登录页与工单页面</p></div></div>' +
        '<form id="site-form" class="stack">' +
          '<div class="form-grid">' +
            fields.slice(0, 2).map(function (f) {
              return UI.field(f[1], '<input class="input" name="' + f[0] + '" value="' + UI.attr(s[f[0]] || '') + '">');
            }).join('') +
          '</div>' +
          '<div class="form-grid">' +
            fields.slice(2, 4).map(function (f) {
              return UI.field(f[1], '<input class="input" name="' + f[0] + '" value="' + UI.attr(s[f[0]] || '') + '">');
            }).join('') +
          '</div>' +
          UI.field('版权信息', '<input class="input" name="copyright" value="' + UI.attr(s.copyright || '') + '">') +
          '<div class="form-grid">' +
            fields.slice(5, 7).map(function (f) {
              return UI.field(f[1], '<input class="input" name="' + f[0] + '" value="' + UI.attr(s[f[0]] || '') + '">');
            }).join('') +
          '</div>' +
          '<div class="form-grid">' +
            UI.field('服务时间', '<input class="input" name="supportHours" value="' + UI.attr(s.supportHours || '') + '">') +
            UI.field('公司地址', '<input class="input" name="address" value="' + UI.attr(s.address || '') + '">') +
          '</div>' +
          '<div class="row row--end"><button class="btn btn--primary" type="submit">' + UI.icon('save', 16) + '保存站点信息</button></div>' +
        '</form></div>' +
        UI.alert('info', '站点名称与版权信息会立即显示在前台页脚与浏览器标题，无需重新构建。', 'info');
    }

    function commerceHtml() {
      var commerce = data.commerce || {};
      var terms = commerce.terms || [];
      var methods = commerce.paymentMethods || [];
      return '<div class="form-section glass"><div class="form-section__head"><div><h4>计费周期</h4>' +
        '<p>套餐按月价 × 周期系数计价，系数越小折扣越大</p></div></div>' +
        UI.table({
          head: ['周期', '系数', '相当于'],
          compact: true,
          rows: terms.map(function (t) {
            return '<tr><td>' + t.months + ' 个月</td><td class="mono">' + t.factor + ' × 月价</td>' +
              '<td class="faint">约 ' + (Number(t.months) / Number(t.factor) * 10).toFixed(1) + ' 折</td></tr>';
          })
        }) + '</div>' +
        '<div class="form-section glass"><div class="form-section__head"><div><h4>支付渠道</h4>' +
          '<p>演示环境所有渠道均为即时确认</p></div></div>' +
          '<div class="row row--wrap">' + methods.map(function (m) {
            return UI.badge(m === 'balance' ? '账户余额' : m === 'alipay' ? '支付宝' : '微信支付', 'neutral');
          }).join('') + '</div>' +
          UI.alert('warning', '计费系数与支付渠道属于演示数据，如需修改请编辑 api/seed/settings.json 后重新播种。', 'alert-triangle') +
        '</div>';
    }

    var navItems = [
      { key: 'theme', label: '主题外观', icon: 'palette' },
      { key: 'site', label: '站点信息', icon: 'globe' },
      { key: 'commerce', label: '商务配置', icon: 'credit-card' }
    ];

    return {
      title: '系统设置',
      html: pageHead('系统设置', '主题参数保存后立即下发前台，并持久化到服务端配置。') +
        '<div class="settings-layout">' +
          '<aside class="settings-nav glass" style="padding:var(--space-3)">' +
            navItems.map(function (n) {
              return '<a class="settings-nav__item' + (tab === n.key ? ' is-active' : '') + '" href="#/admin/settings?tab=' + n.key + '">' +
                UI.icon(n.icon, 15) + n.label + '</a>';
            }).join('') +
          '</aside>' +
          '<div id="settings-body">' + (tab === 'site' ? siteHtml() : tab === 'commerce' ? commerceHtml() : themeEditorHtml()) + '</div>' +
        '</div>',
      mount: function (root) {
        if (tab === 'site') {
          var siteForm = root.querySelector('#site-form');
          siteForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var btn = siteForm.querySelector('button[type="submit"]');
            UI.busy(btn, function () { return API.put('/admin/settings/site', UI.values(siteForm)); })
              .then(function (res) {
                data.site = res.site;
                Store.refreshConfig();
                UI.toast('站点信息已保存', 'success');
              }).catch(function (err) { UI.toast(err.message, 'error'); });
          });
          return;
        }
        if (tab !== 'theme') return;

        var body = root.querySelector('#settings-body');

        function paint() {
          body.innerHTML = themeEditorHtml();
          markDirty();
        }

        function markDirty() {
          var note = root.querySelector('#dirty-note');
          if (note) {
            note.textContent = JSON.stringify(draft) === JSON.stringify(saved)
              ? '当前参数与已保存配置一致'
              : '有未保存的修改，保存后下发到前台';
          }
        }

        function syncInputs(path, value) {
          Array.prototype.forEach.call(body.querySelectorAll('[data-tpath="' + path + '"]'), function (input) {
            if (input.type === 'range') {
              input.value = value;
              var min = Number(input.getAttribute('min'));
              var max = Number(input.getAttribute('max'));
              input.style.setProperty('--fill', Math.max(0, Math.min(100, (Number(value) - min) / (max - min) * 100)) + '%');
            } else if (input.type === 'color') {
              input.value = value;
            } else if (document.activeElement !== input) {
              input.value = value;
            }
          });
          Array.prototype.forEach.call(body.querySelectorAll('[data-out="' + path + '"]'), function (out) {
            out.textContent = fmtValue(path, value);
          });
        }

        UI.on(root, '[data-tpath]', 'input', function (e, el) {
          var path = el.getAttribute('data-tpath');
          var value = el.value;
          if (el.type !== 'color' && /(color|from|to|veilColor|primary|secondary)$/i.test(path) &&
            !/^#[0-9a-fA-F]{6}$/.test(value)) {
            return;
          }
          if (el.type === 'range' || el.type === 'number') value = Number(value);
          setPath(draft, path, value);
          draft.preset = 'custom';
          Theme.preview(draft);
          syncInputs(path, el.type === 'range' ? Number(el.value) : value);
          markDirty();
        });

        UI.on(root, '[data-preset]', 'click', function (e, el) {
          var key = el.getAttribute('data-preset');
          var preset = presets[key];
          if (!preset || !preset.theme) return;
          draft = clone(preset.theme);
          draft.preset = key;
          Theme.preview(draft);
          paint();
        });

        UI.on(root, '[data-bgtype]', 'click', function (e, el) {
          draft.background.type = el.getAttribute('data-bgtype');
          draft.preset = 'custom';
          Theme.preview(draft);
          paint();
        });

        UI.on(root, '[data-mode]', 'click', function (e, el) {
          draft.mode = el.getAttribute('data-mode');
          draft.preset = 'custom';
          Theme.preview(draft);
          paint();
        });

        UI.on(root, '[data-upload]', 'click', function () {
          var file = body.querySelector('#bg-file');
          if (file) file.click();
        });

        UI.on(root, '#bg-file', 'change', function (e, el) {
          var f = el.files && el.files[0];
          if (!f) return;
          if (f.size > 4 * 1024 * 1024) { UI.toast('图片不能超过 4 MB', 'warning'); return; }
          UI.toast('正在上传背景图片…', 'info');
          API.upload(f).then(function (res) {
            draft.background.type = 'image';
            draft.background.image = res.url;
            draft.preset = 'custom';
            Theme.preview(draft);
            paint();
            UI.toast('图片已上传并应用，保存后生效到前台', 'success');
          }).catch(function (err) { UI.toast(err.message, 'error'); });
        });

        UI.on(root, '[data-reset]', 'click', function () {
          draft = clone(saved);
          Theme.preview(draft);
          paint();
          UI.toast('已恢复为上次保存的主题', 'success');
        });

        UI.on(root, '[data-save]', 'click', function (e, el) {
          if (JSON.stringify(draft) === JSON.stringify(saved)) {
            UI.toast('当前没有需要保存的修改', 'info');
            return;
          }
          UI.busy(el, function () { return Theme.save(draft); })
            .then(function (res) {
              saved = clone(res);
              draft = clone(res);
              paint();
              UI.toast('主题已保存并下发到前台', 'success');
            }).catch(function (err) {
              Theme.preview(saved);
              UI.toast(err.message, 'error');
            });
        });
      }
    };
  }, { area: 'admin', auth: true });
})();
