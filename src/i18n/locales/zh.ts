export default {
    entities: {
        subscription: {
            modal: {
            convert: {
                title: '订阅转换方式',
                useExternal: '使用外部转换API',
                useExternalDesc: '关闭时使用后端自带转换',
                apiUrl: '外部转换API地址',
                manualInput: '-- 手动输入 --',
                apiUrlPlaceholder: '例如：api-suc.0z.gs',
                apiUrlHint: '提示：直接填写域名即可，系统会自动补全路径并拼接参数。'
            },
            tg: {
                title: 'Telegram 通知',
                tokenPlaceholder: '从 @BotFather 获取的Bot Token',
                chatIdPlaceholder: '接收通知的聊天ID'
            },
            notify: {
                title: '通知阈值',
                expireDays: '到期提醒阈值（天）',
                daysPlaceholder: '例如：3',
                expireHint: '当订阅剩余天数小于此值时发送提醒',
                trafficPercent: '流量提醒阈值（%）',
                percentPlaceholder: '例如：90',
                trafficHint: '当流量使用超过此百分比时发送提醒'
            },
            cron: {
                title: '自动更新(Cron)配置',
                enable: '启用定时更新',
                enableDesc: '开启后，可通过第三方 Cron 服务自动更新订阅',
                secret: 'Cron 安全密钥（Token）',
                secretPlaceholder: '任意复杂的字符串，例如：my_secret_token',
                hint1: '配置后，您可以使用第三方工具（如 UptimeRobot、宝塔计划任务）定期请求：<br />',
                hint2: '如果您使用的是 Cloudflare Pages，由于平台限制必须通过这种接口方式触发定时任务；Docker 用户自带内部定时器，可选择配置。',
                triggerUrl: '生成的专属触发链接：'
            },
                addTitle: '新增订阅',
                editTitle: '编辑订阅',
                addBtn: '添加',
                saveBtn: '保存',
                urlEmpty: '订阅链接不能为空',
                urlInvalidScheme: '订阅链接必须以 http:// 或 https:// 开头',
                urlInvalid: '无效的 URL 格式',
                fixErrors: '请修正错误后再保存'
            },
            actions: {
                add: '新增订阅',
                update: '更新订阅',
                delete: '删除订阅',
                clear: '清空订阅',
                batchImport: '批量导入订阅',
                updateFailed: '更新失败',
                noEnabled: '没有启用的订阅',
                tgFail: '发送 TG 通知失败:'
            },
            tg: {
                batchUpdateSuccess: '┏━━━━━━━━━━━━━━━━━━━━━┓\n┃  🔄 批量更新完成  ┃\n┗━━━━━━━━━━━━━━━━━━━━━┛\n\n',
                batchUpdateSynced: '📊 仪表板数据已同步完成',
                batchUpdateSuccessMsg: '成功更新了 `{count}` 个订阅\n',
                batchUpdateAllSynced: '📊 所有订阅节点信息已同步完成',
                singleUpdateSuccess: '┏━━━━━━━━━━━━━━━━━━━━━┓\n┃  🔄 订阅更新完成  ┃\n┗━━━━━━━━━━━━━━━━━━━━━┛\n\n',
                subName: '📌 *订阅名称*\n',
                nodeCount: '📊 *节点数量*\n',
                unnamed: '未命名',
                nodesSuffix: '个节点'
            },
            management: {
                urlEmpty: '订阅链接不能为空',
                urlInvalid: '请输入有效的 http:// 或 https:// 订阅链接',
                updated: '{name} 已更新',
                updateFailedMsg: '更新失败: {msg}',
                batchUpdated: '成功更新了 {count} 个订阅',
                batchFailedWithMessage: '更新失败: {msg}',
                batchFailed: '批量更新失败'
            }
        },
        node: {
            actions: {
                add: '新增节点',
                update: '更新节点',
                delete: '删除节点',
                clear: '清空节点',
                batchDelete: '批量删除节点',
                batchImport: '批量导入节点',
                deduplicate: '节点去重',
                autoSort: '自动排序'
            },
            management: {
                urlEmpty: '节点链接不能为空',
                importSuccess: '成功导入 {subs} 条订阅和 {nodes} 个手动节点',
                nodeSort: '节点排序'
            },
            selection: {
                selectFirst: '请先选择要复制的节点',
                copyMultiple: '已复制 {count} 个节点到剪贴板',
                copyFailed: '复制失败',
                copySingle: '已复制节点链接'
            },
            fetching: {
                fetchFailedPrefix: '获取节点信息失败: ',
                fetchFailed: '获取节点信息失败',
                unnamedNode: '未命名节点',
                fetchGroupFailedPrefix: '获取订阅组节点信息失败: ',
                refreshed: '节点信息已刷新',
                unknownAddress: '未知地址',
                vmessError: 'VMess 格式错误',
                urlError: 'URL 解析错误'
            },
            form: {
                newManualNode: '新增手动节点',
                editManualNode: '编辑手动节点',
                add: '添加',
                save: '保存',
                urlEmpty: '节点链接不能为空',
                urlInvalid: '无效的节点链接格式'
            },
            import: {
                fileTooLarge: '文件过大，请上传小于 5MB 的文件',
                fileRead: '已读取文件: {name}',
                fileReadError: '文件读取失败',
                importSuccessMethod: '🚀 {method}成功！共添加 {count} 个节点',
                parseFailed: '未能解析出任何节点，请检查内容或链接是否正确。',
                emptyUrl: '请输入订阅链接',
                invalidUrl: '请输入有效的 URL (例如 https://example.com/...)',
                importFailedMsg: '导入失败: {msg}',
                emptyContent: '请粘贴订阅内容或上传文件',
                importSuccess: '导入成功！共添加 {count} 个节点',
                subsDetected: '检测到 {count} 个订阅链接，请使用 URL 导入模式或在订阅管理中添加。',
                backendParseFailed: '后端解析也失败了',
                importFailedMsgExt: '导入失败: {msg}。支持节点链接、Clash(YAML)、Base64 等格式。'
            }
        },
        profile: {
            actions: {
                customIdExists: '自定义ID已存在，请修改',
                add: '新增订阅组',
                customIdEmpty: '自定义ID不能为空',
                customIdExists2: '自定义ID已存在',
                update: '更新订阅组',
                delete: '删除订阅组',
                clear: '清空订阅组',
                batchDelete: '批量删除订阅组',
                toggleStatus: '切换订阅组状态'
            },
            management: {
                tokenRequired: '请先在"设置"中配置"订阅组分享Token"',
                nameEmpty: '订阅组名称不能为空'
            }
        }
    },
    common: {

        api: {
            networkError: '网络请求失败',
            networkConnectionFail: '网络连接失败，请检查网络连接',
            formatError: '服务器响应格式错误',
            saveSuccess: '数据保存成功',
            saveFail: '保存失败',
            exportFail: '导出失败',
            importFail: '导入失败',
            authFail: '验证请求失败'
        },
        ui: {
            confirmDelete: '确认删除',
            modal: {
                confirm: '确认',
                title: '确认操作',
                body: '你确定要继续吗？',
                cancel: '取消'
            },
            batch: {
                deleteSelected: '删除选中',
                batchMode: '批量删除模式',
                selectedCount: '已选 {count}',
                selectAll: '全选',
                invertSelection: '反选',
                clearSelection: '清空选择',
                cancel: '取消'
            },
            bulk: {
                title: '批量导入',
                desc: '每行一个订阅链接或分享节点。将自动识别节点名称。'
            },
            confirm: {
                title: '确认操作',
                message: '您确定要执行此操作吗？',
                
                cancel: '取消'
            },
            pagination: {
                prev: '上一页',
                page: '第 {current}/{total} 页',
                next: '下一页'
            }
        }
    },
    layout: {
        sidebar: {
            title: 'Sub-One',
            subtitle: 'Manager',
            menu: {
                dashboard: '仪表盘',
                dashboardDesc: '概览状态',
                subscriptions: '订阅管理',
                subscriptionsDesc: '管理订阅源',
                profiles: '订阅组',
                profilesDesc: '组织订阅',
                nodes: '手动节点',
                nodesDesc: '管理节点',
            },
            mainFeatures: '主要功能',
            others: '其他',
            help: '帮助文档',
            helpDesc: '查看文档',
            settings: '设置',
            settingsDesc: '系统设置',
            collapse: '收起',
            expand: '展开',
            logout: '退出登录',
            openMenu: '打开菜单',
            closeMenu: '关闭菜单',
            switchToLight: '切换到亮色模式',
            switchToDark: '切换到暗色模式',
        },
        footer: {
            secure: '安全可靠',
            efficient: '高效管理',
            privacy: '隐私保护',
            rights: 'All Rights Reserved'
        }
    },
    views: {
        dashboard: {

            quotes: [
                { text: '成功不是终点，失败也不是终结，唯有勇气才是永恒。', author: '温斯顿·丘吉尔', category: '励志' },
                { text: '代码如诗，每一行都是对完美的追求。', author: '极客箴言', category: '技术' },
                { text: '今天的努力，是为了明天更好的自己。', author: '佚名', category: '励志' },
                { text: '优秀的程序员不是写代码最多的，而是删代码最多的。', author: '编程智慧', category: '技术' },
                { text: '保持简单，保持优雅，保持高效。', author: '设计哲学', category: '技术' },
                { text: '每一次调试，都是与bug的一场较量。', author: '程序员日常', category: '幽默' },
                { text: '不要害怕重构，害怕的应该是技术债。', author: '代码整洁之道', category: '技术' },
                { text: '真正的智慧不在于知道所有答案，而在于提出正确的问题。', author: '苏格拉底', category: '励志' },
                { text: '让代码自己说话，注释只是辅助。', author: '代码整洁之道', category: '技术' },
                { text: 'bug不会因为你忽视它而消失，只会在生产环境中惊艳亮相。', author: '墨菲定律', category: '幽默' },
                { text: '持续学习，永不止步。今天比昨天更强大。', author: '成长心态', category: '励志' },
                { text: '好的架构不是设计出来的，而是演化出来的。', author: '架构之道', category: '技术' },
                { text: '测试不是负担，而是对代码的信心保障。', author: 'TDD实践', category: '技术' },
                { text: '编程不仅是科学，更是艺术。', author: '高德纳', category: '技术' },
                { text: '越简单的方案，越容易维护。', author: 'KISS原则', category: '技术' }
            ],
            dailyQuote: '每日一言',
            dailyInspiration: 'Daily Inspiration',
            nextQuote: '换一条',
            nodeOverview: '节点概览',
            nodeDistribution: 'Node Distribution & Status',
            activeRate: '活跃率',
            activeSubscriptions: '活跃订阅',
            activeNodes: '活跃节点',
            profiles: '订阅组',
            manualNodes: '手动节点',
            updating: '正在更新...',
            updateNow: '立即更新',
            syncLatest: '正在同步最新节点信息',
            syncAll: '同步所有订阅源的节点信息',
            activeCount: '{count} Active',
            addSubscription: '添加订阅',
            supportsHttp: '支持 HTTP/HTTPS',
            addNode: '添加节点',
            supportsProtocols: '支持多种协议',
            createProfile: '创建订阅组',
            combineSubs: '组合订阅和节点',
            messages: {
                updateSuccess: '成功更新 {count} 个订阅',
                allUpToDate: '所有订阅已是最新状态',
                updateFailed: '更新失败'
            }
        },
        login: {
            subtitle: '现代化订阅管理平台',
            setupSubtitle: '首次使用，请创建管理员账号',
            username: '用户名',
            password: '密码',
            confirmPassword: '确认密码',
            createAdmin: '创建管理员账号',
            loginBtn: '立即登录',
            creating: '创建中...',
            loggingIn: '登录中...',
            secureTransport: '安全加密传输',
            placeholders: {
                username: '请输入您的用户名',
                password: '请输入您的密码',
                confirmPassword: '请再次输入密码'
            },
            errors: {
                emptyUsername: '请输入用户名',
                emptyPassword: '请输入密码',
                emptyConfirmPassword: '请确认密码',
                passwordMismatch: '两次输入的密码不一致',
                passwordTooShort: '密码长度至少为6位',
                loginFailed: '登录失败，请重试'
            }
        },
        nodes: {
            searchPlaceholder: '搜索节点...',
            addBtn: '新增',
            importBtn: '导入节点',
            saveSortBtn: '保存排序',
            sorting: '排序中',
            manualSortBtn: '手动排序',
            sortShortBtn: '排序',
            emptyTitle: '没有手动节点',
            emptyDesc: '添加分享链接或单个节点。',
            menus: {
                autoSort: '一键排序',
                deduplicate: '一键去重',
                batchDelete: '批量删除',
                clearAll: '清空所有'
            },
            clearAllModal: {
                title: '确认清空节点',
                desc: '您确定要删除所有<strong>手动节点</strong>吗？此操作将标记为待保存，不会影响订阅。'
            },
            deleteModal: {
                title: '确认删除节点',
                desc: '您确定要删除此手动节点吗？此操作将标记为待保存，不会影响订阅。'
            }
        },
        profiles: {
            addBtn: '新增',
            emptyTitle: '没有订阅组',
            emptyDesc: '创建一个订阅组来组合你的节点吧！',
            menus: {
                batchDelete: '批量删除',
                clearAll: '清空所有'
            },
            deleteModal: {
                title: '确认删除订阅组',
                desc: '您确定要删除此订阅组吗？此操作不可逆。'
            },
            clearAllModal: {
                title: '确认清空订阅组',
                desc: '您确定要删除所有<strong>订阅组</strong>吗？此操作不可逆。'
            }
        },
        subscriptions: {
            addBtn: '新增',
            updateAllBtn: '一键更新',
            updating: '更新中...',
            updateShortBtn: '更新',
            saveSortBtn: '保存排序',
            sorting: '排序中',
            manualSortBtn: '手动排序',
            sortShortBtn: '排序',
            emptyTitle: '没有订阅',
            emptyDesc: '从添加你的第一个订阅开始。',
            menus: {
                batchDelete: '批量删除',
                clearAll: '清空所有'
            },
            clearAllModal: {
                title: '确认清空订阅',
                desc: '您确定要删除所有<strong>订阅</strong>吗？此操作将标记为待保存，不会影响手动节点。'
            },
            deleteModal: {
                title: '确认删除订阅',
                desc: '您确定要删除此订阅吗？此操作将标记为待保存，不会影响手动节点。'
            }
        },
        tabs: {
            dashboard: {
                title: '仪表盘',
                desc: '概览您的订阅和节点状态'
            },
            subscriptions: {
                title: '订阅管理',
                desc: '管理您的所有机场订阅链接'
            },
            profiles: {
                title: '订阅组',
                desc: '创建和管理订阅组合'
            },
            nodes: {
                title: '手动节点',
                desc: '添加和管理单个节点链接'
            }
        }
    },
    widgets: {
        dashboard: {
            chart: {
                nodeDistribution: '节点分布',
                subscriptionNodes: '订阅节点',
                manualNodes: '手动节点'
            }
        },
        node: {
            manualCard: {
                copySuccess: '已复制节点链接',
                copyFail: '复制失败',
                edit: '编辑',
                delete: '删除',
                unnamed: '未命名节点',
                serverAddr: '服务器地址',
                copyLink: '复制完整链接',
                copyBtn: '复制'
            },
            modal: {
                optional: '(可选)',
                nameLabel: '节点名称',
                namePlaceholder: '留空时自动从链接提取',
                nameHint: '如留空，系统将自动从节点链接中提取名称',
                urlLabel: '节点链接',
                urlPlaceholder: 'vmess://... 或 ss://... 等节点分享链接',
                urlHint: '支持 VMess、VLESS、Trojan、SS/SSR、Hysteria、TUIC、Socks5、WireGuard、Snell 等协议',
                pasteTitle: '粘贴节点分享链接',
                pasteDesc: '从其他应用或网站复制节点分享链接，粘贴到上方输入框即可'
            },
            detailsModal: {
                title: '节点详情',
                unnamedSub: '未命名订阅',
                unnamedProfile: '未命名订阅组',
                contains: '包含 {subCount} 个订阅，{manualCount} 个手动节点',
                totalNodes: '共 {count} 个节点',
                lastUpdate: '上次更新: {count} 个',
                searchPlaceholder: '搜索节点名称或链接...',
                refresh: '刷新',
                copySelected: '复制选中',
                loading: '正在获取节点信息...',
                selectAll: '全选 ({selected}/{total})',
                manual: '手动',
                serverAddr: '服务器地址',
                copyLink: '复制链接',
                copyBtn: '复制',
                noMatch: '没有找到匹配的节点',
                empty: '暂无节点信息',
                close: '关闭'
            },
            importModal: {
                importBtn: '导入',
                title: '导入订阅',
                subtitle: '支持 URL 链接、纯文本、Base64 以及 Clash/YAML 配置文件',
                urlMode: '链接导入',
                textMode: '文本/文件导入',
                urlLabel: '订阅链接',
                hintTitle: '💡 提示：',
                urlHintDesc: '此模式通过后端服务器下载订阅内容，适合需要定期更新的订阅源。如果链接包含敏感参数（如 Token），它们将安全地传输给后端。',
                uploadTitle: '点击上传或拖拽文件',
                uploadDesc: '支持 YAML, JSON, TXT 等格式',
                contentLabel: '订阅内容',
                chars: '字符',
                contentPlaceholder: '在此处粘贴 Base64、节点链接列表或 Clash 配置内容...'
            }
        },
        profile: {
            card: {
                contains: '包含 {subCount} 个订阅，{nodeCount} 个节点',
                edit: '编辑',
                delete: '删除',
                enabled: '已启用',
                disabled: '已禁用',
                showNodes: '显示节点信息',
                nodesBtn: '节点',
                linkBtn: '链接'
            },
            modal: {
                newTitle: '新增订阅组',
                editTitle: '编辑订阅组',
                nameLabel: '订阅组名称',
                namePlaceholder: '例如：家庭共享',
                customIdLabel: '自定义 ID (订阅短链)',
                customIdPlaceholder: '如: home, game (限字母、数字、-、_)',
                generateIdBtn: '生成随机短 ID',
                linkPreview: '设置后，订阅链接会变为：/token/',
                expiresLabel: '到期时间 (可选)',
                expiresHint: '设置此订阅组的到期时间，到期后将返回默认节点。',
                selectSub: '选择订阅',
                selectAll: '全选',
                deselectAll: '全不选',
                searchSubPlaceholder: '搜索订阅...',
                unnamedSub: '未命名订阅',
                disabled: '(已禁用)',
                noSubFound: '没有找到订阅',
                selectManual: '选择手动节点',
                searchNodePlaceholder: '搜索节点...',
                unnamedNode: '未命名节点',
                noNodeFound: '没有找到节点'
            },
            exportModal: {
                generalSub: '通用订阅',
                noTokenError: '该订阅组未配置分享 Token，无法导出',
                copySuccess: '已复制 {name} 订阅链接',
                copyFail: '复制失败',
                title: '导出订阅',
                tokenHint: '请确保已在设置中配置了 <strong>订阅组分享 Token</strong>，否则链接无法访问。',
                copyLink: '复制链接',
                cancel: '取消'
            }
        },
        settings: {
            storage: {
                loadFail: '加载存储后端信息失败',
                migrating: '正在迁移数据并切换存储后端...',
                migrateFail: '数据迁移失败',
                switchFail: '切换失败',
                switchSuccess: '切换成功！已自动迁移 {count} 项数据',
                migrateSwitchFail: '迁移或切换存储后端失败',
                opFail: '操作失败：{error}',
                title: '存储后端设置',
                desc: '管理应用数据的存储位置',
                refresh: '刷新状态',
                currentlyUsing: '当前正在使用',
                running: '运行中',
                switchTitle: '切换存储后端',
                current: '(当前)',
                kvDesc: '读取速度极快，适合数据量较小的场景。',
                d1Desc: '功能强大，适合大量订阅和复杂查询。',
                cannotSwitch: '无法切换存储后端',
                cannotSwitchHint: '仅检测到一个可用的存储后端。如需使用 D1 存储，请在 Cloudflare 控制台创建名为 <strong class="text-primary-600 dark:text-primary-400">sub-one-d1</strong> 的 D1 数据库并绑定到项目变量 <code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800 dark:text-gray-200">SUB_ONE_D1</code>。',
                checking: '正在检查存储后端配置...',
                confirmTitle: '切换存储后端',
                confirmBtn: '确认切换',
                cancelBtn: '再想想',
                switchConfirmText: '您即将从 <strong class="text-gray-900 dark:text-white">{current}</strong> 切换到 <strong class="text-primary-600 dark:text-primary-400">{target}</strong>。',
                autoMigrate: '自动数据迁移',
                autoMigrateHint: '系统将自动把您的<strong>订阅源、订阅组、系统设置和用户账号</strong>全量迁移到新存储后端。原有数据将保留，但切换后的新数据将写入到新后端。',
                refreshHint: '切换成功后，页面将自动刷新以应用更改。'
            },
            help: {
                title: '帮助中心',
                subtitle: 'Documentation & Guides',
                tab_guide: '🚀 快速上手',
                tab_features: '✨ 功能详解',
                tab_faq: '❓ 常见问题',
                faq: {
                    add_q: '如何添加订阅？',
                    add_a: '在首页点击"添加订阅"按钮，输入订阅链接（支持 HTTP/HTTPS），系统会自动解析其中的节点信息。支持 Clash、Surge、V2Ray 等多种格式链接。',
                    export_q: '如何生成订阅链接？',
                    export_a: '在仪表盘或订阅组卡片中，点击"导出"或"链接"按钮。选择您需要的客户端格式（如 Clash, Shadowrocket），然后点击复制即可。',
                    clients_q: '支持哪些客户端格式？',
                    clients_a: 'Sub-One 支持几乎所有主流客户端，包括 Clash (Meta), Surge, Loon, Egern, Shadowrocket, Quantumult X, Sing-Box, V2Ray, Surfboard 等。',
                    token_q: '什么是订阅 Token？',
                    token_a: '订阅 Token 是用于生成固定订阅链接的密钥。在"系统设置"中配置后，您的订阅链接将包含此 Token，即使服务器重启或迁移，只要 Token 不变，链接依然有效。',
                    batch_q: '如何进行批量操作？',
                    batch_a: '在订阅列表页，点击右上角的"多选/批量"图标进入批量模式。选择多个订阅后，可以进行批量删除、批量更新或批量启用/禁用操作。'
                },
                features: {
                    sub_title: '订阅管理',
                    sub_desc: '支持多种格式订阅自动解析，流量与过期时间监控，定时自动更新。',
                    profile_title: '订阅组',
                    profile_desc: '将多个订阅源组合成一个大的订阅，支持自定义筛选规则和排除规则。',
                    manual_title: '手动节点',
                    manual_desc: '支持手动添加单个节点，或批量导入节点链接，支持智能去重排序。',
                    convert_title: '格式转换',
                    convert_desc: '内置强大的格式转换引擎，支持生成适配各种主流客户端的配置文件。'
                },
                guide: {
                    step1_title: '添加订阅源',
                    step1_desc: '在首页点击<span class="font-bold text-primary-600"> + 添加订阅</span>按钮，粘贴您的机场订阅链接。系统会自动下载并解析所有节点信息。',
                    step2_title: '创建订阅组 (可选)',
                    step2_desc: '如果您有多个订阅，可以创建一个 <span class="font-bold text-secondary-600">订阅组</span>。 将它们聚合在一起，还可以设置过滤规则来排除不需要的节点。',
                    step3_title: '导出使用',
                    step3_desc: '点击订阅或订阅组上的 <span class="font-bold text-success-600">导出/链接</span> 按钮。 选择适配您的客户端（如 Clash, Shadowrocket）的格式， 复制链接即可使用。'
                }
            },
            modal: {
                title: '系统设置',
                loading: '正在加载配置...',
                loadFail: '加载设置失败，将使用默认值',
                noWhitespace: '输入项中不能包含空格，请检查后再试。',
                saveSuccess: '设置已保存',
                saveSuccessRefresh: '设置已保存，页面将自动刷新...',
                saveFail: '保存失败',
                copySuccess: '触发链接已复制到剪贴板',
                copyFail: '复制失败，请手动复制',
                saveDisabled: '输入内容包含空格，无法保存',
                tabGeneral: '常规设置',
                tabAdvanced: '高级设置',
                tabStorage: '存储与备份',
                basic: {
                    title: '基础配置',
                    filename: '自定义订阅文件名',
                    filenamePlaceholder: '例如：my_subscription',
                    token: '自定义订阅Token',
                    tokenPlaceholder: '用于访问订阅链接的Token'
                },
                profile: {
                    title: '订阅组与节点',
                    token: '订阅组分享Token',
                    tokenPlaceholder: '例如：my（必须与订阅Token不同）',
                    tokenHint: '重要：此Token必须与"自定义订阅Token"不同。留空则无法使用订阅组分享。',
                    prefixLabel: '节点名前缀',
                    prefixTitle: '自动添加前缀',
                    prefixDesc: '将订阅名作为节点名前缀',
                    dedupeLabel: '节点去重',
                    dedupeTitle: '自动去重',
                    dedupeDesc: '去除相同节点(IP+Port)'
                },
                convert: {
                    title: '订阅转换方式',
                    useExternal: '使用外部转换API',
                    useExternalDesc: '关闭时使用后端自带转换',
                    apiUrl: '外部转换API地址',
                    manualInput: '-- 手动输入 --',
                    apiUrlPlaceholder: '例如：api-suc.0z.gs',
                    apiUrlHint: '提示：直接填写域名即可，系统会自动补全路径并拼接参数。'
                },
                tg: {
                    title: 'Telegram 通知',
                    token: 'Bot Token',
                    tokenPlaceholder: '从 @BotFather 获取的Bot Token',
                    chatId: 'Chat ID',
                    chatIdPlaceholder: '接收通知的聊天ID'
                },
                notify: {
                    title: '通知阈值',
                    expireDays: '到期提醒阈值（天）',
                    daysPlaceholder: '例如：3',
                    expireHint: '当订阅剩余天数小于此值时发送提醒',
                    trafficPercent: '流量提醒阈值（%）',
                    percentPlaceholder: '例如：90',
                    trafficHint: '当流量使用超过此百分比时发送提醒'
                },
                cron: {
                    title: '自动更新(Cron)配置',
                    enable: '启用定时更新',
                    enableDesc: '开启后，可通过第三方 Cron 服务自动更新订阅',
                    secret: 'Cron 安全密钥（Token）',
                    secretPlaceholder: '任意复杂的字符串，例如：my_secret_token',
                    hint1: '配置后，您可以使用第三方工具（如 UptimeRobot、宝塔计划任务）定期请求：<br />',
                    hint2: '如果您使用的是 Cloudflare Pages，由于平台限制必须通过这种接口方式触发定时任务；Docker 用户自带内部定时器，可选择配置。',
                    triggerUrl: '生成的专属触发链接：',
                    copy: '复制链接',
                    disabled: '定时更新功能已关闭'
                },
                storage: {
                    title: '存储设置'
                }
            },
            backup: {
                snapshotCreateSuccess: '快照创建成功',
                snapshotCreateFail: '创建快照失败',
                deletingSnapshots: '正在删除 {count} 个快照...',
                deleteSnapshotsSuccess: '成功删除 {count} 个快照',
                batchDeleteFail: '批量删除失败',
                batchDeleteError: '批量删除过程中发生错误',
                snapshotDeleted: '快照已删除',
                snapshotDeleteFail: '删除快照失败',
                restoringSnapshot: '正在恢复快照，请稍候...',
                snapshotRestoreSuccess: '快照恢复成功，页面即将刷新...',
                snapshotRestoreFail: '快照恢复失败',
                exportFail: '导出失败',
                exportSuccess: '备份文件已导出',
                exportError: '导出备份失败',
                formatError: '备份文件格式错误',
                validateSuccess: '备份文件验证成功',
                formatCorrupt: '备份文件格式错误或损坏',
                onlyJson: '仅支持 JSON 格式的备份文件',
                selectFileFirst: '请先选择备份文件',
                importFail: '导入失败',
                importSuccess: '数据恢复成功，页面即将刷新...',
                importError: '导入备份失败',
                snapshotTitle: '服务器快照',
                storageFeature: '储存功能',
                snapshotDesc: '在服务器上保存数据的历史版本，随时快速恢复 (保留最近 20 条)',
                snapshotNamePlaceholder: '快照名称 (可选)',
                createSnapshot: '创建快照',
                noSnapshots: '还没有任何服务器快照',
                selectAll: '全选',
                cancel: '取消',
                deleteSelected: '删除选中',
                batchManage: '批量管理',
                subscriptions: '订阅',
                manualNodes: '手动',
                totalNodes: '总节点',
                restore: '恢复',
                delete: '删除',
                exportTitle: '导出备份',
                exportDesc: '下载包含所有数据的 JSON 文件到本地',
                exporting: '正在导出...',
                exportData: '导出数据',
                exportHint: '包含订阅源、订阅组、手动节点、系统设置和账号信息。包括敏感数据（如密码哈希），请妥善保管。',
                importTitle: '导入备份',
                importDesc: '从本地 JSON 文件恢复数据',
                dropZoneTitle: '点击选择或拖拽文件到此处',
                dropZoneDesc: '支持 .json 格式备份文件',
                backupReady: '备份文件已就绪',
                version: '版本',
                statSubs: '订阅源',
                statProfiles: '订阅组',
                statManual: '手动节点',
                statTotal: '总节点',
                statUsers: '用户',
                restoreModeLabel: '选择恢复方式',
                modeMerge: '合并模式 (推荐)',
                modeMergeDesc: '保留现有数据，仅添加新项',
                modeOverwrite: '覆盖模式',
                modeOverwriteDesc: '清空现有数据，完全替换',
                restoring: '恢复数据中...',
                confirmRestore: '确认开始恢复',
                confirmBatchDeleteTitle: '确认批量删除',
                confirmBatchDeleteMsg: '您确定要删除选中的 <strong>{count}</strong> 个快照吗？删除后将无法恢复。',
                batchDeleteBtn: '批量删除',
                confirmDeleteTitle: '确认删除快照',
                confirmDeleteMsg: '您确定要删除此快照吗？删除后将无法恢复。',
                confirmRestoreTitle: '确认恢复快照',
                confirmRestoreOverwriteMsg: '确定要从快照恢复并 <strong class="text-danger-500">覆盖</strong> 现有数据吗？此操作不可撤销！',
                confirmRestoreMergeMsg: '确定要从快照恢复（合并）数据吗？',
                confirmImportTitle: '确认导入备份',
                confirmImportOverwriteMsg: '确定要覆盖现有数据吗？现有数据将被完全替换，此操作不可撤销！',
                confirmImportMergeMsg: '确定要导入备份数据吗？现有数据将保留。',
                startImportBtn: '开始导入'
            }
        },
        subscription: {
            modal: {
                basicInfo: '基础信息',
                subName: '订阅名称',
                optional: '(可选)',
                namePlaceholder: '留空自动提取',
                subUrl: '订阅链接',
                urlPlaceholder: 'https://example.com/sub?token=xxx',
                nameHint: '名称留空将自动从链接中提取',
                advancedOptions: '高级选项',
                filterRules: '节点过滤规则',
                filterPlaceholder: '输入节点过滤规则...',
                filterHint1: '支持正则表达式，多个规则用换行分隔。使用 ',
                filterHintKeep: 'keep:',
                filterHint2: ' 前缀表示白名单',
                addHintTitle: '添加订阅后自动获取节点',
                addHintDesc: '保存后系统将自动从订阅链接获取节点数量和流量信息'
            },
            card: {
                copySuccess: '链接已复制到剪贴板',
                copyFailed: '复制失败',
                unnamed: '未命名订阅',
                filterEnabledMsg: '已启用规则过滤: ',
                filterLabel: '规则过滤',
                edit: '编辑',
                delete: '删除',
                subUrl: '订阅链接',
                hideUrlTitle: '隐藏链接',
                showUrlTitle: '显示链接',
                hideBtn: '隐藏',
                showBtn: '显示',
                copyUrlTitle: '复制链接',
                copyBtn: '复制',
                trafficUsage: '流量使用',
                usedPrefix: '已用',
                enabled: '已启用',
                disabled: '已禁用',
                testing: '测试中...',
                available: '可用',
                unavailable: '不可用',
                testConn: '测试连接',
                nodes: '节点',
                updating: '更新中...',
                updateSub: '更新订阅'
            },
            filterEditor: {
                excludeMode: '排除模式',
                blacklist: '(黑名单)',
                keepMode: '保留模式',
                whitelist: '(白名单)',
                rulesCount: '{count} 条规则',
                clear: '清空',
                protocolType: '协议类型',
                selected: '已选',
                count: '个',
                commonRegions: '常用地区',
                keywordFilter: '关键词过滤',
                keywordPlaceholder: '✍️ 输入关键词后回车添加...',
                addBtn: '添加',
                manualEdit: '手动编辑',
                rulePreview: '规则预览',
                visualMode: '📊 可视化模式',
                manualMode: '⌨️ 手动编辑',
                manualPlaceholder: '在此手动编辑过滤规则...',
                autoPlaceholder: '规则将自动生成在这里',
                hint: '💡 提示：选择上方的选项来创建过滤规则',
                clearTitle: '确认清空规则',
                clearMsg1: '确定要清空所有过滤规则吗？',
                clearMsg2: '此操作将清除所有已选的协议、地区和关键词。',
                regions: {
                    hk: '香港', tw: '台湾', sg: '新加坡', jp: '日本', us: '美国',
                    kr: '韩国', cn: '中国', gb: '英国', de: '德国', fr: '法国',
                    nl: '荷兰', au: '澳洲', ca: '加拿大', in: '印度', ru: '俄罗斯',
                    tr: '土耳其', ar: '阿根廷', th: '泰国', vn: '越南', ph: '菲律宾',
                    my: '马来西亚', it: '意大利', ch: '瑞士', se: '瑞典', ae: '阿联酋', br: '巴西'
                },
                keywords: {
                    highMultiplier: '高倍率', lowMultiplier: '低倍率', transit: '中转', direct: '直连',
                    dedicated: '专线', bgp: 'BGP', iplc: 'IPLC', iepl: 'IEPL', ipv6: 'IPv6', udp: 'UDP',
                    homeBroadband: '家宽', native: '原生', test: '测试', maintenance: '维护',
                    expired: '过期', remainingTraffic: '剩余流量', official: '官网',
                    nf: 'NF', netflix: 'Netflix', disney: 'Disney', disPlus: 'Dis+',
                    chatgpt: 'ChatGPT', openai: 'OpenAI', youtube: 'YouTube', emby: 'Emby',
                    tiktok: 'TikTok', tvb: 'TVB'
                }
            }
        }
    },
    app: {
        stores: {
            session: {
                loginFailed: '登录失败',
                initFailed: '初始化失败'
            },
            data: {
                dataChanged: '数据变动',
                savedSuffix: '已保存',
                saveFailedPrefix: '保存失败: ',
                saveError: '保存数据时发生未知错误'
            },
            theme: {
                lightMode: '明亮模式',
                darkMode: '暗黑模式',
                switchToDark: '点击切换到暗黑模式',
                switchToLight: '点击切换到明亮模式'
            }
        }
    }
};
