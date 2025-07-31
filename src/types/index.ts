export interface DeviceConfig {
	udid: string;
	deviceName: string;
	platformVersion: string;
	bundleId: string;
	appPath?: string;
}

export interface AppiumConfig {
	host: string;
	port: number;
	deviceConfig: DeviceConfig;
	capabilities: any;
}

export interface TestCommand {
	type: 'register' | 'login' | 'message' | 'custom' | 'start_test' | 'add_device';
	deviceId: string;
	parameters?: Record<string, any>;
}

export interface DeviceConfigCommand {
	type: 'add_device';
	deviceId: string;
	deviceConfig: DeviceConfig;
}

export interface StartTestCommand {
	type: 'start_test';
	devices: DeviceConfig[];
	testType: 'register' | 'login' | 'message' | 'custom';
	parameters?: Record<string, any>;
}

export interface TestResult {
	success: boolean;
	deviceId: string;
	testType: string;
	duration: number;
	error?: string;
	data?: any;
}

export interface ApiResponse {
	url: string;
	method: string;
	requestBody?: any;
	responseBody?: any;
	statusCode: number;
	timestamp: string;
	deviceId: string;
}

export interface WebSocketMessage {
	type: 'command' | 'status' | 'result' | 'device_config' | 'start_test';
	data: TestCommand | TestResult | DeviceConfigCommand | StartTestCommand | any;
	timestamp: string;
	messageId: string;
} 