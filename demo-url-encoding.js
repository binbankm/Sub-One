// 演示为什么必须编码特殊字符

const username = 'Og@193.233.254.7';
const password = '@193.233.254.7:';
const server = '193.233.254.7';
const port = 1080;

console.log('===== 原始数据 =====');
console.log('用户名:', username);
console.log('密码:', password);
console.log('服务器:', server);
console.log('端口:', port);

console.log('\n===== 不编码（错误方式）=====');
const urlNoEncoding = `socks5://${username}:${password}@${server}:${port}`;
console.log('URL:', urlNoEncoding);

// 尝试用浏览器的 URL 解析
try {
    const parsed = new URL(urlNoEncoding);
    console.log('\n解析结果:');
    console.log('  协议:', parsed.protocol);
    console.log('  用户名:', parsed.username);
    console.log('  密码:', parsed.password);
    console.log('  主机:', parsed.hostname);
    console.log('  端口:', parsed.port);
    console.log('\n❌ 看！解析完全错了！');
} catch (e) {
    console.log('❌ 无法解析:', e.message);
}

console.log('\n===== 正确编码 =====');
const encodedUsername = encodeURIComponent(username);
const encodedPassword = encodeURIComponent(password);
const urlEncoded = `socks5://${encodedUsername}:${encodedPassword}@${server}:${port}`;
console.log('URL:', urlEncoded);

try {
    const parsed = new URL(urlEncoded);
    console.log('\n解析结果:');
    console.log('  协议:', parsed.protocol);
    console.log('  用户名:', decodeURIComponent(parsed.username));
    console.log('  密码:', decodeURIComponent(parsed.password));
    console.log('  主机:', parsed.hostname);
    console.log('  端口:', parsed.port);
    console.log('\n✅ 完美！所有信息都正确！');
} catch (e) {
    console.log('❌ 解析失败:', e.message);
}

console.log('\n===== 编码对照 =====');
console.log('@ 编码为:', encodeURIComponent('@'), '→', '%40');
console.log(': 编码为:', encodeURIComponent(':'), '→', '%3A');
console.log('# 编码为:', encodeURIComponent('#'), '→', '%23');
