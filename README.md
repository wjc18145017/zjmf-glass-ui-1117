# 智简魔方 · 玻璃拟态主题工程（ZJMF Glass UI）

一套可直接运行的 IDC / 云服务站点模板：**毛玻璃（glassmorphism）视觉 + 完整前台 / 用户中心 / 管理后台 + PHP 演示数据服务**。
无构建步骤、无第三方前端依赖、无框架，下载即跑。

- 界面版本：**v1.4.0**
- 技术栈：PHP 7.4（内置服务器即可）+ 原生 JavaScript（Hash 路由 SPA）+ 原生 CSS（设计令牌驱动）
- 数据存储：JSON 文件（`data/*.json`），首次访问自动从 `api/seed` 播种
- 主题：管理员后台可视化配置（背景 / 玻璃 / 深浅色 / 强调色），保存后前台实时生效并持久化

---

## 1. 快速开始

### 1.1 环境要求

- PHP 7.4+（需开启 `json`、`mbstring`、`fileinfo` 扩展；Windows 官方包默认已含）
- 任意现代浏览器（Chrome / Edge / Safari / Firefox，需支持 `backdrop-filter`）

### 1.2 启动

在工程根目录执行（Windows 示例）：

```powershell
C:\BtSoft\php\74\php.exe -S 127.0.0.1:8899 router.php
```

macOS / Linux：

```bash
php -S 127.0.0.1:8899 router.php
```

打开 <http://127.0.0.1:8899/>。

`router.php` 负责：静态文件直出、`/api/*` 转发到 `api/index.php`、其余路径回落到 `index.html`（SPA）。

### 1.3 演示账号

| 账号 | 密码 | 角色 | 入口 |
| --- | --- | --- | --- |
| admin | admin123 | 管理员 | `#/admin` |
| demo | demo123 | 普通用户 | `#/user` |

### 1.4 重置演示数据

删除运行时数据后重新访问即可自动播种（恢复到出厂状态）：

```powershell
Remove-Item data\*.json, data\*.lock -Force
```

主题恢复默认：后台「系统设置 → 主题」点击「恢复默认」，或删除 `data/settings.json`。

---

## 2. 页面清单（37 条前端路由）

### 前台

| 路由 | 页面 |
| --- | --- |
| `#/` | 首页：Hero、产品推荐、价格方案、公告、页脚 |
| `#/products` | 产品列表（分类筛选、搜索） |
| `#/product/:slug` | 产品详情 + 购买配置（可用区/系统/周期/数量） |
| `#/cart` | 购物车（改数量、删除、合计） |
| `#/checkout` | 结算下单（余额/支付宝/微信） |
| `#/pay/result` | 支付结果（成功/失败/待支付） |
| `#/login` `#/register` `#/forgot` | 登录 / 注册 / 找回密码 |
| `#/announcements` `#/announcements/:id` | 公告列表 / 详情 |
| `#/help` | 帮助中心 |
| `#/404` `#/500` `#/403` | 错误页、权限不足 |

### 用户中心

| 路由 | 页面 |
| --- | --- |
| `#/user` | 概览（余额、服务器、订单、工单、流量） |
| `#/user/servers` `#/user/servers/:id` | 我的服务器 / 详情与 Web 控制台 |
| `#/user/orders` `#/user/orders/:no` | 订单列表 / 详情 |
| `#/user/bills` | 账单流水与充值 |
| `#/user/tickets` `#/user/tickets/:id` | 工单列表 / 新建 / 对话详情 |
| `#/user/realname` | 实名认证 |
| `#/user/security` | 账户安全（改密、两步验证、会话） |
| `#/user/apikeys` | API 密钥管理 |
| `#/user/notifications` | 消息通知 |
| `#/user/profile` | 个人资料 |
| `#/user/theme` | 外观偏好（深浅色覆盖、重置为管理员默认） |

### 管理后台

| 路由 | 页面 |
| --- | --- |
| `#/admin` | 仪表盘（指标、趋势、最近订单/工单） |
| `#/admin/users` | 用户管理（增删改、禁用、余额、实名状态） |
| `#/admin/products` | 产品与套餐（CRUD、库存、上下架） |
| `#/admin/orders` | 订单管理（筛选、状态流转） |
| `#/admin/tickets` `#/admin/tickets/:id` | 工单管理 / 对话处理 |
| `#/admin/finance` | 财务：充值审核（通过入账/驳回） |
| `#/admin/announcements` | 公告 CRUD |
| `#/admin/settings` | 系统设置：站点信息、主题编辑器、商务参数 |
| `#/admin/logs` | 操作日志 |

---

## 3. 主题能力

### 3.1 管理员可配（`#/admin/settings` → 主题）

