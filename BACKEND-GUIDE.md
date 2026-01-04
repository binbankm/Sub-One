# 📘 functions/[[path]].ts 完整说明文档

## 🎯 文件概述

**文件路径：** `functions/[[path]].ts`  
**文件大小：** 1097 行，约 50KB  
**运行环境：** Cloudflare Pages Functions (Edge Runtime)  
**核心作用：** 项目的**后端核心**，处理所有API请求、订阅生成、定时任务等

---

## 📁 文件结构总览

```
functions/[[path]].ts (1097行)
├─ 导入和常量定义 (1-96行)
├─ 工具函数 (34-145行)
│  ├─ calculateDataHash() - 数据哈希计算
│  ├─ hasDataChanged() - 变更检测
│  ├─ conditionalKVPut() - 条件写入KV
│  ├─ formatBytes() - 字节格式化
│  └─ sendTgNotification() - TG通知
├─ 定时任务 (147-226行)
│  └─ handleCronTrigger() - Cron定时检查
├─ 认证和通知 (228-288行)
│  ├─ authMiddleware() - 会话认证
│  └─ checkAndNotify() - 流量/到期检查
├─ API路由处理 (291-777行)
│  └─ handleApiRequest() - 主API路由器
│     ├─ /api/migrate - 数据迁移
│     ├─ /api/login - 用户登录
│     ├─ /api/logout - 用户登出
│     ├─ /api/data - 获取订阅数据
│     ├─ /api/subs - 保存订阅数据
│     ├─ /api/node_count - 获取节点数
│     ├─ /api/fetch_external_url - 代理获取URL
│     ├─ /api/batch_update_nodes - 批量更新
│     ├─ /api/settings - 设置管理
│     └─ /api/latency_test - 延迟测试
├─ 订阅生成 (781-1074行)
│  ├─ generateCombinedNodeList() - 聚合节点
│  └─ handleSubRequest() - 订阅请求处理
└─ 主入口 (1077-1096行)
   └─ onRequest() - Cloudflare Pages入口
```

---

## 🔑 核心概念

### **1. Cloudflare Pages Functions**

这个文件是 Cloudflare Pages Functions 的路由处理器：

```typescript
// 文件名特殊：[[path]].ts
// 作用：捕获所有路径 (Catch-all route)

// 请求示例：
// /api/data → handleApiRequest()
// /sub/mytoken → handleSubRequest()
// /cron → handleCronTrigger()
```

**为什么叫 `[[path]]`？**
- `[[path]]` 是 Cloudflare Pages 的通配符语法
- 捕获所有路径请求，由 `onRequest()` 统一分发

---

### **2. KV 存储结构**

```typescript
// 三个主要的KV键
const KV_KEY_SUBS = 'sub_one_subscriptions_v1';      // 订阅列表
const KV_KEY_PROFILES = 'sub_one_profiles_v1';       // 订阅组配置
const KV_KEY_SETTINGS = 'worker_settings_v1';        // 全局设置

// 数据结构：
// KV_KEY_SUBS: Subscription[]
// KV_KEY_PROFILES: Profile[]
// KV_KEY_SETTINGS: AppConfig
```

---

## 🚀 主要功能模块详解

### **模块1：工具函数（L34-145）**

#### **1.1 数据变更检测**
```typescript
// 用途：避免不必要的KV写入（节省成本）
calculateDataHash(data) → 计算数据哈希
hasDataChanged(oldData, newData) → 比较是否变更
conditionalKVPut(env, key, newData, oldData) → 条件写入
```

**使用场景：**
```typescript
// 只有数据真正改变时才写入KV
const changed = await conditionalKVPut(env, KV_KEY_SUBS, newSubs, oldSubs);
if (changed) {
    console.log('数据已更新');
}
```

---

#### **1.2 Telegram 通知**
```typescript
sendTgNotification(settings, message) → 发送TG消息

// 使用场景：
// - 订阅即将到期
// - 流量即将用完
// - 设置变更提醒
```

**配置要求：**
```typescript
settings.BotToken = "your_bot_token";
settings.ChatID = "your_chat_id";
```

---

### **模块2：定时任务（L147-226）**

#### **handleCronTrigger() - 定时检查**

**功能：** 每天定时检查所有订阅的流量和到期情况

**执行流程：**
```
1. 读取所有订阅
2. 并发请求每个订阅
   ├─ 请求A：获取 subscription-userinfo 头（流量信息）
   └─ 请求B：解析节点数量
3. 更新 KV 存储
4. 触发通知（如果满足阈值）
```

