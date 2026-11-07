# 开发文档

版本：1.4.0（文档批次）
工程根目录：`zjmf-glass-ui-1117/`

---

## 1. 架构总览

### 1.1 请求链路

```
浏览器
  ├─ GET /                 → router.php → index.html（SPA 外壳）
  ├─ GET /assets/...       → router.php → 内置服务器直出静态文件
  └─ GET|POST /api/...     → router.php → api/index.php → Router → routes/*.php → JSON
```

- 前端为 Hash 路由（`#/path?query`），不依赖服务端 rewrite，任何静态托管都能跑页面（但数据需 PHP 服务）。
- 后端为「单入口 + 极简路由 + JSON 存储」，没有 Composer 依赖。

### 1.2 后端分层

| 文件 | 职责 |
| --- | --- |
| `api/index.php` | 时区、错误处理、加载 lib、挂载 5 个路由文件、去 `/api` 前缀后 dispatch |
| `api/lib/router.php` | 注册 `get/post/put/delete`；`{param}` 编译为命名捕获组；未匹配返回 `404 接口不存在` |
| `api/lib/helpers.php` | `respond/respond_error`、`body()/input()/query()`、`next_id/find_row`、日志、通知、价格计算、IP/UA 工具 |
| `api/lib/auth.php` | Bearer token 解析（Header 优先，兼容 `?token=`）、`current_user`、`require_login`、`require_admin`、签发/撤销 |
| `api/lib/services.php` | `theme_normalize`、`product_find`（id 或 slug）、`plan_find`、购物车读写与装饰、`pay_order`（扣款+开通+账单+通知） |
| `api/lib/store.php` | JSON 集合读写：缺文件自动从 `api/seed` 播种；写用临时文件 + rename；`update()` 持 `flock` 做读-改-写 |
| `api/routes/public.php` | 配置、产品、公告、帮助 |
| `api/routes/auth.php` | 登录、注册、找回、重置、me、登出 |
| `api/routes/commerce.php` | 购物车、订单创建/列表/详情/支付/取消 |
| `api/routes/account.php` | 用户中心（服务器、账单充值、工单、实名、安全、密钥、通知、资料、概览） |
| `api/routes/admin.php` | 后台（指标、用户、产品、订单、工单、充值审核、公告、日志、设置、上传） |

### 1.3 前端分层

| 文件 | 职责 |
| --- | --- |
| `icons.js` | `Icons.get(name, size)` 返回内联 SVG 字符串；全部图标集中定义，禁止 emoji |
| `api.js` | `API.get/post/put/del`，自动附加 token，解析 `{code,message,data}`，非 0 抛错并统一 toast |
| `store.js` | 登录态与本地缓存：`user/token`、购物车计数、未读数；`Store.subscribe` 通知布局刷新角标 |
| `ui.js` | `toast / modal / confirm / table / empty / skeleton / money / date / statusBadge / payMethod` 等 |
| `theme.js` | 主题引擎（见第 4 节） |
| `app.js` | 路由注册表 `App.page(path, handler, opts)`、布局渲染（public/user/admin）、`App.boot()`、导航高亮、移动抽屉、页脚版本号注入 |
| `pages/front.js` | 前台页面 |
| `pages/user.js` | 用户中心页面 |
| `pages/admin.js` | 后台页面 |

页面约定：

```js
App.page('/products', {
  layout: 'public',
  title: '云产品',
  render: function () {
    return { html: '...' , mount: function (root) { /* 绑定事件、请求数据 */ } };
  }
});
```

`render()` 同步返回骨架，`mount(root)` 内做异步请求与事件绑定；路由切换时 `App` 会清空容器并解绑。

### 1.4 数据模型要点

