import dotenv from 'dotenv';
dotenv.config();

export const config = {
    PORT: process.env.PORT || 3055,
    REDIS_URL: process.env.REDIS_URL,
    DATA_DIR: process.env.DATA_DIR || './data',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
};
