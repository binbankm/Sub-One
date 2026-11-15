import { describe, expect, it } from 'vitest';
import { convert, process } from '../proxy';
import { detectFormat } from '../proxy/parser/format-detector';
import { parseHysteria, parseHysteria2, parseNaive, parseShadowsocks, parseSnell, parseTUIC } from '../proxy/parser/uri-parsers';
import { getNodeFingerprint } from '../proxy/utils';
import { ProxyNode } from '../proxy/types';
import { exportAllData, importAllData } from '../services/backup';
import { KV_KEY_BACKUPS, KV_KEY_PROFILES, KV_KEY_SETTINGS, KV_KEY_SUBS, KV_KEY_USERS } from '../config/constants';
import { migrateKVtoD1 } from '../services/migration';
import { handleApiRequest } from '../api/handlers';
import { createUser } from '../services/users';

describe('P0, P1, P2 Fixes Verification', () => {
    describe('1. Singbox Converter VMess / VLESS TLS Injection', () => {
        it('should NOT output tls block when node.tls is false or undefined for vmess', async () => {
            const vmessNode: ProxyNode = {
                id: '1',
                type: 'vmess',
                name: 'Plain-VMess',
                server: '1.2.3.4',
                port: 80,
                uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                cipher: 'auto',
                tls: false
            };

            const singboxJson = await convert([vmessNode], 'singbox');
            const parsed = JSON.parse(singboxJson);
            const outbound = parsed.outbounds[0];
            expect(outbound.type).toBe('vmess');
            expect(outbound.tls).toBeUndefined();
        });

        it('should NOT output tls block when node.tls is false or undefined for vless', async () => {
            const vlessNode: ProxyNode = {
                id: '2',
                type: 'vless',
                name: 'Plain-VLESS',
                server: '1.2.3.4',
                port: 80,
                uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                tls: false
            };

            const singboxJson = await convert([vlessNode], 'singbox');
            const parsed = JSON.parse(singboxJson);
            const outbound = parsed.outbounds[0];
            expect(outbound.type).toBe('vless');
            expect(outbound.tls).toBeUndefined();
        });

        it('should output tls block when node.tls is true or reality-opts is present', async () => {
            const vmessTls: ProxyNode = {
                id: '3',
                type: 'vmess',
                name: 'TLS-VMess',
                server: '1.2.3.4',
                port: 443,
                uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                tls: true,
                sni: 'example.com'
            };

            const vlessReality: ProxyNode = {
                id: '4',
                type: 'vless',
                name: 'Reality-VLESS',
                server: '1.2.3.4',
                port: 443,
                uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                'reality-opts': {
                    'public-key': 'pk123',
                    'short-id': 'sid123'
                }
            };

            const vmessOut = JSON.parse(await convert([vmessTls], 'singbox')).outbounds[0];
            expect(vmessOut.tls).toBeDefined();
            expect(vmessOut.tls.enabled).toBe(true);

            const vlessOut = JSON.parse(await convert([vlessReality], 'singbox')).outbounds[0];
            expect(vlessOut.tls).toBeDefined();
            expect(vlessOut.tls.reality.enabled).toBe(true);
        });
    });

    describe('2. URL-Safe Base64 & Format Detector', () => {
        it('should detect URL-safe Base64 encoded subscriptions with - and _', () => {
            // Encode a list of vmess URIs using URL-safe base64 characters (- and _)
            const rawContent = 'vmess://some-node\nvless://another-node';
            // Base64 encoding of rawContent with - and _
            const standardB64 = Buffer.from(rawContent).toString('base64');
            const urlSafeB64 = standardB64.replace(/\+/g, '-').replace(/\//g, '_');

            expect(detectFormat(urlSafeB64)).toBe('base64');
        });

        it('should detect naive:// URI in format detector', () => {
            const naiveUri = 'naive://user:pass@example.com:443#NaiveTest';
            expect(detectFormat(naiveUri)).toBe('uri-list');
        });
    });

    describe('3. Hysteria2 Port Hopping Regex', () => {
        it('should capture full port hopping range including comma separated ports', () => {
            const uri = 'hy2://secret@example.com:20000-30000,40000-50000?sni=test#Hy2Hop';
            const node = parseHysteria2(uri);
            expect(node).not.toBeNull();
            expect(node?.ports).toBe('20000-30000,40000-50000');
            expect(node?.server).toBe('example.com');
            expect(node?.password).toBe('secret');
        });
    });

    describe('4. Shadowsocks 2022 SIP002 Plaintext Userinfo', () => {
        it('should correctly parse 2022-blake3- method and password without corrupting via secondary base64 decode', () => {
            const uri = 'ss://2022-blake3-aes-128-gcm:mySecretPass123@1.2.3.4:8388#SS2022';
            const node = parseShadowsocks(uri);
            expect(node).not.toBeNull();
            expect(node?.cipher).toBe('2022-blake3-aes-128-gcm');
            expect(node?.password).toBe('mySecretPass123');
            expect(node?.server).toBe('1.2.3.4');
            expect(node?.port).toBe(8388);
        });

        it('should still correctly parse legacy base64 encoded userinfo', () => {
            const b64UserInfo = Buffer.from('aes-256-gcm:password123').toString('base64');
            const uri = `ss://${b64UserInfo}@1.2.3.4:8388#LegacySS`;
            const node = parseShadowsocks(uri);
            expect(node).not.toBeNull();
            expect(node?.cipher).toBe('aes-256-gcm');
            expect(node?.password).toBe('password123');
        });

        it('should correctly parse standard plaintext method:password in SIP002 URI without corrupting', () => {
            const uri = 'ss://chacha20-ietf-poly1305:myPlainPass123@1.2.3.4:8388#PlainSS';
            const node = parseShadowsocks(uri);
            expect(node).not.toBeNull();
            expect(node?.cipher).toBe('chacha20-ietf-poly1305');
            expect(node?.password).toBe('myPlainPass123');
        });
    });

    describe('5. TUIC URI Password with Special Characters / Percent', () => {
        it('should not throw URIError when password contains special characters or unencoded percent', () => {
            // Password contains percent sign and encoded characters: p@ss%word (URI encoded as p%40ss%25word)
            // Previously, secondary decodeURIComponent on line 1245 threw URIError: URI malformed on '%w'
            const uri = 'tuic://uuid-1234:p%40ss%25word@example.com:443?alpn=h3#TUIC';
            const node = parseTUIC(uri);
            expect(node).not.toBeNull();
            expect(node?.password).toBe('p@ss%word');
        });
    });

    describe('6. Shadowsocks v2ray-plugin obfs-host serialization', () => {
        it('should contain obfs-host= with equals sign in URI output', async () => {
            const node: ProxyNode = {
                id: 'ss-v2ray',
                type: 'ss',
                name: 'SS-V2Ray',
                server: '1.2.3.4',
                port: 443,
                cipher: 'aes-128-gcm',
                password: 'pass',
                plugin: 'v2ray-plugin',
                'plugin-opts': {
                    mode: 'websocket',
                    host: 'cdn.example.com',
                    tls: true
                }
            };

            const uriOutput = await convert([node], 'URI');
            expect(decodeURIComponent(uriOutput)).toContain('obfs-host=cdn.example.com');
            expect(decodeURIComponent(uriOutput)).not.toContain('obfs-hostcdn.example.com');
        });

        it('should include path in v2ray-plugin URI output when specified', async () => {
            const node: ProxyNode = {
                id: 'ss-v2ray-path',
                type: 'ss',
                name: 'SS-V2Ray-Path',
                server: '1.2.3.4',
                port: 443,
                cipher: 'aes-128-gcm',
                password: 'pass',
                plugin: 'v2ray-plugin',
                'plugin-opts': {
                    mode: 'websocket',
                    host: 'cdn.example.com',
                    path: '/custom-ws',
                    tls: true
                }
            };

            const uriOutput = await convert([node], 'URI');
            expect(decodeURIComponent(uriOutput)).toContain(';path=/custom-ws');
        });
    });

    describe('7. Node Deduplication Fingerprint ws-opts.path', () => {
        it('should produce distinct fingerprints for nodes on same server/port but different ws-opts.path', () => {
            const node1: ProxyNode = {
                id: 'n1',
                type: 'vmess',
                name: 'Node1',
                server: '1.2.3.4',
                port: 443,
                uuid: 'uuid-1',
                network: 'ws',
                'ws-opts': { path: '/path1' }
            };

            const node2: ProxyNode = {
                id: 'n2',
                type: 'vmess',
                name: 'Node2',
                server: '1.2.3.4',
                port: 443,
                uuid: 'uuid-1',
                network: 'ws',
                'ws-opts': { path: '/path2' }
            };

            const fp1 = getNodeFingerprint(node1);
            const fp2 = getNodeFingerprint(node2);
            expect(fp1).not.toBe(fp2);
            expect(fp1).toContain('/path1');
            expect(fp2).toContain('/path2');
        });
    });

    describe('8. Hysteria 1 Userinfo Domain Extraction', () => {
        it('should cleanly extract auth and server without server being polluted by auth@', () => {
            const uri = 'hysteria://myauth123@example.com:443?insecure=1&upmbps=100&downmbps=100#Hy1';
            const node = parseHysteria(uri);
            expect(node).not.toBeNull();
            expect(node?.server).toBe('example.com');
            expect(node?.auth).toBe('myauth123');
            expect(node?.port).toBe(443);
        });

        it('should parse hysteria without auth@ correctly', () => {
            const uri = 'hysteria://example.com:443?auth=queryauth&insecure=1#Hy1Plain';
            const node = parseHysteria(uri);
            expect(node).not.toBeNull();
            expect(node?.server).toBe('example.com');
            expect(node?.auth).toBe('queryauth');
        });
    });

    describe('9. Snell & NaiveProxy Parsers', () => {
        it('should parse snell obfs and host options and convert to surge', async () => {
            const snellUri = 'snell://psk123@example.com:443?version=3&obfs=http&host=obfs.example.com#SnellNode';
            const node = parseSnell(snellUri);
            expect(node).not.toBeNull();
            expect(node?.obfs).toBe('http');
            expect(node?.['obfs-host']).toBe('obfs.example.com');
            expect(node?.['obfs-opts']?.mode).toBe('http');
            expect(node?.['obfs-opts']?.host).toBe('obfs.example.com');

            const surgeOutput = await convert([node!], 'surge');
            expect(surgeOutput).toContain('obfs=http');
            expect(surgeOutput).toContain('obfs-host=obfs.example.com');
        });

        it('should parse standard naive:// URI', () => {
            const naiveUri = 'naive://user:pass@example.com:443?sni=sni.com#NaiveNode';
            const node = parseNaive(naiveUri);
            expect(node).not.toBeNull();
            expect(node?.type).toBe('naive');
            expect(node?.username).toBe('user');
            expect(node?.password).toBe('pass');
            expect(node?.server).toBe('example.com');
            expect(node?.port).toBe(443);
        });

        it('should correctly parse naive URI with token-only userinfo without polluting server hostname', () => {
            const naiveUri = 'naive://mytoken123@example.com:443#NaiveToken';
            const node = parseNaive(naiveUri);
            expect(node).not.toBeNull();
            expect(node?.server).toBe('example.com');
            expect(node?.username).toBe('mytoken123');
            expect(node?.password).toBeUndefined();
        });
    });

    describe('10. Node Filter Rule Protocol Matching (WireGuard / Reality)', () => {
        it('should match wireguard nodes with proto:wg|wireguard or proto:wireguard', async () => {
            const wgNode: ProxyNode = {
                id: 'wg-1',
                type: 'wireguard',
                name: 'WG-Node',
                server: '1.2.3.4',
                port: 51820
            };
            const vmessNode: ProxyNode = {
                id: 'vm-1',
                type: 'vmess',
                name: 'VMess-Node',
                server: '1.2.3.4',
                port: 443
            };

            // Test keep:proto:wireguard
            const filtered1 = await process([wgNode, vmessNode], { exclude: 'keep:proto:wireguard' });
            expect(filtered1.length).toBe(1);
            expect(filtered1[0].name).toBe('WG-Node');

            // Test keep:proto:wg|wireguard
            const filtered2 = await process([wgNode, vmessNode], { exclude: 'keep:proto:wg|wireguard' });
            expect(filtered2.length).toBe(1);
            expect(filtered2[0].name).toBe('WG-Node');
        });

        it('should match reality nodes with proto:reality', async () => {
            const realityNode: ProxyNode = {
                id: 'vl-reality',
                type: 'vless',
                name: 'VLESS-Reality',
                server: '1.2.3.4',
                port: 443,
                'reality-opts': { 'public-key': 'pk', 'short-id': 'sid' }
            };
            const normalVless: ProxyNode = {
                id: 'vl-normal',
                type: 'vless',
                name: 'VLESS-Normal',
                server: '1.2.3.4',
                port: 443
            };

            const filtered = await process([realityNode, normalVless], { exclude: 'keep:proto:reality' });
            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('VLESS-Reality');
        });
    });

    describe('11. Backup Restore User Preservation in Overwrite Mode', () => {
        it('should NOT overwrite or clear existing users when backup file lacks users array', async () => {
            const store = new Map<string, any>();
            const mockStorage = {
                get: async (k: string) => store.get(k) || null,
                put: async (k: string, v: any) => { store.set(k, v); },
                delete: async (k: string) => { store.delete(k); }
            };

            // Existing admin user in storage
            const initialUsers = [{ id: 'admin-1', username: 'admin', role: 'admin' }];
            store.set(KV_KEY_USERS, initialUsers);
            store.set(KV_KEY_SUBS, [{ id: 'sub-1', name: 'Old Sub' }]);

            // Create a valid signed backup without users
            const exportStorage = {
                get: async (k: string) => {
                    if (k === KV_KEY_SUBS) return [{ id: 'sub-new', name: 'New Sub' }];
                    if (k === KV_KEY_PROFILES) return [];
                    if (k === KV_KEY_SETTINGS) return {};
                    if (k === KV_KEY_USERS) return [];
                    return null;
                },
                put: async () => {},
                delete: async () => {}
            };
            const validBackup = await exportAllData(exportStorage as any, 'kv', 'admin');
            delete (validBackup.data as any).users; // Simulate legacy or users-omitted backup

            // Recompute checksum
            const dataString = JSON.stringify(validBackup.data);
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
            validBackup.checksum = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

            const result = await importAllData(mockStorage as any, validBackup, 'overwrite');
            expect(result.success).toBe(true);
            // Verify existing users were NOT cleared
            const savedUsers = store.get(KV_KEY_USERS);
            expect(savedUsers).toBeDefined();
            expect(savedUsers.length).toBe(1);
            expect(savedUsers[0].username).toBe('admin');
        });
    });

    describe('12. Storage Backend Migration Snapshot Payload Migration', () => {
        it('should migrate snapshots metadata and individual snapshot data payloads', async () => {
            const kvMap = new Map<string, any>();
            const d1Map = new Map<string, any>();

            const mockEnv: any = {
                SUB_ONE_KV: {
                    get: async (k: string, type?: string) => {
                        const val = kvMap.get(k);
                        if (val === undefined) return null;
                        return type === 'json' ? JSON.parse(val) : val;
                    },
                    put: async (k: string, v: string) => { kvMap.set(k, v); },
                    delete: async (k: string) => { kvMap.delete(k); }
                },
                SUB_ONE_D1: {
                    prepare: (sql: string) => ({
                        bind: (...params: any[]) => ({
                            first: async () => {
                                if (sql.includes('SELECT value FROM storage WHERE key = ?')) {
                                    const val = d1Map.get(params[0]);
                                    return val ? { value: JSON.stringify(val) } : null;
                                }
                                return null;
                            },
                            run: async () => {
                                if (sql.includes('INSERT INTO storage')) {
                                    d1Map.set(params[0], JSON.parse(params[1]));
                                }
                                return { success: true };
                            },
                            all: async () => ({ success: true, results: [] })
                        }),
                        run: async () => ({ success: true }),
                        all: async () => ({ success: true, results: [] })
                    }),
                    exec: async () => ({ success: true })
                }
            };

            // Seed KV with snapshots
            const snapshotId = 'snapshot_12345';
            kvMap.set(KV_KEY_BACKUPS, JSON.stringify([{ id: snapshotId, name: 'TestSnapshot' }]));
            kvMap.set(`backup_data_${snapshotId}`, JSON.stringify({ version: '2.0.0', data: { test: 123 } }));

            const result = await migrateKVtoD1(mockEnv);
            expect(result.success).toBe(true);

            // Verify D1 has both the backup list and the snapshot payload
            expect(d1Map.has(KV_KEY_BACKUPS)).toBe(true);
            expect(d1Map.has(`backup_data_${snapshotId}`)).toBe(true);
            expect(d1Map.get(`backup_data_${snapshotId}`).data.test).toBe(123);
        });
    });

    describe('13. Password Modification & User Management APIs', () => {
        it('should handle /api/user/password modification and verify old password', async () => {
            const store = new Map<string, any>();
            const mockEnv: any = {
                SUB_ONE_KV: {
                    get: async (k: string, type?: string) => {
                        const val = store.get(k);
                        if (val === undefined) return null;
                        return type === 'json' ? JSON.parse(val) : val;
                    },
                    put: async (k: string, v: string) => { store.set(k, v); },
                    delete: async (k: string) => { store.delete(k); }
                }
            };

            // Setup a user
            const adminUser = await createUser(mockEnv, 'admin', 'oldPassword123', 'admin');

            // Simulate authorized cookie session
            const { generateSecureToken, COOKIE_NAME } = await import('../api/auth');
            const token = await generateSecureToken(mockEnv, adminUser.id, adminUser.username);

            // Attempt to change password WITHOUT old password -> should fail
            const reqNoOld = new Request('http://localhost/api/user/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `${COOKIE_NAME}=${token}`
                },
                body: JSON.stringify({ newPassword: 'newPassword456' })
            });
            const resNoOld = await handleApiRequest(reqNoOld, mockEnv);
            expect(resNoOld.status).toBe(400);
            const noOldData = await resNoOld.json() as any;
            expect(noOldData.error).toBe('请输入原密码');

            // Attempt to change password with WRONG old password
            const reqFail = new Request('http://localhost/api/user/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `${COOKIE_NAME}=${token}`
                },
                body: JSON.stringify({ oldPassword: 'wrongOldPassword', newPassword: 'newPassword456' })
            });

            const resFail = await handleApiRequest(reqFail, mockEnv);
            expect(resFail.status).toBe(400);
            const failData = await resFail.json() as any;
            expect(failData.error).toBe('原密码不正确');

            // Change password with CORRECT old password
            const reqSuccess = new Request('http://localhost/api/user/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `${COOKIE_NAME}=${token}`
                },
                body: JSON.stringify({ oldPassword: 'oldPassword123', newPassword: 'newPassword456' })
            });

            const resSuccess = await handleApiRequest(reqSuccess, mockEnv);
            expect(resSuccess.status).toBe(200);
            const successData = await resSuccess.json() as any;
            expect(successData.success).toBe(true);
        });

        it('should handle /api/users CRUD operations', async () => {
            const store = new Map<string, any>();
            const mockEnv: any = {
                SUB_ONE_KV: {
                    get: async (k: string, type?: string) => {
                        const val = store.get(k);
                        if (val === undefined) return null;
                        return type === 'json' ? JSON.parse(val) : val;
                    },
                    put: async (k: string, v: string) => { store.set(k, v); },
                    delete: async (k: string) => { store.delete(k); }
                }
            };

            const adminUser = await createUser(mockEnv, 'admin', 'adminPassword123', 'admin');
            const { generateSecureToken, COOKIE_NAME } = await import('../api/auth');
            const token = await generateSecureToken(mockEnv, adminUser.id, adminUser.username);

            // GET /api/users
            const reqGet = new Request('http://localhost/api/users', {
                method: 'GET',
                headers: { 'Cookie': `${COOKIE_NAME}=${token}` }
            });
            const resGet = await handleApiRequest(reqGet, mockEnv);
            expect(resGet.status).toBe(200);
            const getData = await resGet.json() as any;
            expect(getData.data.length).toBe(1);
            expect(getData.data[0].username).toBe('admin');
            expect(getData.data[0].passwordHash).toBeUndefined();

            // POST /api/users (create user)
            const reqCreate = new Request('http://localhost/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `${COOKIE_NAME}=${token}`
                },
                body: JSON.stringify({ username: 'editor1', password: 'editorPass123', role: 'user' })
            });
            const resCreate = await handleApiRequest(reqCreate, mockEnv);
            expect(resCreate.status).toBe(200);
            const createData = await resCreate.json() as any;
            expect(createData.data.username).toBe('editor1');

            // DELETE /api/users/delete
            const reqDelete = new Request('http://localhost/api/users/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `${COOKIE_NAME}=${token}`
                },
                body: JSON.stringify({ id: createData.data.id })
            });
            const resDelete = await handleApiRequest(reqDelete, mockEnv);
            expect(resDelete.status).toBe(200);

            // Regular user tries to POST /api/users -> should get 403 Forbidden
            const regularUser = await createUser(mockEnv, 'regular', 'regularPass123', 'user');
            const regularToken = await generateSecureToken(mockEnv, regularUser.id, regularUser.username);
            const reqForbidden = new Request('http://localhost/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `${COOKIE_NAME}=${regularToken}`
                },
                body: JSON.stringify({ username: 'hacker', password: 'hackerPass123', role: 'admin' })
            });
            const resForbidden = await handleApiRequest(reqForbidden, mockEnv);
            expect(resForbidden.status).toBe(403);
        });
    });

    describe('14. Profile Matching with ID vs CustomId and URL Encoding', () => {
        it('should correctly match profile by id, customId, or URL-encoded customId in handleSubRequest', async () => {
            const { handleSubRequest } = await import('../subscription/handler');
            const store = new Map<string, any>();
            const mockEnv: any = {
                SUB_ONE_KV: {
                    get: async (k: string, type?: string) => {
                        const val = store.get(k);
                        if (val === undefined) return null;
                        return type === 'json' ? JSON.parse(val) : val;
                    },
                    put: async (k: string, v: string) => { store.set(k, v); },
                    delete: async (k: string) => { store.delete(k); }
                }
            };

            const profileToken = 'test-token-123';
            store.set(KV_KEY_SETTINGS, JSON.stringify({ profileToken }));
            store.set(KV_KEY_SUBS, JSON.stringify([
                { id: 'sub-1', url: 'ss://2022-blake3-aes-128-gcm:pass@1.2.3.4:8388#Node1', enabled: true }
            ]));
            store.set(KV_KEY_PROFILES, JSON.stringify([
                { id: '174000111222', name: 'ProfileNumeric', customId: '', enabled: true, subscriptions: ['sub-1'] },
                { id: 'prof-chinese', name: 'ProfileCN', customId: '测试组', enabled: true, subscriptions: ['sub-1'] }
            ]));

            // 1. Match by profile.id (fallback when customId is empty)
            const reqById = new Request(`http://localhost/sub/${profileToken}/174000111222?target=base64`);
            const resById = await handleSubRequest({ request: reqById, env: mockEnv } as any);
            expect(resById.status).toBe(200);

            // 2. Match by URL-encoded customId
            const encodedCustomId = encodeURIComponent('测试组');
            const reqByEncodedCustomId = new Request(`http://localhost/sub/${profileToken}/${encodedCustomId}?target=base64`);
            const resByEncoded = await handleSubRequest({ request: reqByEncodedCustomId, env: mockEnv } as any);
            expect(resByEncoded.status).toBe(200);

            // 3. Match by query param ?profile=customId
            const reqByQuery = new Request(`http://localhost/sub?token=${profileToken}&profile=测试组&target=base64`);
            const resByQuery = await handleSubRequest({ request: reqByQuery, env: mockEnv } as any);
            expect(resByQuery.status).toBe(200);
        });
    });
});
