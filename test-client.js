const WebSocket = require('ws');

class TestClient {
  constructor(serverUrl = 'ws://localhost:8080') {
    this.ws = null;
    this.serverUrl = serverUrl;
    this.messageId = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.on('open', () => {
        console.log('Connected to WebSocket server');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
  }

  handleMessage(message) {
    console.log('Received message:', message);
    
    if (message.type === 'result') {
      const result = message.data;
      if (result.success) {
        console.log(`✅ Test completed successfully: ${result.testType}`);
        console.log(`   Duration: ${result.duration}ms`);
        if (result.data) {
          console.log(`   Data:`, result.data);
        }
      } else {
        console.log(`❌ Test failed: ${result.testType}`);
        console.log(`   Error: ${result.error}`);
      }
    } else if (message.type === 'status') {
      console.log(`📊 Status: ${message.data.status}`);
      if (message.data.message) {
        console.log(`   Message: ${message.data.message}`);
      }
    }
  }

  sendCommand(commandType, deviceId = 'default', parameters = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'command',
      data: {
        type: commandType,
        deviceId,
        parameters
      },
      timestamp: new Date().toISOString(),
      messageId: `msg_${Date.now()}_${this.messageId++}`
    };

    this.ws.send(JSON.stringify(message));
    console.log(`📤 Sent command: ${commandType} for device: ${deviceId}`);
  }

  testRegistration(phoneNumber = '+1234567890') {
    this.sendCommand('register', 'default', { phoneNumber });
  }

  testLogin() {
    this.sendCommand('login', 'default');
  }

  testMessage() {
    this.sendCommand('message', 'default');
  }

  testCustom() {
    this.sendCommand('custom', 'default');
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// 使用示例
async function runTest() {
  const client = new TestClient();
  
  try {
    await client.connect();
    
    // 等待连接确认
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 测试注册功能
    console.log('\n🧪 Testing Viber registration...');
    client.testRegistration('+1234567890');
    
    // 等待测试完成
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 测试其他功能
    console.log('\n🧪 Testing login...');
    client.testLogin();
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🧪 Testing message...');
    client.testMessage();
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🧪 Testing custom command...');
    client.testCustom();
    
    // 等待所有测试完成
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    client.disconnect();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = TestClient; 