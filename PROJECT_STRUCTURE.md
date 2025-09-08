# Sub-One 项目结构说明

## 📁 项目目录结构

```
Sub-One/
├── 📁 functions/                    # Cloudflare Pages Functions
│   └── [[path]].js                  # 后端API处理函数
├── 📁 src/                          # 源代码目录
│   ├── 📁 assets/                   # 静态资源
│   │   └── main.css                 # 主样式文件
│   ├── 📁 components/               # Vue组件
│   │   ├── 📁 cards/                # 卡片组件
│   │   │   ├── Card.vue             # 通用卡片组件
│   │   │   ├── ManualNodeCard.vue   # 手动节点卡片
│   │   │   ├── ProfileCard.vue      # 订阅组卡片
│   │   │   └── SkeletonCard.vue     # 骨架屏卡片
│   │   ├── 📁 forms/                # 表单组件
│   │   │   └── Login.vue            # 登录表单
│   │   ├── 📁 layout/               # 布局组件
│   │   │   ├── Header.vue           # 页面头部
│   │   │   ├── Footer.vue           # 页面底部
│   │   │   └── NavigationTabs.vue   # 导航标签
│   │   ├── 📁 modals/               # 模态框组件
│   │   │   ├── BulkImportModal.vue  # 批量导入模态框
│   │   │   ├── HelpModal.vue        # 帮助模态框
│   │   │   ├── NodeDetailsModal.vue # 节点详情模态框
│   │   │   ├── ProfileModal.vue     # 订阅组模态框
│   │   │   ├── ProfileNodeDetailsModal.vue # 订阅组节点详情
│   │   │   ├── SettingsModal.vue    # 设置模态框
│   │   │   └── SubscriptionImportModal.vue # 订阅导入模态框
│   │   ├── 📁 sections/             # 页面区域组件
│   │   │   ├── GeneratorSection.vue # 链接生成器区域
│   │   │   ├── ManualNodeSection.vue # 手动节点管理区域
│   │   │   ├── ProfileSection.vue   # 订阅组管理区域
│   │   │   └── SubscriptionSection.vue # 订阅管理区域
│   │   ├── Dashboard.vue            # 主仪表板组件
│   │   ├── DashboardSkeleton.vue    # 仪表板骨架屏
│   │   ├── ManualNodeList.vue       # 手动节点列表
│   │   ├── Modal.vue                # 基础模态框
│   │   ├── ModalManager.vue         # 模态框管理器
│   │   ├── SubscriptionLinkGenerator.vue # 订阅链接生成器
│   │   └── Toast.vue                # 消息提示组件
│   ├── 📁 composables/              # 组合式函数
│   │   ├── useManualNodes.js        # 手动节点管理逻辑
│   │   └── useSubscriptions.js      # 订阅管理逻辑
│   ├── 📁 lib/                      # 工具库
│   │   ├── api.js                   # API接口函数
│   │   ├── constants.js             # 常量定义
│   │   ├── helpers.js               # 辅助函数
│   │   ├── subscriptionParser.js    # 订阅解析器
│   │   └── utils.js                 # 通用工具函数
│   ├── 📁 stores/                   # Pinia状态管理
│   │   ├── session.js               # 会话状态
│   │   ├── theme.js                 # 主题状态
│   │   ├── toast.js                 # 消息提示状态
│   │   └── ui.js                    # UI状态
│   ├── App.vue                      # 根组件
│   ├── main.js                      # 应用入口
│   └── vue-shims.d.ts               # Vue类型声明
├── 📄 配置文件
│   ├── .eslintrc.js                 # ESLint配置
│   ├── .eslintignore                # ESLint忽略文件
│   ├── .gitignore                   # Git忽略文件
│   ├── .prettierrc                  # Prettier配置
│   ├── .prettierignore              # Prettier忽略文件
│   ├── env.example                  # 环境变量示例
│   ├── index.html                   # HTML入口文件
│   ├── package.json                 # 项目依赖配置
│   ├── postcss.config.cjs           # PostCSS配置
│   ├── tailwind.config.cjs          # Tailwind CSS配置
│   ├── tsconfig.json                # TypeScript配置
│   ├── tsconfig.node.json           # Node.js TypeScript配置
│   ├── vite.config.js               # Vite构建配置
│   └── wrangler.toml                # Cloudflare Workers配置
├── LICENSE                          # 开源许可证
└── README.md                        # 项目说明文档
```

## 🏗️ 架构设计原则

### 1. **组件化设计**
- **单一职责**: 每个组件只负责一个特定功能
- **模块化**: 按功能类型组织组件目录
- **可复用**: 通用组件可在多处使用

### 2. **目录结构规范**
- **按功能分类**: 组件按用途分组到不同目录
- **层次清晰**: 目录结构反映组件层次关系
- **易于维护**: 相关文件集中管理

### 3. **代码组织**
- **Composables**: 业务逻辑抽离到组合式函数
- **Stores**: 状态管理集中化
- **Utils**: 工具函数模块化

## 📋 组件分类说明

### 🎨 Layout Components (布局组件)
- **Header.vue**: 页面头部，包含标题和主题切换
- **Footer.vue**: 页面底部，显示版权信息
- **NavigationTabs.vue**: 导航标签，切换不同功能区域

### 🃏 Card Components (卡片组件)
- **Card.vue**: 通用卡片组件，用于显示订阅信息
- **ManualNodeCard.vue**: 手动节点卡片，显示节点详情
- **ProfileCard.vue**: 订阅组卡片，显示订阅组信息
- **SkeletonCard.vue**: 骨架屏卡片，加载状态显示

### 📝 Form Components (表单组件)
- **Login.vue**: 登录表单，用户认证界面

### 🪟 Modal Components (模态框组件)
- **BulkImportModal.vue**: 批量导入订阅
- **HelpModal.vue**: 帮助信息显示
- **NodeDetailsModal.vue**: 节点详细信息
- **ProfileModal.vue**: 订阅组编辑
- **SettingsModal.vue**: 应用设置
- **SubscriptionImportModal.vue**: 订阅导入

### 📑 Section Components (区域组件)
- **SubscriptionSection.vue**: 订阅管理区域
- **ProfileSection.vue**: 订阅组管理区域
- **ManualNodeSection.vue**: 手动节点管理区域
- **GeneratorSection.vue**: 链接生成器区域

## 🔧 开发工具配置

### 代码质量
- **ESLint**: 代码规范检查
- **Prettier**: 代码格式化
- **TypeScript**: 类型检查

### 构建工具
- **Vite**: 快速构建工具
- **Tailwind CSS**: 原子化CSS框架
- **PostCSS**: CSS后处理器

### 部署配置
- **Cloudflare Pages**: 静态站点部署
- **Cloudflare Workers**: 后端API服务
- **Wrangler**: Cloudflare部署工具

## 🚀 性能优化

### 代码分割
- 异步组件加载
- 路由懒加载
- 按需导入

### 缓存策略
- 静态资源缓存
- API响应缓存
- 浏览器缓存优化

### 构建优化
- 代码压缩
- 资源优化
- 打包分析

## 📖 开发指南

### 添加新组件
1. 确定组件类型和功能
2. 选择合适的目录位置
3. 创建组件文件
4. 更新相关导入路径
5. 编写组件文档

### 修改现有组件
1. 理解组件职责
2. 保持接口兼容性
3. 更新相关测试
4. 更新文档说明

### 状态管理
1. 使用Pinia进行状态管理
2. 合理划分store职责
3. 避免状态冗余
4. 保持状态同步

这个项目结构遵循Vue.js最佳实践，提供了清晰的代码组织和良好的可维护性。
