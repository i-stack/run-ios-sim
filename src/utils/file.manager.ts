import fs from 'fs';
import path from 'path';
import { Logger } from './logger';

const logger = new Logger('FileManager');

export interface FileData {
    [key: string]: any;
}

export class FileManager {
    private dataDir: string;

    constructor() {
        const currentDirPath = process.cwd();
        this.dataDir = path.join(currentDirPath, 'data');
        this.ensureDataDirectory();
    }

    /**
     * Ensure the data directory exists
     */
    private ensureDataDirectory(): void {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
            logger.info(`Created data directory: ${this.dataDir}`);
        }
    }

    /**
     * Get the full file path for a given file name
     * @param fileName - The name of the file
     * @returns The full file path
     */
    public getFilePath(fileName: string): string {
        return path.join(this.dataDir, fileName);
    }

    /**
     * Save data to a JSON file
     * @param fileName - The name of the file to save
     * @param data - The data to save
     */
    public saveFile(fileName: string, data: any): void {
        try {
            const filePath = this.getFilePath(fileName);
            const jsonData = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, jsonData, 'utf8');
            logger.info(`File saved successfully: ${fileName}`);
        } catch (error) {
            logger.error(`Error saving file ${fileName}:`, error);
            throw error;
        }
    }

    /**
     * Read data from a JSON file
     * @param fileName - The name of the file to read
     * @returns The parsed data or null if file doesn't exist or is invalid
     */
    public readFile(fileName: string): any {
        try {
            const filePath = this.getFilePath(fileName);
            if (!fs.existsSync(filePath)) {
                logger.warn(`File does not exist: ${fileName}`);
                return null;
            }
            const content = fs.readFileSync(filePath, 'utf8');
            if (!content.trim()) {
                logger.warn(`File is empty: ${fileName}`);
                return null;
            }
            const data = JSON.parse(content);
            logger.info(`File read successfully: ${fileName}`);
            return data;
        } catch (error) {
            logger.error(`Error reading file ${fileName}:`, error);
            return null;
        }
    }

    /**
     * Delete a file by clearing its contents
     * @param fileName - The name of the file to delete
     */
    public deleteFile(fileName: string): void {
        try {
            const filePath = this.getFilePath(fileName);
            if (fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify({}), 'utf8');
                logger.info(`File cleared: ${fileName}`);
            } else {
                logger.warn(`File does not exist: ${fileName}`);
            }
        } catch (error) {
            logger.error(`Error deleting file ${fileName}:`, error);
            throw error;
        }
    }

    /**
     * Check if a file exists
     * @param fileName - The name of the file to check
     * @returns True if file exists, false otherwise
     */
    public checkFileExists(fileName: string): boolean {
        const filePath = this.getFilePath(fileName);
        return fs.existsSync(filePath);
    }

    /**
     * Append data to an existing file
     * @param fileName - The name of the file
     * @param data - The data to append
     */
    public appendToFile(fileName: string, data: any): void {
        try {
            const filePath = this.getFilePath(fileName);
            const existingData = this.readFile(fileName) || {};
            const mergedData = { ...existingData, ...data };
            this.saveFile(fileName, mergedData);
            logger.info(`Data appended to file: ${fileName}`);
        } catch (error) {
            logger.error(`Error appending to file ${fileName}:`, error);
            throw error;
        }
    }

    /**
     * Get all files in the data directory
     * @returns Array of file names
     */
    public listFiles(): string[] {
        try {
            if (!fs.existsSync(this.dataDir)) {
                return [];
            }
            return fs.readdirSync(this.dataDir);
        } catch (error) {
            logger.error('Error listing files:', error);
            return [];
        }
    }

    /**
     * Get file size in bytes
     * @param fileName - The name of the file
     * @returns File size in bytes or -1 if file doesn't exist
     */
    public getFileSize(fileName: string): number {
        try {
            const filePath = this.getFilePath(fileName);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                return stats.size;
            }
            return -1;
        } catch (error) {
            logger.error(`Error getting file size for ${fileName}:`, error);
            return -1;
        }
    }
}

export const fileManager = new FileManager();
export const getFilePath = (fileName: string): string => fileManager.getFilePath(fileName);
export const saveFile = (fileName: string, data: any): void => fileManager.saveFile(fileName, data);
export const readFile = (fileName: string): any => fileManager.readFile(fileName);
export const deleteFile = (fileName: string): void => fileManager.deleteFile(fileName);
export const checkFileExists = (fileName: string): boolean => fileManager.checkFileExists(fileName); 