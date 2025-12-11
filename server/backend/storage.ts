import * as path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { config } from './config';

export interface Storage {
    get<T>(key: string): Promise<T | null>;
    put<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
}

class SQLiteStorage implements Storage {
    private dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>>;

    constructor() {
        const dbPath = path.join(config.DATA_DIR, 'sub-one.sqlite');
        this.dbPromise = this.init(dbPath);
    }

    private async init(dbPath: string): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
        const fs = await import('fs/promises');
        await fs.mkdir(path.dirname(dbPath), { recursive: true });

        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        await db.exec(`
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        return db;
    }

    async get<T>(key: string): Promise<T | null> {
        const db = await this.dbPromise;
        const result = await db.get('SELECT value FROM kv_store WHERE key = ?', key);
        return result ? JSON.parse(result.value) : null;
    }

    async put<T>(key: string, value: T): Promise<void> {
        const db = await this.dbPromise;
        await db.run(
            'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
            key,
            JSON.stringify(value)
        );
    }

    async delete(key: string): Promise<void> {
        const db = await this.dbPromise;
        await db.run('DELETE FROM kv_store WHERE key = ?', key);
    }
}

export const storage: Storage = new SQLiteStorage();
