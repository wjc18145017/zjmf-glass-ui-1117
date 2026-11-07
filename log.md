# 开发日志（log.md）

工程：`zjmf-glass-ui-1117`（智简魔方 · 玻璃拟态主题工程）
记录规则：每一步写清「路径与文件、修改了什么、执行了什么命令、目的、结果」。
时间均为本机本地时间（Asia/Shanghai，2026-11-07）；跨步骤的区间为整理时按文件时间戳回溯，精确到分钟级。

---

## 步骤 01 · 工程骨架与入口

- 时间：16:05 - 16:12
- 路径/文件：`index.html`、`router.php`、`favicon.svg`、`.gitignore`、`version.json`
- 修改：建立 SPA 外壳（`#app`、背景层 `#app-bg`、`#modal-root`、`#toast-root`），首屏内联主题引导脚本；编写 PHP 内置服务器路由（`/api/*` → `api/index.php`，`/assets|/uploads` 静态直出，其余回落 `index.html`）；写入版本号初值。
- 命令：无（创建文件）
- 目的：提供单一入口与可运行的静态/接口分流。
- 结果：`php -S 127.0.0.1:8899 router.php` 可正常打开首页。

## 步骤 02 · 设计令牌与基础样式

- 时间：16:10 - 16:20
- 路径/文件：`assets/css/tokens.css`、`base.css`
- 修改：定义字体/字号/间距/圆角/层级/动效令牌；深色与浅色两套文字与表面变量；背景层（渐变、图片、遮罩、光斑、噪点）与排版工具类。
- 目的：把视觉参数集中，避免页面散落硬编码颜色。
- 结果：两套模式基础对比度达标，后续组件全部引用令牌。

## 步骤 03 · 通用组件库

- 时间：16:15 - 16:25
- 路径/文件：`assets/css/components.css`、`assets/js/icons.js`、`assets/js/ui.js`
- 修改：玻璃卡（`.glass/.glass--strong/.glass--flat/.glass--glow`）、按钮 8 种变体、输入/开关/分段/标签页/胶囊/徽章/状态点/表格/指标/头像/弹窗/轻提示/空状态/骨架屏；`Icons.get()` 内联 SVG 图标库；`UI` 工具（toast/modal/confirm/table/empty/格式化）。
- 目的：页面只组合组件，保证一致性；全站零 emoji。
- 结果：组件在深浅两模式下均可用；图标均为内联 SVG。

## 步骤 04 · 后端基础设施

- 时间：16:18 - 16:30
- 路径/文件：`api/index.php`、`api/lib/store.php`、`api/lib/helpers.php`、`api/lib/auth.php`、`api/lib/router.php`、`api/lib/services.php`
- 修改：单入口加载与异常处理；JSON 存储（首次自动从 `api/seed` 播种、临时文件 + rename 原子写、`update()` 内 flock 读改写）；统一 `respond/respond_error`；Bearer token 签发与校验、`require_login/require_admin`；极简路由注册与 dispatch；主题归一化、产品/套餐查找、价格计算、支付开通等服务函数。
- 目的：不依赖框架与数据库，保证模板「下载即跑」。
- 结果：`/api/health` 返回 `{status:ok, version}`；后续接口均复用该层。

## 步骤 05 · 演示种子数据

- 时间：16:25 - 16:35
- 路径/文件：`api/seed/*.json`（users/products/orders/servers/carts/bills/recharges/tickets/announcements/help/notifications/apikeys/logs/tokens/settings）
- 修改：写入演示账号（admin/admin123、demo/demo123）、8 个云产品与套餐、历史订单与服务器、账单、工单、公告、帮助分类、通知、设置（含主题默认与 4 套预设）。
- 目的：所有页面首次打开即有真实可交互数据。
- 结果：`data/` 首次访问自动生成 15 个 JSON。

## 步骤 06 · 前台页面

- 时间：16:35 - 17:10
- 路径/文件：`assets/js/pages/front.js`、`assets/css/pages.css`、`assets/js/app.js`、`assets/js/api.js`、`assets/js/store.js`
- 修改：Hash 路由与布局渲染（站点头/页脚、用户中心、后台）；前台页面：首页（Hero、推荐、价格方案、公告、页脚）、产品列表、产品详情与购买配置、购物车、结算、支付结果、登录/注册/找回、公告列表/详情、帮助中心、404/403/500。
- 目的：覆盖前台完整转化路径。
- 结果：路由可切换，页面结构完整；购买配置可选可用区/系统/周期/数量。

## 步骤 07 · 用户中心页面

- 时间：17:00 - 17:35
- 路径/文件：`assets/js/pages/user.js`、`assets/css/layout.css`
- 修改：用户侧栏与 12 个页面：概览、服务器列表/详情/控制台（开机/关机/重启/重装）、订单列表/详情、账单与充值、工单列表/新建/对话、实名认证、账户安全、API 密钥、消息通知、个人资料、外观偏好。
- 目的：用户自助管理闭环。
- 结果：侧栏布局在桌面正常；移动端后续单独修复（见步骤 10）。

