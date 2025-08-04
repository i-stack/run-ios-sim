import { WebSocketService } from './services/websocket.service';
import { AppiumService } from './services/appium.service';
import { Logger } from './utils/logger';
import { TestCommand, TestResult, WebSocketMessage } from './types';

class AppiumAutomationServer {
	private logger: Logger;
	private wsService: WebSocketService;
	private appiumService: AppiumService;

	constructor() {
		this.logger = new Logger('AppiumAutomationServer');
		this.wsService = new WebSocketService();
		this.appiumService = new AppiumService();
		this.setupWebSocket();
	}

	private async setupWebSocket() {
        this.wsService.on('message', async (message) => {
            switch (message.type) {
                case 'REGISTER_SERVER':
                    this.logger.info(`Received server registration: ${JSON.stringify(message.params)}`);
                    
                    break
                case 'START_TEST':
                    this.logger.info(`Received start test command: ${JSON.stringify(message.params)}`);
                    if (message.params && message.params.deviceIds) {
                        
                    }
                    break;
                case 'STOP_TEST':
                    this.logger.info('Received stop test command');
                    
                    break;
                case 'GET_STATUS':
                    this.logger.info('Received status request');
                    break;
                default:
                    this.logger.warn(`Unknown message type: ${message.type}`);
            }
        });

        this.wsService.on('connected', () => {
            this.logger.info('Connected to WebSocket server');
        });

        this.wsService.on('disconnected', () => {
            this.logger.info('Disconnected from WebSocket server');
        });

        this.wsService.on('error', (error) => {
            this.logger.error(`WebSocket error: ${error}`);
        });
    }

    start() {
        this.wsService.connect();
    }

    stop() {
        this.wsService.disconnect();
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