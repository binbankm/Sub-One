import { SubscriptionParser } from '../subscription-parser';
import { describe, it, expect } from 'vitest';

describe('VMess Deduplication Test', () => {
    const testUrls = `vmess://eyJ2IjoiMiIsInBzIjoi5Yip5L2Z5rWB6YeP77yaMjIyLjkxIEdCIiwiYWRkIjoidXMuamllZGlhbi5zdHJlYW0iLCJwb3J0Ijo0NDMsImlkIjoiMDkyNTI2Y2ItNGU1YS00ODNhLWFkNDYtZTg1YzJhZDkzOTQ4IiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0IjoidGNwIiwidHlwZSI6Im5vbmUiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJndy5hbGljZG4uY29tIiwiYWxsb3dJbnNlY3VyZSI6dHJ1ZX0=
vmess://eyJ2IjoiMiIsInBzIjoi6Led56a75LiL5qyh6YeN572u5Ymp5L2Z77yaMTMg5aSpIiwiYWRkIjoidXMuamllZGlhbi5zdHJlYW0iLCJwb3J0Ijo0NDMsImlkIjoiMDkyNTI2Y2ItNGU1YS00ODNhLWFkNDYtZTg1YzJhZDkzOTQ4IiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0IjoidGNwIiwidHlwZSI6Im5vbmUiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJndy5hbGljZG4uY29tIiwiYWxsb3dJbnNlY3VyZSI6dHJ1ZX0=
vmess://eyJ2IjoiMiIsInBzIjoi576O5Zu9MSIsImFkZCI6InVzMS5qaWVkaWFuLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi576O5Zu9MiIsImFkZCI6InVzMi5qaWVkaWFuLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==`;

    it('should parse all VMess nodes', () => {
        const parser = new SubscriptionParser();
        const nodes = parser.parse(testUrls);

        expect(nodes.length).toBe(4);
        expect(nodes.every(n => n.type === 'vmess')).toBe(true);
    });

    it('should deduplicate nodes when enabled', () => {
        const parser = new SubscriptionParser();

        const withoutDedupe = parser.parse(testUrls, 'Test', { dedupe: false });
        const withDedupe = parser.parse(testUrls, 'Test', { dedupe: true });

        expect(withoutDedupe.length).toBe(4);
        expect(withDedupe.length).toBe(3); // us.jiedian.stream:443 appears twice

        // Check no duplicates in dedupe result
        const servers = withDedupe.map(n => `${n.server}:${n.port}`);
        const uniqueServers = new Set(servers);
        expect(servers.length).toBe(uniqueServers.size);
    });
});
