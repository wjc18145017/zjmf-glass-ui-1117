# 智简魔方 Glass UI · 设计规范（Design System）

版本：1.4.0
适用范围：前台站点、用户中心、管理后台三套布局共用的视觉语言与组件库。

---

## 1. 设计定位

关键词：玻璃质感、深空底色、克制的霓虹强调、清晰的信息层级。

- 底色承担「空间感」：渐变/图片背景 + 光斑 + 噪点，形成纵深；
- 玻璃层承担「结构感」：卡片、侧栏、顶栏用半透明 + 背景模糊 + 1px 高光边框分层；
- 强调色承担「操作感」：仅用于可点击元素、当前状态、关键数字，不铺大面积；
- 文字承担「可读性」：三级文字色分明，正文行高 1.68，避免玻璃层影响阅读。

参考气质来自 `qqnt-liuli-theme` 与 `dsh-liuli-ui-enhance`（玻璃层次、柔和光晕、紧凑控制条），但布局与信息架构为本工程自建（IDC/云服务场景），不复刻 IM 界面。

### 1.1 禁止项

- 禁止 emoji：所有图标使用内联 SVG（`assets/js/icons.js` 的 `Icons.get(name)`），保证跨平台一致、可换色。
- 禁止散落硬编码颜色：颜色必须来自 tokens.css 或运行时主题变量。
- 禁止用纯白/纯黑大面积填充：最亮用 `#edf3fb`，最暗用 `#04121d`。

---

## 2. 设计令牌（Design Tokens）

令牌集中在 `assets/css/tokens.css`，分「静态令牌」与「运行时主题变量」两类。

### 2.1 字体

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| --font-sans | Inter, HarmonyOS Sans SC, PingFang SC, Microsoft YaHei, system-ui | 全部正文与标题 |
| --font-mono | JetBrains Mono, Cascadia Code, SFMono-Regular, Consolas | 订单号、IP、密钥、金额等 |

### 2.2 字号阶梯

| 令牌 | 值 | 典型用途 |
| --- | --- | --- |
| --fs-2xs | 11px | 角标、表格次级说明 |
| --fs-xs | 12px | 辅助信息、按钮小号 |
| --fs-sm | 13px | 表格正文、导航、表单标签 |
| --fs-base | 14px | 按钮、常规正文 |
| --fs-md | 15px | 页面正文基准 |
| --fs-lg | 17px | 卡片标题 |
| --fs-xl | 20px | 区块小标题 |
| --fs-2xl | 26px | 页面标题 |
| --fs-3xl | 34px | 区块大标题 |
| --fs-4xl | 44px | 营销区标题 |
| --fs-hero | clamp(36px, 4.2vw, 58px) | 首页 Hero 主标题 |
| --fs-display | clamp(64px, 10vw, 132px) | 装饰性巨字 |

行高：`--lh-tight: 1.2`（标题）、`--lh-snug: 1.45`（紧凑段落）、`--lh-normal: 1.68`（正文）。

### 2.3 间距（4px 基数）

`--space-1` 4 / `--space-2` 8 / `--space-3` 12 / `--space-4` 16 / `--space-5` 20 / `--space-6` 24 / `--space-7` 32 / `--space-8` 40 / `--space-9` 48 / `--space-10` 56 / `--space-11` 64 / `--space-12` 80 / `--space-13` 104。

使用约定：
- 卡片内边距 `--space-5`（紧凑 `--space-4`）；
- 相邻卡片间距 `--space-5`；
- 区块上下留白 `--space-12`（移动端降到 `--space-9`）；
- 图标与文字间距 6-10px，不使用 0。

### 2.4 圆角

`--radius-xs` 6（输入框内元素）/ `--radius-sm` 10（按钮、小标签）/ `--radius-md` 14 / `--radius-lg` 20（卡片默认）/ `--radius-xl` 28（大面板）/ `--radius-pill` 999（胶囊按钮、徽章）。

卡片圆角由主题 `glass.radius` 覆盖（0-40）。玻璃卡片统一使用 `--radius-card`（默认取 `--radius-lg`）。

### 2.5 层级与动效

| 令牌 | 值 | 说明 |
| --- | --- | --- |
| --z-bg | -1 | 背景层 |
| --z-header | 100 | 站点头/后台顶栏 |
| --z-popover | 300 | 下拉、浮层 |
| --z-drawer | 500 | 移动端抽屉菜单 |
| --z-modal | 700 | 弹窗 |
| --z-toast | 900 | 轻提示 |
| --ease | cubic-bezier(0.22, 0.61, 0.36, 1) | 常规过渡 |
| --ease-out | cubic-bezier(0.16, 1, 0.3, 1) | 入场动画 |
| --dur-1 | 0.14s | 悬停 |
| --dur-2 | 0.26s | 展开/切换 |
| --dur-3 | 0.48s | 页面入场 |

`prefers-reduced-motion: reduce` 时全部动画降为 0.001ms。

### 2.6 结构尺寸

`--container` 1240px、`--container-narrow` 880px、`--header-h` 68px、`--sidebar-w` 248px（后台沿用同一宽度，内容区自适应）。

