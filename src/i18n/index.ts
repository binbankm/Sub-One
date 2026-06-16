import { createI18n } from 'vue-i18n';
import zh from './locales/zh';
import en from './locales/en';

// Define the messages mapping
const messages = {
    zh,
    en
};

// Retrieve saved locale from localStorage, or default to zh
const savedLocale = localStorage.getItem('locale') || 'zh';

// Create i18n instance with options
const i18n = createI18n({
    legacy: false, // Required for Composition API
    locale: savedLocale,
    fallbackLocale: 'en',
    messages,
});

export default i18n;
