// WebSocket 连接调试脚本
const WebSocket = require('ws');

// 配置
const config = {
    domainId: 'HandsomeRun',
    contestId: '6855db40cbdde934dfeb5cd9',
    server: '118.230.232.250',
    port: 80, // HTTP 端口
    secure: false, // 是否使用 HTTPS/WSS
};

// 构建 WebSocket URL
const protocol = config.secure ? 'wss' : 'ws';
const wsUrl = `${protocol}://${config.server}/d/${config.domainId}/ws/realboard?cid=${config.contestId}`;

console.log('🔍 WebSocket 调试信息:');
console.log('URL:', wsUrl);
console.log('域名:', config.domainId);
console.log('比赛ID:', config.contestId);
console.log('服务器:', config.server);
console.log('协议:', protocol);
console.log('');

console.log('📡 尝试连接...');

const ws = new WebSocket(wsUrl, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `http://${config.server}`,
    },
    followRedirects: true,
});

// 连接事件
ws.on('open', () => {
    console.log('✅ WebSocket 连接已建立');
    console.log('📊 连接状态:', ws.readyState);
    console.log('🔗 协议:', ws.protocol);
    console.log('🔗 扩展:', ws.extensions);
});

ws.on('message', (data) => {
    console.log('📨 收到消息:', data.toString());
});

ws.on('error', (error) => {
    console.error('❌ WebSocket 连接错误:');
    console.error('   错误类型:', error.type);
    console.error('   错误消息:', error.message);
    console.error('   错误代码:', error.code);
    console.error('   错误详情:', error);
});

ws.on('close', (code, reason) => {
    console.log('🔌 WebSocket 连接已关闭:');
    console.log('   关闭代码:', code);
    console.log('   关闭原因:', reason);
    console.log('   关闭状态:', ws.readyState);
});

// 监听未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('💥 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 未处理的 Promise 拒绝:', reason);
});

// 5秒后关闭连接
setTimeout(() => {
    console.log('🕐 5秒后关闭连接');
    ws.close();
    process.exit(0);
}, 5000);

// 测试 HTTP 连接
const http = require('http');
const httpUrl = `http://${config.server}/d/${config.domainId}/contest/${config.contestId}`;

console.log('🌐 测试 HTTP 连接:', httpUrl);

const req = http.get(httpUrl, (res) => {
    console.log('📡 HTTP 响应状态:', res.statusCode);
    console.log('📡 HTTP 响应头:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('📄 HTTP 响应长度:', data.length);
        if (data.length < 1000) {
            console.log('📄 HTTP 响应内容:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ HTTP 连接错误:', error.message);
});

req.setTimeout(5000, () => {
    console.error('⏰ HTTP 连接超时');
    req.destroy();
}); 