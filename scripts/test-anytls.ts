import { parseNodeUrl } from '../lib/shared/parsers';
import { buildNodeUrl } from '../lib/shared/url-builder';

const testUrls = [
    'anytls://uuid@server.com:443?sni=mysni.com&fp=chrome&idleTimeout=60&tls=1#AnyTLSTest',
];

testUrls.forEach(url => {
    console.log(`Testing URL: ${url}`);
    const node = parseNodeUrl(url);
    if (node) {
        console.log('Parsed successfully:', JSON.stringify(node, null, 2));
        const rebuilt = buildNodeUrl(node);
        console.log('Rebuilt URL:', rebuilt);
        if (rebuilt === url) {
            console.log('MATCH!');
        } else {
            console.log('MISMATCH! Rebuilt version is different.');
        }
    } else {
        console.log('FAILED to parse AnyTLS URL');
    }
});
