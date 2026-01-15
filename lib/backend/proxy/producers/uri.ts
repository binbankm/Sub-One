/**
 * URI Producer
 * 参考 Sub-Store: producers/uri.js
 *
 * 输出通用 URI 格式（Base64 订阅）
 */

import { Proxy } from '../types';
import { Base64 } from 'js-base64';
import { removeMetadata, cleanProxy } from './utils';
import { isIPv6 as checkIPv6 } from '../utils';

/**
 * 生成 VLESS URI
 */
function vless(proxy: Proxy): string {
    let security = 'none';
    const isReality = !!proxy['reality-opts'];
    let sid = '';
    let pbk = '';
    let spx = '';

    if (isReality) {
        security = 'reality';
        const publicKey = proxy['reality-opts']?.['public-key'];
        if (publicKey) {
            pbk = `&pbk=${encodeURIComponent(publicKey)}`;
        }
        const shortId = proxy['reality-opts']?.['short-id'];
        if (shortId) {
            sid = `&sid=${encodeURIComponent(shortId)}`;
        }
        const spiderX = proxy['reality-opts']?.['_spider-x'];
        if (spiderX) {
            spx = `&spx=${encodeURIComponent(spiderX)}`;
        }
    } else if (proxy.tls) {
        security = 'tls';
    }

    let alpn = '';
    if (proxy.alpn) {
        alpn = `&alpn=${encodeURIComponent(
            Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn
        )}`;
    }

    let allowInsecure = '';
    if (proxy['skip-cert-verify']) {
        allowInsecure = '&allowInsecure=1';
    }

    let sni = '';
    if (proxy.sni) {
        sni = `&sni=${encodeURIComponent(proxy.sni)}`;
    }

    let fp = '';
    if (proxy['client-fingerprint']) {
        fp = `&fp=${encodeURIComponent(proxy['client-fingerprint'])}`;
    }

    let flow = '';
    if (proxy.flow) {
        flow = `&flow=${encodeURIComponent(proxy.flow)}`;
    }

    let vlessType: string = proxy.network || 'tcp';
    if (proxy.network === 'ws' && proxy['ws-opts']?.['v2ray-http-upgrade']) {
        vlessType = 'httpupgrade';
    }

    let vlessTransport = `&type=${encodeURIComponent(vlessType)}`;

    // gRPC 特殊处理
    if (proxy.network === 'grpc') {
        vlessTransport += `&mode=${encodeURIComponent(
            proxy['grpc-opts']?.[`_grpc-type`] || 'gun'
        )}`;
        const authority = proxy['grpc-opts']?.[`_grpc-authority`];
        if (authority) {
            vlessTransport += `&authority=${encodeURIComponent(authority as string)}`;
        }
    }

    // 传输层 path 和 host
    const optsKey = `${proxy.network}-opts` as keyof Proxy;
    const opts = proxy[optsKey] as any;

    if (opts) {
        const path = opts.path;
        const host = opts.headers?.Host;
        const serviceName = opts[`${proxy.network}-service-name`];

        if (path) {
            vlessTransport += `&path=${encodeURIComponent(
                Array.isArray(path) ? path[0] : path
            )}`;
        }
        if (host) {
            vlessTransport += `&host=${encodeURIComponent(
                Array.isArray(host) ? host[0] : host
            )}`;
        }
        if (serviceName) {
            vlessTransport += `&serviceName=${encodeURIComponent(serviceName)}`;
        }
    }

    const server = checkIPv6(proxy.server) ? `[${proxy.server}]` : proxy.server;

    return `vless://${proxy.uuid}@${server}:${proxy.port}?security=${encodeURIComponent(
        security
    )}${vlessTransport}${alpn}${allowInsecure}${sni}${fp}${flow}${sid}${spx}${pbk}#${encodeURIComponent(
        proxy.name
    )}`;
}

