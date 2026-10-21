# Sub-One Manager

> 🚀 基于 Vue 3 的现代化网络订阅管理与转换平台，专为 Cloudflare Pages 与轻量私有化容器打造。

[![GitHub Release](https://img.shields.io/badge/Release-v2.0.0-blue.svg)](https://github.com/binbankm/Sub-One/releases)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.5+-4FC08D?style=flat&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0+-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-Deploy-F38020?style=flat&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Docker Image](https://img.shields.io/badge/Docker-ghcr.io-2496ED?style=flat&logo=docker&logoColor=white)](https://github.com/binbankm/Sub-One/pkgs/container/sub-one)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**简体中文** | [English](README.en.md)

---

## 🌟 界面预览

![Sub-One Manager 仪表盘](images/1.png)

<details>
<summary>🖼️ 点击展开查看更多功能模块截图</summary>

### 🔐 账号登录与初始化

![登录界面](images/0.png)
*简洁安全的登录界面，首次部署自动引导创建管理员*

### 📋 订阅源管理

![订阅源管理](images/2.png)
*响应式网格布局，支持多订阅源批量管理与状态监控*

### 👥 订阅组聚合

![订阅组聚合](images/3.png)
*强大的聚合配置面板，支持多源节点重组与自定义节点过滤*

### ⚙️ 节点管理

![节点管理](images/4.png)
*独立节点展示与批量导入工具，支持多协议节点快速解析*

</details>

---

## ✨ 核心特性

| 模块 | 特性说明 |
| :--- | :--- |
| ⚡ **内置转换引擎** | 彻底摆脱对外部 Subconverter 依赖，解析与转换全在本地或 Worker 内完成，零隐私泄露风险、无第三方网络延迟 |
| 🔄 **双转换模式** | 支持内置极速内核与外部转换 API 双模式，兼顾极致安全性与深度定制需求 |
| 💾 **双存储引擎** | 原生适配 **Cloudflare KV**（毫秒级极速读取）与 **Cloudflare D1**（SQL 关系型数据库），后台支持一键无损平滑迁移 |
| 🔐 **现代化安全认证** | 告别繁琐易错的环境变量配置，内置开箱即用的管理员引导初始化与基于 SHA-256 + JWT Token 的安全认证 |
| 🔗 **短链与分发** | 原生支持短链接生成与多协议客户端适配，订阅分发更加整洁高效 |
| 📱 **全终端响应式** | 基于 Vue 3 + Tailwind CSS 构建，完美适配桌面宽屏、平板与手机移动端，支持精美深色主题 |

---

## 🚀 部署指南

本项目支持 **Cloudflare Pages（云端无服务器，推荐）** 与 **Docker（私有 VPS）** 两种部署方案。

### 方案 A：Cloudflare Pages 部署（推荐·全免费·全球加速）

无需购买服务器，利用 Cloudflare 边缘网络全球极速分发。

#### 1. Fork 仓库

点击项目右上角的 **Fork** 按钮，将本仓库复制到您的个人 GitHub 账号下。

#### 2. 在 Cloudflare 中创建 Pages 项目

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 导航至 **Workers & Pages** → **Pages**。
3. 点击 **创建应用程序** → 选择 **连接到 Git**。
4. 选择刚刚 Fork 的 `Sub-One` 仓库，并在构建配置中设置：
   - **框架预设**：`Vue`
   - **构建命令**：`npm run build`
   - **构建输出目录**：`dist`
   - **根目录**：留空即可（默认为根路径）

#### 3. 配置存储绑定（关键步骤）

本项目支持 KV 与 D1 存储，初次使用必须绑定 KV：

##### 绑定 KV 命名空间（必需）

1. 在 Cloudflare 控制台中进入 **Workers & Pages** → **KV**，点击 **创建命名空间**，填写名称（例如 `sub-one-kv`）。
2. 返回刚创建的 Pages 项目，进入 **设置** → **函数** → **KV 命名空间绑定** → 点击 **添加绑定**：
   - **变量名称**：`SUB_ONE_KV`（*必须严格大写且完全一致*）
   - **KV 命名空间**：选择刚才创建的命名空间。

##### 绑定 D1 数据库（可选，适合海量节点与 SQL 查询需求）

1. 进入 **Workers & Pages** → **D1** → **创建数据库**，数据库名称填 `sub-one-d1`。
2. 在该数据库的 **控制台 (Console)** 标签页中执行 `db/init.sql` 中的 SQL 脚本以初始化数据表结构：

   ```sql
   CREATE TABLE IF NOT EXISTS storage (
       key TEXT PRIMARY KEY,
       value TEXT NOT NULL,
       updated_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_updated_at ON storage(updated_at);
   CREATE INDEX IF NOT EXISTS idx_key_prefix ON storage(key);
   INSERT OR REPLACE INTO storage (key, value, updated_at)
   VALUES ('_db_initialized', '"true"', strftime('%s', 'now') * 1000);
   ```

3. 返回 Pages 项目的 **设置** → **函数** → **D1 数据库绑定** → 点击 **添加绑定**：
   - **变量名称**：`SUB_ONE_D1`（*必须完全一致*）
   - **D1 数据库**：选择刚创建的 D1 数据库。

> [!TIP]
> 配置完成后，在管理后台的 **设置** → **存储后端** 即可随时在 KV 与 D1 之间自由切换。切换时系统会自动迁移全部订阅源、配置与用户数据，无需人工导表！

#### 4. 首次访问与初始化

1. 部署完成后，访问分配的 `https://your-project.pages.dev` 域名。
2. 系统检测到首次运行，将自动引导进入 **创建管理员账号** 页面。
3. 自定义用户名与密码（至少 6 位），点击提交即可直接登录管理系统。

---

### 方案 B：Docker / VPS 部署（轻量容器化）

适合拥有独立 VPS 并希望将数据存放在本地服务器的用户。数据将持久保存在本地 `./data/kv.json`。

#### 1. 使用 Docker Compose 一键启动（推荐）

下载预设的 `docker-compose.yml`：

```bash
# 下载配置文件
curl -O https://raw.githubusercontent.com/binbankm/Sub-One/main/docker-compose.yml

# 启动服务
docker-compose up -d
```

或手动编写 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  sub-one:
    image: ghcr.io/binbankm/sub-one:latest
    container_name: sub-one
    ports:
      - '3055:3055'
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    environment:
      - PORT=3055
      - TZ=Asia/Shanghai
```

#### 2. 使用 Docker Run 单行运行

```bash
docker run -d \
  --name sub-one \
  --restart unless-stopped \
  -p 3055:3055 \
  -v $(pwd)/data:/app/data \
  -e PORT=3055 \
  ghcr.io/binbankm/sub-one:latest
```

> [!IMPORTANT]
> 容器默认监听端口为 `3055`。务必挂载 `/app/data` 目录以确保持久化存储订阅和账号数据，避免容器更新或重启后数据丢失。

---

### 方案 C：本地开发与编译构建

```bash
# 1. 克隆代码仓库
git clone https://github.com/binbankm/Sub-One.git
cd Sub-One

# 2. 安装依赖包
npm install

# 3. 启动本地开发服务 (支持前端热更新)
npm run dev

# 4. 编译打包生产版本
npm run build

# 5. 预览生产版本
npm run preview
```

---

## 🏗️ 架构与目录结构

<details>
<summary>📁 点击展开查看完整源码架构树</summary>

```text
Sub-One/
├── src/                         # 前端工程源码
│   ├── assets/                 # 静态多媒体资源
│   ├── components/              # 通用业务与UI组件 (图表、编辑器、弹窗等)
│   ├── composables/            # Vue 组合式业务逻辑
│   ├── features/               # 核心功能模块 (Dashboard、Nodes、Profiles、Settings等)
│   ├── pages/                  # 顶层路由页面 (LoginPage, DashboardPage)
│   ├── stores/                 # Pinia 状态管理
│   ├── types/                  # 全局 TypeScript 类型声明
│   ├── utils/                  # 前端工具函数库
│   ├── App.vue                 # 根组件
│   └── main.ts                 # 前端入口文件
├── lib/                         # 后端核心业务逻辑库
│   └── backend/                # 纯 TypeScript 后端实现
│       ├── api/               # API 路由转发与处理器
│       ├── config/            # 全局常量与默认配置
│       ├── cron/              # 定时自动化任务
│       ├── proxy/             # 转换引擎 (核心 Parser 与 Converter)
│       ├── services/          # 数据与存储驱动 (KV, D1, JSON, Auth, Notification)
│       └── utils/             # 后端辅助工具库
├── docker/                     # 容器化适配脚本 (内置 Node.js 本地模拟环境)
├── functions/                  # Cloudflare Pages Functions 接口入口
├── images/                     # 文档演示截图
├── db/                         # D1 数据库初始化脚本 (init.sql)
├── wrangler.toml               # Cloudflare 配置文件
└── Dockerfile                  # 镜像构建定义
```

</details>

---

## 📝 版本更新历史 (v2.0)

- **⚡ 内置转换引擎**：彻底重构协议解析与生成底层逻辑，移除外部依赖，全面提升稳定性与安全性。
- **🔄 灵活双模转换**：内置转换支持高保真格式处理，同时保留外部自定义转换 API 接入能力。
- **🔐 全新账户鉴权**：废除繁杂的环境变量依赖，改用动态多用户管理与安全 JWT 校验机制。
- **🔗 原生短链接**：支持一键生成节点与聚合配置短链，方便导入各类主流客户端。
- **🏗️ 全模块化解耦**：前后端工程结构重构，清晰分离视图层与代理转换核心，便于社区协同维护。

---

## 🛠️ 常见问题排查 (FAQ)

<details>
<summary>❓ 遇到问题？点击展开常见解决方案</summary>

1. **首次部署打开后没有出现初始化界面？**
   - 检查 Cloudflare Pages 项目中环境变量/命名空间绑定变量名是否严格为 `SUB_ONE_KV`。
   - 打开浏览器开发者工具（F12），检查控制台网络请求是否有报错。
   - 清除浏览器缓存或在无痕模式下访问。

2. **忘记管理员用户名或密码怎么办？**
   - **Cloudflare Pages**：进入 Cloudflare 控制台 → **KV** → 选择您的命名空间，搜索并删除键名为 `sub_one_users_v1` 的数据项，刷新页面即可重新初始化管理员账号。
   - **Docker 部署**：删除挂载目录 `data/` 下对应的用户信息键值或直接重命名 `kv.json` 即可重新初始化。

3. **从 KV 切换至 D1 数据库报错？**
   - 确认是否已在 D1 控制台完整执行过 `db/init.sql` 初始化语句。
   - 确认 Pages 项目函数绑定中变量名称是否严格为 `SUB_ONE_D1`。

4. **构建编译失败 (Build Error)？**
   - 请确保 Node.js 版本 `>= 18.0.0`。
   - 尝试在本地清理依赖后重新构建：`rm -rf node_modules dist && npm install && npm run build`。

</details>

---

## 🔒 安全建议

1. **强密码策略**：首次创建管理员账号时，请务必设置包含大小写字母、数字及特殊符号的复杂密码。
2. **凭据安全存储**：用户认证密码采用单向不可逆的 SHA-256 哈希加盐计算，切勿随意公开存储文件备份。
3. **启用 HTTPS**：建议通过 Cloudflare 开启全程强制 HTTPS 加密传输，防止中间人嗅探。
4. **定期数据备份**：利用系统内置的「备份与恢复」功能定期导出配置数据，以防数据误删。

---

## 🙏 致谢与灵感源泉

- **[CF-Workers-SUB](https://github.com/cmliu/CF-Workers-SUB)**：感谢 [@cmliu](https://github.com/cmliu) 大佬提供的优秀架构思路与灵感。
- **[MiSub](https://github.com/imzyb/MiSub)**：感谢原作者 [@imzyb](https://github.com/imzyb) 及所有参与贡献的开发者。
- **开源生态**：感谢 Vue.js、Tailwind CSS、Cloudflare Workers 等优秀开源项目支持。

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 授权开源，欢迎自由分发与二次开发。

*如果您觉得这个项目对您有所帮助，请给仓库点亮一个 ⭐ Star，感谢支持！*