---

## 3. 色彩体系

### 3.1 语义文字与表面

| 变量 | 深色 | 浅色 | 用途 |
| --- | --- | --- | --- |
| --text-1 | #edf3fb | #101828 | 标题、主要数值 |
| --text-2 | #a4b3c9 | #475467 | 正文、说明 |
| --text-3 | #74849b | #667085 | 辅助、占位、时间 |
| --glass-rgb | 14,23,38 | 255,255,255 | 玻璃基色（配合 alpha） |
| --field-bg | rgba(6,12,22,.46) | rgba(255,255,255,.7) | 输入框底 |
| --surface-soft | 白 4.5% | 白 56% | 次级按钮底 |
| --surface-hover | 白 7.5% | 白 82% | 悬停底 |
| --line | 白 9% | 黑 10% | 分隔线 |

### 3.2 状态色（两套模式共用）

| 变量 | 值 | 用途 |
| --- | --- | --- |
| --success | #2fbf91 | 运行中、已支付、成功 |
| --warning | #e8a33d | 待处理、库存告警 |
| --danger | #ef6b6b | 失败、已过期、删除 |
| --info | #58a6ff | 提示、进行中 |

各自配套 `--*-soft`（14% 透明度）用于徽章底色。

### 3.3 强调色

由主题 `accent.primary/secondary` 运行时写入：

- `--accent`：主强调（按钮、激活态、链接）
- `--accent-2`：渐变次色
- `--accent-soft` / `--accent-glow` / `--accent-line`：半透明衍生
- `--accent-ink`：强调底上的文字色（自动取深色，保证对比）

模式自适配（`theme.js`）：
- 浅色模式下对暗背景提亮（`adaptBg` → 与白色混合 88%），对过亮强调色压暗（与 `#0a2233` 混合 50%）；
- 深色模式下对亮背景压暗（与 `#050b12` 混合 82%），对过暗强调色提亮（与白色混合 50%）。
保证「换模式不换背景配置」也能维持可读性。

---

## 4. 玻璃配方（Glass Recipe）

一个玻璃层由四部分构成，缺一不可：

1. 底色：`rgba(var(--glass-rgb), var(--glass-alpha))`
2. 模糊：`backdrop-filter: var(--glass-blur-value)`，即 `blur(var(--glass-blur)) saturate(var(--glass-sat))`
3. 边框：`1px solid rgba(255,255,255,var(--glass-border-alpha))`
4. 高光/阴影：`box-shadow: var(--glass-highlight), 0 18px 48px rgba(0,0,0,calc(.46*var(--glass-shadow)))`

层级变体：

| 类 | 说明 | 典型场景 |
| --- | --- | --- |
| .glass | 标准玻璃卡 | 内容卡片、面板 |
| .glass--strong | 更实的玻璃（alpha + 0.14） | 抽屉、顶栏滚动态、弹窗 |
| .glass--flat | 去模糊，仅半透明底 | 表格行内小块、嵌套层（避免模糊叠加发灰） |
| .glass--glow | 强调色边框光晕 | 推荐套餐、当前选中项 |
| .glass--accent | 强调色底 | 关键 CTA 区块 |

嵌套规则：玻璃卡内不再放 `.glass`，改用 `.glass--flat` 或纯 `--surface-soft`，避免二次模糊导致文字发糊。

---

## 5. 图标规范

- 全部来自 `assets/js/icons.js`，通过 `Icons.get('name', size)` 输出 `stroke` 风格 SVG，默认 `stroke-width: 1.6`（小尺寸 1.8）。
- 常用尺寸：16（行内）、19（图标按钮）、22（卡片标题）、28（空状态）。
- 图标颜色继承 `currentColor`，不单独写 fill。
- 有语义的图标必须配 `aria-hidden="true"` 或可读文本；纯图标按钮需 `aria-label`。
- 禁止使用 emoji、图片替代图标、字体图标。

---

## 6. 组件清单

`assets/css/components.css` 提供的公共组件：

| 组件 | 类名 | 说明 |
| --- | --- | --- |
| 玻璃卡 | .glass / .card / .card-head / .card-body / .card-foot | 标题区+内容区+底部操作 |
| 按钮 | .btn + .btn--primary / --soft / --ghost / --outline / --danger / --sm / --lg / --block / --icon | 主次分明；loading 有 .btn__spinner |
| 输入 | .input / .select / .textarea / .input-group / .input-affix / .field | 含 label、hint、error 态 |
| 开关 | .switch | 主题模式、两步验证 |
| 分段控制 | .segmented | 深浅色模式、图表周期 |
| 标签页 | .tabs | 公告分类、后台设置分组 |
| 筛选胶囊 | .chips / .chip / .chip__count | 产品分类筛选 |
| 徽章 | .badge + --accent/--success/--warning/--danger/--info/--neutral/--solid | 订单/工单/服务器状态 |
| 状态点 | .status-dot + --running/--stopped/--expired/--error | 服务器运行状态 |
| 表格 | .table-wrap / .table / .table--compact / .table-actions | 后台列表；窄屏横向滚动 |
| 指标 | .stat / .stat__value / .stat__icon / .stat__spark | 仪表盘四宫格 |
| 头像 | .avatar / --sm / --lg / --ring | 用户、工单回复 |
| 弹窗 | .modal / .modal__panel / .modal__head / .modal__body / .modal__foot | 确认、表单弹层 |
| 轻提示 | .toast-root / .toast | 成功/失败反馈，3s 自动消失 |
| 空状态 | .empty / .empty__icon / .empty__title | 列表无数据 |
| 骨架屏 | .skeleton | 加载占位（shimmer） |
| 提示条 | .alert + 语调变体 | 表单顶部说明、风险提示 |

