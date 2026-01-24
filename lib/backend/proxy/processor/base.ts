/**
 * Sub-One Processor Base Classes
 */
import type { ProxyNode } from '../types';

export interface ProcessingContext {
    subscriptionName?: string;
    targetPlatform?: string;
    vars: Record<string, any>;
}

export interface IOperator {
    type: string;
    id: string;
    run(proxies: ProxyNode[], context: ProcessingContext): Promise<ProxyNode[]>;
}

export abstract class BaseOperator<T = any> implements IOperator {
    abstract type: string;
    id: string;
    args: T;

    constructor(args: T, id?: string) {
        this.args = args;
        this.id = id || Math.random().toString(36).substring(2, 9);
    }

    abstract run(proxies: ProxyNode[], context: ProcessingContext): Promise<ProxyNode[]>;
}
