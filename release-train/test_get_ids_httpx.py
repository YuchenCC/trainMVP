#!/usr/bin/env python3
"""获取火车和班次ID - 使用page.evaluate"""
from playwright.sync_api import sync_playwright
import time
import httpx

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
        print(f"   ✓ 获取到token: {token[:20]}...")
    else:
        print("   ✗ 未获取到token")
        browser.close()
        exit()
    
    # 3. 使用httpx调用API
    print("\n3. 调用火车列表API...")
    with httpx.Client() as client:
        headers = {'Authorization': f'Bearer {token}'}
        
        # 获取火车列表
        trains_response = client.get(f'{API_URL}/trains', headers=headers)
        if trains_response.status_code == 200:
            trains_data = trains_response.json()
            if 'data' in trains_data and trains_data['data']:
                train = trains_data['data'][0]
                train_id = train['id']
                train_name = train['name']
                print(f"   ✓ 获取到火车:")
                print(f"   - ID: {train_id}")
                print(f"   - 名称: {train_name}")
                
                # 获取火车详情（包含班次）
                print("\n4. 获取火车详情...")
                detail_response = client.get(f'{API_URL}/trains/{train_id}', headers=headers)
                if detail_response.status_code == 200:
                    detail_data = detail_response.json()
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
                else:
                    print(f"   ✗ API错误: {detail_response.status_code}")
        else:
            print(f"   ✗ API错误: {trains_response.status_code}")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()