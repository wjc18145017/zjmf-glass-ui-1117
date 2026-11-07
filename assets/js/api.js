/* ==========================================================================
   智简魔方 · API 客户端
   统一封装 /api 请求、Bearer Token、错误抛出与 401 失效处理。
   ========================================================================== */
(function () {
  'use strict';

  var TOKEN_KEY = 'zjmf:token';

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function setToken(v) {
    try {
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* noop */ }
  }

  function ApiError(message, code, status, data) {
    this.name = 'ApiError';
    this.message = message || '请求失败';
    this.code = code == null ? -1 : code;
    this.status = status || 0;
    this.data = data == null ? null : data;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  var unauthorizedHandler = null;

  function buildUrl(path, query) {
    var url = '/api' + (path.charAt(0) === '/' ? path : '/' + path);
    if (query) {
      var parts = [];
      Object.keys(query).forEach(function (k) {
        var v = query[k];
        if (v === undefined || v === null || v === '') return;
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      });
      if (parts.length) url += (url.indexOf('?') === -1 ? '?' : '&') + parts.join('&');
    }
    return url;
  }

  function request(method, path, options) {
    options = options || {};
    var headers = {};
    var t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    var body = options.body;
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    return fetch(buildUrl(path, options.query), {
      method: method,
      headers: headers,
      body: body,
      cache: 'no-store'
    }).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('application/json') === -1) {
        return res.text().then(function (txt) {
          throw new ApiError('服务返回了非 JSON 响应（HTTP ' + res.status + '）', res.status, res.status, txt.slice(0, 200));
        });
      }
      return res.json().then(function (json) {
        if (json && json.code === 0) return json.data;
        var err = new ApiError((json && json.message) || '请求失败', json ? json.code : -1, res.status, json ? json.data : null);
        if (res.status === 401 && typeof unauthorizedHandler === 'function') {
          try { unauthorizedHandler(err); } catch (e) { /* noop */ }
        }
        throw err;
      });
    }, function (netErr) {
      throw new ApiError('网络异常，请检查本地 PHP 服务是否运行：' + (netErr && netErr.message ? netErr.message : ''), -1, 0, null);
    });
  }

  window.API = {
    ApiError: ApiError,
    token: token,
    setToken: setToken,
    clearToken: function () { setToken(''); },
    onUnauthorized: function (fn) { unauthorizedHandler = fn; },
    request: request,
    get: function (path, query) { return request('GET', path, { query: query }); },
    post: function (path, body, query) { return request('POST', path, { body: body, query: query }); },
    put: function (path, body) { return request('PUT', path, { body: body }); },
    del: function (path, body) { return request('DELETE', path, { body: body }); },
    upload: function (file) {
      var fd = new FormData();
      fd.append('file', file);
      return request('POST', '/admin/upload', { body: fd });
    }
  };
})();
