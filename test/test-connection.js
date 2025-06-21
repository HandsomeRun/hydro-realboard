// 简单的 WebSocket 连接测试脚本
const WebSocket = require('ws');

// 替换为你的实际域名和比赛ID
const domainId = 'HandsomeRun'; // 或者你的域名
const contestId = '6855db40cbdde934dfeb5cd9'; // 替换为实际的比赛ID
const wsUrl = 'ws://118.230.232.250/d/HandsomeRun/ws/realboard?cid=6855db40cbdde934dfeb5cd9';

console.log('尝试连接到:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log('✅ WebSocket 连接已建立');
});

ws.on('message', (data) => {
    console.log('📨 收到消息:', data.toString());
});

ws.on('error', (error) => {
    console.error('❌ WebSocket 连接错误:', error);
});

ws.on('close', (code, reason) => {
    console.log('🔌 WebSocket 连接已关闭, code:', code, 'reason:', reason);
});

// 5秒后关闭连接
setTimeout(() => {
    console.log('🕐 5秒后关闭连接');
    ws.close();
}, 5000); 