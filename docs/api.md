# 智简魔方 Glass UI · 接口文档

版本：1.5.1
服务入口：`http(s)://<host>/api`
数据格式：`application/json; charset=utf-8`（请求与响应均为 JSON，`Cache-Control: no-store`）

---

## 1. 通用约定

### 1.1 统一响应结构

所有接口返回同一外壳，业务成功与否以 `code` 判断：

```json
{ "code": 0, "message": "ok", "data": {} }
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | int | 0 表示成功；非 0 为业务错误码，数值与 HTTP 状态码一致 |
| message | string | 提示文案，可直接展示给用户 |
| data | any | 业务数据；失败时为 `null` 或附加信息 |

### 1.2 错误码

| code | HTTP | 语义 | 典型场景 |
| --- | --- | --- | --- |
| 0 | 200 / 201 | 成功 | 正常返回 |
| 400 | 400 | 参数不合法 | 缺字段、格式错误、周期/配置非法、购物车为空 |
| 401 | 401 | 未登录或凭证失效 | 缺少 Authorization、token 过期、密码错误 |
| 403 | 403 | 无权限 | 非管理员访问 `/admin/*`、访问他人订单、账号被禁用 |
| 404 | 404 | 资源不存在 | 产品/套餐/公告/订单/工单/服务器不存在、路由未注册（message 为「接口不存在」） |
| 409 | 409 | 状态冲突 | 用户名/邮箱重复、订单状态不可支付或不可取消 |
| 422 | 422 | 业务校验失败 | 库存不足、验证码无效或过期 |
| 500 | 500 | 服务端异常 | 未捕获异常，已写入 PHP error_log |

### 1.3 鉴权

- 登录/注册成功后返回 `token`（随机 48 位十六进制字符串），服务端落库于 `data/tokens.json`。
- 后续请求需带请求头：

```
Authorization: Bearer <token>
```

- 令牌无固定过期时间，退出登录（`POST /auth/logout`）、重置密码、管理员禁用账号时会失效。
- 角色：`user`（普通用户）、`admin`（管理员，可访问全部 `/admin/*` 与任意用户订单）。
- 密码以 `password_hash(PASSWORD_BCRYPT)` 存储，响应中的用户对象会自动剔除 `password_hash`。

### 1.4 权限标记

下文中：
- `公开` — 无需登录
- `登录` — 需要有效 token
- `管理员` — token 对应角色为 admin

### 1.5 演示账号

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| admin | admin123 | 管理员 |
| demo | demo123 | 普通用户 |

### 1.6 分页与筛选

本工程为模板演示，列表接口一次性返回全量数据，统一返回 `{ items: [], total: n }`（部分接口附带 `categories`）；筛选通过 query 参数完成，不做分页参数。

---

## 2. 公共接口（公开）

### 2.1 `GET /api/`

服务自检。

- 返回：`{ service, time }`

### 2.2 `GET /api/health`

健康检查，供部署脚本探测。

- 返回：`{ status: "ok", time, version }`，`version` 读取根目录 `version.json`。

### 2.3 `GET /api/config`

全站公开配置，前台首屏调用；主题即由此下发。

- 参数：无
- 返回：

```json
{
  "site": { "name": "智简魔方", "slogan": "...", "phone": "...", "email": "...", "icp": "..." },
  "theme": { "preset": "deepsea", "mode": "dark", "background": {}, "glass": {}, "accent": {} },
  "presets": {
    "morning": { "label": "晨雾", "desc": "浅色背景上的低对比玻璃，适合日间办公", "theme": {} },
    "deepsea": { "label": "深海", "desc": "深蓝海面与青色高光，默认主题", "theme": {} },
    "polar": { "label": "极夜", "desc": "近黑底色与紫粉辉光，夜间低光环境", "theme": {} },
    "aurora": { "label": "极光", "desc": "墨绿极夜中透出极光青绿，冷色调", "theme": {} }
  },
  "commerce": { "terms": [ { "months": 1, "factor": 1, "label": "1 个月" } ], "currency": "CNY" },
  "version": "1.5.0",
  "demo": true
}
```

- 说明：`theme` 已经过 `theme_normalize()` 归一化（字段见附录 A）；`presets` 是以预设 id 为键的对象（`morning/deepsea/polar/aurora`），每项含 `label`、`desc`、`theme`，供前台/后台主题选择器遍历使用。

### 2.4 `GET /api/products`

产品列表。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| category | query | string | 否 | 分类 id；`all` 或留空为全部 |
| q | query | string | 否 | 关键词，匹配名称/标语/描述 |
| recommended | query | string | 否 | 传 `1` 只返回首页推荐产品 |

- 返回：`{ items: [], categories: [{ id, name, count }], total }`
- 每条产品含 `minPrice`（最低套餐月价）与 `planCount`，列表接口不返回 `description`。

### 2.5 `GET /api/products/{id}`

产品详情。`{id}` 支持数字 id 或 `slug`（如 `cloud-ecs`）。

- 返回：完整产品对象 + `related[]`（最多 3 条，同分类优先，不足时补充其它产品）+ `rating` + `sold`
- 错误：`404 产品不存在或已下架`

### 2.6 `GET /api/announcements`

公告列表。

- 返回：`{ items: [{ id, title, category, pinned, views, createdAt, excerpt }], categories: [], total }`
- 排序：置顶优先，其后按 `createdAt` 倒序；`excerpt` 为正文去除标记后的前 96 字。

### 2.7 `GET /api/announcements/{id}`

公告详情，同时 `views + 1`。

- 返回：公告完整对象（含 Markdown 风格 `content`）
- 错误：`404 公告不存在`

### 2.8 `GET /api/help`

帮助中心：分类 + 条目。

- 返回：`{ categories: [{ id, name, icon, articles: [{ id, title, content }] }] }`

---

## 3. 认证接口

### 3.1 `POST /api/auth/login`（公开）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 用户名或邮箱，大小写不敏感 |
| password | string | 是 | 明文密码 |

- 返回：`{ token, user }`
- 错误：`400 请输入账号与密码`、`401 账号或密码错误`、`403 该账户已被禁用`

### 3.2 `POST /api/auth/register`（公开）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 3-20 位字母/数字/下划线 |
| email | string | 是 | 合法邮箱 |
| password | string | 是 | 6-32 位 |
| name | string | 否 | 昵称，≤20 字，缺省取用户名 |

- 返回：`{ token, user }`；同时写入站内欢迎通知
- 错误：`400` 格式校验、`409 该用户名已被注册` / `409 该邮箱已被注册`

### 3.3 `POST /api/auth/forgot`（公开）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 注册邮箱 |

- 返回：`{ sent: true, demoCode, message }`
- 说明：演示环境不发送真实邮件，直接把 6 位验证码放在 `demoCode`；验证码有效期 30 分钟。邮箱未注册时 `demoCode` 为空串，避免账号枚举。

### 3.4 `POST /api/auth/reset`（公开）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| email | string | 是 | 注册邮箱 |
| code | string | 是 | 6 位验证码 |
| password | string | 是 | 新密码 6-32 位 |

- 返回：`{ message: "密码已重置，请重新登录" }`
- 副作用：该用户全部 token 失效
- 错误：`422 验证码无效或已过期`、`404 账户不存在`

### 3.5 `GET /api/auth/me`（登录）

- 返回：`{ user, unread, cartCount, isAdmin }`，前台用来恢复登录态、角标计数。

### 3.6 `POST /api/auth/logout`（公开）

- 行为：删除当前 Bearer token（无 token 也返回成功）
- 返回：`{ message: "已退出登录" }`

---

## 4. 购物车与订单

### 4.1 购物车对象

```json
{
  "items": [
    {
      "key": "md5(productId|planId|region|os|months)",
      "productId": 1, "slug": "cloud-ecs", "name": "弹性云服务器",
      "planId": "p2", "planName": "2 核 4G",
      "region": "华东-上海", "os": "Ubuntu 22.04",
      "months": 1, "qty": 2, "unitPrice": 99, "amount": 198,
      "stock": 12, "thumb": "/assets/img/product-1.svg"
    }
  ],
  "count": 2, "total": 198
}
```

`count` 为数量合计（用于角标），`total` 为金额合计。

### 4.2 `GET /api/cart`（登录）

- 返回：购物车对象；条目金额按当前套餐价与周期系数重算，价格变动实时反映。

### 4.3 `POST /api/cart`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| productId | int | 是 | 产品 id |
| planId | string | 是 | 套餐 id |
| region | string | 否 | 缺省取产品首个可用区 |
| os | string | 否 | 缺省取产品首个系统 |
| months | int | 否 | 仅允许 1/3/6/12，默认 1 |
| qty | int | 否 | 1-10，默认 1 |

- 行为：相同（产品+套餐+可用区+系统+周期）合并数量，上限 10
- 返回：购物车对象
- 错误：`404` 产品/套餐不存在、`400` 可用区/系统/周期非法、`422 库存不足，当前仅剩 N 台`

### 4.4 `PUT /api/cart`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| key | string | 是 | 条目 key |
| qty | int | 是 | 1-10 |

- 返回：购物车对象；错误 `400 数量需在 1-10 之间`、`404 购物车条目不存在`

### 4.5 `DELETE /api/cart/{key}`（登录）

- 返回：删除后的购物车对象

### 4.6 `DELETE /api/cart`（登录）

- 行为：清空购物车，返回空购物车对象

### 4.7 `POST /api/orders`（登录）

创建订单。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| items | array | 否 | 直接下单条目数组（结构同购物车条目）；不传则结算整车 |
| payWithBalance | bool | 否 | `true` 时创建后立即用余额支付并开通 |
| remark | string | 否 | 订单备注 |

- 单价计算：`套餐月价 × term_factor(months) × qty`，`term_factor` 来自 `settings.commerce.terms`
- 返回：订单对象（HTTP 201），含 `no`（形如 `ZJ202611070009`）与 `statusText`
- 错误：`400 订单中没有可结算的商品` / `购物车为空`、`404` 产品/套餐不存在、`422` 库存不足

### 4.8 `GET /api/orders`（登录）

| 参数 | 位置 | 说明 |
| --- | --- | --- |
| status | query | 订单状态筛选，`all` 或留空为全部 |

- 返回：`{ items: [], total }`，每条附 `statusText`、`itemCount`，按创建时间倒序

### 4.9 `GET /api/orders/{id}`（登录）

`{id}` 支持订单 id 或订单号 `no`。

- 返回：订单对象 + `statusText` + `servers[]`（该订单开通的服务器）
- 错误：`404 订单不存在`、`403 无权查看该订单`

### 4.10 `POST /api/orders/{id}/pay`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| method | string | 否 | `balance`（默认）/`alipay`/`wechat` |

- 行为：状态置 `paid`、写 `paidAt`、开通服务器（`servers` 与 `bills` 同步写入）、记录日志与通知
- 返回：更新后的订单对象
- 错误：`409 该订单当前状态不可支付：xxx`、`400 不支持的支付方式`、余额不足时 `422`

### 4.11 `POST /api/orders/{id}/cancel`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| reason | string | 否 | 取消原因，缺省「用户主动取消」 |

- 返回：`{ id, status: "cancelled", statusText: "已取消" }`
- 错误：`409 仅待支付订单可以取消`

### 4.12 订单状态枚举

| status | statusText | 说明 |
| --- | --- | --- |
| pending | 待支付 | 创建后默认 |
| paid | 已支付 | 支付完成、资源已开通 |
| cancelled | 已取消 | 用户取消或超时关闭 |
| refunded | 已退款 | 后台状态流转 |

---

## 5. 用户中心

### 5.1 `GET /api/servers`（登录）

- 返回：`{ items: [], total }`；每条含 `id, name, productId, planName, ip, region, os, status, expireAt, cpu, memory, disk, bandwidth, trafficUsed, trafficTotal, orderNo`

### 5.2 `GET /api/servers/{id}`（登录）

- 返回：服务器详情，额外含 `metrics`（24 个时间点的 CPU/内存/带宽曲线）与 `actions` 可用操作
- 错误：`404 服务器不存在`、`403` 非本人资源

### 5.3 `POST /api/servers/{id}/power`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| action | string | 是 | `start` / `stop` / `reboot` / `reinstall` |

- 返回：`{ id, status, lastAction, at }`；`reinstall` 会重置系统标记
- 错误：`400 不支持的操作`

### 5.4 `POST /api/servers/{id}/renew`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| months | int | 是 | 1/3/6/12 |

- 行为：按套餐月价 × 系数扣减余额、顺延 `expireAt`、写入账单与日志
- 返回：更新后的服务器对象
- 错误：`400 计费周期不可用`、余额不足 `422`

### 5.5 `GET /api/bills`（登录）

- 返回：`{ items: [], recharges: [], balance, totalRecharge, totalConsume }`；`items` 为消费/充值流水（`id, no, type(consume/recharge), amount, status, method, createdAt, remark`），`recharges` 为充值单，`balance` 为当前余额。

### 5.6 `POST /api/recharge`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| amount | number | 是 | 充值金额，1-50000 |
| method | string | 否 | `alipay` / `wechat` / `bank` |

- 行为：生成充值单（状态 `reviewing`），进入后台「财务审核」
- 返回：`{ id, no, amount, status, statusText }`
- 错误：`400 充值金额需在 1-50000 元之间`

### 5.7 `GET /api/tickets`（登录）

- 返回：`{ items: [], total }`；字段 `id, no, title, category, priority, status, createdAt, updatedAt, replies`

### 5.8 `POST /api/tickets`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| title | string | 是 | 标题，4-60 字 |
| category | string | 否 | 分类，默认「其他问题」 |
| priority | string | 否 | `low` / `normal` / `high` / `urgent`，默认 normal |
| content | string | 是 | 首条内容，10-2000 字 |

- 返回：新建工单对象（HTTP 201）
- 错误：`400 工单标题需为 4-60 个字符` / `400 问题描述需为 10-2000 个字符`

### 5.9 `GET /api/tickets/{id}`（登录）

- 返回：工单详情 + `replies[]`（`{ id, role(user/admin), author, content, at }`）
- 错误：`404 工单不存在`、`403` 非本人工单

### 5.10 `POST /api/tickets/{id}/reply`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| content | string | 是 | 回复内容 |

- 行为：追加回复、工单状态回到 `processing`、给管理员端写入未读
- 返回：更新后的工单对象
- 错误：`409 工单已关闭，无法回复`

### 5.11 `POST /api/tickets/{id}/close`（登录）

- 返回：`{ id, status: "closed" }`

### 5.12 `GET /api/user/realname`（登录）

- 返回：`{ status, name(masked), idno(masked), at, note }`

### 5.13 `POST /api/user/realname`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 真实姓名 |
| idno | string | 是 | 18 位身份证号 |
| phone | string | 否 | 联系手机 |

- 行为：状态置 `pending`（后台可审核为 `verified`/`rejected`）
- 返回：实名信息对象；错误 `400 姓名或证件号格式不正确`、`409 已提交，请勿重复提交`

### 5.14 `GET /api/user/security`（登录）

- 返回：`{ twofa, lastPasswordChange, sessions: [{ id, device, ip, at, current }] }`

### 5.15 `POST /api/user/security/password`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| oldPassword | string | 是 | 当前密码 |
| newPassword | string | 是 | 新密码 6-32 位 |

- 行为：改密后除当前 token 外全部失效
- 错误：`400 原密码不正确`、`400 新密码长度需在 6-32 位之间`

### 5.16 `POST /api/user/security/twofa`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| enabled | bool | 是 | 开启/关闭两步验证 |

- 返回：`{ twofa }`

### 5.17 `DELETE /api/user/sessions/{id}`（登录）

- 行为：踢出指定会话（撤销对应 token），不能删除当前会话以外的他人会话
- 返回：`{ message: "该会话已下线" }`

### 5.18 `GET /api/user/apikeys`（登录）

- 返回：`{ items: [{ id, name, key(masked), scopes, enabled, createdAt, lastUsedAt }], total }`

### 5.19 `POST /api/user/apikeys`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 名称，≤20 字 |
| scopes | array | 否 | 权限范围，如 `["server:read","server:power"]` |

- 返回：`{ id, name, key, ... }`；**仅创建时返回完整 key**，之后一律脱敏
- 错误：`400 请填写密钥名称`

### 5.20 `DELETE /api/user/apikeys/{id}`（登录）

- 返回：`{ message: "密钥已删除" }`

### 5.21 `POST /api/user/apikeys/{id}/rotate`（登录）

- 行为：重新生成密钥，返回新 key（完整）
- 返回：密钥对象

### 5.22 `POST /api/user/apikeys/{id}/toggle`（登录）

- 行为：启用/停用
- 返回：`{ id, enabled }`

### 5.23 `GET /api/notifications`（登录）

- 返回：`{ items: [{ id, type, title, content, read, at, link }], unread, total }`

### 5.24 `POST /api/notifications/read`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | int \| null | 否 | 指定消息 id；不传则全部已读 |

- 返回：`{ unread }`

### 5.25 `GET /api/user/profile`（登录）

- 返回：用户资料对象（含 `credits`、`realname`、`security`）

### 5.26 `PUT /api/user/profile`（登录）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 否 | 昵称 |
| email | string | 否 | 邮箱，需唯一 |
| phone | string | 否 | 手机号 |

- 返回：更新后的用户对象；错误 `409 该邮箱已被占用`

### 5.27 `GET /api/user/summary`（登录）

- 返回：`{ servers, activeServers, orders, pendingOrders, tickets, openTickets, balance, unread, monthSpend, trafficUsed, trafficTotal }`

---

## 6. 后台接口（管理员）

> 全部需要 `管理员` 权限，否则 `403 需要管理员权限`。所有写操作都会写入 `logs`（操作日志）。

### 6.1 `GET /api/admin/stats`

- 返回：仪表盘指标

```json
{
  "userTotal": 4, "userActive": 4,
  "orderTotal": 8, "orderPaid": 6, "revenue": 1734.00,
  "serverTotal": 7, "serverRunning": 5,
  "ticketOpen": 3, "pendingRecharges": 1,
  "revenueChart": [ { "date": "2026-11-01", "revenue": 0 } ],
  "recentOrders": [],
  "serverStatus": { "running": 5, "stopped": 2, "expired": 1 }
}
```

- 说明：`revenueChart` 固定返回最近 7 天（含当天）的已支付金额；`recentOrders` 为最近 6 条订单；`serverStatus` 用于服务器状态分布图。

### 6.2 `GET /api/admin/users`

| 参数 | 位置 | 说明 |
| --- | --- | --- |
| q | query | 用户名/邮箱/昵称模糊搜索 |
| status | query | `active` / `disabled` |
| role | query | `user` / `admin` |

- 返回：`{ items, total }`（用户对象自动脱敏）

### 6.3 `POST /api/admin/users`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 3-20 位 |
| email | string | 是 | 合法邮箱 |
| password | string | 否 | 默认 `demo123456` |
| name | string | 否 | 昵称 |
| role | string | 否 | `user` / `admin` |

- 返回：新用户对象（HTTP 201）；错误 `409` 重复、`400` 校验

### 6.4 `PUT /api/admin/users/{id}`

任意字段可选：`name, email, phone, status, role, credits, realnameStatus`

- 行为：`credits` 为余额绝对值覆盖；`realnameStatus` 可置 `verified/unverified/rejected`
- 限制：不能把当前登录管理员自己禁用（`400 不能禁用当前登录的管理员`）
- 返回：更新后的用户对象

### 6.5 `DELETE /api/admin/users/{id}`

- 限制：不能删除自己（`400 不能删除当前登录的管理员`）
- 返回：`{ message: "用户已删除" }`

### 6.6 `GET /api/admin/products`

- 返回：`{ items }`，全量产品（含下架产品、套餐与库存、分类字段）

### 6.7 `POST /api/admin/products`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 产品名称 |
| category | string | 是 | 分类 id |
| categoryName | string | 否 | 分类中文名 |
| tagline | string | 否 | 一句话标语 |
| slug | string | 否 | URL 标识，缺省自动生成 |
| description | string | 否 | 详情描述 |
| plans | array | 否 | 套餐数组，缺省给出一条默认套餐 |
| regions / os | array | 否 | 可用区 / 操作系统 |

- 返回：新产品质量对象（HTTP 201）

### 6.8 `PUT /api/admin/products/{id}`

- 请求体同上，按字段增量更新；`plans` 整体替换
- 返回：更新后的产品

### 6.9 `DELETE /api/admin/products/{id}`

- 返回：`{ message: "产品已删除" }`

### 6.10 `GET /api/admin/orders`

| 参数 | 位置 | 说明 |
| --- | --- | --- |
| status | query | 订单状态 |
| q | query | 订单号 / 用户名 / 产品名 |

- 返回：`{ items, total, summary: { pending, paid, revenue } }`

### 6.11 `POST /api/admin/orders/{id}/status`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| status | string | 是 | `pending` / `paid` / `cancelled` / `refunded` |

- 行为：置为 `paid` 时触发开通与账单；置为 `refunded` 时退回余额
- 返回：更新后的订单对象

### 6.12 `GET /api/admin/tickets`

| 参数 | 位置 | 说明 |
| --- | --- | --- |
| status | query | `open` / `processing` / `closed` |

- 返回：`{ items, total, counts }`（`counts` 为各状态计数）

### 6.13 `GET /api/admin/tickets/{id}`

- 返回：工单 + 用户信息 + `replies[]`

### 6.14 `POST /api/admin/tickets/{id}/reply`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| content | string | 是 | 回复内容 |

- 行为：以 `admin` 角色追加回复，通知用户
- 返回：更新后的工单

### 6.15 `POST /api/admin/tickets/{id}/status`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| status | string | 是 | `open` / `processing` / `closed` |

- 返回：`{ id, status }`

### 6.16 `GET /api/admin/recharges`

- 返回：`{ items, total, summary: { pending, approved, amount } }`

### 6.17 `POST /api/admin/recharges/{id}/review`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| status | string | 是 | `approved`（通过并入账）/ `rejected` |
| note | string | 否 | 审核备注 |

- 行为：`approved` 时给用户余额加值并写入账单与通知
- 返回：充值单对象；错误 `409 该充值单已审核`

### 6.18 `GET /api/admin/announcements`

- 返回：`{ items }`，按 `createdAt` 倒序，含正文

### 6.19 `POST /api/admin/announcements`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| title | string | 是 | 标题 |
| content | string | 是 | 正文 |
| category | string | 否 | 默认「产品公告」 |
| pinned | bool | 否 | 是否置顶 |

- 返回：新公告（HTTP 201）

### 6.20 `PUT /api/admin/announcements/{id}`

- 字段同 6.19，均为可选
- 返回：更新后的公告

### 6.21 `DELETE /api/admin/announcements/{id}`

- 返回：`{ message: "公告已删除" }`

### 6.22 `GET /api/admin/logs`

| 参数 | 位置 | 说明 |
| --- | --- | --- |
| level | query | `info` / `warning` / `error` |
| q | query | 操作名/详情/用户名关键词 |

- 返回：`{ items: [{ id, userId, userName, action, detail, ip, level, at }], total }`

### 6.23 `GET /api/admin/settings`

- 返回：`{ site, theme, presets, commerce, smtp, payment }` 全量设置

### 6.24 `PUT /api/admin/settings/theme`

保存主题，前台轮询/刷新即生效（`/api/config` 同源读取）。

请求体可以是完整主题对象，也可以包裹在 `theme` 字段里：

```json
{
  "theme": {
    "preset": "custom",
    "mode": "dark",
    "background": { "type": "gradient", "color": "#04121d", "from": "#04121d", "to": "#0b3550", "angle": 140, "image": "", "blur": 0, "veil": 0.2, "veilColor": "#03111a" },
    "glass": { "alpha": 0.9, "blur": 20, "border": 0.3, "glow": 0.4, "radius": 20, "shadow": 0.5, "saturation": 1.5 },
    "accent": { "primary": "#3fd0c9", "secondary": "#58a6ff" }
  }
}
```

- 行为：服务端 `theme_normalize()` 逐字段校验与钳制（非法值回退默认），落盘 `data/settings.json`
- 返回：`{ theme }`（归一化后的最终值，前端以此为准刷新预览）
- 错误：`400 主题数据格式不正确`

### 6.25 `PUT /api/admin/settings/site`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name / slogan / phone / email / icp / address | string | 否 | 站点信息，按需传 |

- 返回：`{ site }`

### 6.26 `POST /api/admin/upload`

上传背景图（主题图片背景）。

- 请求：`multipart/form-data`，字段名 `file`
- 限制：仅 `jpg/jpeg/png/webp/gif`，≤2MB
- 返回：`{ url: "/uploads/xxx.png", name, size }`
- 错误：`400 未选择文件` / `400 仅支持 jpg/jpeg/png/webp/gif` / `400 文件大小不能超过 2MB`

---

## 附录 A：主题对象字段

| 路径 | 类型 | 范围 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| preset | string | 预设 id / `custom` | `custom` | 当前预设标识 |
| mode | enum | `dark` `light` `system` | `dark` | 默认色彩模式 |
| background.type | enum | `solid` `gradient` `image` | `gradient` | 背景类型 |
| background.color | hex | `#rrggbb` | `#04121d` | 纯色背景 |
| background.from / to | hex | `#rrggbb` | `#04121d` / `#0b3550` | 渐变起止色 |
| background.angle | int | 0-360 | 140 | 渐变角度（deg） |
| background.image | string | URL / `/uploads/...` / `data:image/` | `""` | 图片背景 |
| background.blur | number | 0-40 | 0 | 背景模糊（px） |
| background.veil | number | 0-0.9 | 0.2 | 遮罩浓度 |
| background.veilColor | hex | `#rrggbb` | `#03111a` | 遮罩颜色 |
| glass.alpha | number | 0.25-0.95 | 0.48 | 玻璃不透明度 |
| glass.blur | number | 0-40 | 20 | 玻璃模糊半径（px） |
| glass.border | number | 0-0.9 | 0.3 | 边框透明度 |
| glass.glow | number | 0-0.9 | 0.4 | 光晕强度 |
| glass.radius | number | 0-40 | 20 | 卡片圆角（px） |
| glass.shadow | number | 0-1 | 0.5 | 阴影强度系数 |
| glass.saturation | number | 1-2.5 | 1.5 | 背景饱和度增强 |
| accent.primary | hex | `#rrggbb` | `#3fd0c9` | 主强调色 |
| accent.secondary | hex | `#rrggbb` | `#58a6ff` | 次强调色 |

预设 id：`mist`（晨雾，浅色）、`deepsea`（深海，深色，默认）、`polar`（极夜，深色）、`aurora`（极光，深色偏绿）。

## 附录 B：数据集合

| 集合 | 文件 | 说明 |
| --- | --- | --- |
| users | `data/users.json` | 用户、余额、实名、安全设置 |
| products | `data/products.json` | 产品、套餐、可用区、库存 |
| orders | `data/orders.json` | 订单与条目快照 |
| servers | `data/servers.json` | 已开通实例 |
| carts | `data/carts.json` | 按 userId 存购物车 |
| bills | `data/bills.json` | 消费/充值流水 |
| recharges | `data/recharges.json` | 充值单与审核状态 |
| tickets | `data/tickets.json` | 工单与回复 |
| announcements | `data/announcements.json` | 公告 |
| help | `data/help.json` | 帮助中心 |
| notifications | `data/notifications.json` | 站内消息 |
| apikeys | `data/apikeys.json` | API 密钥（脱敏展示） |
| logs | `data/logs.json` | 操作日志 |
| tokens | `data/tokens.json` | Bearer 令牌 |
| password_resets | `data/password_resets.json` | 重置验证码 |
| settings | `data/settings.json` | 站点/主题/预设/商务/支付 |

## 附录 C：调用示例（PowerShell）

```powershell
# 健康检查
Invoke-RestMethod http://127.0.0.1:8899/api/health

# 登录并取 token
$r = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8899/api/auth/login `
  -ContentType 'application/json' -Body '{"username":"demo","password":"demo123"}'
$h = @{ Authorization = "Bearer $($r.data.token)" }

# 读取购物车
Invoke-RestMethod http://127.0.0.1:8899/api/cart -Headers $h

# 加入购物车
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8899/api/cart -Headers $h `
  -ContentType 'application/json' -Body '{"productId":1,"planId":"p2","region":"华东-上海","os":"Ubuntu 22.04","months":1,"qty":1}'

# 管理员保存主题
$adm = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8899/api/auth/login `
  -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}'
$ah = @{ Authorization = "Bearer $($adm.data.token)" }
Invoke-RestMethod -Method Put -Uri http://127.0.0.1:8899/api/admin/settings/theme -Headers $ah `
  -ContentType 'application/json' -Body '{"theme":{"preset":"custom","glass":{"alpha":0.8}}}'
```

curl 等价写法：

```bash
curl -s -X POST http://127.0.0.1:8899/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demo123"}'
```
