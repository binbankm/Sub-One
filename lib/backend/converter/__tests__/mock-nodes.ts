import { ProxyNode, VmessNode, VlessNode, TrojanNode, ShadowsocksNode, ShadowsocksRNode, Hysteria2Node, TuicNode, WireGuardNode, Socks5Node } from '../../../shared/types';

export const mockNodes = {
    vmess: {
        type: 'vmess',
        name: 'VMess Test',
        server: 'vmess.example.com',
        port: 443,
        uuid: 'a12ba00f-485a-4b07-9b2f-2d743a1a5b82',
        alterId: 0,
        cipher: 'auto',
        tls: {
            enabled: true,
            serverName: 'vmess.example.com'
        },
        transport: {
            type: 'ws',
            path: '/vmess',
            headers: { Host: 'vmess.example.com' }
        },
        network: 'ws',
        id: 'vmess-id',
        udp: true
    } as VmessNode,

    vlessReality: {
        type: 'vless',
        name: 'VLESS Reality Test',
        server: 'vless.example.com',
        port: 443,
        uuid: 'b23cb11f-596b-5c18-0c3f-3e854b2b6c93',
        cipher: 'auto',
        flow: 'xtls-rprx-vision',
        tls: {
            enabled: true,
            serverName: 'vless.example.com',
            reality: {
                enabled: true,
                publicKey: '7_A2k1...M3k1',
                shortId: '12345abcdef',
                spiderX: '/'
            }
        },
        id: 'vless-id',
        udp: true
    } as VlessNode,

    trojan: {
        type: 'trojan',
        name: 'Trojan Test',
        server: 'trojan.example.com',
        port: 443,
        password: 'trojan-password',
        tls: {
            enabled: true,
            serverName: 'trojan.example.com',
            alpn: ['h2', 'http/1.1']
        },
        id: 'trojan-id',
        udp: true
    } as TrojanNode,

    ss: {
        type: 'ss',
        name: 'SS Test',
        server: 'ss.example.com',
        port: 8388,
        cipher: 'aes-256-gcm',
        password: 'ss-password',
        udp: true,
        id: 'ss-id'
    } as ShadowsocksNode,

    ssr: {
        type: 'ssr',
        name: 'SSR Test',
        server: 'ssr.example.com',
        port: 1234,
        protocol: 'auth_aes128_md5',
        cipher: 'aes-128-ctr',
        obfs: 'tls1.2_ticket_auth',
        password: 'ssr-password',
        protocolParam: 'protocol-param',
        obfsParam: 'obfs-param',
        id: 'ssr-id',
        udp: true
    } as ShadowsocksRNode,

    hysteria2: {
        type: 'hysteria2',
        name: 'Hysteria2 Test',
        server: 'hy2.example.com',
        port: 443,
        password: 'hy2-password',
        tls: {
            enabled: true,
            serverName: 'hy2.example.com',
            insecure: true
        },
        obfs: {
            type: 'salamander',
            password: 'obfs-password'
        },
        id: 'hy2-id',
        udp: true
    } as Hysteria2Node,

    tuic: {
        type: 'tuic',
        name: 'TUIC Test',
        server: 'tuic.example.com',
        port: 8443,
        uuid: 'c34dc22f-6a7c-6d29-1d4f-4f965c3c7d04',
        password: 'tuic-password',
        congestionControl: 'bbr', // corrected from congestion_control
        tls: {
            enabled: true,
            serverName: 'tuic.example.com',
            alpn: ['h3']
        },
        id: 'tuic-id',
        udp: true
    } as TuicNode,

    wireguard: {
        type: 'wireguard',
        name: 'WireGuard Test',
        server: '1.2.3.4',
        port: 51820,
        privateKey: 'private-key',
        publicKey: 'public-key',
        preSharedKey: 'preshared-key',
        ip: '10.0.0.2/32',
        ipv6: '2001:db8::2/128',
        mtu: 1420,
        id: 'wg-id',
        udp: true
    } as WireGuardNode,

    socks5: {
        type: 'socks5',
        name: 'Socks5 Test',
        server: 'socks.example.com',
        port: 1080,
        username: 'user',
        password: 'pass',
        tls: {
            enabled: true,
            serverName: 'socks.example.com'
        },
        id: 'socks-id',
        udp: true
    } as Socks5Node
};

export const allNodes: ProxyNode[] = Object.values(mockNodes);