| 集合 | 关键字段 |
| --- | --- |
| users | `id, username, email, name, role, status, password_hash, phone, credits, realname{status,name,idno}, security{twofa,lastPasswordChange}, createdAt` |
| products | `id, slug, name, category, categoryName, tagline, description, recommended, plans[{id,name,cpu,memory,disk,bandwidth,price,stock}], regions[], os[]` |
| orders | `id, no, userId, status, amount, payMethod, createdAt, paidAt, provisioned, remark, items[]` |
| servers | `id, userId, orderNo, name, productId, planName, ip, region, os, status, expireAt, cpu, memory, disk, bandwidth, trafficUsed, trafficTotal` |
| tickets | `id, no, userId, title, category, priority, status, createdAt, updatedAt, replies[{id,role,author,content,at}]` |
| settings | `site{}, theme{}, presets[], commerce{terms[]}, smtp{}, payment{}` |

完整字段与接口映射见 [api.md](./api.md) 附录 A/B。

---

## 2. 本地运行

### 2.1 启动命令

```powershell
# 工程根目录
C:\BtSoft\php\74\php.exe -S 127.0.0.1:8899 router.php
```

- 必须带 `router.php`，否则 `/api/*` 不会被转发、SPA 也不会回落。
- 端口被占用时换一个（如 `8899` → `8900`），前端全用相对路径，无需改配置。
- 生产环境：Nginx/Apache 需配置「`/api/*` → `api/index.php`，其余 → `index.html`」，并禁止直接访问 `data/*.json`。

### 2.2 目录权限

`data/` 与 `uploads/` 需可写（Windows 默认即可；Linux 下 `chmod 775`，属主为 Web 用户）。

### 2.3 首次访问

访问任意页面会触发 `Store::read()`，自动把 `api/seed/*.json` 复制到 `data/`。若 `data/` 内已存在同名文件则不会覆盖。

---

## 3. 扩展指引

### 3.1 新增一个接口

1. 在 `api/routes/` 对应模块文件中注册：

```php
$router->get('/foo/{id}', function ($params) {
    $user = require_login();            // 需要登录时
    $row = find_row(Store::read('foo'), $params['id']);
    if (!$row) { respond_error(404, '记录不存在', 404); }
    respond($row);
});
```

2. 需要落库时用 `Store::update('foo', function (&$data) use (...) { ... });`，禁止直接 `file_put_contents`。
3. 写操作补 `log_action($user, 'foo.create', '描述')` 与必要的 `push_notification()`。
4. 更新 [api.md](./api.md)。

约定：错误一律 `respond_error(code, message, httpStatus)`；成功 `respond(data, status)`，创建返回 201。

### 3.2 新增一个页面

1. 在 `assets/js/pages/*.js` 中 `App.page('/xxx', {...})`；
2. 布局选择：`public` / `user` / `admin`；
3. 样式优先复用 `components.css` 的组件类，新页面级样式加到 `pages.css`（后台加 `admin.css`）；
4. 若加了新静态文件，同步修改 `index.html` 的 `?v=` 版本号（避免浏览器缓存旧文件）。

### 3.3 新增数据集合

1. 在 `api/seed/` 放 `foo.json`（数组，元素带自增 `id`）；
2. 代码里 `Store::read('foo')` 即自动播种；
3. 若需脱敏/派生字段，在 `services.php` 增加装饰函数。

### 3.4 替换为数据库

只需重写 `Store` 类的 `read/write/update` 三个静态方法为 PDO 实现，路由与业务代码无需改动（`update` 的回调签名保持 `function (array &$data)`）。

---

## 4. 主题引擎实现

### 4.1 数据流

```
admin 主题页
  └─ 控件变更 → Theme.preview(draft)            只写 CSS 变量（即时预览，不落库）
  └─ 点击保存 → PUT /admin/settings/theme       服务端 theme_normalize 归一化后落盘
                    ↓
               GET /api/config → theme          前台 App.boot() 拉取
                    ↓
               Theme.apply(theme)                写 data-mode / data-bg-type / CSS 变量
                    ↓
               localStorage.zjmf:themeCache      下次首屏防闪烁
               BroadcastChannel('zjmf-theme')    其它标签页同步
```

### 4.2 关键函数（`assets/js/theme.js`）

