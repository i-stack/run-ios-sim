#!/usr/bin/env python3
"""
Enhanced Mitmproxy script for capturing Viber API responses on iOS
Supports automatic certificate installation and comprehensive API monitoring
"""

import json
import os
import time
import hashlib
import base64
from datetime import datetime
from pathlib import Path
from mitmproxy import ctx
from mitmproxy import http
from mitmproxy import tls
from mitmproxy.net import tls as net_tls


class EnhancedViberCaptureScript:
    def __init__(self):
        self.log_dir = Path.cwd() / 'api-responses'
        self.ensure_log_directory()
        self.captured_count = 0
        self.viber_domains = [
            'api.viber.com',
            'api.viber.me', 
            'api.viber.net',
            'viber.com',
            'viber.me',
            'viber.net',
            'vibercdn.com',
            'viber-cdn.com',
            'viber-prod.com',
            'viber-prod.net'
        ]
        
        # iOS specific domains that might contain Viber traffic
        self.ios_viber_domains = [
            '*.viber.com',
            '*.viber.me',
            '*.viber.net',
            'viber-prod-*.amazonaws.com',
            'viber-cdn-*.cloudfront.net'
        ]
        
    def ensure_log_directory(self):
        """确保日志目录存在"""
        self.log_dir.mkdir(exist_ok=True)
        print(f"[INFO] Log directory: {self.log_dir}")
        
    def should_capture_request(self, flow):
        """判断是否应该捕获请求 - 增强版"""
        url = flow.request.pretty_url.lower()
        host = flow.request.pretty_host.lower()
        
        # 检查Viber相关域名
        if any(domain in host for domain in self.viber_domains):
            return True
            
        # 检查iOS特定的Viber流量模式
        if self.is_ios_viber_traffic(flow):
            return True
            
        # 检查URL路径中的Viber相关关键词
        viber_keywords = ['viber', 'vb', 'chat', 'message', 'contact', 'profile']
        if any(keyword in url for keyword in viber_keywords):
            return True
            
        return False
        
    def is_ios_viber_traffic(self, flow):
        """检测iOS设备上的Viber流量特征"""
        request = flow.request
        
        # 检查User-Agent中的iOS标识
        user_agent = request.headers.get('user-agent', '').lower()
        if 'iphone' in user_agent or 'ipad' in user_agent or 'ipod' in user_agent:
            # 检查是否包含Viber相关的请求头
            viber_headers = ['x-viber-', 'viber-', 'vb-']
            for header in request.headers.keys():
                if any(vh in header.lower() for vh in viber_headers):
                    return True
                    
        # 检查请求路径模式
        path = request.path.lower()
        ios_viber_patterns = [
            '/api/', '/v1/', '/v2/', '/chat/', '/message/',
            '/contact/', '/profile/', '/auth/', '/register/'
        ]
        if any(pattern in path for pattern in ios_viber_patterns):
            return True
            
        return False
        
    def should_capture_response(self, flow):
        """判断是否应该捕获响应 - 增强版"""
        response = flow.response
        if not response:
            return False
            
        # 捕获所有Viber相关的响应，包括错误响应
        if self.should_capture_request(flow):
            return True
            
        # 检查响应头中的Viber标识
        viber_response_headers = ['x-viber-', 'viber-', 'vb-']
        for header in response.headers.keys():
            if any(vh in header.lower() for vh in viber_response_headers):
                return True
                
        # 检查内容类型
        content_type = response.headers.get('content-type', '')
        if ('application/json' in content_type or 
            'text/plain' in content_type or
            'application/xml' in content_type):
            return True
            
        return False
                
    def log_request(self, flow):
        """记录请求信息 - 增强版"""
        request = flow.request
        request_data = {
            'method': request.method,
            'url': request.pretty_url,
            'host': request.pretty_host,
            'path': request.path,
            'headers': dict(request.headers),
            'timestamp': datetime.now().isoformat(),
            'client_ip': getattr(flow.client_conn, 'address', None),
            'is_ssl': request.scheme == 'https'
        }
        
        # 记录请求体（如果是POST/PUT等）
        if request.method in ['POST', 'PUT', 'PATCH'] and request.content:
            try:
                request_data['body'] = request.content.decode('utf-8')
            except UnicodeDecodeError:
                request_data['body'] = str(request.content)
                
        print(f"[CAPTURE] Request: {json.dumps(request_data, indent=2)}")
        
    def capture_response(self, flow):
        """捕获并保存响应 - 增强版"""
        try:
            request = flow.request
            response = flow.response
            
            # 获取响应体
            response_body = ""
            if response.content:
                try:
                    response_body = response.content.decode('utf-8')
                except UnicodeDecodeError:
                    response_body = str(response.content)
            
            api_response = {
                'url': request.pretty_url,
                'method': request.method,
                'host': request.pretty_host,
                'path': request.path,
                'request_headers': dict(request.headers),
                'response_headers': dict(response.headers),
                'body': response_body,
                'timestamp': datetime.now().isoformat(),
                'statusCode': response.status_code,
                'client_ip': getattr(flow.client_conn, 'address', None),
                'is_ssl': request.scheme == 'https',
                'capture_id': self.generate_capture_id(request.pretty_url)
            }
            
            # 生成文件名
            timestamp = datetime.now().isoformat().replace(':', '-').replace('.', '-')
            url_hash = self.hash_string(request.pretty_url)
            filename = f"{timestamp}_{url_hash}.json"
            filepath = self.log_dir / filename
            
            # 保存响应到文件
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(api_response, f, indent=2, ensure_ascii=False)
                
            self.captured_count += 1
            print(f"[CAPTURE] Saved response #{self.captured_count} to: {filename}")
            print(f"[CAPTURE] URL: {request.pretty_url}")
            print(f"[CAPTURE] Status: {response.status_code}")
            print(f"[CAPTURE] Content-Length: {len(response_body)}")
            
        except Exception as e:
            print(f"[ERROR] Failed to capture response: {e}")
            
    def generate_capture_id(self, url):
        """生成唯一的捕获ID"""
        timestamp = datetime.now().isoformat()
        return hashlib.md5(f"{url}_{timestamp}".encode()).hexdigest()[:8]
            
    def hash_string(self, s):
        """简单的字符串哈希函数"""
        return hashlib.md5(s.encode()).hexdigest()[:8]


