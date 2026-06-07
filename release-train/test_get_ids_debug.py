#!/usr/bin/env python3
"""获取火车和班次ID - 调试版"""
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
    print("获取火车和班次ID")
    print("=" * 60)
    
    # 1. 登录
    print("\n1. 登录并获取token...")
    page.goto(f'{BASE_URL}/login', timeout=10000)
    page.wait_for_load_state('domcontentloaded')
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    
    # 2. 从localStorage获取token
    print("\n2. 获取认证token...")
    token = page.evaluate("localStorage.getItem('token')")
    if token:
        print(f"   ✓ 获取到token")
    else:
        print("   ✗ 未获取到token")
        browser.close()
        exit()
    
    # 3. 使用curl调用API
    print("\n3. 调用火车列表API...")
    result = subprocess.run(
        ['curl', '-s', '-H', f'Authorization: Bearer {token}', f'{API_URL}/trains'],
        capture_output=True, text=True
    )
    
    if result.returncode == 0:
        print(f"\n   API响应: {result.stdout[:500]}")
        
        try:
            trains_data = json.loads(result.stdout)
            print(f"\n   解析后的数据结构: {type(trains_data)}")
            
            # 检查数据结构
            if isinstance(trains_data, dict):
                print(f"   keys: {list(trains_data.keys())}")
                if 'data' in trains_data:
                    data = trains_data['data']
                    print(f"   data类型: {type(data)}")
                    if isinstance(data, list) and len(data) > 0:
                        train = data[0]
                        print(f"   第一个火车的keys: {list(train.keys())}")
                        train_id = train.get('id')
                        train_name = train.get('name')
                        print(f"\n   ✓ 获取到火车:")
                        print(f"   - ID: {train_id}")
                        print(f"   - 名称: {train_name}")
                        
                        # 获取火车详情
                        print("\n4. 获取火车详情...")
                        detail_result = subprocess.run(
                            ['curl', '-s', '-H', f'Authorization: Bearer {token}', f'{API_URL}/trains/{train_id}'],
                            capture_output=True, text=True
                        )
                        
                        if detail_result.returncode == 0:
                            detail_data = json.loads(detail_result.stdout)
                            if 'data' in detail_data:
                                schedules = detail_data['data'].get('schedules', [])
                                print(f"   ✓ 班次数量: {len(schedules)}")
                                
                                if schedules:
                                    schedule = schedules[0]
                                    schedule_id = schedule['id']
                                    schedule_name = schedule['name']
                                    print(f"   ✓ 第一个班次:")
                                    print(f"   - ID: {schedule_id}")
                                    print(f"   - 名称: {schedule_name}")
                                    
                                    # 输出完整的路由
                                    print(f"\n5. 班次详情导览路由:")
                                    route = f'/trains/{train_id}/schedules/{schedule_id}'
                                    print(f"   {route}")
                                    
                                    # 更新配置文件
                                    print("\n6. 更新配置文件...")
                                    config_file = '/Users/laiyang/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/版本火车/release-train/apps/web/src/tour/TourHelpButton.tsx'
                                    with open(config_file, 'r') as f:
                                        content = f.read()
                                    
                                    # 替换路由
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
                    elif isinstance(data, dict):
                        # 可能是分页结构
                        if 'items' in data:
                            items = data['items']
                        elif 'records' in data:
                            items = data['records']
                        else:
                            items = list(data.values())
                        
                        if items and len(items) > 0:
                            train = items[0]
                            train_id = train.get('id')
                            train_name = train.get('name')
                            print(f"\n   ✓ 获取到火车:")
                            print(f"   - ID: {train_id}")
                            print(f"   - 名称: {train_name}")
        except json.JSONDecodeError as e:
            print(f"   ✗ JSON解析失败: {e}")
    else:
        print(f"   ✗ curl调用失败")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()