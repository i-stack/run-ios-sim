import axios from 'axios';
import { EnvConfig } from '../env';
import { Logger } from '../utils/logger';
import { fileManager } from '../utils/file.manager';

const logger = new Logger('Phone');

// Interfaces
export interface SmsResponse {
    success: boolean;
    code: string;
    message: string;
    fullMessage: string;
}

export interface NumberResponse {
    success: boolean;
    parsedData: {
        pkey: string;
        iid: string;
        countryCode: string;
        phoneNumber: string;
        countryAreaCode: string;
    };
}

export interface PhoneNumberData {
    pkey: string;
    iid?: string;
    country?: string;
    maxPrice?: string;
    phoneNumber: string;
    countryCode: string;
    originalPhoneNumber: string;
}

export interface ParsedPhoneNumber {
    nationalNumber: number;
    countryCode: string;
}

// Configuration interface
export interface PhoneServiceConfig {
    iid: string;
    country: string;
    maxPrice: string;
}

// Utility functions
function saveFile(filename: string, data: any): void {
    try {
        fileManager.saveFile(filename, data);
        console.log(`File saved: ${fileManager.getFilePath(filename)}`);
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

/**
 * Get a phone number from the API
 * @param config - The phone service configuration
 * @returns Promise<PhoneNumberData | null>
 */
export async function getNumber(config: Partial<PhoneServiceConfig>): Promise<PhoneNumberData | null> {
    const maxRetries = 10;
    const retryDelay = 5000;
    let retryCount = 0;
    while (retryCount < maxRetries) {
        try {
            const params: Record<string, string> = {};
            if (config.country && config.country.trim() !== '') {
                params.country = config.country;
            }
            if (config.iid && config.iid.trim() !== '') {
                params.iid = config.iid;
            }
            if (config.maxPrice && config.maxPrice.trim() !== '') {
                params.maxPrice = config.maxPrice;
            }
            logger.info(`正在获取号码...请求URL: ${EnvConfig.getNumberUrl()} (尝试 ${retryCount + 1} / ${maxRetries})`);
            const response = await axios.post<NumberResponse>(EnvConfig.getNumberUrl(), params, { 
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + EnvConfig.getToken()
                }
            });
            if (!response.data.success) {
                throw new Error(`HTTP status ${JSON.stringify(response.data)}`);
            }
            const parsedData = response.data.parsedData;
            const res: PhoneNumberData = {
                pkey: parsedData.pkey,
                iid: parsedData.iid,
                maxPrice: config.maxPrice,
                country: parsedData.countryCode,
                phoneNumber: parsedData.phoneNumber,
                countryCode: parsedData.countryAreaCode,
                originalPhoneNumber: `+${parsedData.countryAreaCode}${parsedData.phoneNumber}`,
            };
            logger.info(`成功获取号码: ${JSON.stringify(res)}`);
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
 * Get SMS code for the given pkey
 * @param pkey - The pkey to get SMS for
 * @returns Promise<string | null>
 */
export async function getSms(pkey: string): Promise<string | null> {
    const maxRetries = 12;
    const retryDelay = 5000;
    let retryCount = 0;
    while (retryCount < maxRetries) {
        try {
            const params: Record<string, string> = {"pkey": pkey};
            logger.info(`正在获取验证码...请求URL: ${EnvConfig.getSmsUrl()} (尝试 ${retryCount + 1} / ${maxRetries})`);
            const response = await axios.post<SmsResponse>(EnvConfig.getSmsUrl(), params, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + EnvConfig.getToken()
                }
            });
            if (!response.data.success) {
                throw new Error(`HTTP status ${JSON.stringify(response.data)}`);
            }
            const smsCode = response.data.code;
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

// let result = getNumber({
//     country: 'phl',
//     service: 'viber',
//     maxPrice: '10'
// });

// console.log(result);