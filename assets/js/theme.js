/* ==========================================================================
   智简魔方 · 主题引擎
   职责：
   1) 把服务端主题配置映射为 CSS 变量并即时生效（无需刷新）
   2) 深/浅/跟随系统三种模式，用户本地覆盖可重置
   3) 后台主题编辑器实时预览（preview 不改写持久化配置）
   4) 通过 BroadcastChannel 让多标签页同步
   ========================================================================== */
window.Theme = (function () {
  'use strict';

  var MODE_KEY = 'zjmf:mode';
  var MQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  var current = null;
  var lastAppliedMode = 'dark';
  var channel = null;
  var listeners = [];

  try {
    if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel('zjmf-theme');
  } catch (e) { channel = null; }

  var FALLBACK = {
    preset: 'deepsea',
    mode: 'dark',
    background: {
      type: 'gradient', color: '#04121d', from: '#04121d', to: '#0b3550', angle: 140,
      image: '', blur: 0, veil: 0.2, veilColor: '#03111a'
    },
    glass: { alpha: 0.48, blur: 20, border: 0.3, glow: 0.4, radius: 20, shadow: 0.5, saturation: 1.5 },
    accent: { primary: '#3fd0c9', secondary: '#58a6ff' }
  };

  function clamp(n, min, max, def) {
    n = Number(n);
    if (!isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
  }

  function isHex(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v); }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(FALLBACK));
    var bg = raw.background || {};
    var glass = raw.glass || {};
    var accent = raw.accent || {};
    var type = ['solid', 'gradient', 'image'].indexOf(bg.type) !== -1 ? bg.type : 'gradient';
    var mode = ['dark', 'light', 'system'].indexOf(raw.mode) !== -1 ? raw.mode : 'dark';
    var image = typeof bg.image === 'string' ? bg.image.trim() : '';
    if (image && !/^(https?:\/\/|\/uploads\/|data:image\/)/i.test(image)) image = '';
    return {
      preset: typeof raw.preset === 'string' && raw.preset ? raw.preset : 'custom',
      mode: mode,
      background: {
        type: type,
        color: isHex(bg.color) ? bg.color : '#04121d',
        from: isHex(bg.from) ? bg.from : '#04121d',
        to: isHex(bg.to) ? bg.to : '#0b3550',
        angle: Math.round(clamp(bg.angle, 0, 360, 140)),
        image: image,
        blur: clamp(bg.blur, 0, 40, 0),
        veil: clamp(bg.veil, 0, 0.9, 0.2),
        veilColor: isHex(bg.veilColor) ? bg.veilColor : '#03111a'
      },
      glass: {
        alpha: clamp(glass.alpha, 0.25, 0.95, 0.48),
        blur: clamp(glass.blur, 0, 40, 20),
        border: clamp(glass.border, 0, 0.9, 0.3),
        glow: clamp(glass.glow, 0, 0.9, 0.4),
        radius: clamp(glass.radius, 0, 40, 20),
        shadow: clamp(glass.shadow, 0, 1, 0.5),
        saturation: clamp(glass.saturation, 1, 2.5, 1.5)
      },
      accent: {
        primary: isHex(accent.primary) ? accent.primary : '#3fd0c9',
        secondary: isHex(accent.secondary) ? accent.secondary : '#58a6ff'
      }
    };
  }

  function rgbOf(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }

  function rgba(hex, a) {
    var c = rgbOf(hex);
    return 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + a + ')';
  }

  function inkFor(hex) {
    var c = rgbOf(hex).map(function (v) { return v / 255; }).map(function (v) {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return L > 0.55 ? '#071018' : '#f4f8ff';
  }

  function luminance(hex) {
    if (!isHex(hex)) return 0;
    var c = rgbOf(hex).map(function (v) { return v / 255; }).map(function (v) {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  /* 向目标色混合，用于按显示模式自适应背景明度，保证文字对比度 */
  function blend(hex, target, amount) {
    if (!isHex(hex)) return hex;
    var a = rgbOf(hex);
    var b = rgbOf(target);
    var out = a.map(function (v, i) { return Math.round(v + (b[i] - v) * amount); });
    return '#' + out.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }

  function adaptBg(hex, mode) {
    var L = luminance(hex);
    if (mode === 'light' && L < 0.5) return blend(hex, '#ffffff', 0.88);
    if (mode === 'dark' && L > 0.42) return blend(hex, '#050b12', 0.82);
    return hex;
  }

  /* 强调色随模式调校：浅色模式压暗保证可读，深色模式提亮保证发光感 */
  function adaptAccent(hex, mode) {
    var L = luminance(hex);
    if (mode === 'light' && L > 0.36) return blend(hex, '#0a2233', 0.5);
    if (mode === 'dark' && L < 0.16) return blend(hex, '#ffffff', 0.5);
    return hex;
  }

  function userOverride() {
    try { return localStorage.getItem(MODE_KEY) || ''; } catch (e) { return ''; }
  }

  function resolveMode(theme) {
    var override = userOverride();
    var wanted = override && ['dark', 'light', 'system'].indexOf(override) !== -1 ? override : (theme.mode || 'dark');
    if (wanted === 'system') {
      return (MQ && MQ.matches) ? 'light' : 'dark';
    }
    return wanted === 'light' ? 'light' : 'dark';
  }

  function paintBackground(t, mode) {
    var bg = t.background;
    var root = document.documentElement;
    var color = adaptBg(bg.color, mode);
    var from = adaptBg(bg.from, mode);
    var to = adaptBg(bg.to, mode);
    var veilColor = adaptBg(bg.veilColor, mode);
    root.setAttribute('data-bg-type', bg.type);
    root.style.setProperty('--bg-color', color);
    root.style.setProperty('--bg-from', from);
    root.style.setProperty('--bg-to', to);
    root.style.setProperty('--bg-angle', bg.angle + 'deg');
    root.style.setProperty('--bg-veil', String(bg.veil));
    root.style.setProperty('--bg-veil-color', veilColor);
    root.style.setProperty('--bg-blur', bg.blur + 'px');
    root.style.setProperty('--bg-image', bg.image ? 'url("' + bg.image.replace(/"/g, '%22') + '")' : 'none');

    var paint;
    if (bg.type === 'solid') {
      paint = color;
    } else {
      paint = 'linear-gradient(' + bg.angle + 'deg, ' + from + ', ' + to + ')';
    }
    root.style.setProperty('--bg-paint', paint);

    var imageEl = document.getElementById('app-bg-image');
    if (imageEl) {
      imageEl.style.backgroundImage = bg.image ? 'url("' + bg.image + '")' : 'none';
      imageEl.style.filter = 'blur(' + (bg.blur || 0) + 'px)' + (mode === 'light' ? ' brightness(1.35) saturate(0.9)' : '');
    }
    var veilEl = document.getElementById('app-bg-veil');
    if (veilEl) {
      veilEl.style.background = veilColor;
      veilEl.style.opacity = String(bg.veil);
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', bg.type === 'solid' ? color : from);
  }

  function apply(theme, options) {
    options = options || {};
    var t = normalize(theme || (Store.state.config && Store.state.config.theme) || FALLBACK);
    current = t;
    var mode = resolveMode(t);
    lastAppliedMode = mode;

    var root = document.documentElement;
    root.setAttribute('data-mode', mode);
    root.style.setProperty('--glass-alpha', String(t.glass.alpha));
    root.style.setProperty('--glass-blur', t.glass.blur + 'px');
    root.style.setProperty('--glass-border-alpha', String(t.glass.border));
    root.style.setProperty('--glass-glow', String(t.glass.glow));
    root.style.setProperty('--glass-shadow', String(t.glass.shadow));
    root.style.setProperty('--glass-sat', String(t.glass.saturation));
    root.style.setProperty('--radius-card', Math.round(t.glass.radius) + 'px');
    var primary = adaptAccent(t.accent.primary, mode);
    var secondary = adaptAccent(t.accent.secondary, mode);
    root.style.setProperty('--accent', primary);
    root.style.setProperty('--accent-2', secondary);
    root.style.setProperty('--accent-soft', rgba(primary, 0.14));
    root.style.setProperty('--accent-glow', rgba(primary, 0.32 + t.glass.glow * 0.2));
    root.style.setProperty('--accent-ink', inkFor(primary));

    paintBackground(t, mode);

    if (!options.silent) notify('apply');
    return t;
  }

  function preview(theme) {
    return apply(theme, { silent: true });
  }

  function notify(type) {
    listeners.forEach(function (fn) {
      try { fn(current, type); } catch (e) { console.error('[Theme] listener failed', e); }
    });
  }

  function onChange(fn) {
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  function get() { return current || normalize(FALLBACK); }

  function mode() { return lastAppliedMode; }

  function setUserMode(value) {
    try {
      if (value && ['dark', 'light', 'system'].indexOf(value) !== -1) localStorage.setItem(MODE_KEY, value);
      else localStorage.removeItem(MODE_KEY);
    } catch (e) { /* noop */ }
    apply(current, { silent: false });
    broadcast({ type: 'mode' });
  }

  function resetUserMode() {
    try { localStorage.removeItem(MODE_KEY); } catch (e) { /* noop */ }
    apply(current, { silent: false });
    broadcast({ type: 'mode' });
  }

  function presetByKey(key) {
    var presets = (Store.state.config && Store.state.config.presets) || {};
    return presets[key] && presets[key].theme ? normalize(presets[key].theme) : null;
  }

  function listPresets() {
    var presets = (Store.state.config && Store.state.config.presets) || {};
    return Object.keys(presets).map(function (key) {
      return { key: key, label: presets[key].label || key, desc: presets[key].desc || '', theme: normalize(presets[key].theme) };
    });
  }

  function broadcast(payload) {
    if (channel) {
      try { channel.postMessage(payload); } catch (e) { /* noop */ }
    }
  }

  function save(theme) {
    var payload = normalize(theme);
    return API.put('/admin/settings/theme', { theme: payload }).then(function (res) {
      var saved = normalize((res && res.theme) || payload);
      if (Store.state.config) Store.state.config.theme = saved;
      Store.cacheTheme(Store.state.config || { theme: saved });
      apply(saved);
      broadcast({ type: 'saved', theme: saved });
      notify('saved');
      return saved;
    });
  }

  if (channel) {
    channel.onmessage = function (ev) {
      var msg = ev.data || {};
      if (msg.type === 'saved' && msg.theme) {
        if (Store.state.config) Store.state.config.theme = normalize(msg.theme);
        Store.cacheTheme(Store.state.config || { theme: msg.theme });
        apply(msg.theme, { silent: false });
        notify('remote');
      } else if (msg.type === 'mode') {
        apply(current, { silent: false });
        notify('remote-mode');
      }
    };
  }

  if (MQ) {
    var onScheme = function () {
      var base = current || normalize((Store.state.config && Store.state.config.theme) || FALLBACK);
      var override = userOverride();
      var wanted = override || (base.mode || 'dark');
      if (wanted === 'system') apply(base, { silent: false });
    };
    if (MQ.addEventListener) MQ.addEventListener('change', onScheme);
    else if (MQ.addListener) MQ.addListener(onScheme);
  }

  /* 首屏从缓存应用，避免等待网络造成闪烁 */
  function bootFromCache() {
    var cached = Store.readThemeCache();
    if (cached) apply(cached, { silent: true });
  }

  return {
    FALLBACK: FALLBACK,
    normalize: normalize,
    apply: apply,
    preview: preview,
    get: get,
    mode: mode,
    setUserMode: setUserMode,
    resetUserMode: resetUserMode,
    userOverride: userOverride,
    presetByKey: presetByKey,
    listPresets: listPresets,
    save: save,
    onChange: onChange,
    bootFromCache: bootFromCache
  };
})();
