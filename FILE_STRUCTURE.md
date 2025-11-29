# 📁 项目文件结构

## 目录说明

```
src/
├── assets/                    # 静态资源
│   └── styles/               # 样式文件
│       ├── design-system.css # 设计系统
│       └── main.css          # 主样式
│
├── components/               # 组件目录
│   ├── common/              # 通用组件
│   │   └── Toast.vue        # Toast通知组件
│   │
│   ├── views/               # 视图组件（页面级）
│   │   ├── DashboardView.vue          # 仪表板视图
│   │   ├── LoginView.vue              # 登录视图
│   │   └── SubscriptionLinkGenerator.vue  # 订阅链接生成器
│   │
│   ├── cards/               # 卡片组件
│   │   ├── SubscriptionCard.vue   # 订阅卡片
│   │   ├── ProfileCard.vue        # 订阅组卡片
│   │   └── ManualNodeCard.vue     # 手动节点卡片
│   │
│   ├── layout/              # 布局组件
│   │   ├── AppSidebar.vue   # 侧边栏
│   │   └── AppFooter.vue    # 页脚
│   │
│   └── modals/              # 模态框组件
│       ├── BaseModal.vue              # 基础模态框
│       ├── SubscriptionImportModal.vue # 订阅导入
│       ├── BulkImportModal.vue        # 批量导入
│       ├── NodeDetailsModal.vue       # 节点详情
│       ├── ProfileModal.vue           # 订阅组编辑
│       ├── ProfileNodeDetailsModal.vue # 订阅组节点详情
│       ├── SettingsModal.vue          # 设置
│       └── HelpModal.vue              # 帮助
│
├── composables/             # 组合式函数
│   ├── useSubscriptions.js  # 订阅管理逻辑
│   └── useManualNodes.js    # 手动节点管理逻辑
│
├── lib/                     # 工具库
│   ├── api.js               # API接口
│   ├── subscription-parser.js  # 订阅解析器
│   └── utils.js             # 工具函数
│
├── stores/                  # Pinia状态管理
│   ├── session.js           # 会话状态
│   ├── theme.js             # 主题状态
│   ├── toast.js             # Toast状态
│   ├── layout.js            # 布局状态
│   └── ui.js                # UI状态
│
├── App.vue                  # 根组件
└── main.js                  # 入口文件
```

## 命名规范

### 组件命名
- **视图组件**: `XxxView.vue` (如 `DashboardView.vue`)
- **布局组件**: `AppXxx.vue` (如 `AppSidebar.vue`)
- **卡片组件**: `XxxCard.vue` (如 `SubscriptionCard.vue`)
- **模态框组件**: `XxxModal.vue` (如 `ProfileModal.vue`)
- **基础组件**: `BaseXxx.vue` (如 `BaseModal.vue`)

### 文件命名
- **Vue组件**: PascalCase (如 `DashboardView.vue`)
- **JS/TS文件**: kebab-case (如 `subscription-parser.js`)
- **CSS文件**: kebab-case (如 `design-system.css`)

## 目录说明

| 目录 | 用途 | 示例 |
|------|------|------|
| `components/views/` | 页面级视图组件 | LoginView, DashboardView |
| `components/common/` | 可重用的通用组件 | Toast, Loading |
| `components/layout/` | 应用布局组件 | AppSidebar, AppFooter |
| `components/cards/` | 卡片展示组件 | SubscriptionCard, ProfileCard |
| `components/modals/` | 弹窗对话框组件 | ProfileModal, SettingsModal |
| `composables/` | Vue 组合式函数 | useSubscriptions, useManualNodes |
| `lib/` | 工具函数和辅助库 | api, utils, parser |
| `stores/` | Pinia 状态管理 | session, theme, toast |
| `assets/styles/` | 全局样式文件 | main.css, design-system.css |

## 优势

✅ **清晰的结构** - 组件按功能分类，易于查找  
✅ **明确的命名** - 通过名称即可了解用途  
✅ **易于扩展** - 新组件有明确的归类标准  
✅ **减少冲突** - 使用具体的名称避免命名冲突  
✅ **最佳实践** - 符合Vue和前端开发的标准规范  

---

📝 最后更新：2025-11-29
