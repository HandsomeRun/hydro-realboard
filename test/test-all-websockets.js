// 测试 Hydro 的所有 WebSocket 端点
const WebSocket = require('ws');

const endpoints = [
    'ws://127.0.0.1:8888/d/HandsomeRun/ws/realboard?cid=6855db40cbdde934dfeb5cd9',
    'ws://127.0.0.1:8888/d/HandsomeRun/home/messages-conn',
    'ws://127.0.0.1:8888/d/HandsomeRun/record-conn',
    'ws://127.0.0.1:8888/d/HandsomeRun/ws/test',
];

console.log('🔍 测试 Hydro 的所有 WebSocket 端点...\n');

endpoints.forEach((url, index) => {
    console.log(`📡 测试 ${index + 1}: ${url}`);
    
    const ws = new WebSocket(url);
    
    ws.on('open', () => {
        console.log(`✅ ${index + 1}: 连接成功`);
    });
    
    ws.on('message', (data) => {
        console.log(`📨 ${index + 1}: 收到消息: ${data.toString().substring(0, 100)}`);
    });
    
    ws.on('error', (error) => {
        console.log(`❌ ${index + 1}: 连接错误: ${error.message}`);
    });
    
    ws.on('close', (code, reason) => {
        console.log(`🔌 ${index + 1}: 连接关闭 - 代码: ${code}, 原因: ${reason}`);
        console.log('');
    });
    
    // 2秒后关闭连接
    setTimeout(() => {
        ws.close();
    }, 2000);
});

// 6秒后退出
setTimeout(() => {
    console.log('🔚 测试完成');
    process.exit(0);
}, 6000); 