| 函数 | 作用 |
| --- | --- |
| `apply(theme)` | 归一化 + 写入属性与变量 + 缓存 |
| `preview(theme)` | 与 apply 相同的写入逻辑，但标记为预览、不写服务端 |
| `save(theme)` | `PUT /admin/settings/theme`，成功后以服务端返回为准 |
| `resetUserMode()` | 清除 `zjmf:mode` 用户覆盖，回到管理员默认 |
| `luminance(hex)` | 计算相对亮度，用于模式自适应判断 |
| `blend(hex, target, amount)` | 颜色混合 |
| `adaptBg(hex, mode)` | 浅色提亮暗底 / 深色压暗亮底 |
| `adaptAccent(hex, mode)` | 浅色压暗过亮强调色 / 深色提亮过暗强调色 |
| `paintBackground(t, mode)` | 组 `--bg-paint`（纯色 / 渐变 / 图片）、模糊、遮罩 |
| `paintGlass(t)` | 写 `--glass-alpha/blur/border-alpha/glow/radius/shadow/sat` |

### 4.3 服务端约束

`theme_normalize()` 对每个字段做类型与范围校验（见 api.md 附录 A），非法值回退默认，避免坏配置导致整站样式崩坏。图片地址仅接受 `http(s)://`、`/uploads/`、`data:image/` 前缀，杜绝 `javascript:` 注入。

### 4.4 首屏防闪烁

`index.html` 头部内联脚本在 CSS 生效前读取 `zjmf:themeCache` 与 `zjmf:mode`，设置 `data-mode`，避免深色用户先看到白屏再变暗。

---

## 5. 测试

### 5.1 接口冒烟（PowerShell）

```powershell
# 健康检查
Invoke-RestMethod http://127.0.0.1:8899/api/health

# 产品列表与详情（含 slug）
Invoke-RestMethod 'http://127.0.0.1:8899/api/products?category=all'
Invoke-RestMethod http://127.0.0.1:8899/api/products/cloud-ecs

# 登录 → 加购 → 下单 → 支付
$r = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8899/api/auth/login -ContentType 'application/json' -Body '{"username":"demo","password":"demo123"}'
$h = @{ Authorization = "Bearer $($r.data.token)" }
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8899/api/cart -Headers $h -ContentType 'application/json' -Body '{"productId":1,"planId":"p2","months":1,"qty":1}'
$o = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8899/api/orders -Headers $h -ContentType 'application/json' -Body '{"payWithBalance":true}'
Invoke-RestMethod "http://127.0.0.1:8899/api/orders/$($o.data.no)" -Headers $h
```

### 5.2 页面巡检（浏览器控制台）

逐条切换 hash 路由并检查是否出现「页面加载失败 / 接口不存在」：

```js
(async () => {
  const routes = ['#/','#/products','#/product/cloud-ecs','#/cart','#/checkout','#/login','#/register',
    '#/announcements','#/help','#/user','#/user/servers','#/user/orders','#/user/bills','#/user/tickets',
    '#/user/realname','#/user/security','#/user/apikeys','#/user/notifications','#/user/profile','#/user/theme',
    '#/admin','#/admin/users','#/admin/products','#/admin/orders','#/admin/tickets','#/admin/finance',
    '#/admin/announcements','#/admin/settings','#/admin/logs'];
  const out = [];
  for (const r of routes) {
    location.hash = r;
    await new Promise(s => setTimeout(s, 650));
    const bad = /页面加载失败|接口不存在|加载失败/.test(document.querySelector('#app').innerText);
    out.push({ r, ok: !bad });
  }
  console.table(out);
})();
```

### 5.3 主题回归检查项

1. 后台切预设，背景与强调色即时变化，出现「有未保存修改」提示；
2. 拖动玻璃不透明度，数值标签与卡片观感即时变化；
3. 保存后 `GET /api/config` 返回新值；刷新前台，`--glass-alpha` 与 `--accent` 生效；
4. 切浅色/深色：文字仍可读（浅色模式背景被提亮）、按钮文字对比度正常；
5. 用户中心「恢复管理员默认」后 `localStorage['zjmf:mode']` 为空，回到管理员模式；
6. 移动端 390px 宽度下无横向滚动（`document.documentElement.scrollWidth === clientWidth`）。

