import type { Node } from '../types';

/**
 * 测试节点数据 Fixtures
 * 提供各种协议的标准测试数据
 */

// ==================== VMess 测试数据 ====================
export const vmessNode: Node = {
    id: '1',
    name: 'VMess节点',
    protocol: 'vmess',
    enabled: true,
    url: 'vmess://' + Buffer.from(JSON.stringify({
        v: '2',
        ps: 'VMess节点',
        add: 'example.com',
        port: '443',
        id: '12345678-1234-1234-1234-123456789012',
        aid: '0',
        scy: 'auto',
        net: 'ws',
        type: 'none',
        host: 'example.com',
        path: '/path',
        tls: 'tls',
        sni: 'example.com',
        alpn: 'h2,http/1.1',
    })).toString('base64'),
};

// ==================== VLESS 测试数据 ====================
export const vlessNode: Node = {
    id: '2',
    name: 'VLESS节点',
    protocol: 'vless',
    enabled: true,
    url: 'vless://12345678-1234-1234-1234-123456789012@example.com:443?type=ws&security=tls&path=/path&host=example.com&sni=example.com&alpn=h2,http/1.1#VLESS%E8%8A%82%E7%82%B9',
};

export const vlessRealityNode: Node = {
    id: '3',
    name: 'VLESS-Reality节点',
    protocol: 'vless',
    enabled: true,
    url: 'vless://12345678-1234-1234-1234-123456789012@example.com:443?type=tcp&security=reality&pbk=publickey123&sid=shortid123&sni=example.com&fp=chrome#VLESS-Reality',
};

// ==================== Trojan 测试数据 ====================
export const trojanNode: Node = {
    id: '4',
    name: 'Trojan节点',
    protocol: 'trojan',
    enabled: true,
    url: 'trojan://password123@example.com:443?sni=example.com&alpn=h2,http/1.1&type=ws&path=/path&host=example.com#Trojan%E8%8A%82%E7%82%B9',
};

// ==================== Shadowsocks 测试数据 ====================
export const shadowsocksNode: Node = {
    id: '5',
    name: 'SS节点',
    protocol: 'ss',
    enabled: true,
    url: 'ss://' + Buffer.from('aes-256-gcm:password123').toString('base64') + '@example.com:8388#SS%E8%8A%82%E7%82%B9',
};

export const shadowsocksWithPluginNode: Node = {
    id: '6',
    name: 'SS-Obfs节点',
    protocol: 'ss',
    enabled: true,
    url: 'ss://' + Buffer.from('aes-256-gcm:password123').toString('base64') + '@example.com:8388?plugin=obfs-local;obfs=http;obfs-host=example.com#SS-Obfs',
};

// ==================== Hysteria2 测试数据 ====================
export const hysteria2Node: Node = {
    id: '7',
    name: 'Hysteria2节点',
    protocol: 'hysteria2',
    enabled: true,
    url: 'hysteria2://password123@example.com:443?sni=example.com&alpn=h3&insecure=0&obfs=salamander&obfs-password=obfspass#Hysteria2%E8%8A%82%E7%82%B9',
};

// ==================== Hysteria 测试数据 ====================
export const hysteriaNode: Node = {
    id: '8',
    name: 'Hysteria节点',
    protocol: 'hysteria',
    enabled: true,
    url: 'hysteria://example.com:36712?auth=password123&upmbps=10&downmbps=50&alpn=h3&obfs=xplus&protocol=wechat-video&sni=example.com#Hysteria%E8%8A%82%E7%82%B9',
};

// ==================== TUIC 测试数据 ====================
export const tuicNode: Node = {
    id: '9',
    name: 'TUIC节点',
    protocol: 'tuic',
    enabled: true,
    url: 'tuic://12345678-1234-1234-1234-123456789012:password123@example.com:443?sni=example.com&alpn=h3&congestion_control=cubic#TUIC%E8%8A%82%E7%82%B9',
};

// ==================== Snell 测试数据 ====================
export const snellNode: Node = {
    id: '10',
    name: 'Snell节点',
    protocol: 'snell',
    enabled: true,
    url: 'snell://example.com:6333?psk=presharedkey123&version=4&obfs=http&obfs-host=example.com#Snell%E8%8A%82%E7%82%B9',
};

// ==================== WireGuard 测试数据 ====================
export const wireguardNode: Node = {
    id: '11',
    name: 'WireGuard节点',
    protocol: 'wireguard',
    enabled: true,
    url: 'wireguard://privatekey123@example.com:51820?publickey=publickey456&ip=10.0.0.2&reserved=1,2,3&mtu=1420#WireGuard%E8%8A%82%E7%82%B9',
};

// ==================== 多协议测试集 ====================
export const mixedNodes: Node[] = [
    vmessNode,
    vlessNode,
    trojanNode,
    shadowsocksNode,
    hysteria2Node,
];

export const allProtocolNodes: Node[] = [
    vmessNode,
    vlessNode,
    vlessRealityNode,
    trojanNode,
    shadowsocksNode,
    shadowsocksWithPluginNode,
    hysteria2Node,
    hysteriaNode,
    tuicNode,
    snellNode,
    wireguardNode,
];

// ==================== 边界情况测试数据 ====================
export const emptyNodes: Node[] = [];

export const invalidNode: Node = {
    id: '999',
    name: '无效节点',
    protocol: 'invalid-protocol' as any,
    enabled: true,
    url: 'invalid://broken-url',
};

export const disabledNode: Node = {
    id: '998',
    name: '已禁用节点',
    protocol: 'vmess',
    enabled: false,
    url: vmessNode.url,
};
