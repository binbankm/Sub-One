import * as fs from 'fs/promises';
import * as path from 'path';
import Redis from 'ioredis';
import { config } from './config';

export interface Storage {
    get<T>(key: string): Promise<T | null>;
    put<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
}

class FileStorage implements Storage {
    private filePath: string;
    private data: Record<string, unknown> = {};
    private initialized = false;

    constructor() {
        this.filePath = path.join(config.DATA_DIR, 'sub-one.json');
    }

    private async init() {
        if (this.initialized) return;
        try {
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });
            const content = await fs.readFile(this.filePath, 'utf-8');
            this.data = JSON.parse(content);
        } catch (error: unknown) {
            if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error('Failed to load data file:', error);
            }
            // If file doesn't exist, start with empty data
            this.data = {};
        }
        this.initialized = true;
    }

    private async save() {
        await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
    }

    async get<T>(key: string): Promise<T | null> {
        await this.init();
        return (this.data[key] as T) || null;
    }

    async put<T>(key: string, value: T): Promise<void> {
        await this.init();
        this.data[key] = value;
        await this.save();
    }

    async delete(key: string): Promise<void> {
        await this.init();
        delete this.data[key];
        await this.save();
    }
}

class RedisStorage implements Storage {
    private client: Redis;

    constructor(url: string) {
        this.client = new Redis(url);
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async put<T>(key: string, value: T): Promise<void> {
        await this.client.set(key, JSON.stringify(value));
    }

    async delete(key: string): Promise<void> {
        await this.client.del(key);
    }
}

export const storage: Storage = config.REDIS_URL ? new RedisStorage(config.REDIS_URL) : new FileStorage();
