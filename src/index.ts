import dotenv from 'dotenv';
import { WebSocketService } from './services/websocket.service';
import { AppiumService } from './services/appium.service';
import { Logger } from './utils/logger';
import { TestCommand, TestResult, WebSocketMessage, DeviceConfigCommand, StartTestCommand } from './types';

dotenv.config();

class AppiumAutomationServer {
	private wsService: WebSocketService;
	private appiumService: AppiumService;
	private logger: Logger;

	constructor() {
		this.logger = new Logger('AppiumAutomationServer');
		this.wsService = new WebSocketService(
			parseInt(process.env.WS_PORT || '8080')
		);
		this.appiumService = new AppiumService();
		
		this.initialize();
	}

	private initialize(): void {
		this.logger.info('Initializing Appium Automation Server...');
		this.wsService.registerMessageHandler('command', this.handleCommand.bind(this));
		this.wsService.registerMessageHandler('device_config', this.handleDeviceConfig.bind(this));
		this.wsService.registerMessageHandler('start_test', this.handleStartTest.bind(this));
		this.logger.info('Appium Automation Server initialized successfully');
	}

	private async handleCommand(message: WebSocketMessage): Promise<void> {
		try {
			const command = message.data as TestCommand;
			this.logger.info(`Received command: ${command.type} for device: ${command.deviceId}`);
			let result: TestResult;
			switch (command.type) {
				case 'register':
					result = await this.handleRegistrationCommand(command);
					break;
				case 'login':
					result = await this.handleLoginCommand(command);
					break;
				case 'message':
					result = await this.handleMessageCommand(command);
					break;
				case 'custom':
					result = await this.handleCustomCommand(command);
					break;
				default:
					result = {
						success: false,
						deviceId: command.deviceId,
						testType: command.type,
						duration: 0,
						error: `Unknown command type: ${command.type}`
					};
			}
			this.wsService.broadcast({
				type: 'result',
				data: result,
				timestamp: new Date().toISOString(),
				messageId: message.messageId
			});
		} catch (error) {
			this.logger.error('Error handling command:', error);
			const errorResult: TestResult = {
				success: false,
				deviceId: (message.data as TestCommand).deviceId,
				testType: (message.data as TestCommand).type,
				duration: 0,
				error: error instanceof Error ? error.message : String(error)
			};
			this.wsService.broadcast({
				type: 'result',
				data: errorResult,
				timestamp: new Date().toISOString(),
				messageId: message.messageId
			});
		}
	}

	private async handleDeviceConfig(message: WebSocketMessage): Promise<void> {
		try {
			const deviceConfig = message.data as DeviceConfigCommand;
			this.logger.info(`Received device config for device: ${deviceConfig.deviceId}`);
			
			// 添加设备配置到Appium配置管理器
			const configManager = this.appiumService.getConfigManager();
			configManager.addDeviceConfig(deviceConfig.deviceId, deviceConfig.deviceConfig);
			
			this.logger.info(`Device config added successfully for device: ${deviceConfig.deviceId}`);
			
			// 发送成功响应
			this.wsService.broadcast({
				type: 'status',
				data: { 
					status: 'success', 
					message: `Device config added for device: ${deviceConfig.deviceId}`,
					deviceId: deviceConfig.deviceId
				},
				timestamp: new Date().toISOString(),
				messageId: message.messageId
			});
		} catch (error) {
			this.logger.error('Error handling device config:', error);
			this.wsService.broadcast({
				type: 'status',
				data: { 
					status: 'error', 
					error: error instanceof Error ? error.message : String(error)
				},
				timestamp: new Date().toISOString(),
				messageId: message.messageId
			});
		}
	}

