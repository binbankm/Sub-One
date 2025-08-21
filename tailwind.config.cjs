/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        // 现代化渐变色
        gradient: {
          primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          success: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          warning: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          danger: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        },
        // 玻璃态颜色
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(0, 0, 0, 0.2)',
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'blob': 'blob 7s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        slideInRight: {
          '0%': {
            opacity: '0',
            transform: 'translateX(30px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)'
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)'
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)'
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)'
          }
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)'
          },
          '50%': {
            transform: 'translateY(-20px)'
          }
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'modern': '0 20px 40px rgba(0, 0, 0, 0.15)',
        'modern-dark': '0 20px 40px rgba(0, 0, 0, 0.4)',
      },
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}