## 步骤 08 · 管理后台页面

- 时间：17:20 - 17:55
- 路径/文件：`assets/js/pages/admin.js`、`assets/css/admin.css`
- 修改：后台侧栏与顶栏、仪表盘（指标卡 + 趋势 + 最近订单/工单）、用户管理、产品与套餐、订单、工单、财务充值审核、公告、系统设置（站点/主题/商务）、操作日志。
- 目的：后台可完成日常运营操作。
- 结果：列表与详情可用；主题编辑器控件齐全（预设/模式/背景/玻璃/强调色/上传）。

## 步骤 09 · 路由与接口缺陷修复

- 时间：17:35 - 17:50
- 路径/文件：`api/lib/router.php`、`api/lib/services.php`、`api/routes/public.php`
- 修改：`Router` 新增 `compile()`，把 `{param}` 转成命名捕获组（原实现把 `{`/`}` 当正则量词，导致所有带参路由 404）；`product_find()` 增加 slug 回退；产品详情 `related` 增加同类为空时的兜底，并补 `slug` 字段。
- 命令：`Invoke-RestMethod http://127.0.0.1:8899/api/products/cloud-ecs`
- 目的：修复产品详情、订单、服务器等全部带参接口。
- 结果：接口恢复 200；产品详情可用 slug 访问，相关推荐不为空。

## 步骤 10 · 表格与支付结果页修复

- 时间：17:50 - 18:05
- 路径/文件：`assets/js/ui.js`、`assets/js/pages/admin.js`、`assets/js/pages/front.js`、`api/routes/commerce.php`
- 修改：`UI.table` 兼容字符串/数组行（修复后台仪表盘 `options.rows.join is not a function`）；新增 `UI.payMethod()`，后台订单显示「余额支付/支付宝/微信支付」；支付结果页统一取 `order.no || order.orderNo`、`order.amount ?? order.total`；`order_for_user()` 支持按订单号查询。
- 命令：`Invoke-RestMethod http://127.0.0.1:8899/api/orders/ZJ202611070009 -Headers $h`
- 目的：修复支付结果页「订单不存在 / ¥0 / 待支付」错位。
- 结果：支付成功后可正确显示订单号与金额；后台订单支付方式为中文。

## 步骤 11 · 深浅色自适应

- 时间：18:00 - 18:12
- 路径/文件：`assets/js/theme.js`
- 修改：新增 `luminance()`、`blend()`、`adaptBg()`、`adaptAccent()`；`paintBackground()` 按模式调整纯色/渐变/遮罩颜色，图片层加亮度；强调色按模式压暗或提亮并同步 `--accent/--accent-2/--accent-soft/--accent-glow/--accent-ink`。
- 目的：修复浅色模式下「深底浅字」不可读。
- 结果：切换深/浅色后背景与强调色自动校正，正文对比度可读。

## 步骤 12 · 移动端与布局修复

- 时间：18:05 - 18:18
- 路径/文件：`assets/css/layout.css`、`assets/css/pages.css`、`assets/css/admin.css`
- 修改：`.dash-side { min-width: 0 }`；≤1024px 网格改 `minmax(0,1fr)`；隐藏 `.dash-nav` 滚动条；Header 改隐藏 `.header-user__name`（原规则误隐藏头像）；≤720px 隐藏 Hero 浮动卡与后台品牌 chip；指标卡 sparkline 改流式；`.pay-method` 标题/描述改块级；认证页页脚图标 `inline-flex` 防换行。
- 命令：浏览器 390×844 视口检查 `document.documentElement.scrollWidth`
- 目的：消除移动端横向溢出、文字重叠与换行错位。
- 结果：用户中心 `scrollWidth == clientWidth == 380`；首页与后台无横向滚动。

## 步骤 13 · 静态资源缓存与版本号

- 时间：18:12 - 18:30
- 路径/文件：`index.html`、`version.json`、`assets/js/pages/user.js`
- 修改：所有 CSS/JS 引用加 `?v=1.4.0`；版本升到 1.4.0；用户中心主题页文案修正（「玻璃不透明度」、预设名兜底「自定义主题」）。
- 命令：硬刷新后读取 `getComputedStyle(document.documentElement).getPropertyValue('--glass-alpha')`
- 目的：解决样式改动不生效（旧缓存）与文案不一致。
- 结果：新样式即时生效；主题页描述准确。

## 步骤 14 · 全站路由巡检

- 时间：18:20 - 18:28
- 路径/文件：浏览器控制台（无文件改动）
- 修改：无
- 命令：逐条设置 `location.hash`，间隔 650ms，检查 `#app` 文本是否含「页面加载失败 / 接口不存在」
- 目的：确认 37 条前端路由与带参接口全部可用。
- 结果：37 条全部 `ok`。

## 步骤 15 · 端到端交易与后台实测

