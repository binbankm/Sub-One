import { SubscriptionParser } from '../subscription-parser';
import { describe, it, expect } from 'vitest';

describe('Enhanced Deduplication Logic', () => {

    it('should NOT deduplicate when UUIDs are different (VMess)', () => {
        const url1 = `vmess://eyJhZGQiOiJzZXJ2ZXIuY29tIiwicG9ydCI6NDQzLCJpZCI6IjExMTEtMTExMSIsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIiwicHMiOiJOb2RlIEEifQ==`; // uuid: 1111-1111
        const url2 = `vmess://eyJhZGQiOiJzZXJ2ZXIuY29tIiwicG9ydCI6NDQzLCJpZCI6IjIyMjItMjIyMiIsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIiwicHMiOiJOb2RlIEIifQ==`; // uuid: 2222-2222

        const parser = new SubscriptionParser();
        const nodes = parser.parse(`${url1}\n${url2}`, '', { dedupe: true });

        expect(nodes.length).toBe(2);
        expect(nodes.map(n => n.name)).toContain('Node A');
        expect(nodes.map(n => n.name)).toContain('Node B');
    });

    it('should deduplicate when UUIDs are same (VMess)', () => {
        const url1 = `vmess://eyJhZGQiOiJzZXJ2ZXIuY29tIiwicG9ydCI6NDQzLCJpZCI6IjExMTEtMTExMSIsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIiwicHMiOiJOb2RlIExvbmcgTmFtZSJ9`;
        const url2 = `vmess://eyJhZGQiOiJzZXJ2ZXIuY29tIiwicG9ydCI6NDQzLCJpZCI6IjExMTEtMTExMSIsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIiwicHMiOiJOb2RlIFNob3J0In0=`; // Short name

        const parser = new SubscriptionParser();
        const nodes = parser.parse(`${url1}\n${url2}`, '', { dedupe: true });

        expect(nodes.length).toBe(1);
        expect(nodes[0].name).toBe('Node Short'); // Should keep shortest
    });

    it('should NOT deduplicate when Paths are different (VMess WS)', () => {
        // Different Paths: /chat vs /download
        const url1 = `vmess://eyJhZGQiOiJzZXJ2ZXIuY29tIiwicG9ydCI6NDQzLCJpZCI6IjExMTEtMTExMSIsIm5ldCI6IndzIiwicGF0aCI6Ii9jaGF0IiwicHMiOiJWSFAgMSJ9`;
        const url2 = `vmess://eyJhZGQiOiJzZXJ2ZXIuY29tIiwicG9ydCI6NDQzLCJpZCI6IjExMTEtMTExMSIsIm5ldCI6IndzIiwicGF0aCI6Ii9kb3dubG9hZCIsInBzIjoiVklQIDIifQ==`;

        const parser = new SubscriptionParser();
        const nodes = parser.parse(`${url1}\n${url2}`, '', { dedupe: true });

        expect(nodes.length).toBe(2);
    });

    it('should NOT deduplicate when Passwords are different (Trojan)', () => {
        // Constructed manual standard Nodes since raw parsing might be complex for pure mock
        // But let's trust parseNodeUrl supports standard formats
        // trojan://password@server:443#Name
        const url1 = `trojan://pass1@server.com:443#User1`;
        const url2 = `trojan://pass2@server.com:443#User2`;

        const parser = new SubscriptionParser();
        const nodes = parser.parse(`${url1}\n${url2}`, '', { dedupe: true });

        expect(nodes.length).toBe(2);
    });

    it('should deduplicate when Passwords are same (Trojan)', () => {
        const url1 = `trojan://pass1@server.com:443#User1LongName`;
        const url2 = `trojan://pass1@server.com:443#User1`;

        const parser = new SubscriptionParser();
        const nodes = parser.parse(`${url1}\n${url2}`, '', { dedupe: true });

        expect(nodes.length).toBe(1);
        expect(nodes[0].name).toBe('User1');
    });

});