**Cron 配置（wrangler.toml）：**
```toml
[triggers]
crons = ["0 2 * * *"]  # 每天凌晨2点执行
```

**使用的API：**
- `subscriptionParser.parse()` - 解析节点
- `checkAndNotify()` - 检查并通知

---

### **模块3：认证系统（L228-241）**

#### **authMiddleware() - 会话认证**

**工作原理：**
```typescript
// 使用 Cookie 会话认证
Cookie: auth_session=<timestamp>

// 验证逻辑：
1. 读取 Cookie 中的 timestamp
2. 检查是否在有效期内（8小时）
3. 有效 → 通过认证
4. 无效 → 返回 401
```

**登录流程：**
```
用户 → POST /api/login (password) 
     → 验证密码
     → 设置 Cookie (timestamp)
     → 返回 success
```

---

### **模块4: 通知检查（L243-288）**

#### **checkAndNotify() - 流量/到期检查**

**检查内容：**

1. **订阅到期检查**
```typescript
if (剩余天数 <= NotifyThresholdDays) {
    发送通知: "订阅即将到期"
}
```

2. **流量使用检查**
```typescript
if (已用百分比 >= NotifyThresholdPercent) {
    发送通知: "流量即将用完"
}
```

**防重复通知：**
```typescript
// 24小时内不重复通知
if (now - sub.lastNotifiedExpire > ONE_DAY_MS) {
    sendNotification();
    sub.lastNotifiedExpire = now;
}
```

---

### **模块5：API路由处理（L291-777）**

这是最复杂的部分，包含10+个API端点：

#### **5.1 数据迁移 - `/api/migrate`**
```typescript
功能：从旧版KV结构迁移到新版
用途：一次性执行，升级数据结构
```

#### **5.2 认证相关**
```typescript
POST /api/login   → 用户登录
POST /api/logout  → 用户登出
```

#### **5.3 数据管理**
```typescript
GET  /api/data     → 获取订阅、订阅组、设置
POST /api/subs     → 保存订阅和订阅组
GET  /api/settings → 获取设置
POST /api/settings → 保存设置
```

#### **5.4 节点操作**
```typescript
POST /api/node_count          → 获取单个订阅的节点数
POST /api/batch_update_nodes  → 批量更新节点数
POST /api/fetch_external_url  → 代理获取外部URL（CORS绕过）
POST /api/latency_test        → 测试订阅延迟
```

---

### **模块6：订阅生成（L781-1074）**

这是**最核心**的功能！

#### **6.1 generateCombinedNodeList() - 节点聚合**

**功能：** 聚合多个订阅和手动节点

**流程：**
```
输入: [订阅1, 订阅2, 手动节点1, 手动节点2]
  ↓
1. 分类：手动节点 vs HTTP订阅
  ↓
2. 并发请求所有HTTP订阅
   └─ 使用 subscriptionParser.parse()
  ↓
3. 合并所有节点
  ↓
输出: Node[] (标准化节点数组)
```

**关键代码：**
```typescript
// 手动节点
const parsedManualNodes = subscriptionParser.parseNodeLines(...)
const processedManualNodes = subscriptionParser.processNodes(...)

// HTTP订阅
const nodes = subscriptionParser.parse(text, sub.name, {
    exclude: sub.exclude,
    prependSubName: config.prependSubName,
    dedupe: config.dedupe
});

// 合并
const allNodes = [...processedManualNodes, ...processedSubResults.flat()];
```

---

#### **6.2 handleSubRequest() - 订阅请求处理**

**这是用户获取订阅的主入口！**

**URL格式：**
```
/sub/{token}                 → 全部订阅
/sub/{profileToken}/{id}     → 指定订阅组
```

**完整流程：**
```
1. 解析URL参数
   ├─ 提取 token / profileToken
   ├─ 提取 profileId（如果有）
   └─ 提取目标格式（target / UA检测）
   
2. 验证Token
   ├─ 全局订阅：验证 mytoken
   └─ 订阅组：验证 profileToken
   
3. 筛选订阅
   ├─ 全局模式：所有启用的订阅
   └─ 订阅组模式：该组包含的订阅
   
4. 检查订阅组过期
   └─ 如果过期 → 返回特殊节点
   
5. 获取节点列表
   └─ generateCombinedNodeList()
   
6. 格式转换
   ├─ Clash → toClash()
   ├─ SingBox → toSingBox()
    ├─ Base64 → toBase64()
   └─ 其他格式...
   
7. 返回订阅内容
   └─ 添加 subscription-userinfo 头
```