- 时间：18:20 - 18:32
- 路径/文件：无文件改动（数据落 `data/*.json`）
- 修改：无
- 命令：Puppeteer 点击加购 → 购物车改数量 → 结算选余额支付 → 确认下单；后台执行新增用户/删除用户、充值审核通过、工单回复、保存站点信息
- 目的：验证「交互真实可用」而非静态稿。
- 结果：订单 9 创建成功、余额扣减、服务器开通、支付结果页显示 `¥99` 与订单号；后台新增用户后可删除（`DELETE /admin/users/5` code=0）；充值单入账并进入审核记录；工单跨端回复一致；`PUT /admin/settings/site` 返回 code=0。

## 步骤 16 · 主题实时预览与持久化实测

- 时间：18:28 - 18:36
- 路径/文件：`assets/js/pages/admin.js`（无新增改动，验证已实现逻辑）
- 修改：无
- 命令：Puppeteer 点击预设「极光」→ 拖动玻璃不透明度 0.5→0.9 → 点击保存 → 刷新前台 → 读取 CSS 变量；用户中心点击「恢复管理员默认」
- 目的：验证主题「实时预览 + 保存持久化 + 前台生效 + 用户可重置」。
- 结果：预览即时变化且出现 dirty 提示；保存后 `GET /api/config` 返回 `preset=custom, alpha=0.9`；前台 `--glass-alpha:0.9`、`--accent:#7cf0d0` 生效；重置后 `zjmf:mode=null`、`data-mode=dark`。

## 步骤 17 · 首个 Git 提交

- 时间：18:38 - 18:42
- 路径/文件：全仓库
- 修改：`git init`，`.gitignore` 忽略 `data/*.json`、`data/*.lock`、`uploads/*`
- 命令：`git init` → `git add` → `git commit -m "feat: 智简魔方玻璃拟态主题工程骨架、前台/用户中心/后台页面与 PHP 演示服务 (v1.4.0)"`
- 目的：建立版本基线，便于后续小粒度提交与云端备份。
- 结果：提交 `d322f8d`，1 个提交；CRLF 警告无碍。

## 步骤 18 · 文档批次（接口/设计规范）

- 时间：18:45 - 19:05
- 路径/文件：`docs/api.md`、`docs/design-system.md`、`.gitignore`、`data/.gitkeep`、`uploads/.gitkeep`
- 修改：新增 77 条接口文档（统一响应、错误码、鉴权、每接口参数/返回/示例、主题字段附录、数据集合附录、PowerShell/curl 示例）；新增设计规范（设计令牌、玻璃配方、组件清单、响应式、无障碍、预设主题、版本号规范）；`.gitignore` 增加 `!/data/.gitkeep`，补齐两个 `.gitkeep` 以消除未跟踪目录噪声。
- 命令：`git add .gitignore data/.gitkeep uploads/.gitkeep docs/api.md docs/design-system.md` → `git commit -m "docs: 补充接口文档(77 条路由)与设计规范(design tokens/玻璃配方/组件清单) v1.4.0"`
- 目的：交付完整接口文档与视觉规范。
- 结果：提交 `e67ae8f`，5 个文件、1072 行新增；`git status` 无未跟踪噪声。

---

## 步骤 19 · README 与开发文档

- 时间：19:05 - 19:15
- 路径/文件：`README.md`、`docs/development.md`、`CHANGELOG.md`、`log.md`
- 修改：README（快速开始、演示账号、37 条页面路由表、主题能力与生效逻辑、目录结构、文档索引、已知边界）；开发文档（架构与请求链路、后端/前端分层、数据模型、扩展指引、主题引擎数据流与关键函数、测试方法、常见问题排查、Nginx 部署、版本流程）；CHANGELOG 补 v1.5.0 与 v1.4.0；本日志。
- 命令：`git add README.md CHANGELOG.md log.md docs/development.md` → `git commit -m "docs: 新增 README、开发文档、CHANGELOG 与开发日志 v1.4.0"`
- 目的：交付可维护的开发文档与版本记录。
- 结果：提交 `460ff33`，4 个文件、748 行新增。

## 步骤 20 · 版本升至 1.5.0

- 时间：19:15 - 19:20
- 路径/文件：`version.json`、`index.html`、`README.md`、`docs/api.md`、`docs/design-system.md`、`docs/development.md`、`CHANGELOG.md`
- 修改：`version.json` → `1.5.0`（更新时间 2026-11-07 19:20:00）；`index.html` 全部静态资源 `?v=1.4.0` → `?v=1.5.0`；四份文档版本号同步；CHANGELOG 增加 v1.5.0 条目。
- 命令：`git add -A` → `git commit -m "chore: 版本升至 1.5.0（文档交付）"`
- 目的：文档交付属于一次功能更新，按规则升版并保持页面版本号一致。
- 结果：见提交记录；页脚/后台顶栏读取 `/api/config` 即显示 v1.5.0。

---

## 待续

- 步骤 21：重置演示数据与主题回默认，PHP 本地服务复测（health、关键接口、页面截图）
- 步骤 22：GitHub 仓库 `zjmf-glass-ui-1117` 创建与推送（若无 `gh`/凭证则记录阻塞）
