import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory (server/)
dotenv.config();

// Also try to load .env from parent directory (project root)
// This allows users to place .env in the root folder for convenience
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    PORT: process.env.PORT || 3055,
    REDIS_URL: process.env.REDIS_URL,
    DATA_DIR: process.env.DATA_DIR || './data',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
};
