#!/usr/bin/env python3
"""检查火车详情API响应"""
from playwright.sync_api import sync_playwright
import time
import json
import subprocess

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:3000/api"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    print("=" * 60)
    print("检查火车详情API响应")
    print("=" * 60)
    
    # 登录
    page.goto(f'{BASE_URL}/login', timeout=10000)
    page.wait_for_load_state('domcontentloaded')
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    
    # 获取token
    token = page.evaluate("localStorage.getItem('token')")
    print(f"\nToken: {token[:20]}...")
    
    # 获取火车列表
    print("\n1. 获取火车列表...")
    result = subprocess.run(
        ['curl', '-s', '-H', f'Authorization: Bearer {token}', f'{API_URL}/trains'],
        capture_output=True, text=True
    )
    trains_data = json.loads(result.stdout)
    train = trains_data['data']['list'][0]
    train_id = train['id']
    print(f"   火车ID: {train_id}")
    print(f"   火车名称: {train['name']}")
    print(f"   班次数: {train['scheduleCount']}")
    
    # 获取火车详情
    print("\n2. 获取火车详情...")
    detail_result = subprocess.run(
        ['curl', '-s', '-H', f'Authorization: Bearer {token}', f'{API_URL}/trains/{train_id}'],
        capture_output=True, text=True
    )
    detail_data = json.loads(detail_result.stdout)
    print(f"   响应: {json.dumps(detail_data, indent=2)[:1000]}")
    
    # 直接获取班次列表
    print("\n3. 直接获取班次列表...")
    schedules_result = subprocess.run(
        ['curl', '-s', '-H', f'Authorization: Bearer {token}', f'{API_URL}/schedules'],
        capture_output=True, text=True
    )
    if schedules_result.returncode == 0:
        schedules_data = json.loads(schedules_result.stdout)
        print(f"   响应: {json.dumps(schedules_data, indent=2)[:1000]}")
        
        # 提取班次ID
        if 'data' in schedules_data:
            data = schedules_data['data']
            if isinstance(data, dict) and 'list' in data:
                schedules = data['list']
                if schedules:
                    schedule = schedules[0]
                    schedule_id = schedule['id']
                    schedule_name = schedule['name']
                    print(f"\n   第一个班次:")
                    print(f"   - ID: {schedule_id}")
                    print(f"   - 名称: {schedule_name}")
                    
                    # 更新配置文件
                    print("\n4. 更新配置文件...")
                    route = f'/trains/{train_id}/schedules/{schedule_id}'
                    print(f"   路由: {route}")
                    
                    config_file = '/Users/laiyang/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/版本火车/release-train/apps/web/src/tour/TourHelpButton.tsx'
                    with open(config_file, 'r') as f:
                        content = f.read()
                    
                    import re
                    new_route = f"  'schedule-detail': {{ path: '{route}', description: '了解班次详情功能' }}"
                    content = re.sub(
                        r"'schedule-detail': \{ path: '[^']*', description: '了解班次详情功能' \}",
                        new_route,
                        content
                    )
                    with open(config_file, 'w') as f:
                        f.write(content)
                    print("   ✓ 配置文件已更新")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()