/**
 * Producer Utils
 * 参考 Sub-Store: producers/utils.js
 */

import { Proxy } from '../types';

/**
 * 生产器结果拼接辅助类
 * 参考自 Sub-Store: producers/utils.js
 */
export class Result {
    private parts: string[] = [];
    private proxy: any;

    constructor(proxy: any) {
        this.proxy = proxy;
    }

    /**
     * 追加字符串
     */
    append(str: string): this {
        this.parts.push(str);
        return this;
    }

    /**
     * 如果属性存在且不为空，则追加字符串
     * @param str 要追加的字符串
     * @param path 属性路径，如 'plugin-opts.mode'
     */
    appendIfPresent(str: string, path: string): this {
        if (isPresent(this.proxy, path)) {
            this.parts.push(str);
        }
        return this;
    }

    toString(): string {
        return this.parts.join('');
    }
}

/**
 * 检查代理对象中是否存在指定字段
 * 支持点分隔的路径，如 'ws-opts.path'
 */
export function isPresent(proxy: Proxy, path: string): boolean {
    const keys = path.split('.');
    let current: unknown = proxy;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return false;
        }
        if (typeof current !== 'object') {
            return false;
        }
        current = (current as Record<string, unknown>)[key];
    }

    return current !== null && current !== undefined;
}

/**
 * 获取代理对象中指定路径的值
 */
export function getPath<T>(proxy: Proxy, path: string, defaultValue?: T): T | undefined {
    const keys = path.split('.');
    let current: unknown = proxy;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        if (typeof current !== 'object') {
            return defaultValue;
        }
        current = (current as Record<string, unknown>)[key];
    }

    return (current as T) ?? defaultValue;
}

/**
 * 设置代理对象中指定路径的值
 */
export function setPath(proxy: Proxy, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = proxy as Record<string, unknown>;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
}

/**
 * 清理代理对象：删除 null/undefined 值和下划线前缀的内部字段
 */
export function cleanProxy(proxy: Proxy, keepInternal = false): Proxy {
    const cleaned = { ...proxy };

    for (const key of Object.keys(cleaned)) {
        const value = cleaned[key as keyof Proxy];

        // 删除 null/undefined
        if (value === null || value === undefined) {
            delete cleaned[key as keyof Proxy];
            continue;
        }

        // 删除下划线前缀的内部字段（除非 keepInternal）
        if (!keepInternal && key.startsWith('_')) {
            delete cleaned[key as keyof Proxy];
        }
    }

    return cleaned;
}

/**
 * 删除与生产无关的元数据字段
 */
export function removeMetadata(proxy: Proxy): Proxy {
    const cleaned = { ...proxy };

    // 删除元数据字段
    delete cleaned._subName;
    delete cleaned._desc;
    delete cleaned._category;
    delete cleaned._resolved;
    delete cleaned._extra;
    delete cleaned._mode;
    delete cleaned._pqv;

    // 删除其他内部字段
    delete (cleaned as Record<string, unknown>).subName;
    delete (cleaned as Record<string, unknown>).collectionName;
    delete (cleaned as Record<string, unknown>).id;
    delete (cleaned as Record<string, unknown>).resolved;
    delete (cleaned as Record<string, unknown>)['no-resolve'];

    return cleaned;
}