	private async handleStartTest(message: WebSocketMessage): Promise<void> {
		try {
			const startTestCommand = message.data as StartTestCommand;
			this.logger.info(`Received start test command for ${startTestCommand.devices.length} devices`);
			
			// 首先添加所有设备配置
			const configManager = this.appiumService.getConfigManager();
			for (const deviceConfig of startTestCommand.devices) {
				configManager.addDeviceConfig(deviceConfig.udid, deviceConfig);
			}
			
			// 为每个设备执行测试
			const results: TestResult[] = [];
			for (const deviceConfig of startTestCommand.devices) {
				try {
					const command: TestCommand = {
						type: startTestCommand.testType,
						deviceId: deviceConfig.udid,
						parameters: startTestCommand.parameters
					};
					
					let result: TestResult;
					switch (startTestCommand.testType) {
						case 'register':
							result = await this.handleRegistrationCommand(command);
							break;
						case 'login':
							result = await this.handleLoginCommand(command);
							break;
						case 'message':
							result = await this.handleMessageCommand(command);
							break;
						case 'custom':
							result = await this.handleCustomCommand(command);
							break;
						default:
							result = {
								success: false,
								deviceId: deviceConfig.udid,
								testType: startTestCommand.testType,
								duration: 0,
								error: `Unknown test type: ${startTestCommand.testType}`
							};
					}
					results.push(result);
				} catch (error) {
					results.push({
						success: false,
						deviceId: deviceConfig.udid,
						testType: startTestCommand.testType,
						duration: 0,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
			
			// 发送批量测试结果
			this.wsService.broadcast({
				type: 'result',
				data: {
					type: 'batch_test_result',
					results,
					totalDevices: startTestCommand.devices.length,
					successfulTests: results.filter(r => r.success).length,
					failedTests: results.filter(r => !r.success).length
				},
				timestamp: new Date().toISOString(),
				messageId: message.messageId
			});
			
		} catch (error) {
			this.logger.error('Error handling start test command:', error);
			this.wsService.broadcast({
				type: 'status',
				data: { 
					status: 'error', 
					error: error instanceof Error ? error.message : String(error)
				},
				timestamp: new Date().toISOString(),
				messageId: message.messageId
			});
		}
	}

	private async handleRegistrationCommand(command: TestCommand): Promise<TestResult> {
		const phoneNumber = command.parameters?.phoneNumber;
		if (!phoneNumber) {
			throw new Error('Phone number is required for registration');
		}
		return await this.appiumService.performViberRegistration(command.deviceId, phoneNumber);
	}

	private async handleLoginCommand(command: TestCommand): Promise<TestResult> {
		const startTime = Date.now();
		await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟登录过程
		return {
			success: true,
			deviceId: command.deviceId,
			testType: 'login',
			duration: Date.now() - startTime,
			data: { message: 'Login functionality not implemented yet' }
		};
	}

  private async handleMessageCommand(command: TestCommand): Promise<TestResult> {
    // TODO: 实现消息发送功能
    const startTime = Date.now();
    
    // 这里添加消息发送逻辑
    await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟消息发送过程
    
    return {
      success: true,
      deviceId: command.deviceId,
      testType: 'message',
      duration: Date.now() - startTime,
      data: { message: 'Message functionality not implemented yet' }
    };
  }

  private async handleCustomCommand(command: TestCommand): Promise<TestResult> {
    // TODO: 实现自定义命令功能
    const startTime = Date.now();
    
    // 这里添加自定义命令逻辑
    await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟自定义命令执行
    
    return {
      success: true,
      deviceId: command.deviceId,
      testType: 'custom',
      duration: Date.now() - startTime,
      data: { message: 'Custom command functionality not implemented yet' }
    };
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Appium Automation Server...');
    
    // 关闭所有Appium会话
    await this.appiumService.closeAllDrivers();
    
    // 关闭WebSocket服务
    this.wsService.close();
    
    this.logger.info('Appium Automation Server shutdown complete');
  }
}

const server = new AppiumAutomationServer();

process.on('SIGINT', async () => {
	console.log('\nReceived SIGINT, shutting down gracefully...');
	await server.shutdown();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.log('\nReceived SIGTERM, shutting down gracefully...');
	await server.shutdown();
	process.exit(0);
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
	process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	process.exit(1);
}); 