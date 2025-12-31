import { describe, it, expect } from 'vitest';
import { subscriptionParser } from '../subscription-parser';
import type { Node } from '../types';

describe('NDNode Test Suite', () => {
    // Content from https://raw.githubusercontent.com/Barabama/FreeNodes/main/nodes/ndnode.txt
    const rawContent = `
ss://YWVzLTI1Ni1jZmI6YW1hem9uc2tyMDU@63.180.254.10:443#8%E5%85%83%E8%80%81%E7%89%8C%E4%B8%93%E7%BA%BF%E6%9C%BA%E5%9C%BA%EF%BC%9Acczzuu.top
vmess://eyJ2IjoiMiIsInBzIjoi8J+HrfCfh7Ag6aaZ5rivfEBzdGFpcm5vZGUiLCJhZGQiOiJ2MTAuaGRhY2QuY29tIiwicG9ydCI6IjMwODA3IiwidHlwZSI6Im5vbmUiLCJpZCI6ImNiYjNmODc3LWQxZmItMzQ0Yy04N2E5LWQxNTNiZmZkNTQ4NCIsImFpZCI6Ilx1MDAwMiIsIm5ldCI6InRjcCIsInBhdGgiOiIvIiwiaG9zdCI6InYxMC5oZGFjZC5jb20iLCJ0bHMiOiIifQ==
ss://Y2hhY2hhMjAtaWV0Zjphc2QxMjM0NTY@103.149.182.86:8388#%F0%9F%87%AD%F0%9F%87%B0%20%E9%A6%99%E6%B8%AF2%7C%40stairnode
trojan://f36f4495b4b26cc2fe346cfa23e05b1b@58.152.18.226:443?allowInsecure=0&sni=www.nintendogames.net#%F0%9F%87%AD%F0%9F%87%B0%20%E9%A6%99%E6%B8%AF3%7C%40stairnode
trojan://BxceQaOe@58.152.46.60:443?allowInsecure=1&sni=t.me%2Fripaojiedian#%F0%9F%87%AD%F0%9F%87%B0%20%E9%A6%99%E6%B8%AF4%7C%40stairnode
trojan://BxceQaOe@203.198.84.221:443?allowInsecure=1&sni=t.me%2Fripaojiedian#%F0%9F%87%AD%F0%9F%87%B0%20%E9%A6%99%E6%B8%AF5%7C%40stairnode
trojan://BxceQaOe@18.182.16.254:2762?allowInsecure=1&sni=t.me%252Fripaojiedian#%F0%9F%87%AF%F0%9F%87%B5%20%E6%97%A5%E6%9C%AC%7C%40stairnode
trojan://f36f4495b4b26cc2fe346cfa23e05b1b@13.231.208.147:3093?allowInsecure=0&sni=www.nintendogames.net#%F0%9F%87%AF%F0%9F%87%B5%20%E6%97%A5%E6%9C%AC2%7C%40stairnode
trojan://f36f4495b4b26cc2fe346cfa23e05b1b@153.121.51.29:3093?allowInsecure=0&sni=www.nintendogames.net#%F0%9F%87%AF%F0%9F%87%B5%20%E6%97%A5%E6%9C%AC3%7C%40stairnode
trojan://12345678-1234-1234-1234-123456789123@45.8.113.22:50383?allowInsecure=0&sni=support.zoom.us.joss.gvpn2.web.id#%F0%9F%87%AF%F0%9F%87%B5%20%E6%97%A5%E6%9C%AC4%7C%40stairnode
trojan://f36f4495b4b26cc2fe346cfa23e05b1b@13.115.111.129:3901?allowInsecure=0&sni=www.nintendogames.net#%F0%9F%87%B8%F0%9F%87%AC%20%E6%96%B0%E5%8A%A0%E5%9D%A1%7C%40stairnode
trojan://f36f4495b4b26cc2fe346cfa23e05b1b@160.16.153.13:3901?allowInsecure=0&sni=www.nintendogames.net#%F0%9F%87%B8%F0%9F%87%AC%20%E6%96%B0%E5%8A%A0%E5%9D%A12%7C%40stairnode
trojan://BxceQaOe@13.115.111.129:3127?allowInsecure=0&sni=t.me%252Fripaojiedian#%F0%9F%87%B8%F0%9F%87%AC%20%E6%96%B0%E5%8A%A0%E5%9D%A13%7C%40stairnode
trojan://f36f4495b4b26cc2fe346cfa23e05b1b@160.16.150.76:1281?allowInsecure=0&sni=www.nintendogames.net#%F0%9F%87%BA%F0%9F%87%B8%20%E7%BE%8E%E5%9B%BD%7C%40stairnode
trojan://f36f4495b4b26cc2fe346cfa23e05b1b@160.16.68.250:1281?allowInsecure=0&sni=www.nintendogames.net#%F0%9F%87%BA%F0%9F%87%B8%20%E7%BE%8E%E5%9B%BD2%7C%40stairnode
trojan://BxceQaOe@18.183.82.133:4569?allowInsecure=1&sni=t.me%2Fripaojiedian#%F0%9F%87%BA%F0%9F%87%B8%20%E7%BE%8E%E5%9B%BD3%7C%40stairnode
vmess://eyJ2IjoiMiIsInBzIjoi8J+HuvCfh7gg576O5Zu9NHxAc3RhaXJub2RlIiwiYWRkIjoiODIuMTk4LjI0Ni45NyIsInBvcnQiOiIxODAiLCJ0eXBlIjoibm9uZSIsImlkIjoiZDEzZmMyZjUtM2UwNS00Nzk1LTgxZWItNDQxNDNhMDllNTUyIiwiYWlkIjoiIiwibmV0IjoidGNwIiwicGF0aCI6Ii8iLCJob3N0IjoidC5tZSUyRnJpcGFvamllZGlhbiIsInRscyI6IiJ9
ss://YWVzLTI1Ni1jZmI6WG44aktkbURNMDBJZU8lIyQjZkpBTXRzRUFFVU9wSC9ZV1l0WXFERm5UMFNW@103.186.155.232:38388#%F0%9F%87%BB%F0%9F%87%B3%20%E8%B6%8A%E5%8D%97%7C%40stairnode
    `;

    it('should parse all nodes correctly', () => {
        const nodes: Node[] = subscriptionParser.parse(rawContent, 'NDNode Test');

        // Check total count - assuming 18 lines lead to 18 nodes
        expect(nodes.length).toBe(18);

        // Verify Protocol Counts
        const ssNodes = nodes.filter(n => n.protocol === 'ss');
        expect(ssNodes.length).toBe(3);

        const vmessNodes = nodes.filter(n => n.protocol === 'vmess');
        expect(vmessNodes.length).toBe(2);

        const trojanNodes = nodes.filter(n => n.protocol === 'trojan');
        expect(trojanNodes.length).toBe(13);

        // Verify First Node (SS)
        // ss://YWVzLTI1Ni1jZmI6YW1hem9uc2tyMDU@63.180.254.10:443#...
        const node1 = nodes[0];
        expect(node1.protocol).toBe('ss');
        // We might want to check decoded URL or other properties if parsing populates them
        // Note: The parse method primarily keeps the original URL but might also parse it into other fields potentially?
        // Looking at parsed Node type, it has `url` field.
        expect(node1.url).toContain('ss://');
        expect(node1.name).toContain('8元老牌专线机场');

        // Verify VMess Node
        const node2 = nodes[1];
        expect(node2.protocol).toBe('vmess');
        expect(node2.name).toContain('香港|@stairnode');

        // Verify Trojan Node
        const node4 = nodes[3];
        expect(node4.protocol).toBe('trojan');
        expect(node4.name).toContain('香港3|@stairnode');
    });
});