**UA检测逻辑：**
```typescript
// 根据User-Agent自动选择格式
const ua = userAgentHeader.toLowerCase();

if (ua.includes('clash')) → format = 'clash'
if (ua.includes('sing-box')) → format = 'singbox'
if (ua.includes('shadowrocket')) → format = 'base64'
// ...
```

---

### **模块7：主入口（L1077-1096）**

#### **onRequest() - 路由分发**

**这是Cloudflare Pages Functions的入口函数！**

```typescript
export default {
    async onRequest(context) {
        const { request, env } = context;
        const url = new URL(request.url);
        
        // 路由分发
        if (url.pathname.startsWith('/api/')) {
            return handleApiRequest(request, env);
        }
        
        if (url.pathname.startsWith('/sub/')) {
            return handleSubRequest(context);
        }
        
        if (url.pathname === '/cron') {
            return handleCronTrigger(env);
        }
        
        // 404
        return new Response('Not Found', { status: 404 });
    }
}
```

---

## 🔄 完整请求流程示例

### **示例1：用户登录**
```
1. 前端发送
   POST /api/login
   Body: { password: "admin123" }

2. onRequest() 识别 /api/ → handleApiRequest()

3. handleApiRequest() 路由到 /login 分支
   ├─ 验证密码
   ├─ 生成timestamp token
   └─ 设置Cookie: auth_session=<timestamp>

4. 返回: { success: true }
```

---

### **示例2：获取订阅**
```
1. Clash客户端请求
   GET /sub/mySecretToken?target=clash
   User-Agent: Clash.Meta/1.19

2. onRequest() 识别 /sub/ → handleSubRequest()

3. handleSubRequest() 流程
   ├─ 验证 mySecretToken
   ├─ 读取所有启用的订阅
   ├─ 调用 generateCombinedNodeList()
   │  ├─ 并发拉取所有HTTP订阅
   │  ├─ 解析节点（subscriptionParser.parse）
   │  └─ 合并节点
   ├─ 转换为Clash格式（subscriptionConverter.convert）
   └─ 返回YAML配置

4. Clash客户端收到YAML配置文件
```

---

### **示例3：定时任务**
```
1. Cloudflare Cron触发
   GET /cron
   
2. onRequest() 识别 /cron → handleCronTrigger()

3. handleCronTrigger() 流程
   ├─ 读取所有订阅
   ├─ 并发请求每个订阅
   │  ├─ 获取流量信息（subscription-userinfo）
   │  └─ 解析节点数量
   ├─ 更新KV存储
   └─ 调用 checkAndNotify()
      ├─ 检查到期时间
      ├─ 检查流量使用
      └─ 发送TG通知（如果需要）

4. 返回: Cron job completed
```

---

## 🎯 关键设计模式

### **1. 中间件模式**
```typescript
// 认证中间件
if (!await authMiddleware(request, env)) {
    return new Response('Unauthorized', { status: 401 });
}
```

### **2. 策略模式**
```typescript
// 根据UA选择格式
const formatHandlers = {
    'clash': () => toClash(...),
    'singbox': () => toSingBox(...),
    // ...
};
```

### **3. 工厂模式**
```typescript
// 使用共享的Parser和Converter
const subscriptionParser = new SubscriptionParser();
const subscriptionConverter = new SubscriptionConverter();
```

---

## 📊 数据流向图

```
用户请求
  ↓
onRequest() [主入口]
  ├─ /api/* → handleApiRequest()
  │            ├─ /login → 认证
  │            ├─ /data → KV读取
  │            ├─ /subs → KV写入
  │            └─ /node_count → 订阅解析
  │
  ├─ /sub/* → handleSubRequest()
  │            ├─ Token验证
  │            ├─ generateCombinedNodeList()
  │            │  ├─ fetch订阅
  │            │  └─ subscriptionParser.parse()
  │            ├─ subscriptionConverter.convert()
  │            └─ 返回订阅配置
  │
  └─ /cron → handleCronTrigger()
               ├─ 并发检查所有订阅
               ├─ checkAndNotify()
               └─ 更新KV
```

---

## ⚙️ 环境变量配置

```typescript
// 必需环境变量
env.SUB_ONE_KV         // KV Namespace绑定
env.ADMIN_PASSWORD     // 管理员密码

// 可选配置（在settings中）
settings.BotToken      // TG Bot Token
settings.ChatID        // TG Chat ID
settings.mytoken       // 订阅Token
settings.profileToken  // 订阅组Token
```

---

希望这份文档能帮您理清思路！有任何具体问题都可以问我。🎯