- 预设：晨雾（浅色）/ 深海 / 极夜 / 极光，一键套用
- 模式：深色 / 浅色 / 跟随系统（作为全站默认）
- 背景：纯色 / 渐变（起止色 + 角度）/ 图片（上传或填 URL），并可调模糊与遮罩浓度
- 玻璃：不透明度、模糊半径、边框透明度、光晕、圆角、阴影强度、饱和度
- 强调色：主色 / 次色（hex）
- 交互：所有控件**实时预览**（不刷新页面、不落库），点击「保存主题」才 `PUT /api/admin/settings/theme` 持久化；「放弃修改」回滚

### 3.2 前台生效逻辑

1. `App.boot()` 先读 `localStorage['zjmf:themeCache']` 应用主题（首屏防闪烁），再 `GET /api/config` 拉取服务端最新主题覆盖；
2. 管理员保存后，前台下次加载（或刷新）即应用新主题；打开中的页面通过 `BroadcastChannel('zjmf-theme')` 接收同步；
3. 用户可在 `#/user/theme` 覆盖深浅色（`localStorage['zjmf:mode']`），「恢复管理员默认」清除覆盖；
4. 浅色模式自动对暗背景提亮、深色模式自动对亮背景压暗（`adaptBg` / `adaptAccent`），避免出现「浅色模式深底浅字」的不可读组合。

---

## 4. 目录结构

```
zjmf-glass-ui-1117/
├─ index.html                # 唯一页面入口（SPA 外壳 + 首屏主题引导）
├─ router.php                # PHP 内置服务器路由：静态 / API / SPA 回落
├─ favicon.svg
├─ version.json              # 界面版本号（页脚与后台顶栏读取）
├─ api/
│  ├─ index.php              # API 入口（异常处理、路由挂载）
│  ├─ lib/
│  │  ├─ store.php           # JSON 存储：读写、flock、原子写、自动播种
│  │  ├─ helpers.php         # 响应封装、body/query、日志、通知、价格计算
│  │  ├─ auth.php            # Bearer token 签发/校验、require_login/require_admin
│  │  ├─ router.php          # 极简路由（{param} 编译为正则捕获组）
│  │  └─ services.php        # 主题归一化、产品/套餐查找、购物车、支付开通
│  ├─ routes/
│  │  ├─ public.php          # /config /products /announcements /help
│  │  ├─ auth.php            # 登录注册找回、/auth/me、登出
│  │  ├─ commerce.php        # 购物车、订单、支付、取消
│  │  ├─ account.php         # 用户中心全部接口
│  │  └─ admin.php           # 后台全部接口
│  └─ seed/                  # 演示数据（首次访问播种）
├─ assets/
│  ├─ css/
│  │  ├─ tokens.css          # 设计令牌
│  │  ├─ base.css            # 重置、背景层、排版
│  │  ├─ components.css      # 通用组件
│  │  ├─ layout.css          # 站点头、页脚、用户中心/后台框架
│  │  ├─ pages.css           # 前台页面级样式
│  │  └─ admin.css           # 后台专属样式
│  └─ js/
│     ├─ icons.js            # 内联 SVG 图标库（无 emoji）
│     ├─ api.js              # fetch 封装、token、统一错误处理
│     ├─ store.js            # 本地状态：登录态、购物车、通知计数
│     ├─ ui.js               # UI 工具：toast/modal/table/empty/格式化
│     ├─ theme.js            # 主题引擎：apply/preview/save/模式自适应
│     ├─ app.js              # Hash 路由、布局渲染、启动引导
│     └─ pages/
│        ├─ front.js         # 前台页面
│        ├─ user.js          # 用户中心页面
│        └─ admin.js         # 后台页面
├─ data/                     # 运行时 JSON（不纳入版本库）
├─ uploads/                  # 主题背景上传目录（不纳入版本库）
└─ docs/
   ├─ api.md                 # 接口文档
   ├─ design-system.md       # 设计规范
   └─ development.md         # 开发与运维文档
```

---

## 5. 文档索引

| 文档 | 内容 |
| --- | --- |
| [docs/api.md](docs/api.md) | 77 条接口：路径、方法、权限、参数、返回、错误码、示例 |
| [docs/design-system.md](docs/design-system.md) | 设计令牌、玻璃配方、组件清单、响应式、无障碍 |
| [docs/development.md](docs/development.md) | 架构说明、扩展指引、调试与测试、部署 |
| [CHANGELOG.md](CHANGELOG.md) | 版本变更记录 |
| [log.md](log.md) | 开发过程逐步记录（路径/文件/修改/命令/目的/结果） |

---

## 6. 已知边界

- 演示环境，不接真实支付网关：支付宝/微信下单即视为成功，充值单需后台审核入账。
- 邮件、短信不真实发送；找回密码验证码直接在 `POST /api/auth/forgot` 的 `demoCode` 返回。
- JSON 文件存储适合模板演示与中小数据量；生产环境建议替换 `api/lib/store.php` 为数据库实现（接口层无需改动）。
- 未实现多语言与真实发票/合同流程。
