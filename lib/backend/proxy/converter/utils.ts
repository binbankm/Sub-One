/**
 * Utility for building converter strings
 */

export class Result {
    private output: string[] = [];
    private proxy: any;

    constructor(proxy: any) {
        this.proxy = proxy;
    }

    append(data: string | number | boolean | undefined) {
        if (data === undefined) {
            return;
        }
        this.output.push(String(data));
        return this;
    }

    appendIfPresent(data: string | number | boolean | undefined, attr: string) {
        if (this.isPresent(attr)) {
            this.append(data);
        }
        return this;
    }

    private isPresent(attr: string): boolean {
        const parts = attr.split('.');
        let current = this.proxy;
        for (const part of parts) {
            if (current === null || current === undefined) return false;
            current = current[part];
        }
        return current !== undefined && current !== null && current !== '';
    }

    toString(): string {
        return this.output.join('');
    }
}

/**
 * Helper to check if a property is present in an object
 */
export function isPresent(obj: any, attr: string): boolean {
    if (!obj) return false;
    const parts = attr.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return false;
        current = current[part];
    }
    return current !== undefined && current !== null && current !== '';
}