### 5.4 回归范围

| 模块 | 用例 |
| --- | --- |
| 认证 | 注册校验、登录、错误密码、禁用账号、忘记密码取码重置 |
| 产品 | 分类筛选、关键词搜索、slug 详情、推荐位 |
| 交易 | 加购合并、改数量、删除、结算余额支付、支付结果页订单号/金额、取消订单 |
| 用户中心 | 开机/关机/重启、续费扣款、充值申请、工单对话（用户端↔后台）、实名提交、改密、密钥轮换/停用、通知已读 |
| 后台 | 用户增删改禁、产品 CRUD、订单状态流转、工单回复、充值审核入账、公告 CRUD、主题保存、站点信息保存、上传背景 |
| 视觉 | 深浅色、透明度、预设、移动端三套布局 |

---

## 6. 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 所有 `/api/xxx/{id}` 返回 `404 接口不存在` | 路由 `{param}` 未编译为正则（历史缺陷，已修） | 确认 `api/lib/router.php` 有 `compile()` |
| 页面白屏、控制台 404 静态资源 | 未带 `router.php` 启动 | `php -S ... router.php` |
| 样式改动不生效 | 浏览器缓存 | 提升 `index.html` 中 `?v=` 版本号并硬刷新 |
| `?v=` 未变但文件已改 | CDN/代理缓存 | 同步升级 `version.json` |
| 后台提示 `options.rows.join is not a function` | `UI.table` 传入字符串（历史缺陷，已兼容） | 升级到 v1.4.0+ |
| 写入数据失败 | `data/` 不可写 | 放开目录权限 |
| 图片背景不显示 | 地址不在允许前缀 | 用 `http(s)://`、`/uploads/` 或上传 |
| 中文乱码 | 未走 `respond()` | 统一用 `respond` 输出（已设 UTF-8） |

---

## 7. 部署

### 7.1 Nginx 参考

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/zjmf-glass-ui-1117;
    index index.html;

    location /api/ {
        try_files $uri /api/index.php$is_args$args;
        fastcgi_pass 127.0.0.1:9000;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root/api/index.php;
    }

    location /assets/ { expires 7d; }
    location /uploads/ { expires 7d; }

    location ~ ^/data/ { deny all; }

    location / { try_files $uri /index.html; }
}
```

### 7.2 上线检查

1. `version.json` 与 `index.html` 的 `?v=` 一致；
2. `data/`、`uploads/` 可写且不被外网直读；
3. 删除演示数据或重置为主题默认（`data/settings.json`）；
4. 修改演示账号密码，或接入真实用户体系；
5. 建议为 `api/` 增加限流与 HTTPS。

---

## 8. Git 与版本

- 分支：`main`（当前本地为 `master`，可按需重命名）。
- 提交粒度：一个功能/一次修复一条提交，信息格式 `feat|fix|docs|style: 说明 (vX.Y.Z)`。
- 升版流程：
  1. 改 `version.json`（`version` + `updatedAt`）；
  2. 同步 `index.html` 中全部 `?v=`；
  3. 更新 `CHANGELOG.md` 与 `log.md`；
  4. 提交并推送。
- 版本号展示：前台页脚右下 `.version-badge`、后台顶栏右上，均读取 `/api/config` 的 `version`（服务端读取 `version.json`）。

---

## 9. 后续可扩展方向

1. 真实支付网关（支付宝当面付 / 微信 Native）与异步回调；
2. 邮件/短信通道（找回密码、工单提醒）替换 `demoCode`；
3. JSON 存储换 MySQL/PostgreSQL，并给列表接口加分页；
4. 资源监控真实数据接入（当前 `metrics` 为演示曲线）；
5. 多语言（i18n 文案表）与主题导入/导出 JSON。
