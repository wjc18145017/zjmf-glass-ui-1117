# 变更记录（CHANGELOG）

版本号规则：`MAJOR.MINOR.PATCH`，本工程按「页面批次 / 功能交付 / 缺陷修复」升 `MINOR`，纯修复升 `PATCH`。

---

## v1.5.1 — 2026-11-07

### 修复（文档与接口实测对齐）

- `docs/api.md` 校正 `GET /config` 的 `presets` 结构（以 `morning/deepsea/polar/aurora` 为键的对象，含 `label/desc/theme`）。
- 校正 `GET /admin/stats` 实际字段（`userTotal/userActive/orderTotal/orderPaid/revenue/serverTotal/serverRunning/ticketOpen/pendingRecharges/revenueChart/recentOrders/serverStatus`）。
- 校正 `GET /bills`（`items/recharges/balance/totalRecharge/totalConsume`）、`GET /admin/products` 与 `GET /admin/announcements`（仅 `items`）。
- 校正充值限额为 1-50000 元、工单标题 4-60 字与描述 10-2000 字校验。
- 设计规范中预设 id 由 `mist` 更正为 `morning`。

### 测试

- PHP 7.4 本地服务实测：health/config/products/产品 slug/公告/帮助/登录/加购/下单支付/订单详情/servers/bills/后台 stats/tickets/users/products/announcements/logs/主题保存与校验/主题恢复/首页 200 与 `?v=1.5.1` 全部通过。
- 测试后清空 `data/*.json`，恢复出厂种子数据。

---

## v1.5.0 — 2026-11-07

### 文档

- 新增 `README.md`：快速开始、演示账号、37 条页面路由、主题能力、目录结构、文档索引、已知边界。
- 新增 `docs/api.md`：77 条接口全量（统一响应、错误码、鉴权、参数、返回、示例、主题字段与数据集合附录）。
- 新增 `docs/design-system.md`：设计令牌、玻璃配方、组件清单、响应式断点、无障碍、预设主题、版本号规范。
- 新增 `docs/development.md`：架构与分层、本地运行、扩展指引（新增接口/页面/集合、换数据库）、主题引擎数据流、测试方法与常见问题、Nginx 部署参考。
- 新增 `CHANGELOG.md` 与根目录 `log.md`（逐步记录路径/文件/修改/命令/目的/结果）。
- `.gitignore` 增加 `!/data/.gitkeep`，补齐 `data/.gitkeep`、`uploads/.gitkeep`。

### 工程

- 界面版本号升至 1.5.0，`index.html` 全部静态资源版本同步为 `?v=1.5.0`。

---

## v1.4.0 — 2026-11-07

### 新增

- 工程骨架：SPA 外壳（`index.html`）、PHP 内置服务器路由（`router.php`）、版本号文件（`version.json`）。
- 设计令牌与视觉体系：`tokens.css / base.css / components.css / layout.css / pages.css / admin.css`。
- 内联 SVG 图标库（`icons.js`），全站零 emoji。
- 前台 13 个页面：首页、产品列表、产品详情与购买配置、购物车、结算、支付结果、登录/注册/找回、公告列表与详情、帮助中心、错误页。
- 用户中心 12 个页面：概览、服务器列表/详情/控制台、订单、账单充值、工单、实名、安全、API 密钥、通知、资料、外观偏好。
- 管理后台 9 个页面：仪表盘、用户、产品、订单、工单、财务审核、公告、系统设置（含主题编辑器）、操作日志。
- PHP API 77 条路由，统一 `{code,message,data}` 响应；Bearer Token 鉴权；JSON 文件存储（原子写 + flock + 自动播种）。
- 主题引擎：4 套预设（晨雾/深海/极夜/极光）、背景三类（纯色/渐变/图片）、玻璃 7 项参数、深浅/跟随系统、实时预览、持久化、用户本地覆盖与重置、跨标签同步。
- 深浅色自适应：`adaptBg` / `adaptAccent`，切换模式自动校正背景亮度与强调色对比度。
- 文档：`docs/api.md`、`docs/design-system.md`、`docs/development.md`、`README.md`、本文件、`log.md`。

### 修复

- 路由 `{param}` 未编译为正则导致 `/products/{id}` 等 404（新增 `Router::compile()`）。
- `product_find` 支持 slug，产品详情可直接用 `cloud-ecs` 访问。
- 后台仪表盘 `options.rows.join is not a function`（`UI.table` 兼容字符串行）。
- 指标卡 sparkline 绝对定位压住文字（改流式条带）。
- 支付结果页订单号/金额字段错位（前后端字段对齐，`/orders/{id}` 支持订单号）。
- 浅色模式文字不可读（模式自适应背景提亮/压暗）。
- 移动端：Hero 浮动卡遮挡标题、Header 用户按钮被压成竖条、用户中心横向溢出、导航滚动条、后台顶栏 chip 换行。
- 静态资源缓存导致样式不生效（全部加 `?v=1.4.0`）。
- 用户中心主题页泄漏内部 id、文案误写「玻璃透明度」。

### 测试

- 37 条前端路由自动巡检：全部通过，无「页面加载失败 / 接口不存在」。
- 端到端：加购 → 购物车 → 结算余额支付 → 订单创建、扣款、服务器开通 → 支付结果页显示订单号与金额。
- 后台：用户新增/删除、充值审核入账、工单跨端回复一致、站点信息保存。
- 主题：预设切换、透明度实时预览、保存后 `/api/config` 与前台 CSS 变量一致、用户重置覆盖生效。
- 移动端 390px：`scrollWidth === clientWidth`，无横向溢出。

---

## v1.3.0 — 2026-11-07

- 管理后台：主题编辑器（预设、模式、背景、玻璃参数、强调色、上传背景、保存/放弃）、站点信息、商务参数。
- 用户中心：外观偏好页（模式覆盖与重置）。
- 后台 CRUD：用户、产品、公告；订单状态流转；充值审核；工单对话。

## v1.2.0 — 2026-11-07

- 用户中心全部页面与接口：服务器控制台/续费、账单充值、工单、实名、安全、密钥、通知、资料、概览。
- 三套布局（public / user / admin）与移动端适配。

## v1.1.0 — 2026-11-07

- 前台全部页面：首页、产品、购买配置、购物车、结算、支付结果、认证、公告、帮助。
- 购物车与订单接口、余额支付与服务器开通逻辑。

## v1.0.0 — 2026-11-07

- 工程骨架、设计令牌、组件库、图标库、PHP API 基础（路由、存储、鉴权）、主题引擎初版。
