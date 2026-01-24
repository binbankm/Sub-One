import { describe, expect, it } from 'vitest';

import { convert, parse } from '../index';

describe('New Protocol Converters Tests', () => {
    it('should convert to Surge AnyTLS and TUIC correctly', async () => {
        const nodes = parse(
            'anytls://pass@host:443?sni=sni.com#Any\ntuic://uuid:pass@host:443?alpn=h3#TUIC'
        );
        const surgeResult = await convert(nodes, 'surge');

        expect(surgeResult).toContain('Any=anytls,host,443,password="pass",sni=sni.com');
        expect(surgeResult).toContain('TUIC=tuic,host,443,uuid=uuid,password="pass",alpn=h3');
    });

    it('should convert to Loon TUIC and Snell correctly', async () => {
        const nodes = parse(
            'tuic://uuid:pass@host:443?alpn=h3#TUIC\nsnell://pass@host:443?version=4#Snell'
        );
        const loonResult = await convert(nodes, 'loon');

        expect(loonResult).toContain('TUIC=tuic,host,443,"uuid","pass",alpn=h3');
        expect(loonResult).toContain('Snell=snell,host,443,psk="pass",version=4');
    });

    it('should convert to QX Hysteria2 and WireGuard placeholder correctly', async () => {
        const nodes = parse(
            'hysteria2://pass@host:443#Hy2\nwireguard://priv@host:51820?ip=10.0.0.1#WG'
        );
        const qxResult = await convert(nodes, 'qx');

        expect(qxResult).toContain('hysteria2=host:443, password=pass, tag=Hy2');
        expect(qxResult).toContain(
            '# QX WireGuard: wireguard=WG, server=host, port=51820, ip=10.0.0.1'
        );
    });
});
