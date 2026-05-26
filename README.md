# NetWorthLens

基于 React 19 + TanStack Start + Tailwind CSS v4 + shadcn/ui 的全栈财富管理前端，配合 FastAPI 后端使用。

## 技术栈

- **框架**: React 19 + TanStack Start v1 (App Router / File-based routing)
- **构建**: Vite 7
- **样式**: Tailwind CSS v4 + shadcn/ui (Emerald Prestige 主题)
- **字体**: Space Grotesk (标题) / DM Sans (正文)
- **状态管理**: Zustand
- **数据请求**: TanStack Query + ky
- **表单**: react-hook-form + zod
- **图表**: Recharts
- **加密**: WebCrypto RSA-OAEP (SHA-256)

## 功能概览

- 登录 / 注册（账号 / 手机号 / 邮箱，密码或验证码登录）
- JWT 双 Token（access + refresh）自动续期
- 密码字段全局 RSA 加密上送（公钥按 `biz` 维度缓存 1 小时）
- 受保护路由 `_authenticated` 布局与侧边栏导航
- 资产、投资、交易、目标、仪表盘等页面骨架

## 目录结构

```
src/
  routes/                # 文件路由
    __root.tsx           # 根布局
    index.tsx            # 落地页
    login.tsx / signup.tsx
    _authenticated.tsx   # 受保护布局
    _authenticated/      # 鉴权后的子路由
  components/            # 业务组件 + shadcn/ui
  lib/
    api.ts               # ky 实例 + 统一响应处理 + 自动刷新 token
    auth-context.tsx     # 登录态 Provider
    crypto.ts            # RSA 加密工具
  stores/
    rsa-key-store.ts     # 公钥缓存 (zustand)
  styles.css             # 设计令牌 (OKLCH)
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