页面级组件在 `assets/css/pages.css`（Hero、产品卡、购买配置、购物车、结算、支付结果、公告、帮助、认证页）与 `assets/css/admin.css`（后台框架、指标卡、主题编辑器）中。

---

## 7. 布局与响应式

三套布局：

| 布局 | 根类 | 组成 |
| --- | --- | --- |
| 公共页 | .site-header + .site-main + .site-footer | 站点头、内容、页脚（4 列） |
| 用户中心 | .dash | 左侧 `.dash-side`（248px）+ 右侧内容 |
| 管理后台 | .dash.dash--admin | 同结构，最大宽 1480px，顶栏带「管理后台」标识 |

断点：

| 断点 | 行为 |
| --- | --- |
| ≤1080px | 主站导航收进移动抽屉 `.mobile-nav` |
| ≤1024px | 用户中心/后台侧栏折叠为横向滚动导航，网格改单列 `minmax(0,1fr)` |
| ≤720px | 容器内边距降为 `--space-4`，区块留白降为 `--space-9`，隐藏 Hero 浮动卡与后台品牌 chip，页脚单列 |
| ≤480px | 按钮组纵向铺满，表格改卡片化展示（关键页面） |

防溢出规则：
- 网格子项统一 `min-width: 0`（尤其 `.dash-side`），滚动容器宽度不会被子项撑破；
- 横向滚动导航隐藏滚动条（`scrollbar-width: none` + `::-webkit-scrollbar { display:none }`）；
- 长订单号/密钥使用 `.mono` + `word-break: break-all`。

---

## 8. 可读性与无障碍

- 正文对比度目标 ≥ 4.5:1；辅助文字 ≥ 3:1；玻璃层上的文字额外用 `--text-1/2` 保证区分。
- 焦点态统一 `:focus-visible` 2px 强调色描边 + 2px 偏移，不依赖 hover。
- 交互元素最小点击区 38×38（移动端 44×44）。
- 状态不只靠颜色：徽章带文字、状态点带 `aria-label`。
- 表单错误同时给颜色与文案（`.field__hint` 变红并带图标）。
- 动效可被 `prefers-reduced-motion` 关闭。

---

## 9. 主题变量与模式

运行时由 `assets/js/theme.js` 写入 `document.documentElement`：

- 属性：`data-mode="dark|light"`、`data-bg-type="solid|gradient|image"`
- CSS 变量：`--bg-color / --bg-from / --bg-to / --bg-angle / --bg-image / --bg-blur / --bg-veil / --bg-veil-color / --bg-paint`、`--glass-alpha / --glass-blur / --glass-border-alpha / --glass-glow / --glass-shadow / --glass-sat`、`--accent / --accent-2 / --accent-soft / --accent-glow / --accent-ink`
- 存储：服务端 `settings.theme` 为管理员默认；`localStorage['zjmf:themeCache']` 为最近一次生效主题（首屏防闪烁）；`localStorage['zjmf:mode']` 为用户本地模式覆盖（可一键重置）。
- 预览：后台拖动滑块走 `Theme.preview()`，只改 CSS 变量不落库；点击保存才 `PUT /admin/settings/theme`。
- 跨标签：`BroadcastChannel('zjmf-theme')` 广播主题变更，其它标签实时同步。

---

## 10. 预设主题

| id | 名称 | 模式 | 背景 | 强调色 | 适用 |
| --- | --- | --- | --- | --- | --- |
| mist | 晨雾 | light | 浅灰蓝渐变 + 轻遮罩 | 青蓝深调 | 白天办公、明亮环境 |
| deepsea | 深海 | dark | #04121d → #0b3550 140° | #3fd0c9 / #58a6ff | 默认，通用 |
| polar | 极夜 | dark | 近黑冷灰渐变 | 冷蓝 | 数据中心、监控场景 |
| aurora | 极光 | dark | 深青绿渐变 | #7cf0d0 / #4bd2ff | 营销活动、强调页 |

管理员可在后台基于预设微调任意字段，保存后 `preset` 记为 `custom`（保留原始预设名展示在用户端说明里）。

---

## 11. 版本号展示规范

- 页脚右侧 `.version-badge` 显示 `v{version}`（读取 `version.json`，由 `App.boot()` 注入）。
- 后台顶栏右上角同步显示版本号。
- 每次功能更新：递增 `version.json` → 同步 `index.html` 中所有 `?v=` 静态资源版本 → 记录 `CHANGELOG.md` 与 `log.md`。
