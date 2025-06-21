// 检查 Hydro 状态和插件加载
const http = require('http');

console.log('🔍 检查 Hydro 状态...');

// 检查 Hydro 是否运行
const checkHydro = () => {
    const req = http.get('http://127.0.0.1:8888', (res) => {
        console.log('✅ Hydro 服务正在运行');
        console.log('📊 HTTP 状态码:', res.statusCode);
        console.log('📊 响应头:', res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            if (data.includes('Hydro')) {
                console.log('✅ Hydro 页面正常加载');
            } else {
                console.log('⚠️  Hydro 页面可能有问题');
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Hydro 服务未运行:', error.message);
    });
    
    req.setTimeout(5000, () => {
        console.error('⏰ Hydro 服务连接超时');
        req.destroy();
    });
};

// 检查 WebSocket 端点
const checkWebSocket = () => {
    const req = http.get('http://127.0.0.1:8888/d/HandsomeRun/ws/realboard', (res) => {
        console.log('📡 WebSocket 端点响应:', res.statusCode);
        console.log('📡 升级头:', res.headers.upgrade);
        console.log('📡 连接头:', res.headers.connection);
    });
    
    req.on('error', (error) => {
        console.error('❌ WebSocket 端点错误:', error.message);
    });
    
    req.setTimeout(5000, () => {
        console.error('⏰ WebSocket 端点连接超时');
        req.destroy();
    });
};

// 检查比赛页面
const checkContest = () => {
    const req = http.get('http://127.0.0.1:8888/d/HandsomeRun/contest/6855db40cbdde934dfeb5cd9', (res) => {
        console.log('🏆 比赛页面响应:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            if (data.includes('realboard')) {
                console.log('✅ Realboard 插件已加载');
            } else {
                console.log('⚠️  Realboard 插件可能未加载');
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ 比赛页面错误:', error.message);
    });
    
    req.setTimeout(5000, () => {
        console.error('⏰ 比赛页面连接超时');
        req.destroy();
    });
};

// 执行检查
setTimeout(checkHydro, 1000);
setTimeout(checkWebSocket, 2000);
setTimeout(checkContest, 3000);

// 5秒后退出
setTimeout(() => {
    console.log('🔚 检查完成');
    process.exit(0);
}, 6000); 