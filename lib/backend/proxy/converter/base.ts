/**
 * Sub-One Converter Base Interfaces
 */

import type { ProxyNode, ConvertOptions } from '../types';

export interface IConverter {
    name: string;
    convert(nodes: ProxyNode[], options?: ConvertOptions): string | Promise<string>;
}

export abstract class BaseConverter implements IConverter {
    abstract name: string;
    abstract convert(nodes: ProxyNode[], options?: ConvertOptions): string | Promise<string>;
}
