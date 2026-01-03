import { SubscriptionParser } from '../lib/shared/subscription-parser';
import { buildNodeUrl } from '../lib/shared/url-builder';
import { encodeBase64 } from '../lib/shared/converter/base64';

const parser = new SubscriptionParser();

const ssrUrl = `ssr://${encodeBase64('1.2.3.4:8388:auth_aes128_md5:aes-128-cfb:tls1.2_ticket_auth:' + encodeBase64('testpass') + '/?remarks=' + encodeBase64('SSR测试节点') + '&protoparam=' + encodeBase64('param1') + '&obfsparam=' + encodeBase64('param2'))}`;

console.log("Original SSR URL:", ssrUrl);

const nodes = parser.parse(ssrUrl);
console.log("\nParsed Node:", nodes[0]);

if (nodes[0]) {
    const rebuilt = buildNodeUrl(nodes[0]);
    console.log("\nRebuilt SSR URL:", rebuilt);

    const nodes2 = parser.parse(rebuilt);
    console.log("\nRe-parsed Node (should match):", nodes2[0]);
}
