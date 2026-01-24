/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            // 🎨 颜色系统
            colors: {
                primary: {
                    50: 'hsl(243, 100%, 97%)',
                    100: 'hsl(243, 96%, 94%)',
                    200: 'hsl(242, 96%, 88%)',
                    300: 'hsl(243, 94%, 80%)',
                    400: 'hsl(243, 87%, 70%)',
                    500: 'hsl(243, 75%, 59%)',
                    600: 'hsl(243, 61%, 48%)',
                    700: 'hsl(243, 58%, 39%)',
                    800: 'hsl(243, 54%, 31%)',
                    900: 'hsl(243, 47%, 24%)'
                },
                secondary: {
                    50: 'hsl(280, 100%, 97%)',
                    100: 'hsl(280, 95%, 93%)',
                    200: 'hsl(279, 93%, 86%)',
                    300: 'hsl(280, 91%, 76%)',
                    400: 'hsl(280, 84%, 65%)',
                    500: 'hsl(280, 72%, 54%)',
                    600: 'hsl(280, 61%, 45%)',
                    700: 'hsl(280, 59%, 37%)',
                    800: 'hsl(280, 54%, 30%)',
                    900: 'hsl(280, 48%, 24%)'
                },
                accent: {
                    cyan: 'hsl(189, 94%, 43%)',
                    pink: 'hsl(328, 85%, 70%)',
                    orange: 'hsl(25, 95%, 53%)',
                    green: 'hsl(142, 71%, 45%)'
                }
            },

            // 📏 间距扩展
            spacing: {
                18: '4.5rem',
                88: '22rem'
            },

            // 🔵 圆角
            borderRadius: {
                '4xl': '2rem'
            },

            // ⚫ 阴影
            boxShadow: {
                glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
                'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.3)',
                'glow-primary': '0 0 30px rgba(99, 102, 241, 0.4)',
                'glow-secondary': '0 0 30px rgba(168, 85, 247, 0.4)'
            },

            // 🌫️ 背景模糊
            backdropBlur: {
                xs: '2px'
            },

            // 🔠 字体
            fontFamily: {
                sans: [
                    'Nunito',
                    'Quicksand',
                    'PingFang SC',
                    'Microsoft YaHei',
                    'Inter',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    'sans-serif'
                ],
                mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'monospace']
            },

            // 🎭 动画
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'fade-in-up': 'fadeInUp 0.3s ease-out',
                'fade-in-down': 'fadeInDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                shimmer: 'shimmer 2s infinite',
                'pulse-slow': 'pulse-slow 3s ease-in-out infinite'
            },

            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                fadeInDown: {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' }
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' }
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' }
                },
                'pulse-slow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.75' }
                }
            },

            // ⏱️ 过渡时长
            transitionDuration: {
                400: '400ms'
            }
        }
    },
    plugins: []
};
