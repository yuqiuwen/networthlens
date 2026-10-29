# Finora

> **Your Wealth, In Focus.**

Finora is a modern personal finance management platform that helps you organize financial accounts, analyze assets, track investment portfolios, and achieve financial goals with AI-powered insights.

Finora 是一款现代化个人财务管理平台，集账户管理、资产分析、投资持仓追踪、财务目标规划和 AI 智能助手于一体，帮助用户清晰掌握财务状况，更从容地规划未来。

前端基于 React 19 + TanStack Start + Tailwind CSS v4 + shadcn/ui，配合 FastAPI 后端使用。

## 技术栈

- **框架**: React 19 + TanStack Start v1 (App Router / File-based routing)
- **构建**: Vite 7
- **样式**: Tailwind CSS v4 + shadcn/ui（Emerald Prestige 主题）
- **字体**: Inter（西文 / 数字）+ 思源黑体（中文，Google Fonts 上的 Noto Sans SC）
- **状态管理**: Zustand
- **数据请求**: TanStack Query + ky
- **表单**: react-hook-form + zod
- **图表**: Recharts
- **加密**: WebCrypto RSA-OAEP (SHA-256)

## 品牌规范

| 项目 | 值 |
| --- | --- |
| 产品名 | Finora（仅英文，无中文名） |
| Slogan | Your Wealth, In Focus. |
| 标识青绿 | `#1FB4A1`（仅标识使用，不参与 UI 主题） |
| 标识藏青 | `#151B33`（仅标识使用，不参与 UI 主题） |
| UI 主题色 | Emerald Prestige，定义在 `src/styles.css` 的 `:root` / `.dark` |
| 圆角 | `--radius: 1rem`，卡片用 `rounded-2xl` + `shadow-soft` |
| 数字 | 全局 `font-variant-numeric: tabular-nums`（金额等宽对齐） |

标识由两条 Γ 形粗笔画叠成字母 F，被一段大半径圆弧斜切成上下两半 —— 上半为标识青绿、下半为标识藏青。
几何数据是从设计稿逐像素反推得到的，**不要凭感觉修改 `src/components/logo.tsx` 里的路径数字**，改动前先跑像素比对。

## 功能概览

- 登录 / 注册（账号 / 手机号 / 邮箱，密码或验证码登录）
- JWT 双 Token（access + refresh）自动续期，登录态失效自动清理并回到登录页
- 密码字段全局 RSA 加密上送（公钥按 `biz` 维度缓存 1 小时）
- 受保护路由 `_authenticated` 布局与侧边栏导航
- 财务概览：总资产趋势、资产结构、收支与储蓄率
- 账户管理 / 资产管理 / 现金流管理（支持微信、支付宝账单导入与自动归类）
- 财务目标规划：目标金额、期限、追加投入与达成预测
- AI 财务助手：自然语言查询账户、资产、现金流与目标进度
- 个人中心：昵称、头衔、简介、性别、生日与头像

> 投资持仓追踪仍在开发中（侧边栏与落地页均标注「开发中」）。

## 目录结构

```
src/
  routes/                # 文件路由
    __root.tsx           # 根布局（标题、描述、favicon、字体）
    index.tsx            # 落地页
    login.tsx / signup.tsx
    _authenticated.tsx   # 受保护布局
    _authenticated/      # 鉴权后的子路由
  components/
    logo.tsx             # 品牌标识（LogoMark / Logo / favicon）
    auth-card.tsx        # 登录注册页品牌侧栏
    ui/                  # shadcn/ui
  lib/
    api.ts               # ky 实例 + 统一响应处理 + 自动刷新 token
    auth-context.tsx     # 登录态 Provider
    crypto.ts            # RSA 加密工具
  stores/
    rsa-key-store.ts     # 公钥缓存 (zustand)
  styles.css             # 设计令牌 (OKLCH) + 字体 + 品牌 utility
```

## 环境变量

在项目根目录创建 `.env`：

```
VITE_API_BASE_URL=http://127.0.0.1:5555
```

## 后端约定

所有接口 HTTP 状态码均为 200，统一响应：

```json
{
  "code": 0,
  "msg": "successful",
  "data": {},
  "errmsg": ""
}
```

- `code === 0` 成功
- `code === 40001` 未认证（前端自动调用 `/v1/auth/refresh` 续期后重试）
- `code === 40003` 权限不足
- 其它非 0 取 `errmsg` 提示

### 关键接口

| 用途 | 方法 | 路径 |
| --- | --- | --- |
| 登录 | POST | `/v1/auth/login` |
| 注册 | POST | `/v1/auth/signup` |
| 刷新 Token | POST | `/v1/auth/refresh` |
| 获取 RSA 公钥 | POST | `/v1/secret/rsa_public_key` (body: `{ "biz": "user_pwd" }`) |

## 包管理器

项目支持 **pnpm / bun / npm**，推荐使用 **pnpm**。

`package.json` 中已声明：

```json
"packageManager": "pnpm@9.12.0"
```

### 使用 pnpm

```bash
# 安装 pnpm（如未安装）
npm i -g pnpm

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 预览构建产物
pnpm preview

# Lint / 格式化
pnpm lint
pnpm format
```

### 使用 bun

```bash
bun install
bun run dev
```

### 使用 npm

```bash
npm install
npm run dev
```

## 开发

```bash
pnpm dev
```

默认访问 http://localhost:8080，确保后端运行在 `http://127.0.0.1:5555`。

## 构建部署

```bash
pnpm build
```

产物输出到 `.output/`，可部署到 Cloudflare Workers（已内置 `@cloudflare/vite-plugin`）。

## License

MIT
