/* ==========================================================================
   智简魔方 · UI 工具库
   纯字符串模板 + 原生 DOM 交互，无第三方依赖。
   ========================================================================== */
window.UI = (function () {
  'use strict';

  /* ---------------- 基础 ---------------- */
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attr(value) { return esc(value); }

  function icon(name, size, cls) {
    if (!window.Icons) return '';
    return window.Icons.svg(name, { size: size || 18, cls: cls || '' });
  }

  function raw(value) { return value == null ? '' : String(value); }

  /* ---------------- 数字 / 时间 ---------------- */
  function num(n, digits) {
    var v = Number(n);
    if (!isFinite(v)) v = 0;
    var fixed = digits == null ? (Math.abs(v % 1) > 0.0001 ? 2 : 0) : digits;
    return v.toLocaleString('zh-CN', { minimumFractionDigits: fixed, maximumFractionDigits: fixed });
  }

  function money(n, symbol) {
    return (symbol === false ? '' : '¥') + num(n, 2);
  }

  function moneyShort(n) {
    var v = Number(n) || 0;
    if (v >= 10000) return '¥' + (v / 10000).toFixed(1) + ' 万';
    return '¥' + num(v, Math.abs(v % 1) > 0.0001 ? 2 : 0);
  }

  function parseDate(str) {
    if (!str) return null;
    var s = String(str).replace('T', ' ').replace(/-/g, '/');
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function date(str) {
    var d = parseDate(str);
    if (!d) return str || '-';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function datetime(str) {
    var d = parseDate(str);
    if (!d) return str || '-';
    return date(str) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function fromNow(str) {
    var d = parseDate(str);
    if (!d) return str || '-';
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + ' 天前';
    return date(str);
  }

  function daysLeft(str) {
    var d = parseDate(str);
    if (!d) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  }

  /* ---------------- 轻提示 ---------------- */
  function toast(message, type, duration) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' toast--' + type : '');
    el.innerHTML = '<span class="toast__icon"></span><span class="toast__text">' + esc(message) + '</span>';
    root.appendChild(el);
    var ttl = duration || (type === 'error' ? 4200 : 3000);
    setTimeout(function () {
      el.classList.add('is-leaving');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
    }, ttl);
  }

  /* ---------------- 弹窗 ---------------- */
  var modalStack = [];

  function closeTopModal() {
    var top = modalStack[modalStack.length - 1];
    if (top) top.close();
  }

  function modal(options) {
    options = options || {};
    var root = document.getElementById('modal-root') || document.body;
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    var sizeCls = options.size === 'lg' ? ' modal--lg' : options.size === 'xl' ? ' modal--xl' : '';
    var footerHtml = options.footer
      ? '<div class="modal__foot">' + options.footer + '</div>'
      : '';
    mask.innerHTML =
      '<div class="modal glass glass--strong' + sizeCls + '" role="dialog" aria-modal="true">' +
        '<div class="modal__head">' +
          '<div><h2 class="modal__title">' + esc(options.title || '提示') + '</h2>' +
          (options.sub ? '<p class="modal__sub">' + esc(options.sub) + '</p>' : '') + '</div>' +
          '<button class="modal__close" data-modal-close aria-label="关闭">' + icon('close', 18) + '</button>' +
        '</div>' +
        '<div class="modal__body">' + raw(options.body || '') + '</div>' +
        footerHtml +
      '</div>';
    root.appendChild(mask);
    document.body.classList.add('modal-open');

    var closed = false;
    function close(result) {
      if (closed) return;
      closed = true;
      mask.classList.add('is-closing');
      if (mask.parentNode) mask.parentNode.removeChild(mask);
      var idx = modalStack.indexOf(handle);
      if (idx !== -1) modalStack.splice(idx, 1);
      if (!modalStack.length) document.body.classList.remove('modal-open');
      if (typeof options.onClose === 'function') options.onClose(result);
    }
    var handle = { close: close, el: mask };

    mask.addEventListener('click', function (e) {
      if (e.target === mask && options.maskClosable !== false) close(null);
      var closer = e.target.closest ? e.target.closest('[data-modal-close]') : null;
      if (closer) close(null);
    });

    mask.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close(null);
    });

    modalStack.push(handle);
    if (typeof options.onMount === 'function') {
      setTimeout(function () { options.onMount(mask, close); }, 0);
    }
    setTimeout(function () {
      var input = mask.querySelector('[data-autofocus]');
      if (input && input.focus) input.focus();
    }, 60);
    return handle;
  }

  function confirmDialog(options) {
    options = options || {};
    return new Promise(function (resolve) {
      var settled = false;
      var h = modal({
        title: options.title || '请确认操作',
        body: '<p style="color:var(--text-2);font-size:var(--fs-sm);line-height:1.7">' + esc(options.message || '') + '</p>' +
          (options.extra ? options.extra : ''),
        footer:
          '<button class="btn btn--ghost" data-modal-close>取消</button>' +
          '<button class="btn ' + (options.danger ? 'btn--danger' : 'btn--primary') + '" data-ok>' + esc(options.confirmText || '确认') + '</button>',
        onMount: function (el, close) {
          el.querySelector('[data-ok]').addEventListener('click', function () {
            settled = true;
            close(true);
            resolve(true);
          });
        },
        onClose: function () {
          if (!settled) resolve(false);
        }
      });
      return h;
    });
  }

  /* ---------------- 状态徽标 ---------------- */
  var STATUS_MAP = {
    pending: { text: '待支付', tone: 'warning' },
    paid: { text: '已支付', tone: 'success' },
    cancelled: { text: '已取消', tone: 'neutral' },
    refunded: { text: '已退款', tone: 'info' },
    running: { text: '运行中', tone: 'success', dot: true },
    stopped: { text: '已停止', tone: 'neutral', dot: true },
    expired: { text: '已过期', tone: 'danger', dot: true },
    error: { text: '异常', tone: 'danger', dot: true },
    open: { text: '待处理', tone: 'warning' },
    answered: { text: '已回复', tone: 'success' },
    closed: { text: '已关闭', tone: 'neutral' },
    approved: { text: '已通过', tone: 'success' },
    rejected: { text: '已驳回', tone: 'danger' },
    active: { text: '启用', tone: 'success' },
    disabled: { text: '停用', tone: 'neutral' },
    completed: { text: '已完成', tone: 'success' },
    verified: { text: '已认证', tone: 'success' },
    none: { text: '未认证', tone: 'neutral' },
    reviewing: { text: '审核中', tone: 'warning' }
  };

  function statusInfo(status) {
    return STATUS_MAP[status] || { text: status || '-', tone: 'neutral' };
  }

  function statusBadge(status, label) {
    var s = statusInfo(status);
    var cls = 'badge badge--' + s.tone + (s.dot ? ' badge--dot' : '');
    return '<span class="' + cls + '">' + esc(label || s.text) + '</span>';
  }

  function badge(text, tone) {
    return '<span class="badge badge--' + (tone || 'neutral') + '">' + esc(text) + '</span>';
  }

  var PAY_METHOD = { balance: '余额支付', alipay: '支付宝', wechat: '微信支付' };

  function payMethod(method) {
    if (!method) return '未支付';
    return PAY_METHOD[method] || String(method);
  }

  /* ---------------- 空状态 / 骨架 ---------------- */
  function empty(options) {
    options = options || {};
    return '<div class="empty">' +
      '<div class="empty__icon">' + icon(options.icon || 'inbox', 28) + '</div>' +
      '<div class="empty__title">' + esc(options.title || '暂无内容') + '</div>' +
      '<div class="empty__desc">' + esc(options.desc || '') + '</div>' +
      (options.actions ? '<div class="empty__actions">' + options.actions + '</div>' : '') +
      '</div>';
  }

  function skeleton(count, opts) {
    opts = opts || {};
    var rows = '';
    for (var i = 0; i < (count || 3); i++) {
      rows += '<div class="skeleton' + (opts.lg ? ' skeleton--lg' : '') + '" style="width:' + (70 + (i * 9) % 30) + '%;margin-top:12px"></div>';
    }
    return '<div class="skeleton-card">' + rows + '</div>';
  }

  function loadingPage(text) {
    return '<div class="loading-page"><div class="loader"></div>' +
      '<p>' + esc(text || '正在加载数据…') + '</p></div>';
  }

  /* ---------------- 表格 ---------------- */
  function table(options) {
    var head = options.head.map(function (h) {
      var text = typeof h === 'string' ? h : h.label;
      var cls = typeof h === 'object' && h.right ? ' class="is-right"' : '';
      return '<th' + cls + '>' + esc(text) + '</th>';
    }).join('');
    var rows = options.rows;
    var rowsHtml = Array.isArray(rows) ? rows.join('') : (typeof rows === 'string' ? rows : '');
    var body = rowsHtml.trim()
      ? rowsHtml
      : '<tr><td colspan="' + options.head.length + '">' + empty({ title: options.emptyTitle || '暂无数据', desc: options.emptyDesc || '', icon: options.emptyIcon || 'inbox' }) + '</td></tr>';
    return '<div class="table-wrap"><table class="table' + (options.compact ? ' table--compact' : '') + '">' +
      '<thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* ---------------- 分页 ---------------- */
  function pager(page, total, perPage) {
    var pages = Math.max(1, Math.ceil(total / perPage));
    var cur = Math.min(Math.max(1, page), pages);
    var html = '<div class="pager">';
    html += '<button class="pager__btn" data-page="' + (cur - 1) + '"' + (cur <= 1 ? ' disabled' : '') + '>上一页</button>';
    var start = Math.max(1, cur - 2);
    var end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    for (var i = start; i <= end; i++) {
      html += '<button class="pager__btn' + (i === cur ? ' is-active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button class="pager__btn" data-page="' + (cur + 1) + '"' + (cur >= pages ? ' disabled' : '') + '>下一页</button>';
    html += '<span style="font-size:var(--fs-xs);color:var(--text-3);margin-left:8px">共 ' + total + ' 条</span>';
    html += '</div>';
    return html;
  }

  /* ---------------- 头像 ---------------- */
  var AVATAR_TONES = ['#3fd0c9', '#58a6ff', '#a78bfa', '#f472b6', '#f0b95c', '#2fbf91'];

  function avatar(name, opts) {
    opts = opts || {};
    var text = (name || '?').trim().slice(0, 1).toUpperCase();
    var tone = AVATAR_TONES[(name || '').length % AVATAR_TONES.length];
    var cls = 'avatar' + (opts.size === 'lg' ? ' avatar--lg' : opts.size === 'sm' ? ' avatar--sm' : '') + (opts.ring ? ' avatar--ring' : '');
    if (opts.url) {
      return '<span class="' + cls + '"><img src="' + attr(opts.url) + '" alt="' + attr(name || '') + '"></span>';
    }
    return '<span class="' + cls + '" style="background:linear-gradient(135deg,' + tone + '33,' + tone + '18);color:' + tone + ';border-color:' + tone + '44">' + esc(text) + '</span>';
  }

  /* ---------------- 表单 ---------------- */
  function field(label, inputHtml, hint) {
    return '<label class="field">' + (label ? '<span class="field__label">' + esc(label) + '</span>' : '') +
      inputHtml + (hint ? '<span class="field__hint">' + esc(hint) + '</span>' : '') + '</label>';
  }

  function values(form) {
    var out = {};
    if (!form) return out;
    var els = form.querySelectorAll('input[name], select[name], textarea[name]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.type === 'checkbox') {
        out[el.name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) out[el.name] = el.value;
      } else {
        out[el.name] = el.value;
      }
    });
    return out;
  }

  function validate(form, rules) {
    var ok = true;
    Object.keys(rules || {}).forEach(function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      if (!el) return;
      var value = (el.value || '').trim();
      var rule = rules[name];
      var msg = '';
      if (rule.required && !value) msg = rule.message || '此项为必填';
      else if (rule.min && value.length < rule.min) msg = rule.minMessage || ('至少 ' + rule.min + ' 个字符');
      else if (rule.pattern && value && !rule.pattern.test(value)) msg = rule.patternMessage || '格式不正确';
      el.classList.toggle('input--error', !!msg);
      var hint = el.parentNode.querySelector('.field__error');
      if (msg) {
        ok = false;
        if (!hint) {
          hint = document.createElement('span');
          hint.className = 'field__error';
          hint.style.cssText = 'color:var(--danger);font-size:var(--fs-2xs);margin-top:4px;display:block';
          el.parentNode.appendChild(hint);
        }
        hint.textContent = msg;
      } else if (hint) {
        hint.parentNode.removeChild(hint);
      }
    });
    return ok;
  }

  /* ---------------- 交互工具 ---------------- */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait || 260);
    };
  }

  function on(root, selector, event, handler) {
    if (!root) return function () {};
    var fn = function (e) {
      var target = e.target;
      var el = target && target.closest ? target.closest(selector) : null;
      if (el && root.contains(el)) handler(e, el);
    };
    root.addEventListener(event, fn);
    return function () { root.removeEventListener(event, fn); };
  }

  function copy(text) {
    var value = String(text == null ? '' : text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).then(function () {
        toast('已复制到剪贴板', 'success');
      }, function () {
        fallbackCopy(value);
      });
    }
    fallbackCopy(value);
    return Promise.resolve();
  }

  function fallbackCopy(value) {
    var ta = document.createElement('textarea');
    ta.value = value;
    ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制到剪贴板', 'success'); }
    catch (e) { toast('复制失败，请手动选择', 'error'); }
    document.body.removeChild(ta);
  }

  function busy(button, promiseFactory) {
    if (!button) return promiseFactory();
    var original = button.innerHTML;
    button.disabled = true;
    button.classList.add('is-loading');
    button.innerHTML = '<span class="btn__spinner"></span>' + original;
    return Promise.resolve(promiseFactory()).then(function (v) {
      restore();
      return v;
    }, function (err) {
      restore();
      throw err;
    });
    function restore() {
      button.disabled = false;
      button.classList.remove('is-loading');
      button.innerHTML = original;
    }
  }

  /* ---------------- Markdown（精简） ---------------- */
  function markdown(src) {
    if (!src) return '';
    var text = String(src).replace(/\r\n/g, '\n');
    var blocks = [];
    text = text.replace(/```([a-zA-Z0-9-]*)\n([\s\S]*?)```/g, function (m, lang, code) {
      blocks.push('<pre class="code-block">' + esc(code.replace(/\n$/, '')) + '</pre>');
      return '\u0000BLOCK' + (blocks.length - 1) + '\u0000';
    });

    text = esc(text);

    var lines = text.split('\n');
    var out = [];
    var inList = false;
    var listType = '';

    function closeList() {
      if (inList) { out.push('</' + listType + '>'); inList = false; listType = ''; }
    }

    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) { closeList(); return; }
      var blockMatch = /^\u0000BLOCK(\d+)\u0000$/.exec(trimmed);
      if (blockMatch) { closeList(); out.push(blocks[Number(blockMatch[1])]); return; }

      var h = /^(######|#####|####|###|##|#)\s+(.*)$/.exec(trimmed);
      if (h) {
        closeList();
        var level = h[1].length;
        out.push('<h' + level + '>' + inline(h[2]) + '</h' + level + '>');
        return;
      }
      if (/^&gt;\s+/.test(trimmed)) {
        closeList();
        out.push('<blockquote style="border-left:2px solid var(--accent-line);padding-left:12px;color:var(--text-2);margin:10px 0">' + inline(trimmed.replace(/^&gt;\s+/, '')) + '</blockquote>');
        return;
      }
      var ul = /^[-*]\s+(.*)$/.exec(trimmed);
      if (ul) {
        if (!inList || listType !== 'ul') { closeList(); out.push('<ul style="margin:10px 0;padding-left:20px;list-style:disc">'); inList = true; listType = 'ul'; }
        out.push('<li>' + inline(ul[1]) + '</li>');
        return;
      }
      var ol = /^\d+\.\s+(.*)$/.exec(trimmed);
      if (ol) {
        if (!inList || listType !== 'ol') { closeList(); out.push('<ol style="margin:10px 0;padding-left:22px">'); inList = true; listType = 'ol'; }
        out.push('<li>' + inline(ol[1]) + '</li>');
        return;
      }
      closeList();
      out.push('<p>' + inline(trimmed) + '</p>');
    });
    closeList();
    return out.join('');
  }

  function inline(text) {
    return text
      .replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);font-size:0.92em;padding:1px 5px;border-radius:5px;background:var(--code-bg);border:1px solid var(--line)">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline;text-underline-offset:2px">$1</a>');
  }

  /* ---------------- 图表 ---------------- */
  function sparkline(values, opts) {
    opts = opts || {};
    var w = opts.width || 220;
    var h = opts.height || 40;
    var data = (values || []).map(function (v) { return Number(v) || 0; });
    if (data.length < 2) data = [0, 0];
    var max = Math.max.apply(null, data.concat([1]));
    var min = Math.min.apply(null, data.concat([0]));
    var span = max - min || 1;
    var pts = data.map(function (v, i) {
      var x = (i / (data.length - 1)) * w;
      var y = h - 4 - ((v - min) / span) * (h - 8);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
    var area = line + ' L' + w + ' ' + h + ' L0 ' + h + ' Z';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<path d="' + area + '" fill="var(--accent)" opacity="0.14"/>' +
      '<path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '</svg>';
  }

  function chartBars(values, labels, opts) {
    opts = opts || {};
    var max = Math.max.apply(null, (values || []).concat([1]));
    var cols = (values || []).map(function (v, i) {
      var pct = max ? Math.max(2, Math.round((Number(v) || 0) / max * 100)) : 0;
      return '<div class="trend-bars__col">' +
        '<span class="trend-bars__value">' + esc(opts.format ? opts.format(v) : num(v, 0)) + '</span>' +
        '<div class="trend-bars__track"><div class="trend-bars__bar' + (i % 2 ? ' trend-bars__bar--alt' : '') + '" style="height:' + pct + '%"></div></div>' +
        '<span class="trend-bars__label">' + esc((labels || [])[i] || '') + '</span>' +
        '</div>';
    }).join('');
    return '<div class="trend-bars">' + cols + '</div>';
  }

  /* ---------------- 其他 ---------------- */
  function kv(rows) {
    return '<dl class="kv">' + rows.map(function (r) {
      return '<dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? r[1] : esc(r[1])) + '</dd>';
    }).join('') + '</dl>';
  }

  function alertBox(type, text, iconName) {
    return '<div class="alert alert--' + (type || 'info') + '">' + icon(iconName || 'info', 18) + '<span>' + raw(text) + '</span></div>';
  }

  function chatMsg(msg) {
    var isUser = msg.from === 'user';
    return '<div class="chat__msg' + (isUser ? ' chat__msg--user' : '') + '">' +
      avatar(msg.authorName || (isUser ? '我' : '客服'), { size: 'sm' }) +
      '<div><div class="chat__bubble">' + esc(msg.content) + '</div>' +
      '<div class="chat__meta"><span>' + esc(msg.authorName || (isUser ? '我' : '技术支持')) + '</span><span>' + esc(datetime(msg.at)) + '</span></div></div></div>';
  }

  function productIconName(product) {
    var id = (product && (product.slug || product.id || product.category)) || '';
    var map = {
      'cloud-ecs': 'cloud',
      'gpu-cloud': 'cpu',
      'hk-dedicated': 'server',
      'hk-vps': 'layers',
      'anti-ddos-cdn': 'shield',
      'object-storage': 'database',
      'shared-hosting': 'box'
    };
    if (map[id]) return map[id];
    var cat = product && product.category;
    if (cat === 'cloud') return 'cloud';
    if (cat === 'gpu') return 'cpu';
    if (cat === 'dedicated') return 'server';
    if (cat === 'vps' || cat === 'hosting') return 'layers';
    if (cat === 'network') return 'shield';
    if (cat === 'storage') return 'database';
    return 'server';
  }

  function bytes(n) {
    var v = Number(n) || 0;
    if (v < 1024) return v + ' B';
    if (v < 1048576) return (v / 1024).toFixed(1) + ' KB';
    if (v < 1073741824) return (v / 1048576).toFixed(1) + ' MB';
    return (v / 1073741824).toFixed(2) + ' GB';
  }

  return {
    esc: esc,
    attr: attr,
    raw: raw,
    icon: icon,
    num: num,
    money: money,
    moneyShort: moneyShort,
    date: date,
    datetime: datetime,
    fromNow: fromNow,
    daysLeft: daysLeft,
    toast: toast,
    modal: modal,
    confirm: confirmDialog,
    closeTopModal: closeTopModal,
    statusBadge: statusBadge,
    statusInfo: statusInfo,
    badge: badge,
    payMethod: payMethod,
    empty: empty,
    skeleton: skeleton,
    loadingPage: loadingPage,
    table: table,
    pager: pager,
    avatar: avatar,
    field: field,
    values: values,
    validate: validate,
    debounce: debounce,
    on: on,
    copy: copy,
    busy: busy,
    markdown: markdown,
    sparkline: sparkline,
    chartBars: chartBars,
    kv: kv,
    alert: alertBox,
    chatMsg: chatMsg,
    productIconName: productIconName,
    bytes: bytes
  };
})();
