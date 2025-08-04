#!/usr/bin/env python3
"""
Mitmproxy script for capturing Viber API responses
"""

import json
import time
from mitmproxy import ctx
from mitmproxy import http
import os

# 配置日志文件路径
log_dir = os.path.join(os.getcwd(), 'api-responses')
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

def request(flow: http.HTTPFlow) -> None:
    """处理请求"""
    # 只记录Viber相关的请求
    if 'viber.com' in flow.request.pretty_host or 'api.viber.com' in flow.request.pretty_host:
        ctx.log.info(f"Captured Viber request: {flow.request.method} {flow.request.pretty_url}")
        
        # 记录请求信息
        request_data = {
            'url': flow.request.pretty_url,
            'method': flow.request.method,
            'headers': dict(flow.request.headers),
            'timestamp': time.time()
        }
        
        # 如果有请求体，也记录下来
        if flow.request.content:
            try:
                request_data['body'] = json.loads(flow.request.content.decode('utf-8'))
            except:
                request_data['body'] = flow.request.content.decode('utf-8', errors='ignore')

def response(flow: http.HTTPFlow) -> None:
    """处理响应"""
    # 只记录Viber相关的响应
    if 'viber.com' in flow.request.pretty_host or 'api.viber.com' in flow.request.pretty_host:
        ctx.log.info(f"Captured Viber response: {flow.response.status_code} {flow.request.pretty_url}")
        
        # 记录响应信息
        response_data = {
            'url': flow.request.pretty_url,
            'method': flow.request.method,
            'status_code': flow.response.status_code,
            'headers': dict(flow.response.headers),
            'timestamp': time.time()
        }
        
        # 如果有响应体，也记录下来
        if flow.response.content:
            try:
                response_data['body'] = json.loads(flow.response.content.decode('utf-8'))
            except:
                response_data['body'] = flow.response.content.decode('utf-8', errors='ignore')
        
        # 保存到文件
        filename = f"viber_api_{int(time.time())}.json"
        filepath = os.path.join(log_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(response_data, f, indent=2, ensure_ascii=False)
        
        ctx.log.info(f"Saved API response to: {filepath}")

def load(loader):
    """脚本加载时的初始化"""
    ctx.log.info("Viber API capture script loaded") 