export function URI_Producer() {
    const type = 'SINGLE' as const;

    const produce = (input: Proxy | Proxy[]): string => {
        const proxy = Array.isArray(input) ? input[0] : input;
        if (!proxy) return '';

        let p = removeMetadata(proxy);
        p = cleanProxy(p, true);

        // 隐式 TLS
        if (['trojan', 'tuic', 'hysteria', 'hysteria2', 'anytls'].includes(p.type)) {
            delete p.tls;
        }

        // IPv6 地址格式化
        if (!['vmess' as any].includes(p.type) && p.server && checkIPv6(p.server)) {
            p.server = `[${p.server}]`;
        }

        let result = '';

        switch (p.type) {
            case 'socks5':
                result = `socks://${encodeURIComponent(
                    Base64.encode(`${p.username ?? ''}:${p.password ?? ''}`)
                )}@${p.server}:${p.port}#${encodeURIComponent(p.name)}`;
                break;

            case 'ss': {
                const userinfo = `${p.cipher}:${p.password}`;
                let encoded: string;
                if (p.cipher?.startsWith('2022-blake3-')) {
                    encoded = `${encodeURIComponent(p.cipher)}:${encodeURIComponent(p.password || '')}`;
                } else {
                    encoded = Base64.encode(userinfo);
                }
                result = `ss://${encoded}@${p.server}:${p.port}${p.plugin ? '/' : ''}`;

                let query = '';

                // 插件
                if (p.plugin) {
                    query += '&plugin=';
                    const opts = (p['plugin-opts'] as any) || {};
                    switch (p.plugin) {
                        case 'obfs':
                            query += encodeURIComponent(
                                `simple-obfs;obfs=${opts.mode}${opts.host ? ';obfs-host=' + opts.host : ''}`
                            );
                            break;
                        case 'v2ray-plugin':
                            query += encodeURIComponent(
                                `v2ray-plugin;obfs=${opts.mode}${opts.host ? ';obfs-host=' + opts.host : ''}${opts.tls ? ';tls' : ''}`
                            );
                            break;
                        case 'shadow-tls':
                            query += encodeURIComponent(
                                `shadow-tls;host=${opts.host};password=${opts.password};version=${opts.version}`
                            );
                            break;
                    }
                }

                if (p['udp-over-tcp']) query += '&uot=1';
                if (p.tfo) query += '&tfo=1';

                query += `#${encodeURIComponent(p.name)}`;
                result += query.replace(/^&/, '?');
                break;
            }

            case 'ssr': {
                let ssrContent = `${p.server}:${p.port}:${p.protocol}:${p.cipher}:${p.obfs}:${Base64.encode(p.password || '')}/`;
                ssrContent += `?remarks=${Base64.encode(p.name)}`;
                if (p['obfs-param']) {
                    ssrContent += `&obfsparam=${Base64.encode(p['obfs-param'])}`;
                }
                if (p['protocol-param']) {
                    ssrContent += `&protocolparam=${Base64.encode(p['protocol-param'])}`;
                }
                result = 'ssr://' + Base64.encode(ssrContent);
                break;
            }

            case 'vmess': {
                let net: string = p.network || 'tcp';
                let headerType = '';
                if (p.network === 'http') {
                    net = 'tcp';
                    headerType = 'http';
                } else if (p.network === 'ws' && p['ws-opts']?.['v2ray-http-upgrade']) {
                    net = 'httpupgrade';
                }

                const vmessObj: any = {
                    v: '2',
                    ps: p.name,
                    add: p.server,
                    port: `${p.port}`,
                    id: p.uuid,
                    aid: `${p.alterId || 0}`,
                    scy: p.cipher,
                    net,
                    type: headerType,
                    tls: p.tls ? 'tls' : '',
                    alpn: Array.isArray(p.alpn) ? p.alpn.join(',') : p.alpn,
                    fp: p['client-fingerprint'],
                };

                if (p.tls && p.sni) {
                    vmessObj.sni = p.sni;
                }

                // 传输层
                if (p.network) {
                    const optsKey = `${p.network}-opts` as keyof Proxy;
                    const opts = p[optsKey] as any;

                    if (opts) {
                        if (p.network === 'grpc') {
                            vmessObj.path = opts['grpc-service-name'];
                            vmessObj.type = opts['_grpc-type'] || 'gun';
                            vmessObj.host = opts['_grpc-authority'];
                        } else {
                            const path = opts.path;
                            const host = opts.headers?.Host;

                            if (path) {
                                vmessObj.path = Array.isArray(path) ? path[0] : path;
                            }
                            if (host) {
                                vmessObj.host = Array.isArray(host) ? host[0] : host;
                            }
                        }
                    }
                }

                result = 'vmess://' + Base64.encode(JSON.stringify(vmessObj));
                break;
            }

            case 'vless':
                result = vless(p);
                break;

            case 'trojan': {
                let transport = '';
                if (p.network && p.network !== 'tcp') {
                    let trojanType: string = p.network;
                    if (p.network === 'ws' && p['ws-opts']?.['v2ray-http-upgrade']) {
                        trojanType = 'httpupgrade';
                    }
                    transport = `&type=${encodeURIComponent(trojanType)}`;

                    const optsKey = `${p.network}-opts` as keyof Proxy;
                    const opts = p[optsKey] as any;

                    if (opts) {
                        const path = opts.path;
                        const host = opts.headers?.Host;

                        if (path) transport += `&path=${encodeURIComponent(path)}`;
                        if (host) transport += `&host=${encodeURIComponent(host)}`;
                    }
                }

                let alpn = '';
                if (p.alpn) {
                    alpn = `&alpn=${encodeURIComponent(
                        Array.isArray(p.alpn) ? p.alpn.join(',') : p.alpn
                    )}`;
                }

                let fp = '';
                if (p['client-fingerprint']) {
                    fp = `&fp=${encodeURIComponent(p['client-fingerprint'])}`;
                }

                result = `trojan://${encodeURIComponent(p.password || '')}@${p.server}:${p.port}?sni=${encodeURIComponent(
                    p.sni || p.server
                )}${p['skip-cert-verify'] ? '&allowInsecure=1' : ''}${transport}${alpn}${fp}#${encodeURIComponent(
                    p.name
                )}`;
                break;
            }

            case 'hysteria2': {
                const params: string[] = [];
                if (p.sni) params.push(`sni=${encodeURIComponent(p.sni)}`);
                if (p['skip-cert-verify']) params.push('insecure=1');
                if (p.obfs) {
                    params.push(`obfs=${encodeURIComponent(p.obfs)}`);
                    if (p['obfs-password']) {
                        params.push(`obfs-password=${encodeURIComponent(p['obfs-password'])}`);
                    }
                }
                if (p.ports) params.push(`mport=${p.ports}`);
                if (p['tls-fingerprint']) {
                    params.push(`pinSHA256=${encodeURIComponent(p['tls-fingerprint'])}`);
                }
                if (p.tfo) params.push('fastopen=1');

                result = `hysteria2://${encodeURIComponent(p.password || '')}@${p.server}:${p.port}?${params.join('&')}#${encodeURIComponent(p.name)}`;
                break;
            }

            case 'hysteria': {
                const params: string[] = [];
                if (p['auth-str']) params.push(`auth=${encodeURIComponent(p['auth-str'])}`);
                if (p.up) params.push(`upmbps=${p.up}`);
                if (p.down) params.push(`downmbps=${p.down}`);
                if (p.sni) params.push(`peer=${encodeURIComponent(p.sni)}`);
                if (p['skip-cert-verify']) params.push('insecure=1');
                if (p.alpn) {
                    params.push(`alpn=${encodeURIComponent(Array.isArray(p.alpn) ? p.alpn[0] : p.alpn)}`);
                }
                if (p.ports) params.push(`mport=${p.ports}`);
                if (p.tfo) params.push('fastopen=1');
                if (p.obfs) params.push(`obfsParam=${encodeURIComponent(p.obfs)}`);

                result = `hysteria://${p.server}:${p.port}?${params.join('&')}#${encodeURIComponent(p.name)}`;
                break;
            }

            case 'tuic': {
                const params: string[] = [];
                if (p.sni) params.push(`sni=${encodeURIComponent(p.sni)}`);
                if (p['skip-cert-verify']) params.push('allow_insecure=1');
                if (p.alpn) {
                    params.push(`alpn=${encodeURIComponent(Array.isArray(p.alpn) ? p.alpn[0] : p.alpn)}`);
                }
                if (p['congestion-controller']) {
                    params.push(`congestion_control=${encodeURIComponent(p['congestion-controller'])}`);
                }
                if (p['udp-relay-mode']) {
                    params.push(`udp_relay_mode=${encodeURIComponent(p['udp-relay-mode'])}`);
                }
                if (p['reduce-rtt']) params.push('reduce_rtt=1');
                if (p.tfo) params.push('fast_open=1');

                result = `tuic://${encodeURIComponent(p.uuid || '')}:${encodeURIComponent(p.password || '')}@${p.server}:${p.port}?${params.join('&')}#${encodeURIComponent(p.name)}`;
                break;
            }

            case 'wireguard': {
                const params: string[] = [];
                if (p['public-key']) params.push(`publickey=${encodeURIComponent(p['public-key'])}`);
                if (p['pre-shared-key'] || p['preshared-key']) {
                    params.push(`presharedkey=${encodeURIComponent(p['pre-shared-key'] || p['preshared-key'] || '')}`);
                }
                if (p.ip || p.ipv6) {
                    const addrs: string[] = [];
                    if (p.ip) addrs.push(p.ip);
                    if (p.ipv6) addrs.push(p.ipv6);
                    params.push(`address=${encodeURIComponent(addrs.join(','))}`);
                }
                if (p.mtu) params.push(`mtu=${p.mtu}`);
                if (p.reserved) {
                    const r = Array.isArray(p.reserved) ? p.reserved.join(',') : p.reserved;
                    params.push(`reserved=${encodeURIComponent(r)}`);
                }
                if (p.udp) params.push('udp=1');

                result = `wireguard://${encodeURIComponent(p['private-key'] || '')}@${p.server}:${p.port}?${params.join('&')}#${encodeURIComponent(p.name)}`;
                break;
            }

            case 'anytls': {
                const params: string[] = [];
                if (p.sni) params.push(`sni=${encodeURIComponent(p.sni)}`);
                if (p['skip-cert-verify']) params.push('insecure=1');
                if (p.alpn) {
                    params.push(`alpn=${encodeURIComponent(Array.isArray(p.alpn) ? p.alpn.join(',') : p.alpn)}`);
                }
                if (p['idle-timeout']) params.push(`idle_timeout=${p['idle-timeout']}`);
                if (p.udp) params.push('udp=1');

                result = `anytls://${encodeURIComponent(p.password || '')}@${p.server}:${p.port}?${params.join('&')}#${encodeURIComponent(p.name)}`;
                break;
            }

            case 'snell': {
                const psk = p.psk || p.password || '';
                const params: string[] = [];
                if (p.version) params.push(`version=${p.version}`);
                if (p['obfs-opts']) {
                    const opts = p['obfs-opts'] as any;
                    if (opts.mode) params.push(`obfs=${opts.mode}`);
                    if (opts.host) params.push(`obfs-host=${opts.host}`);
                }
                const query = params.length > 0 ? `?${params.join('&')}` : '';
                result = `snell://${encodeURIComponent(psk)}@${p.server}:${p.port}${query}#${encodeURIComponent(p.name)}`;
                break;
            }

            default:
                // 不支持的类型返回空
                result = '';
        }

        return result;
    };

    return { type, produce };
}

export default URI_Producer;
