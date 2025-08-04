import axios from 'axios';
import { EnvConfig } from '../env';
import { Logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Interfaces
export interface SmsResponse {
    success: boolean;
    data: {
        sms?: {
            code?: string;
        } | null;
    };
}

export interface NumberResponse {
    activationId: string;
    phoneNumber: string;
    success: boolean;
    data: {
        activationId: string;
        phoneNumber: string;
    };
}

export interface PhoneNumberData {
    country?: string;
    service?: string;
    maxPrice?: string;
    phoneNumber: string;
    countryCode: string;
    activationId: string;
    originalPhoneNumber: string;
}

export interface ParsedPhoneNumber {
    nationalNumber: number;
    countryCode: string;
}

// Configuration interface
interface PhoneServiceConfig {
    country: string;
    service: string;
    maxPrice: string;
}

// Utility functions
function saveFile(filename: string, data: any): void {
    try {
        const filePath = path.join(process.cwd(), filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`File saved: ${filePath}`);
    } catch (error) {
        console.error(`Error saving file ${filename}:`, error);
    }
}

function parsePhone(phoneNumber: string): ParsedPhoneNumber | null {
    try {
        // Simple phone number parsing - you might want to use a library like libphonenumber-js
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Basic parsing logic - adjust based on your needs
        if (cleanNumber.length >= 10) {
            const countryCode = cleanNumber.startsWith('86') ? '86' : '1'; // Default to China or US
            const nationalNumber = parseInt(cleanNumber.replace(countryCode, ''));
            
            return {
                nationalNumber,
                countryCode: `+${countryCode}`
            };
        }
        return null;
    } catch (error) {
        console.error('Error parsing phone number:', error);
        return null;
    }
}

// Get phone service configuration from environment variables
function getPhoneServiceConfig(): PhoneServiceConfig {
    return {
        country: process.env.PHONE_COUNTRY || '',
        service: process.env.PHONE_SERVICE || '',
        maxPrice: process.env.PHONE_MAX_PRICE || ''
    };
}

const logger = new Logger('RequestPhone');

/**
 * Get a phone number from the API
 * @returns Promise<PhoneNumberData | null>
 */
export async function getNumber(): Promise<PhoneNumberData | null> {
    const maxRetries = 10;
    const retryDelay = 5000;
    let retryCount = 0;
    const config = getPhoneServiceConfig();
    
    while (retryCount < maxRetries) {
        try {
            const apiUrl = new URL(EnvConfig.getNumberUrl());
            if (config.country && config.country.trim() !== '') {
                apiUrl.searchParams.append('country', config.country);
            }
            if (config.service && config.service.trim() !== '') {
                apiUrl.searchParams.append('service', config.service);
            }
            if (config.maxPrice && config.maxPrice.trim() !== '') {
                apiUrl.searchParams.append('maxPrice', config.maxPrice);
            }
            
            const url = apiUrl.toString();
            logger.info(`正在获取号码...请求URL: ${url} (尝试 ${retryCount + 1} / ${maxRetries})`);
            
            const response = await axios.get<NumberResponse>(url, { timeout: 10000 });
            
            if (!response.data.success || !response.data.data) {
                throw new Error(`HTTP status ${JSON.stringify(response.data)}`);
            }
            
            const responseData = response.data.data;
            const activationId = responseData.activationId;
            const phoneNumber = responseData.phoneNumber;
            
            if (!activationId || !phoneNumber) {
                throw new Error(`response data: ${JSON.stringify(response.data)}`);
            }
            
            const parsedPhoneNumber = parsePhone(phoneNumber);
            if (!parsedPhoneNumber) {
                throw new Error(`解析手机号失败: ${phoneNumber}`);
            }
            
            const number = parsedPhoneNumber.nationalNumber.toString();
            const countryCode = parsedPhoneNumber.countryCode.replace('+', '');
            
            logger.info(`成功获取号码: phoneNumber: ${phoneNumber} - activationId: ${activationId}`);
            
            const res: PhoneNumberData = {
                country: config.country,
                service: config.service,
                maxPrice: config.maxPrice,
                phoneNumber: number,
                countryCode: countryCode,
                activationId: activationId,
                originalPhoneNumber: phoneNumber
            };
            
            saveFile('number.json', res);
            return res;
        } catch (error) {
            retryCount++;
            if (retryCount < maxRetries) {
                logger.info(`获取号码失败，等待 ${retryDelay / 1000} 秒后重试...`);
                logger.error(`错误信息: ${error}`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                logger.error(`获取号码失败，已达到最大重试次数: ${error}`);
            }
        }
    }
    return null;
}

/**
 * Get SMS code for the given activation ID
 * @param activationId - The activation ID to get SMS for
 * @returns Promise<string | null>
 */
export async function getSms(activationId: string): Promise<string | null> {
    const maxRetries = 12;
    const retryDelay = 5000;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const apiUrl = new URL(EnvConfig.getSmsUrl());
            apiUrl.searchParams.append('activationId', activationId);
            const url = apiUrl.toString();
            
            logger.info(`正在获取验证码...请求URL: ${url} (尝试 ${retryCount + 1} / ${maxRetries})`);
            
            const response = await axios.get<SmsResponse>(url, { timeout: 10000 });
            
            if (!response.data.success || !response.data.data) {
                throw new Error(`HTTP status ${JSON.stringify(response.data)}`);
            }
            
            const smsCode = response.data.data.sms?.code;
            if (smsCode) {
                logger.info(`成功获取验证码: ${smsCode}`);
                return smsCode;
            }
            
            logger.info(`验证码获取失败，等待 ${retryDelay / 1000} 秒后重试...`);
            logger.error(`错误信息: ${JSON.stringify(response.data)}`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryCount++;
        } catch (error) {
            retryCount++;
            if (retryCount < maxRetries) {
                logger.info(`验证码获取失败，等待 ${retryDelay / 1000} 秒后重试...`);
                logger.error(`错误信息: ${error}`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                logger.error(`验证码获取失败，已达到最大重试次数: ${error}`);
            }
        }
    }
    return null;
} 