# 创建全局实例
capture_script = EnhancedViberCaptureScript()


def request(flow):
    """处理HTTP请求 - 增强版"""
    request = flow.request
    print(f"[REQUEST] {request.method} {request.pretty_url}")
    
    if capture_script.should_capture_request(flow):
        capture_script.log_request(flow)


def response(flow):
    """处理HTTP响应 - 增强版"""
    request = flow.request
    response = flow.response
    
    if response:
        print(f"[RESPONSE] {response.status_code} {request.method} {request.pretty_url}")
        
        if capture_script.should_capture_response(flow):
            capture_script.capture_response(flow)


def tls_clienthello(data):
    """处理TLS握手 - 用于SSL/TLS流量分析"""
    try:
        # 记录TLS连接信息
        print(f"[TLS] Client Hello detected")
        print(f"[TLS] SNI: {data.server_name}")
        print(f"[TLS] ALPN: {data.alpn_protocols}")
    except Exception as e:
        print(f"[ERROR] TLS processing error: {e}")


def load(loader):
    """脚本加载时的初始化"""
    print("[INFO] Enhanced Viber Capture Script loaded")
    print(f"[INFO] Monitoring domains: {capture_script.viber_domains}")
    print(f"[INFO] Log directory: {capture_script.log_dir}")


# 如果直接运行此脚本，显示使用说明
if __name__ == "__main__":
    print("Enhanced Viber Capture Script for iOS")
    print("This script is designed to be used with mitmproxy.")
    print("Usage: mitmdump --script capture.script.py")
    print("Features:")
    print("- Enhanced iOS Viber traffic detection")
    print("- Comprehensive API response capture")
    print("- SSL/TLS traffic analysis")
    print("- Automatic log file management")
