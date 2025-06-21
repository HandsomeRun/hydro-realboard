// 测试 Hydro WebSocket 服务
const WebSocket = require('ws');

// 直接连接到 Hydro 后端（绕过 Caddy）
const wsUrl = 'ws://127.0.0.1:8888/d/HandsomeRun/ws/realboard?cid=6855db40cbdde934dfeb5cd9';

console.log('🔍 直接测试 Hydro WebSocket 服务');
console.log('URL:', wsUrl);
console.log('');

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('✅ 直接连接到 Hydro 成功');
    console.log('📊 连接状态:', ws.readyState);
});

ws.on('message', (data) => {
    console.log('📨 收到消息:', data.toString());
});

ws.on('error', (error) => {
    console.error('❌ 直接连接错误:', error.message);
});

ws.on('close', (code, reason) => {
    console.log('🔌 连接关闭:', code, reason);
});

// 3秒后关闭
setTimeout(() => {
    ws.close();
    process.exit(0);
}, 3000); 