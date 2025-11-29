# 项目文件结构整理说明

## 📁 整理日期
2025-11-29

## 🎯 整理目标
使项目文件结构更加清晰、易于维护，文件命名更加明确

## 📋 主要改动

### 1. 新增目录结构

```
src/
├── assets/
│   └── styles/              # ✨ 新增：样式文件目录
│       ├── design-system.css
│       └── main.css
│
├── components/
│   ├── common/              # ✨ 新增：通用组件目录
│   │   └── Toast.vue
│   │
│   ├── views/               # ✨ 新增:视图组件目录
│   │   ├── DashboardView.vue
│   │   ├── LoginView.vue
│   │   └── SubscriptionLinkGenerator.vue
│   │
│   ├── cards/
│   ├── layout/
│   └── modals/
│
├── composables/
├── lib/
└── stores/
```

### 2. 文件重命名清单

#### 视图组件 (components → components/views)
- ✅ `Login.vue` → `LoginView.vue`
- ✅ `Dashboard.vue` → `DashboardView.vue`
- ✅ `SubscriptionLinkGenerator.vue` → `views/SubscriptionLinkGenerator.vue`

#### 通用组件 (components → components/common)
- ✅ `Toast.vue` → `common/Toast.vue`

#### 布局组件 (components/layout)
- ✅ `Sidebar.vue` → `AppSidebar.vue`
- ✅ `Footer.vue` → `AppFooter.vue`

#### 卡片组件 (components/cards)
- ✅ `Card.vue` → `SubscriptionCard.vue`
- ✅ `ProfileCard.vue` (保持不变)
- ✅ `ManualNodeCard.vue` (保持不变)

#### 模态框组件 (components/modals)
- ✅ `Modal.vue` → `BaseModal.vue`
- ✅ 其他模态框组件保持原名

#### 工具库 (lib)
- ✅ `subscriptionParser.js` → `subscription-parser.js`

#### 样式文件 (assets → assets/styles)
- ✅ `main.css` → `styles/main.css`
- ✅ `design-system.css` → `styles/design-system.css`

### 3. 导入路径更新

所有相关组件的导入路径已同步更新：

#### App.vue
```javascript
// 更新前
import Dashboard from './components/Dashboard.vue';
import Login from './components/Login.vue';
import Sidebar from './components/layout/Sidebar.vue';
import Toast from './components/Toast.vue';
import Footer from './components/layout/Footer.vue';

// 更新后
import Dashboard from './components/views/DashboardView.vue';
import Login from './components/views/LoginView.vue';
import Sidebar from './components/layout/AppSidebar.vue';
import Toast from './components/common/Toast.vue';
import Footer from './components/layout/AppFooter.vue';
```

#### DashboardView.vue
```javascript
// 更新前
import Card from './cards/Card.vue';
import Modal from './modals/Modal.vue';
import { subscriptionParser } from '../lib/subscriptionParser.js';

// 更新后
import Card from '../cards/SubscriptionCard.vue';
import Modal from '../modals/BaseModal.vue';
import { subscriptionParser } from '../../lib/subscription-parser.js';
```

#### 所有模态框组件
```javascript
// 更新前
import Modal from './Modal.vue';
import { subscriptionParser } from '../../lib/subscriptionParser.js';

// 更新后
import Modal from './BaseModal.vue';
import { subscriptionParser } from '../../lib/subscription-parser.js';
```

#### main.js
```javascript
// 更新前
import './assets/main.css';

// 更新后
import './assets/styles/main.css';
```

### 4. 文件组织原则

1. **视图组件(Views)**: 页面级组件，通常对应完整的页面或路由
   - 放置在 `components/views/`
   - 命名格式：`XxxView.vue`

2. **通用组件(Common)**: 可重用的基础组件
   - 放置在 `components/common/`
   - 示例：Toast、Loading等

3. **布局组件(Layout)**: 应用布局相关组件
   - 放置在 `components/layout/`
   - 命名格式：`AppXxx.vue`

4. **卡片组件(Cards)**: 展示卡片类组件
   - 放置在 `components/cards/`
   - 命名格式：`XxxCard.vue`

5. **模态框组件(Modals)**: 弹窗组件
   - 放置在 `components/modals/`
   - 基础模态框命名为 `BaseModal.vue`
   - 具体模态框命名格式：`XxxModal.vue`

6. **工具文件(Lib)**: 使用 kebab-case 命名
   - 示例：`subscription-parser.js`, `api.js`

## ✅ 验证清单

- [x] 所有文件已成功移动和重命名
- [x] 所有导入路径已更新
- [x] 应用可以正常启动 ✅
- [x] 构建成功无错误 ✅
- [x] 所有功能正常运行 ✅

## 🎨 优势

1. **更清晰的目录结构**：组件按功能分类，易于查找和维护
2. **更明确的文件命名**：通过文件名即可了解组件用途
3. **更好的可扩展性**：新组件有明确的归类标准
4. **减少命名冲突**：使用更具体的名称（如 BaseModal 而不是 Modal）
5. **符合Vue最佳实践**：视图组件、通用组件等有明确的分类

## 📌 注意事项

1. 本次重组不影响业务逻辑，仅调整文件结构和命名
2. 所有功能保持不变
3. 建议在开发新功能时遵循新的文件组织规范
