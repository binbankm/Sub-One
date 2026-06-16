export default {
    entities: {
        subscription: {
            modal: {
            convert: {
                title: 'Subscription Conversion',
                useExternal: 'Use External API',
                useExternalDesc: 'Use built-in conversion when off',
                apiUrl: 'External API URL',
                manualInput: '-- Manual Input --',
                apiUrlPlaceholder: 'e.g., api-suc.0z.gs',
                apiUrlHint: 'Hint: Enter the domain name directly. The system will autocomplete the path and parameters.'
            },
            tg: {
                title: 'Telegram Notification',
                tokenPlaceholder: 'Bot Token from @BotFather',
                chatIdPlaceholder: 'Chat ID for receiving notifications'
            },
            notify: {
                title: 'Notification Thresholds',
                expireDays: 'Expiration Threshold (Days)',
                daysPlaceholder: 'e.g., 3',
                expireHint: 'Send a reminder when remaining days are less than this value',
                trafficPercent: 'Traffic Threshold (%)',
                percentPlaceholder: 'e.g., 90',
                trafficHint: 'Send a reminder when traffic usage exceeds this percentage'
            },
            cron: {
                title: 'Auto Update (Cron) Configuration',
                enable: 'Enable Scheduled Update',
                enableDesc: 'When enabled, subscriptions can be auto-updated via third-party Cron services',
                secret: 'Cron Security Token',
                secretPlaceholder: 'Any complex string, e.g., my_secret_token',
                hint1: 'Once configured, you can use third-party tools (like UptimeRobot) to periodically request:<br />',
                hint2: 'If you use Cloudflare Pages, you must trigger tasks via this interface due to platform limits. Docker users have an internal timer and can optionally configure this.',
                triggerUrl: 'Generated Trigger URL:'
            },
                addTitle: 'Add Subscription',
                editTitle: 'Edit Subscription',
                addBtn: 'Add',
                saveBtn: 'Save',
                urlEmpty: 'Subscription URL cannot be empty',
                urlInvalidScheme: 'Subscription URL must start with http:// or https://',
                urlInvalid: 'Invalid URL format',
                fixErrors: 'Please fix the errors before saving'
            },
            actions: {
                add: 'Add Subscription',
                update: 'Update Subscription',
                delete: 'Delete Subscription',
                clear: 'Clear Subscriptions',
                batchImport: 'Batch Import Subscriptions',
                updateFailed: 'Update failed',
                noEnabled: 'No enabled subscriptions',
                tgFail: 'Failed to send TG notification:'
            },
            tg: {
                batchUpdateSuccess: '┏━━━━━━━━━━━━━━━━━━━━━┓\n┃  🔄 Batch Update Done  ┃\n┗━━━━━━━━━━━━━━━━━━━━━┛\n\n',
                batchUpdateSynced: '📊 Dashboard data synced',
                batchUpdateSuccessMsg: 'Successfully updated `{count}` subscriptions\n',
                batchUpdateAllSynced: '📊 All subscription nodes synced',
                singleUpdateSuccess: '┏━━━━━━━━━━━━━━━━━━━━━┓\n┃  🔄 Sub Update Done   ┃\n┗━━━━━━━━━━━━━━━━━━━━━┛\n\n',
                subName: '📌 *Subscription*\n',
                nodeCount: '📊 *Node Count*\n',
                unnamed: 'Unnamed',
                nodesSuffix: 'nodes'
            },
            management: {
                urlEmpty: 'Subscription URL cannot be empty',
                urlInvalid: 'Please enter a valid http:// or https:// subscription URL',
                updated: '{name} updated',
                updateFailedMsg: 'Update failed: {msg}',
                batchUpdated: 'Successfully updated {count} subscriptions',
                batchFailedWithMessage: 'Update failed: {msg}',
                batchFailed: 'Batch update failed'
            }
        },
        node: {
            actions: {
                add: 'Add Node',
                update: 'Update Node',
                delete: 'Delete Node',
                clear: 'Clear Nodes',
                batchDelete: 'Batch Delete Nodes',
                batchImport: 'Batch Import Nodes',
                deduplicate: 'Deduplicate Nodes',
                autoSort: 'Auto Sort'
            },
            management: {
                urlEmpty: 'Node URL cannot be empty',
                importSuccess: 'Successfully imported {subs} subscriptions and {nodes} manual nodes',
                nodeSort: 'Node Sorting'
            },
            selection: {
                selectFirst: 'Please select nodes to copy first',
                copyMultiple: 'Copied {count} nodes to clipboard',
                copyFailed: 'Copy failed',
                copySingle: 'Copied node URL'
            },
            fetching: {
                fetchFailedPrefix: 'Failed to fetch node info: ',
                fetchFailed: 'Failed to fetch node info',
                unnamedNode: 'Unnamed Node',
                fetchGroupFailedPrefix: 'Failed to fetch profile node info: ',
                refreshed: 'Node info refreshed',
                unknownAddress: 'Unknown address',
                vmessError: 'VMess format error',
                urlError: 'URL parse error'
            },
            form: {
                newManualNode: 'Add Manual Node',
                editManualNode: 'Edit Manual Node',
                add: 'Add',
                save: 'Save',
                urlEmpty: 'Node URL cannot be empty',
                urlInvalid: 'Invalid node URL format'
            },
            import: {
                fileTooLarge: 'File is too large, please upload a file smaller than 5MB',
                fileRead: 'File read: {name}',
                fileReadError: 'Failed to read file',
                importSuccessMethod: '🚀 {method} successful! Added {count} nodes',
                parseFailed: 'Failed to parse any nodes, please check the content or URL.',
                emptyUrl: 'Please enter a subscription URL',
                invalidUrl: 'Please enter a valid URL (e.g. https://example.com/...)',
                importFailedMsg: 'Import failed: {msg}',
                emptyContent: 'Please paste subscription content or upload a file',
                importSuccess: 'Import successful! Added {count} nodes',
                subsDetected: 'Detected {count} subscription URLs, please use URL import mode or add them in Subscription Management.',
                backendParseFailed: 'Backend parsing also failed',
                importFailedMsgExt: 'Import failed: {msg}. Supported formats: node links, Clash(YAML), Base64, etc.'
            }
        },
        profile: {
            actions: {
                customIdExists: 'Custom ID already exists, please modify',
                add: 'Add Profile',
                customIdEmpty: 'Custom ID cannot be empty',
                customIdExists2: 'Custom ID already exists',
                update: 'Update Profile',
                delete: 'Delete Profile',
                clear: 'Clear Profiles',
                batchDelete: 'Batch Delete Profiles',
                toggleStatus: 'Toggle Profile Status'
            },
            management: {
                tokenRequired: 'Please configure "Profile Share Token" in Settings first',
                nameEmpty: 'Profile name cannot be empty'
            }
        }
    },
    common: {

        api: {
            networkError: 'Network request failed',
            networkConnectionFail: 'Network connection failed, please check your connection',
            formatError: 'Server response format error',
            saveSuccess: 'Data saved successfully',
            saveFail: 'Save failed',
            exportFail: 'Export failed',
            importFail: 'Import failed',
            authFail: 'Authentication request failed'
        },
        ui: {
            confirmDelete: 'Confirm Deletion',
            modal: {
                confirm: 'Confirm',
                title: 'Confirm Operation',
                body: 'Are you sure you want to continue?',
                cancel: 'Cancel'
            },
            batch: {
                deleteSelected: 'Delete Selected',
                batchMode: 'Batch Delete Mode',
                selectedCount: 'Selected {count}',
                selectAll: 'Select All',
                invertSelection: 'Invert Selection',
                clearSelection: 'Clear Selection',
                cancel: 'Cancel'
            },
            bulk: {
                title: 'Bulk Import',
                desc: 'One subscription link or share node per line. Node names will be recognized automatically.'
            },
            confirm: {
                confirm: 'Confirm',
                title: 'Confirm Operation',
                message: 'Are you sure you want to perform this operation?',
                
                cancel: 'Cancel'
            },
            pagination: {
                prev: 'Previous',
                page: 'Page {current} of {total}',
                next: 'Next'
            }
        }
    },
    layout: {
        sidebar: {
            title: 'Sub-One',
            subtitle: 'Manager',
            menu: {
                dashboard: 'Dashboard',
                dashboardDesc: 'Overview Status',
                subscriptions: 'Subscriptions',
                subscriptionsDesc: 'Manage Sources',
                profiles: 'Profiles',
                profilesDesc: 'Organize Subs',
                nodes: 'Manual Nodes',
                nodesDesc: 'Manage Nodes',
            },
            mainFeatures: 'Main Features',
            others: 'Others',
            help: 'Help',
            helpDesc: 'View Docs',
            settings: 'Settings',
            settingsDesc: 'System Settings',
            collapse: 'Collapse',
            expand: 'Expand',
            logout: 'Logout',
            openMenu: 'Open Menu',
            closeMenu: 'Close Menu',
            switchToLight: 'Switch to Light Mode',
            switchToDark: 'Switch to Dark Mode',
        },
        footer: {
            secure: 'Secure & Reliable',
            efficient: 'Efficient Management',
            privacy: 'Privacy Protection',
            rights: 'All Rights Reserved'
        }
    },
    views: {
        dashboard: {

            quotes: [
                { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill', category: 'Inspirational' },
                { text: 'Code is like poetry; every line is a pursuit of perfection.', author: 'Geek Proverb', category: 'Technical' },
                { text: 'Today\'s effort is for a better version of yourself tomorrow.', author: 'Anonymous', category: 'Inspirational' },
                { text: 'Great programmers don\'t write the most code; they delete the most code.', author: 'Programming Wisdom', category: 'Technical' },
                { text: 'Keep it simple, elegant, and efficient.', author: 'Design Philosophy', category: 'Technical' },
                { text: 'Every debugging session is a battle against bugs.', author: 'Programmer Daily', category: 'Humor' },
                { text: 'Don\'t fear refactoring; fear technical debt.', author: 'Clean Code', category: 'Technical' },
                { text: 'True wisdom lies not in knowing all the answers, but in asking the right questions.', author: 'Socrates', category: 'Inspirational' },
                { text: 'Let the code speak for itself; comments are just assistants.', author: 'Clean Code', category: 'Technical' },
                { text: 'Bugs don\'t disappear by ignoring them; they simply make a stunning debut in production.', author: 'Murphy\'s Law', category: 'Humor' },
                { text: 'Continuous learning, never stop. Stronger today than yesterday.', author: 'Growth Mindset', category: 'Inspirational' },
                { text: 'Good architecture is not designed, but evolved.', author: 'The Tao of Architecture', category: 'Technical' },
                { text: 'Testing is not a burden, but a guarantee of confidence in your code.', author: 'TDD Practice', category: 'Technical' },
                { text: 'Programming is not only a science but an art.', author: 'Donald Knuth', category: 'Technical' },
                { text: 'The simpler the solution, the easier it is to maintain.', author: 'KISS Principle', category: 'Technical' }
            ],
            dailyQuote: 'Daily Quote',
            dailyInspiration: 'Daily Inspiration',
            nextQuote: 'Next Quote',
            nodeOverview: 'Node Overview',
            nodeDistribution: 'Node Distribution & Status',
            activeRate: 'Active Rate',
            activeSubscriptions: 'Active Subs',
            activeNodes: 'Active Nodes',
            profiles: 'Profiles',
            manualNodes: 'Manual Nodes',
            updating: 'Updating...',
            updateNow: 'Update Now',
            syncLatest: 'Synchronizing latest node info',
            syncAll: 'Sync node info for all subscriptions',
            activeCount: '{count} Active',
            addSubscription: 'Add Subscription',
            supportsHttp: 'Supports HTTP/HTTPS',
            addNode: 'Add Node',
            supportsProtocols: 'Supports multiple protocols',
            createProfile: 'Create Profile',
            combineSubs: 'Combine subs and nodes',
            messages: {
                updateSuccess: 'Successfully updated {count} subscriptions',
                allUpToDate: 'All subscriptions are up to date',
                updateFailed: 'Update failed'
            }
        },
        login: {
            subtitle: 'Modern Subscription Management',
            setupSubtitle: 'First time use, please create an admin account',
            username: 'Username',
            password: 'Password',
            confirmPassword: 'Confirm Password',
            createAdmin: 'Create Admin Account',
            loginBtn: 'Login',
            creating: 'Creating...',
            loggingIn: 'Logging in...',
            secureTransport: 'Secure Encrypted Transport',
            placeholders: {
                username: 'Enter your username',
                password: 'Enter your password',
                confirmPassword: 'Enter password again'
            },
            errors: {
                emptyUsername: 'Please enter a username',
                emptyPassword: 'Please enter a password',
                emptyConfirmPassword: 'Please confirm your password',
                passwordMismatch: 'Passwords do not match',
                passwordTooShort: 'Password must be at least 6 characters',
                loginFailed: 'Login failed, please try again'
            }
        },
        nodes: {
            searchPlaceholder: 'Search nodes...',
            addBtn: 'Add',
            importBtn: 'Import Nodes',
            saveSortBtn: 'Save Order',
            sorting: 'Sorting...',
            manualSortBtn: 'Manual Sort',
            sortShortBtn: 'Sort',
            emptyTitle: 'No Manual Nodes',
            emptyDesc: 'Add share links or individual nodes.',
            menus: {
                autoSort: 'Auto Sort',
                deduplicate: 'Deduplicate',
                batchDelete: 'Batch Delete',
                clearAll: 'Clear All'
            },
            clearAllModal: {
                title: 'Confirm Clear Nodes',
                desc: 'Are you sure you want to delete all <strong>manual nodes</strong>? This action will not affect subscriptions.'
            },
            deleteModal: {
                title: 'Confirm Delete Node',
                desc: 'Are you sure you want to delete this manual node? This action will not affect subscriptions.'
            }
        },
        profiles: {
            addBtn: 'Add',
            emptyTitle: 'No Profiles',
            emptyDesc: 'Create a profile to organize your nodes!',
            menus: {
                batchDelete: 'Batch Delete',
                clearAll: 'Clear All'
            },
            deleteModal: {
                title: 'Confirm Delete Profile',
                desc: 'Are you sure you want to delete this profile? This action is irreversible.'
            },
            clearAllModal: {
                title: 'Confirm Clear Profiles',
                desc: 'Are you sure you want to delete all <strong>profiles</strong>? This action is irreversible.'
            }
        },
        subscriptions: {
            addBtn: 'Add',
            updateAllBtn: 'Update All',
            updating: 'Updating...',
            updateShortBtn: 'Update',
            saveSortBtn: 'Save Order',
            sorting: 'Sorting...',
            manualSortBtn: 'Manual Sort',
            sortShortBtn: 'Sort',
            emptyTitle: 'No Subscriptions',
            emptyDesc: 'Start by adding your first subscription.',
            menus: {
                batchDelete: 'Batch Delete',
                clearAll: 'Clear All'
            },
            clearAllModal: {
                title: 'Confirm Clear Subscriptions',
                desc: 'Are you sure you want to delete all <strong>subscriptions</strong>? This action will not affect manual nodes.'
            },
            deleteModal: {
                title: 'Confirm Delete Subscription',
                desc: 'Are you sure you want to delete this subscription? This action will not affect manual nodes.'
            }
        },
        tabs: {
            dashboard: {
                title: 'Dashboard',
                desc: 'Overview of your subscriptions and nodes'
            },
            subscriptions: {
                title: 'Subscriptions',
                desc: 'Manage all your subscription links'
            },
            profiles: {
                title: 'Profiles',
                desc: 'Create and manage profile groups'
            },
            nodes: {
                title: 'Manual Nodes',
                desc: 'Add and manage individual node links'
            }
        }
    },
    widgets: {
        dashboard: {
            chart: {
                nodeDistribution: 'Node Distribution',
                subscriptionNodes: 'Subscription Nodes',
                manualNodes: 'Manual Nodes'
            }
        },
        node: {
            manualCard: {
                copySuccess: 'Node link copied',
                copyFail: 'Failed to copy',
                edit: 'Edit',
                delete: 'Delete',
                unnamed: 'Unnamed Node',
                serverAddr: 'Server Address',
                copyLink: 'Copy Full Link',
                copyBtn: 'Copy'
            },
            modal: {
                optional: '(Optional)',
                nameLabel: 'Node Name',
                namePlaceholder: 'Auto-extract if left empty',
                nameHint: 'If left empty, the system will auto-extract the name from the link',
                urlLabel: 'Node Link',
                urlPlaceholder: 'vmess://... or ss://... share links',
                urlHint: 'Supports VMess, VLESS, Trojan, SS/SSR, Hysteria, TUIC, Socks5, WireGuard, Snell etc.',
                pasteTitle: 'Paste Node Link',
                pasteDesc: 'Copy the node link from another app or website and paste it above'
            },
            detailsModal: {
                title: 'Node Details',
                unnamedSub: 'Unnamed Subscription',
                unnamedProfile: 'Unnamed Profile',
                contains: 'Contains {subCount} subscriptions, {manualCount} manual nodes',
                totalNodes: 'Total {count} nodes',
                lastUpdate: 'Last update: {count} nodes',
                searchPlaceholder: 'Search node name or link...',
                refresh: 'Refresh',
                copySelected: 'Copy Selected',
                loading: 'Fetching node info...',
                selectAll: 'Select All ({selected}/{total})',
                manual: 'Manual',
                serverAddr: 'Server Address',
                copyLink: 'Copy Link',
                copyBtn: 'Copy',
                noMatch: 'No matching nodes found',
                empty: 'No nodes info',
                close: 'Close'
            },
            importModal: {
                importBtn: 'Import',
                title: 'Import Subscription',
                subtitle: 'Supports URL, Plain Text, Base64, and Clash/YAML configurations',
                urlMode: 'URL Import',
                textMode: 'Text/File Import',
                urlLabel: 'Subscription URL',
                hintTitle: '💡 Hint:',
                urlHintDesc: 'This mode downloads subscription content via backend server, suitable for sources requiring regular updates. Sensitive parameters (like Tokens) are securely transmitted to backend.',
                uploadTitle: 'Click or drag file to upload',
                uploadDesc: 'Supports YAML, JSON, TXT, etc.',
                contentLabel: 'Content',
                chars: 'chars',
                contentPlaceholder: 'Paste Base64, node links, or Clash config here...'
            }
        },
        profile: {
            card: {
                contains: 'Contains {subCount} subscriptions, {nodeCount} nodes',
                edit: 'Edit',
                delete: 'Delete',
                enabled: 'Enabled',
                disabled: 'Disabled',
                showNodes: 'Show Nodes',
                nodesBtn: 'Nodes',
                linkBtn: 'Link'
            },
            modal: {
                newTitle: 'New Profile',
                editTitle: 'Edit Profile',
                nameLabel: 'Profile Name',
                namePlaceholder: 'e.g. Family Share',
                customIdLabel: 'Custom ID (Short Link)',
                customIdPlaceholder: 'e.g. home, game (letters, numbers, -, _)',
                generateIdBtn: 'Generate Random ID',
                linkPreview: 'Link will become: /token/',
                expiresLabel: 'Expiration Time (Optional)',
                expiresHint: 'Set an expiration time. Will return default nodes after expiration.',
                selectSub: 'Select Subscriptions',
                selectAll: 'Select All',
                deselectAll: 'Deselect All',
                searchSubPlaceholder: 'Search subscriptions...',
                unnamedSub: 'Unnamed Sub',
                disabled: '(Disabled)',
                noSubFound: 'No subscriptions found',
                selectManual: 'Select Manual Nodes',
                searchNodePlaceholder: 'Search nodes...',
                unnamedNode: 'Unnamed Node',
                noNodeFound: 'No nodes found'
            },
            exportModal: {
                generalSub: 'General Sub',
                noTokenError: 'This profile has no share Token configured, cannot export',
                copySuccess: '{name} subscription link copied',
                copyFail: 'Failed to copy',
                title: 'Export Subscription',
                tokenHint: 'Please ensure <strong>Profile Share Token</strong> is configured in settings, otherwise the link will be inaccessible.',
                copyLink: 'Copy Link',
                cancel: 'Cancel'
            }
        },
        settings: {
            storage: {
                loadFail: 'Failed to load storage backend info',
                migrating: 'Migrating data and switching storage backend...',
                migrateFail: 'Data migration failed',
                switchFail: 'Switch failed',
                switchSuccess: 'Switched successfully! Automatically migrated {count} items of data',
                migrateSwitchFail: 'Failed to migrate or switch storage backend',
                opFail: 'Operation failed: {error}',
                title: 'Storage Backend Settings',
                desc: 'Manage where application data is stored',
                refresh: 'Refresh Status',
                currentlyUsing: 'Currently Using',
                running: 'Running',
                switchTitle: 'Switch Storage Backend',
                current: '(Current)',
                kvDesc: 'Extremely fast read speed, suitable for small data scenarios.',
                d1Desc: 'Powerful, suitable for massive subscriptions and complex queries.',
                cannotSwitch: 'Cannot Switch Storage Backend',
                cannotSwitchHint: 'Only one available storage backend detected. To use D1 storage, please create a D1 database named <strong class="text-primary-600 dark:text-primary-400">sub-one-d1</strong> in the Cloudflare console and bind it to the project variable <code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800 dark:text-gray-200">SUB_ONE_D1</code>.',
                checking: 'Checking storage backend configuration...',
                confirmTitle: 'Switch Storage Backend',
                confirmBtn: 'Confirm Switch',
                cancelBtn: 'Let me think',
                switchConfirmText: 'You are about to switch from <strong class="text-gray-900 dark:text-white">{current}</strong> to <strong class="text-primary-600 dark:text-primary-400">{target}</strong>.',
                autoMigrate: 'Automatic Data Migration',
                autoMigrateHint: 'The system will automatically migrate all your <strong>subscriptions, profiles, system settings, and user accounts</strong> to the new storage backend. Original data will be preserved, but new data will be written to the new backend after switching.',
                refreshHint: 'After successful switch, the page will refresh automatically to apply changes.'
            },
            help: {
                title: 'Help Center',
                subtitle: 'Documentation & Guides',
                tab_guide: '🚀 Quick Start',
                tab_features: '✨ Features',
                tab_faq: '❓ FAQ',
                faq: {
                    add_q: 'How to add a subscription?',
                    add_a: 'Click the "Add Subscription" button on the home page, enter the subscription link (HTTP/HTTPS supported), and the system will automatically parse the node information. Supports multiple formats like Clash, Surge, V2Ray.',
                    export_q: 'How to generate a subscription link?',
                    export_a: 'On the dashboard or profile card, click the "Export" or "Link" button. Select your required client format (e.g. Clash, Shadowrocket), and click copy.',
                    clients_q: 'Which client formats are supported?',
                    clients_a: 'Sub-One supports almost all mainstream clients, including Clash (Meta), Surge, Loon, Egern, Shadowrocket, Quantumult X, Sing-Box, V2Ray, Surfboard, etc.',
                    token_q: 'What is a Subscription Token?',
                    token_a: 'Subscription Token is a key used to generate a fixed subscription link. After configuring it in "System Settings", your subscription link will contain this token. As long as the Token remains unchanged, the link remains valid even if the server restarts or migrates.',
                    batch_q: 'How to perform batch operations?',
                    batch_a: 'On the subscription list page, click the "Multi-select / Batch" icon in the upper right corner to enter batch mode. After selecting multiple subscriptions, you can perform batch delete, update, or enable/disable operations.'
                },
                features: {
                    sub_title: 'Subscription Management',
                    sub_desc: 'Supports automatic parsing of multiple subscription formats, traffic and expiration time monitoring, and scheduled automatic updates.',
                    profile_title: 'Profiles',
                    profile_desc: 'Combine multiple subscriptions into a large one, supports custom filter rules and exclusion rules.',
                    manual_title: 'Manual Nodes',
                    manual_desc: 'Supports manually adding single nodes, or batch importing node links, supports intelligent deduplication and sorting.',
                    convert_title: 'Format Conversion',
                    convert_desc: 'Built-in powerful format conversion engine, supports generating configuration files for various mainstream clients.'
                },
                guide: {
                    step1_title: 'Add Subscription Source',
                    step1_desc: 'Click the <span class="font-bold text-primary-600"> + Add Subscription</span> button on the home page, and paste your provider\'s subscription link. The system will automatically download and parse all node information.',
                    step2_title: 'Create Profile (Optional)',
                    step2_desc: 'If you have multiple subscriptions, you can create a <span class="font-bold text-secondary-600">Profile</span>. Aggregate them together, and you can also set filter rules to exclude unwanted nodes.',
                    step3_title: 'Export and Use',
                    step3_desc: 'Click the <span class="font-bold text-success-600">Export/Link</span> button on the subscription or profile. Select the format that fits your client (e.g. Clash, Shadowrocket), and copy the link to use it.'
                }
            },
            modal: {
                title: 'System Settings',
                loading: 'Loading config...',
                loadFail: 'Failed to load settings, using defaults',
                noWhitespace: 'Input cannot contain whitespace, please check and try again.',
                saveSuccess: 'Settings saved',
                saveSuccessRefresh: 'Settings saved, page will refresh automatically...',
                saveFail: 'Save failed',
                copySuccess: 'Trigger link copied to clipboard',
                copyFail: 'Copy failed, please copy manually',
                saveDisabled: 'Input contains whitespace, cannot save',
                tabGeneral: 'General',
                tabAdvanced: 'Advanced',
                tabStorage: 'Storage & Backup',
                basic: {
                    title: 'Basic Config',
                    filename: 'Custom Sub Filename',
                    filenamePlaceholder: 'e.g., my_subscription',
                    token: 'Custom Sub Token',
                    tokenPlaceholder: 'Token for accessing subscription links'
                },
                profile: {
                    title: 'Profile & Nodes',
                    token: 'Profile Share Token',
                    tokenPlaceholder: 'e.g., my (Must be different from Sub Token)',
                    tokenHint: 'Important: This token MUST be different from "Custom Sub Token". Leave empty to disable profile sharing.',
                    prefixLabel: 'Node Name Prefix',
                    prefixTitle: 'Auto Add Prefix',
                    prefixDesc: 'Use subscription name as node prefix',
                    dedupeLabel: 'Node Deduplication',
                    dedupeTitle: 'Auto Deduplicate',
                    dedupeDesc: 'Remove identical nodes (IP+Port)'
                },
                convert: {
                    title: 'Subscription Conversion',
                    useExternal: 'Use External API',
                    useExternalDesc: 'Use built-in conversion when disabled',
                    apiUrl: 'External API URL',
                    manualInput: '-- Manual Input --',
                    apiUrlPlaceholder: 'e.g., api-suc.0z.gs',
                    apiUrlHint: 'Hint: Just enter the domain name, the system will auto-complete the path and parameters.'
                },
                tg: {
                    title: 'Telegram Notification',
                    token: 'Bot Token',
                    tokenPlaceholder: 'Bot Token from @BotFather',
                    chatId: 'Chat ID',
                    chatIdPlaceholder: 'Chat ID to receive notifications'
                },
                notify: {
                    title: 'Notification Thresholds',
                    expireDays: 'Expiration Reminder (Days)',
                    daysPlaceholder: 'e.g., 3',
                    expireHint: 'Send reminder when remaining days are less than this value',
                    trafficPercent: 'Traffic Reminder (%)',
                    percentPlaceholder: 'e.g., 90',
                    trafficHint: 'Send reminder when traffic usage exceeds this percentage'
                },
                cron: {
                    title: 'Auto Update (Cron) Config',
                    enable: 'Enable Scheduled Update',
                    enableDesc: 'When enabled, subscriptions can be auto-updated via third-party Cron services',
                    secret: 'Cron Secret (Token)',
                    secretPlaceholder: 'Any complex string, e.g., my_secret_token',
                    hint1: 'Once configured, you can use third-party tools (like UptimeRobot) to periodically request:<br />',
                    hint2: 'If you are using Cloudflare Pages, due to platform limitations, you must use this API to trigger scheduled tasks. Docker users have built-in internal timers and can configure this optionally.',
                    triggerUrl: 'Generated Trigger Link:',
                    copy: 'Copy Link',
                    disabled: 'Scheduled update is disabled'
                },
                storage: {
                    title: 'Storage Settings'
                }
            },
            backup: {
                snapshotCreateSuccess: 'Snapshot created successfully',
                snapshotCreateFail: 'Failed to create snapshot',
                deletingSnapshots: 'Deleting {count} snapshots...',
                deleteSnapshotsSuccess: 'Successfully deleted {count} snapshots',
                batchDeleteFail: 'Batch delete failed',
                batchDeleteError: 'Error occurred during batch delete',
                snapshotDeleted: 'Snapshot deleted',
                snapshotDeleteFail: 'Failed to delete snapshot',
                restoringSnapshot: 'Restoring snapshot, please wait...',
                snapshotRestoreSuccess: 'Snapshot restored successfully, page will refresh...',
                snapshotRestoreFail: 'Failed to restore snapshot',
                exportFail: 'Export failed',
                exportSuccess: 'Backup file exported',
                exportError: 'Failed to export backup',
                formatError: 'Backup file format error',
                validateSuccess: 'Backup file validated successfully',
                formatCorrupt: 'Backup file format error or corrupted',
                onlyJson: 'Only JSON backup files are supported',
                selectFileFirst: 'Please select a backup file first',
                importFail: 'Import failed',
                importSuccess: 'Data restored successfully, page will refresh...',
                importError: 'Failed to import backup',
                snapshotTitle: 'Server Snapshots',
                storageFeature: 'Storage Feature',
                snapshotDesc: 'Save historical versions of data on the server for quick recovery (Keep latest 20)',
                snapshotNamePlaceholder: 'Snapshot name (Optional)',
                createSnapshot: 'Create Snapshot',
                noSnapshots: 'No server snapshots yet',
                selectAll: 'Select All',
                cancel: 'Cancel',
                deleteSelected: 'Delete Selected',
                batchManage: 'Batch Manage',
                subscriptions: 'Subs',
                manualNodes: 'Manual',
                totalNodes: 'Total',
                restore: 'Restore',
                delete: 'Delete',
                exportTitle: 'Export Backup',
                exportDesc: 'Download JSON file containing all data to local',
                exporting: 'Exporting...',
                exportData: 'Export Data',
                exportHint: 'Contains subscriptions, profiles, manual nodes, settings, and accounts. Includes sensitive data (e.g. password hashes), please keep it safe.',
                importTitle: 'Import Backup',
                importDesc: 'Restore data from local JSON file',
                dropZoneTitle: 'Click or drag file here',
                dropZoneDesc: 'Supports .json backup files',
                backupReady: 'Backup file ready',
                version: 'Version',
                statSubs: 'Subscriptions',
                statProfiles: 'Profiles',
                statManual: 'Manual Nodes',
                statTotal: 'Total Nodes',
                statUsers: 'Users',
                restoreModeLabel: 'Select Restore Mode',
                modeMerge: 'Merge Mode (Recommended)',
                modeMergeDesc: 'Keep existing data, only add new items',
                modeOverwrite: 'Overwrite Mode',
                modeOverwriteDesc: 'Clear existing data, replace completely',
                restoring: 'Restoring...',
                confirmRestore: 'Confirm Restore',
                confirmBatchDeleteTitle: 'Confirm Batch Delete',
                confirmBatchDeleteMsg: 'Are you sure you want to delete the selected <strong>{count}</strong> snapshots? This cannot be undone.',
                batchDeleteBtn: 'Batch Delete',
                confirmDeleteTitle: 'Confirm Delete',
                confirmDeleteMsg: 'Are you sure you want to delete this snapshot? This cannot be undone.',
                confirmRestoreTitle: 'Confirm Restore',
                confirmRestoreOverwriteMsg: 'Are you sure you want to restore and <strong class="text-danger-500">overwrite</strong> existing data? This action cannot be undone!',
                confirmRestoreMergeMsg: 'Are you sure you want to restore (merge) data from this snapshot?',
                confirmImportTitle: 'Confirm Import',
                confirmImportOverwriteMsg: 'Are you sure you want to overwrite existing data? Current data will be completely replaced, this action cannot be undone!',
                confirmImportMergeMsg: 'Are you sure you want to import backup data? Existing data will be preserved.',
                startImportBtn: 'Start Import'
            }
        },
        subscription: {
            modal: {
                basicInfo: 'Basic Info',
                subName: 'Subscription Name',
                optional: '(Optional)',
                namePlaceholder: 'Leave empty to auto-extract',
                subUrl: 'Subscription URL',
                urlPlaceholder: 'https://example.com/sub?token=xxx',
                nameHint: 'Name will be automatically extracted from the URL if left empty',
                advancedOptions: 'Advanced Options',
                filterRules: 'Node Filter Rules',
                filterPlaceholder: 'Enter node filter rules...',
                filterHint1: 'Supports regex, separate multiple rules with line breaks. Use ',
                filterHintKeep: 'keep:',
                filterHint2: ' prefix for whitelist',
                addHintTitle: 'Auto-fetch Nodes After Add',
                addHintDesc: 'System will automatically fetch node count and traffic info from the URL after saving'
            },
            card: {
                copySuccess: 'Link copied to clipboard',
                copyFailed: 'Copy failed',
                unnamed: 'Unnamed Subscription',
                filterEnabledMsg: 'Filter rule enabled: ',
                filterLabel: 'Rule Filtered',
                edit: 'Edit',
                delete: 'Delete',
                subUrl: 'Subscription URL',
                hideUrlTitle: 'Hide URL',
                showUrlTitle: 'Show URL',
                hideBtn: 'Hide',
                showBtn: 'Show',
                copyUrlTitle: 'Copy URL',
                copyBtn: 'Copy',
                trafficUsage: 'Traffic Usage',
                usedPrefix: 'Used',
                enabled: 'Enabled',
                disabled: 'Disabled',
                testing: 'Testing...',
                available: 'Available',
                unavailable: 'Unavailable',
                testConn: 'Test Connection',
                nodes: 'Nodes',
                updating: 'Updating...',
                updateSub: 'Update Subscription'
            },
            filterEditor: {
                excludeMode: 'Exclude Mode',
                blacklist: '(Blacklist)',
                keepMode: 'Keep Mode',
                whitelist: '(Whitelist)',
                rulesCount: '{count} rules',
                clear: 'Clear',
                protocolType: 'Protocol Type',
                selected: 'Selected',
                count: '',
                commonRegions: 'Common Regions',
                keywordFilter: 'Keyword Filter',
                keywordPlaceholder: '✍️ Press enter to add keyword...',
                addBtn: 'Add',
                manualEdit: 'Manual Edit',
                rulePreview: 'Rule Preview',
                visualMode: '📊 Visual Mode',
                manualMode: '⌨️ Manual Edit',
                manualPlaceholder: 'Edit filter rules manually here...',
                autoPlaceholder: 'Rules will be auto-generated here',
                hint: '💡 Tip: Select options above to create filter rules',
                clearTitle: 'Confirm Clear Rules',
                clearMsg1: 'Are you sure you want to clear all filter rules?',
                clearMsg2: 'This action will remove all selected protocols, regions, and keywords.',
                regions: {
                    hk: 'Hong Kong', tw: 'Taiwan', sg: 'Singapore', jp: 'Japan', us: 'USA',
                    kr: 'South Korea', cn: 'China', gb: 'UK', de: 'Germany', fr: 'France',
                    nl: 'Netherlands', au: 'Australia', ca: 'Canada', in: 'India', ru: 'Russia',
                    tr: 'Turkey', ar: 'Argentina', th: 'Thailand', vn: 'Vietnam', ph: 'Philippines',
                    my: 'Malaysia', it: 'Italy', ch: 'Switzerland', se: 'Sweden', ae: 'UAE', br: 'Brazil'
                },
                keywords: {
                    highMultiplier: 'High Multiplier', lowMultiplier: 'Low Multiplier', transit: 'Transit', direct: 'Direct',
                    dedicated: 'Dedicated', bgp: 'BGP', iplc: 'IPLC', iepl: 'IEPL', ipv6: 'IPv6', udp: 'UDP',
                    homeBroadband: 'Home Broadband', native: 'Native', test: 'Test', maintenance: 'Maintenance',
                    expired: 'Expired', remainingTraffic: 'Remaining Traffic', official: 'Official',
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
                loginFailed: 'Login failed',
                initFailed: 'Initialization failed'
            },
            data: {
                dataChanged: 'Data changed',
                savedSuffix: 'saved',
                saveFailedPrefix: 'Save failed: ',
                saveError: 'Unknown error occurred while saving data'
            },
            theme: {
                lightMode: 'Light Mode',
                darkMode: 'Dark Mode',
                switchToDark: 'Click to switch to Dark Mode',
                switchToLight: 'Click to switch to Light Mode'
            }
        }
    }
};
