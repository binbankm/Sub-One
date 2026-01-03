import { SubscriptionParser } from '../lib/shared/subscription-parser';

const parser = new SubscriptionParser();

const sip008Content = JSON.stringify({
    version: 1,
    servers: [
        {
            remarks: "Test SIP008",
            server: "1.2.3.4",
            server_port: 8388,
            method: "aes-256-gcm",
            password: "test-password",
            plugin: "obfs-local",
            plugin_opts: "obfs=http;obfs-host=www.google.com"
        }
    ]
});

const vmessStyleSS = "ss://" + Buffer.from(JSON.stringify({
    ps: "VMess Style SS",
    add: "5.6.7.8",
    port: 8443,
    scy: "chacha20-poly1305",
    id: "uuid-pass"
})).toString('base64');

console.log("--- Testing SIP008 ---");
const nodes1 = parser.parse(sip008Content);
console.log(nodes1);

console.log("\n--- Testing VMess-Style SS URL ---");
const nodes2 = parser.parse(vmessStyleSS);
console.log(nodes2);
