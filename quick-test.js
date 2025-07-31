const WebSocket = require('ws');

console.log('🧪 Quick Test - Viber Appium Automation Server');
console.log('==============================================\n');

// 连接到WebSocket服务器
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  
  // 发送一个简单的状态查询
  const message = {
    type: 'status',
    data: { action: 'ping' },
    timestamp: new Date().toISOString(),
    messageId: 'test_001'
  };
  
  ws.send(JSON.stringify(message));
  console.log('📤 Sent ping message');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received message:', message);
    
    if (message.type === 'status' && message.data.status === 'connected') {
      console.log('✅ Server is ready!');
      
      // 测试注册命令（不会真正执行，因为没有配置设备）
      const registerCommand = {
        type: 'command',
        data: {
          type: 'register',
          deviceId: 'default',
          parameters: {
            phoneNumber: '+1234567890'
          }
        },
        timestamp: new Date().toISOString(),
        messageId: 'test_002'
      };
      
      setTimeout(() => {
        ws.send(JSON.stringify(registerCommand));
        console.log('📤 Sent register command (will fail without device config)');
      }, 1000);
    }
  } catch (error) {
    console.error('❌ Failed to parse message:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
});

// 5秒后关闭连接
setTimeout(() => {
  console.log('\n🏁 Test completed');
  ws.close();
  process.exit(0);
}, 5000); 