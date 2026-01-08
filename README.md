# Sub-One Manager

> 🚀 基于 Vue.js 3 的现代化订阅管理工具，专为 Cloudflare Pages 设计

[![Vue.js](https://img.shields.io/badge/Vue.js-3.0+-4FC08D?style=flat&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0+-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-Deploy-blue?style=flat&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📖 项目简介

**Sub-One Manager** 是一款专为网络订阅管理而设计的现代化Web应用。它基于Vue.js 3构建，采用最新的前端技术栈，为用户提供直观、高效的订阅管理体验。 （界面可能有人不喜欢，只是增加些趣味性，代码还不够完善，不喜勿喷。）

### 🎯 项目特色

- **🚀 现代化架构**: 基于Vue.js 3 Composition API，响应式设计
- **🎨 精美界面**: 采用Tailwind CSS，支持深色主题
- **📱 全平台适配**: 完美支持桌面、平板、手机等设备
- **⚡ 高性能**: 基于Cloudflare Workers，全球CDN加速
- **🔒 安全可靠**: 完善的权限控制和数据加密
- **🏷️ 标签页布局**: 顶部标签页导航，功能模块清晰分离

### 🖼️ 界面预览

<details>
<summary>🎨 点击展开查看界面截图</summary>

#### 🔐 登录界面

![登录界面](images/0.png)
*简洁的登录界面，支持管理员密码验证*

#### 📊 仪表盘

![仪表盘](images/1.png)
*主仪表盘界面，展示所有功能模块的概览*

#### 📋 订阅管理

![订阅管理界面](images/2.png)
*订阅管理界面，支持2行3列布局，包含分页控制*

#### 👥 订阅组

![订阅组界面](images/3.png)
*订阅组管理界面，支持组合多个订阅和自定义配置*

#### ⚙️ 手动节点

![手动节点管理](images/4.png)
*手动节点管理界面，支持4列网格布局和搜索功能*

</details>

### 项目结构

<details>
<summary>📁 点击展开查看完整项目结构</summary>

```text
Sub-One/
├── src/                         # 前端源码
│   ├── components/              # Vue组件
│   │   ├── cards/              # 卡片组件
│   │   │   ├── ManualNodeCard.vue         # 手动节点卡片
│   │   │   ├── ProfileCard.vue            # 订阅组卡片
│   │   │   ├── SubscriptionCard.vue       # 订阅卡片
│   │   │   └── SubscriptionLinkGeneratorCard.vue  # 链接生成卡片
│   │   ├── layout/             # 布局组件
│   │   │   ├── AppFooter.vue              # 页面底部
│   │   │   └── AppSidebar.vue             # 侧边栏导航
│   │   ├── modals/             # 模态框组件
│   │   │   ├── BaseModal.vue              # 基础模态框
│   │   │   ├── BulkImportModal.vue        # 批量导入
│   │   │   ├── HelpModal.vue              # 帮助文档
│   │   │   ├── NodeDetailsModal.vue       # 节点详情
│   │   │   ├── ProfileModal.vue           # 订阅组编辑
│   │   │   ├── SettingsModal.vue          # 设置面板
│   │   │   └── SubscriptionImportModal.vue # 订阅导入
│   │   ├── tabs/               # 标签页组件
│   │   │   ├── DashboardHome.vue          # 仪表盘首页
│   │   │   ├── GeneratorTab.vue           # 链接生成标签页
│   │   │   ├── NodesTab.vue               # 手动节点标签页
│   │   │   ├── ProfilesTab.vue            # 订阅组标签页
│   │   │   └── SubscriptionsTab.vue       # 订阅管理标签页
│   │   ├── views/              # 视图组件
│   │   │   ├── DashboardView.vue          # 主仪表盘视图
│   │   │   └── LoginView.vue              # 登录/初始化视图
│   │   ├── common/             # 通用组件
│   │   └── editors/            # 编辑器组件
│   ├── composables/            # 组合式函数
│   │   ├── useSubscriptions.ts            # 订阅数据管理
│   │   └── useManualNodes.ts              # 手动节点管理
│   ├── stores/                 # Pinia状态管理
│   │   ├── layout.ts                      # 布局状态
│   │   ├── session.ts                     # 会话管理
│   │   ├── theme.ts                       # 主题配置
│   │   ├── toast.ts                       # 消息提示
│   │   └── ui.ts                          # UI状态
│   ├── lib/                    # 前端工具库
│   │   ├── api.ts                         # API接口
│   │   ├── subscription-parser.ts         # 订阅解析器
│   │   └── utils.ts                       # 工具函数
│   ├── assets/                 # 静态资源
│   │   └── styles/                        # 样式文件
│   ├── App.vue                 # 根组件
│   ├── main.ts                 # 入口文件
│   └── types.ts                # 前端类型定义
├── lib/                         # 共享代码库
│   ├── backend/                # 后端逻辑
│   │   ├── api/               # API处理
│   │   │   ├── auth.ts                    # 认证模块（Token生成/验证）
│   │   │   └── handlers.ts                # API路由处理
│   │   ├── config/            # 配置
│   │   │   ├── constants.ts               # 常量定义（KV键名等）
│   │   │   ├── defaults.ts                # 默认配置
│   │   │   └── rule-templates.ts          # 规则模板
│   │   ├── services/          # 业务服务
│   │   │   ├── kv.ts                      # KV存储服务
│   │   │   ├── notification.ts            # 通知服务
│   │   │   └── users.ts                   # 用户管理服务
│   │   ├── converter/         # 订阅转换器
│   │   ├── parsers/           # 节点解析器
│   │   ├── subscription/      # 订阅处理
│   │   ├── cron/              # 定时任务
│   │   ├── subscription-parser.ts         # 订阅解析主模块
│   │   └── types.ts                       # 后端类型定义
│   └── shared/                 # 前后端共享
│       └── types.ts                       # 共享类型定义
├── functions/                  # Cloudflare Functions
│   └── [[path]].ts            # 统一入口（路由分发）
├── images/                     # 界面截图
├── index.html                  # HTML入口
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript配置
├── tailwind.config.cjs         # Tailwind CSS配置
├── vite.config.ts              # Vite配置
├── wrangler.toml               # Cloudflare配置
└── AUTH_MIGRATION.md           # 认证系统迁移文档
```

</details>

### 核心组件

<details>
<summary>🧩 点击展开查看组件详情</summary>

#### 视图层 (Views)

- **LoginView.vue**: 登录/初始化界面，支持两种模式
  - 初始化模式：首次使用时创建管理员账号（用户名+密码+确认密码）
  - 登录模式：用户名密码登录验证
- **DashboardView.vue**: 主仪表盘视图，整合所有功能模块

#### 标签页 (Tabs)

- **DashboardHome.vue**: 仪表盘首页，展示统计信息和快捷操作
- **SubscriptionsTab.vue**: 订阅管理标签页，管理机场订阅
- **ProfilesTab.vue**: 订阅组标签页，组合管理节点
- **GeneratorTab.vue**: 链接生成标签页，生成各种格式订阅链接
- **NodesTab.vue**: 手动节点标签页，管理单个节点

#### 卡片组件 (Cards)

- **SubscriptionCard.vue**: 订阅卡片，显示订阅信息和流量状态
- **ProfileCard.vue**: 订阅组卡片，显示订阅组配置
- **ManualNodeCard.vue**: 手动节点卡片，显示节点信息
- **SubscriptionLinkGeneratorCard.vue**: 链接生成卡片，生成订阅链接

#### 模态框 (Modals)

- **BaseModal.vue**: 基础模态框组件，统一弹窗样式
- **SubscriptionImportModal.vue**: 订阅导入弹窗
- **ProfileModal.vue**: 订阅组编辑弹窗
- **NodeDetailsModal.vue**: 节点详情弹窗
- **BulkImportModal.vue**: 批量导入弹窗
- **SettingsModal.vue**: 设置面板弹窗
- **HelpModal.vue**: 帮助文档弹窗

#### 布局组件 (Layout)

- **AppSidebar.vue**: 侧边栏导航，标签页切换和功能入口
- **AppFooter.vue**: 页面底部，显示版权和链接信息

### 状态管理 (Stores)

- **session.ts**: 会话管理，处理登录状态和认证
- **theme.ts**: 主题配置，管理深色/浅色模式
- **layout.ts**: 布局状态，管理侧边栏和界面布局
- **toast.ts**: 消息提示，统一管理提示信息
- **ui.ts**: UI状态，管理界面交互状态

### 组合式函数 (Composables)

- **useSubscriptions.ts**: 订阅数据管理，处理订阅的增删改查
- **useManualNodes.ts**: 手动节点管理，处理节点的批量操作

### 工具库 (Lib)

- **api.ts**: API接口，与后端通信
- **subscription-parser.ts**: 订阅解析器，解析各种订阅格式
- **utils.ts**: 工具函数，通用辅助方法

</details>

## 🚀 快速开始

### 环境要求

- **Node.js**: 16.0+ 版本
- **包管理器**: npm 或 yarn
- **浏览器**: 支持ES6+的现代浏览器

### 本地开发

```bash
# 克隆项目
git clone <repository-url>
cd Sub-One

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 🐳 Docker 部署

如果您拥有自己的服务器（VPS），可以使用 Docker 一键部署：

```bash
docker run -d \
  --user root \
  --name sub-one \
  --restart unless-stopped \
  -p 3055:3055 \
  -v $(pwd)/sub-one-data:/app/data \
  -e ADMIN_PASSWORD=admin \
  binbankm/sub-one:latest
```

- **端口映射**: `-p 3055:3055` (访问地址: `http://ip:3055`)
- **数据持久化**: `-v $(pwd)/sub-one-data:/app/data` (使用本地目录存储数据)
- **管理员密码**: `-e ADMIN_PASSWORD=admin` (请修改为您自己的密码)

### 🌐 Cloudflare Pages 部署

本项目专为Cloudflare Pages设计，支持一键部署。

#### 步骤 1: Fork 项目

1. 点击右上角的 "Fork" 按钮
2. 选择你的GitHub账户作为目标

#### 步骤 2: 创建Cloudflare Pages项目

1. 登录 [Cloudflare控制台](https://dash.cloudflare.com/)
2. 进入 `Workers & Pages` → `Pages`
3. 点击 "创建应用程序" → "连接到Git"
4. 选择你刚刚Fork的Sub-One仓库
5. 配置构建设置：
   - **框架预设**: `Vue`
   - **构建命令**: `npm run build`
   - **构建输出目录**: `dist`
   - **根目录**: `/` (留空)

#### 步骤 3: 用户登录说明

本系统采用**用户名密码**认证方式，无需配置环境变量：

- ✅ **首次访问**：系统自动引导创建管理员账号
- ✅ **后续登录**：使用创建的用户名和密码登录
- ✅ **安全性**：密码使用SHA-256哈希存储在KV中

> 💡 **提示**: 不需要配置 `ADMIN_PASSWORD` 环境变量，系统内置默认Token签名密钥

#### 步骤 4: 绑定KV命名空间

1. 在项目设置中进入 "函数" → "KV命名空间绑定"
2. 点击 "添加绑定"
3. 配置绑定：
   - **变量名称**: `SUB_ONE_KV`
   - **KV命名空间**: 选择或创建新的KV命名空间

#### 步骤 5: 部署项目

1. 回到 "部署" 选项卡
2. 点击 "重新部署" 按钮
3. 等待部署完成

#### 步骤 6: 首次访问与初始化

部署完成后，你会获得一个Cloudflare Pages域名：

```text
https://your-project-name.pages.dev
```

**首次访问流程**：

1. 打开应用，系统检测到无用户数据
2. 自动显示 **"创建管理员账号"** 界面
3. 填写以下信息：
   - 用户名（自定义）
   - 密码（至少6位）
   - 确认密码
4. 点击 **"创建管理员账号"** 按钮
5. 创建成功后，跳转到登录页面
6. 使用刚创建的用户名和密码登录
7. 进入管理界面 ✅

**后续访问**：

- 直接使用用户名和密码登录即可

### 🔧 自定义域名（可选）

1. 在项目设置中进入 "自定义域"
2. 添加你的域名
3. 按照提示配置DNS记录

## 🛠️ 故障排除

<details>
<summary>🔧 点击展开查看常见问题</summary>

### 常见问题

1. **构建失败**
   - 检查Node.js版本是否为16.0+
   - 确认`package.json`中的依赖版本正确
   - 清除`node_modules`并重新安装

2. **KV绑定错误**
   - 确认KV命名空间已创建
   - 检查变量名称是否为`SUB_ONE_KV`
   - 重新部署项目

3. **环境变量未生效**
   - 确认变量已添加到生产环境
   - 重新部署项目
   - 检查变量名拼写是否正确

4. **登录失败**
   - 确认用户名和密码输入正确
   - 如果忘记密码，需要通过KV控制台删除 `sub_one_users_v1` 重新初始化
   - 清除浏览器Cookie后重试

5. **首次访问未显示初始化界面**
   - 检查KV命名空间绑定是否正确（变量名必须是 `SUB_ONE_KV`）
   - 查看浏览器控制台是否有错误信息
   - 尝试清除浏览器缓存后刷新

</details>

## 🔒 安全建议

1. **强密码**: 管理员账号密码使用强密码（字母+数字+符号，至少8位）
2. **密码哈希**: 系统使用SHA-256哈希存储用户密码，确保安全性
3. **定期更新**: 定期更新依赖包和项目版本
4. **备份数据**: 定期备份KV中的数据（订阅、配置、用户数据）
5. **监控访问**: 关注异常访问日志
6. **HTTPS**: 确保使用HTTPS协议访问

## 🙏 致谢

### 项目起源

本项目是基于 [CM大佬的CF-Workers-SUB项目](https://github.com/cmliu/CF-Workers-SUB) ，感谢CM大佬提供的优秀基础架构。

### 二次开发

本项目是对 [imzyb/MiSub](https://github.com/imzyb/MiSub) 的二次修改版本，感谢原项目作者 [imzyb](https://github.com/imzyb) 及其贡献者们的优秀工作！

### 技术栈致谢

- Vue.js 团队提供的优秀框架
- Tailwind CSS 提供的现代化样式解决方案
- Cloudflare 提供的 Workers 平台
- 所有贡献者的辛勤付出

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

**Sub-One Manager** - 让订阅管理变得简单高效 🚀

*如果你觉得这个项目对你有帮助，请给我们一个 ⭐ Star！*
