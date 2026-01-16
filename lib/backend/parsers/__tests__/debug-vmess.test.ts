
import { describe, it, expect } from 'vitest';
import { parseVmess } from '../vmess';

describe('Debug VMess Parsing', () => {
    it('should correctly parse the specific VMess link provided by user', () => {
        const base64 = 'eyJ2IjoiMiIsInBzIjoi8J+UpUpvaW4rVGVsZWdyYW06QEZhcmFoX1ZQTvCfn6MiLCJhZGQiOiI4OS40NC4yNDIuMjU1IiwicG9ydCI6MjAxMCwiaWQiOiI3NWNmMGI2MS0yNGM1LTRlYWQtODBhNS0yODI4MjkxNDQ0ZDEiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6IiJ9';
        const url = 'vmess://' + base64;

        console.log('Testing URL:', url.substring(0, 50) + '...');

        const node = parseVmess(url);

        console.log('Parsed Node:', JSON.stringify(node, null, 2));

        expect(node).not.toBeNull();
        expect(node?.server).toBe('89.44.242.255');
        expect(node?.port).toBe(2010);
        expect(node?.type).toBe('vmess');
    });
});
