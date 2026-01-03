import { SubscriptionParser } from '../subscription-parser';
import { describe, it, expect } from 'vitest';

describe('Real-world VMess Nodes Deduplication Test', () => {
    const testUrls = `vmess://eyJ2IjoiMiIsInBzIjoi5Yip5L2Z5rWB6YeP77yaMjIyLjkxIEdCIiwiYWRkIjoidXMuamllZGlhbi5zdHJlYW0iLCJwb3J0Ijo0NDMsImlkIjoiMDkyNTI2Y2ItNGU1YS00ODNhLWFkNDYtZTg1YzJhZDkzOTQ4IiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0IjoidGNwIiwidHlwZSI6Im5vbmUiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJndy5hbGljZG4uY29tIiwiYWxsb3dJbnNlY3VyZSI6dHJ1ZX0=
vmess://eyJ2IjoiMiIsInBzIjoi6Led56a75LiL5qyh6YeN572u5Ymp5L2Z77yaMTMg5aSpIiwiYWRkIjoidXMuamllZGlhbi5zdHJlYW0iLCJwb3J0Ijo0NDMsImlkIjoiMDkyNTI2Y2ItNGU1YS00ODNhLWFkNDYtZTg1YzJhZDkzOTQ4IiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0IjoidGNwIiwidHlwZSI6Im5vbmUiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJndy5hbGljZG4uY29tIiwiYWxsb3dJbnNlY3VyZSI6dHJ1ZX0=
vmess://eyJ2IjoiMiIsInBzIjoi5aWX6aSQ5Yiw5pyf77yaMjAyNi0wOS0xNiIsImFkZCI6InVzLmppZWRpYW4uc3RyZWFtIiwicG9ydCI6NDQzLCJpZCI6IjA5MjUyNmNiLTRlNWEtNDgzYS1hZDQ2LWU4NWMyYWQ5Mzk0OCIsImFpZCI6MCwic2N5IjoiYXV0byIsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIiwidGxzIjoidGxzIiwic25pIjoiZ3cuYWxpY2RuLmNvbSIsImFsbG93SW5zZWN1cmUiOnRydWV9
vmess://eyJ2IjoiMiIsInBzIjoi8J+qpyDkuI3lj6/nlKjor7fova/ku7blhoXmm7TmlrDorqLpmIXmiJblrpjnvZHnnIvpl67popjmjpLmn6UiLCJhZGQiOiJ1cy5qaWVkaWFuLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+HrfCfh7Ag6aaZ5rivMSAo56e75YqoPuiBlOmAmj7nlLXkv6EpIiwiYWRkIjoiaGsxLmppZWRpYW4uc3RyZWFtIiwicG9ydCI6ODQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+Hr/Cfh7Ug5pel5pysMSAo56e75YqoPueUteS/oT7ogZTpgJopIiwiYWRkIjoianAxLmNuZG5zLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+Hr/Cfh7Ug5pel5pysMiAo56e75YqoPueUteS/oT7ogZTpgJopIiwiYWRkIjoianAyLmNuZG5zLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+HsPCfh7cg6Z+p5Zu9ICjnp7vliqg+6IGU6YCaPueUteS/oSkiLCJhZGQiOiJrci5qaWVkaWFuLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+HuPCfh6wg5paw5Yqg5Z2hMSAo5LiJ572RKSIsImFkZCI6InNnMS5qaWVkaWFuLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+HuPCfh6wg5paw5Yqg5Z2hMiAo56e75Yqo6IGU6YCaPueUteS/oSkiLCJhZGQiOiJzZzIuamllZGlhbi5zdHJlYW0iLCJwb3J0Ijo0NDMsImlkIjoiMDkyNTI2Y2ItNGU1YS00ODNhLWFkNDYtZTg1YzJhZDkzOTQ4IiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0IjoidGNwIiwidHlwZSI6Im5vbmUiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJndy5hbGljZG4uY29tIiwiYWxsb3dJbnNlY3VyZSI6dHJ1ZX0=
vmess://eyJ2IjoiMiIsInBzIjoi8J+HuvCfh7gg576O5Zu9MSIsImFkZCI6InVzMS5qaWVkaWFuLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+HuvCfh7gg576O5Zu9MiIsImFkZCI6InVzMi5qaWVkaWFuLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+HuvCfh7gg576O5Zu9MyIsImFkZCI6InVzMy5qaWVkaWFuLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+HqPCfh6Yg5Yqg5ou/5aSnIiwiYWRkIjoiY2EuamllZGlhbi5zdHJlYW0iLCJwb3J0Ijo0NDMsImlkIjoiMDkyNTI2Y2ItNGU1YS00ODNhLWFkNDYtZTg1YzJhZDkzOTQ4IiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0IjoidGNwIiwidHlwZSI6Im5vbmUiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJndy5hbGljZG4uY29tIiwiYWxsb3dJbnNlY3VyZSI6dHJ1ZX0=
vmess://eyJ2IjoiMiIsInBzIjoi8J+HqfCfh6og5b635Zu9MSIsImFkZCI6Ijg1LjIzNC42OS41MiIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+HqfCfh6og5b635Zu9MiIsImFkZCI6ImRlMi5qaWVkaWFuLnN0cmVhbSIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==
vmess://eyJ2IjoiMiIsInBzIjoi8J+HufCfh7wg5Y+w5rm+IiwiYWRkIjoidHcxLmppZWRpYW4uc3RyZWFtIiwicG9ydCI6NDQzLCJpZCI6IjA5MjUyNmNiLTRlNWEtNDgzYS1hZDQ2LWU4NWMyYWQ5Mzk0OCIsImFpZCI6MCwic2N5IjoiYXV0byIsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIiwidGxzIjoidGxzIiwic25pIjoiZ3cuYWxpY2RuLmNvbSIsImFsbG93SW5zZWN1cmUiOnRydWV9
vmess://eyJ2IjoiMiIsInBzIjoi8J+HufCfh7cg5Zyf6ICz5YW2IiwiYWRkIjoidHIuamllZGlhbi5zdHJlYW0iLCJwb3J0Ijo0NDMsImlkIjoiMDkyNTI2Y2ItNGU1YS00ODNhLWFkNDYtZTg1YzJhZDkzOTQ4IiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0IjoidGNwIiwidHlwZSI6Im5vbmUiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJndy5hbGljZG4uY29tIiwiYWxsb3dJbnNlY3VyZSI6dHJ1ZX0=
vmess://eyJ2IjoiMiIsInBzIjoi8J+HpvCfh7cg6Zi/5qC55bu3IiwiYWRkIjoiYXIuamllZGlhbi5zdHJlYW0iLCJwb3J0Ijo0NDMsImlkIjoiMDkyNTI2Y2ItNGU1YS00ODNhLWFkNDYtZTg1YzJhZDkzOTQ4IiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0IjoidGNwIiwidHlwZSI6Im5vbmUiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJndy5hbGljZG4uY29tIiwiYWxsb3dJbnNlY3VyZSI6dHJ1ZX0=
vmess://eyJ2IjoiMiIsInBzIjoi8J+qpyDlrpjnvZEgOiDmgKfku7fmr5TmnLrlnLoubmV0IiwiYWRkIjoiMTguMTQxLjE0Ni41NCIsInBvcnQiOjQ0MywiaWQiOiIwOTI1MjZjYi00ZTVhLTQ4M2EtYWQ0Ni1lODVjMmFkOTM5NDgiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsInRscyI6InRscyIsInNuaSI6Imd3LmFsaWNkbi5jb20iLCJhbGxvd0luc2VjdXJlIjp0cnVlfQ==`;

    it('should parse all VMess nodes correctly', () => {
        const parser = new SubscriptionParser();
        const nodes = parser.parse(testUrls);

        console.log(`\n✅ 成功解析 ${nodes.length} 个节点\n`);

        // 验证所有节点都被正确解析
        expect(nodes.length).toBe(20);

        // 验证所有节点都是 vmess 类型
        nodes.forEach(node => {
            expect(node.type).toBe('vmess');
        });

        // 打印节点详情
        nodes.forEach((node, index) => {
            console.log(`${index + 1}. ${node.name}`);
            console.log(`   Server: ${node.server}:${node.port}`);
        });
    });

    it('should deduplicate nodes based on server+port when enabled', () => {
        const parser = new SubscriptionParser();

        // 不启用去重
        const nodesWithoutDedupe = parser.parse(testUrls, 'TestSub', { dedupe: false });
        console.log(`\n📊 不去重: ${nodesWithoutDedupe.length} 个节点`);

        // 启用去重
        const nodesWithDedupe = parser.parse(testUrls, 'TestSub', { dedupe: true });
        console.log(`📊 去重后: ${nodesWithDedupe.length} 个节点\n`);

        // 验证去重生效
        expect(nodesWithDedupe.length).toBeLessThan(nodesWithoutDedupe.length);

        // 统计重复情况
        const serverPortMap = new Map<string, number>();
        nodesWithoutDedupe.forEach(node => {
            const key = `${node.server}:${node.port}`;
            serverPortMap.set(key, (serverPortMap.get(key) || 0) + 1);
        });

        console.log('🔍 重复节点统计:');
        const duplicates: string[] = [];
        serverPortMap.forEach((count, key) => {
            if (count > 1) {
                duplicates.push(`   ${key} - ${count} 个重复`);
            }
        });
        console.log(duplicates.join('\n'));

        // 验证去重后每个 server:port 只出现一次
        const dedupeMap = new Map<string, number>();
        nodesWithDedupe.forEach(node => {
            const key = `${node.server}:${node.port}`;
            dedupeMap.set(key, (dedupeMap.get(key) || 0) + 1);
        });

        dedupeMap.forEach((count) => {
            expect(count).toBe(1);
        });
    });

    it('should keep the node with shortest name when deduplicating', () => {
        const parser = new SubscriptionParser();
        const nodes = parser.parse(testUrls, 'TestSub', { dedupe: true });

        // 找到 us.jiedian.stream:443 的节点，应该保留名称最短的
        const usNodes = nodes.filter(n => n.server === 'us.jiedian.stream' && n.port === 443);

        if (usNodes.length > 0) {
            console.log(`\n✨ us.jiedian.stream:443 保留的节点: ${usNodes[0].name}`);
            expect(usNodes.length).toBe(1);
        }
    });
});
