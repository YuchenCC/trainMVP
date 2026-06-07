#!/usr/bin/env python3
"""获取火车和班次ID"""
from playwright.sync_api import sync_playwright
import time
import json

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    # 拦截API响应
    train_api_data = []
    schedule_api_data = []
    
    def handle_response(response):
        url = response.url
        if '/api/trains' in url and response.status == 200:
            try:
                data = response.json()
                train_api_data.append(data)
            except:
                pass
        elif '/api/trains/' in url and '/schedules' in url and response.status == 200:
            try:
                data = response.json()
                schedule_api_data.append(data)
            except:
                pass
    
    page.on('response', handle_response)
    
    print("=" * 60)
    print("获取火车和班次ID")
    print("=" * 60)
    
    # 1. 登录
    print("\n1. 登录...")
    page.goto(f'{BASE_URL}/login', timeout=10000)
    page.wait_for_load_state('domcontentloaded')
    page.fill('input[placeholder="用户名"]', 'puhuiqianduan_ba')
    page.fill('input[placeholder="密码"]', '123456')
    page.click('button:has-text("登 录")')
    page.wait_for_url('**/dashboard', timeout=10000)
    print("   ✓ 登录成功")
    
    # 2. 跳转到版本火车页面
    print("\n2. 跳转到版本火车页面...")
    page.goto(f'{BASE_URL}/trains')
    page.wait_for_load_state('domcontentloaded')
    time.sleep(3)
    
    # 3. 分析火车列表API
    print("\n3. 分析火车列表...")
    if train_api_data:
        for data in train_api_data:
            if 'data' in data:
                trains = data['data']
                print(f"   火车数量: {len(trains)}")
                for i, train in enumerate(trains[:3]):
                    print(f"\n   火车 {i+1}:")
                    print(f"   - ID: {train.get('id')}")
                    print(f"   - 名称: {train.get('name')}")
                    print(f"   - 班次数: {train.get('scheduleCount', 0)}")
                    
                    # 检查嵌套的班次
                    if 'schedules' in train and train['schedules']:
                        print(f"   - 嵌套班次数: {len(train['schedules'])}")
                        first_schedule = train['schedules'][0]
                        print(f"   - 第一个班次ID: {first_schedule.get('id')}")
                        print(f"   - 第一个班次名称: {first_schedule.get('name')}")
    else:
        print("   ✗ 未捕获到火车列表API")
    
    # 4. 点击第一个火车的"查看"按钮
    print("\n4. 跳转到火车详情页...")
    view_button = page.locator('button:has-text("查看")')
    if view_button.count() > 0:
        # 使用force绕过模态框
        view_button.first.click(force=True)
        page.wait_for_load_state('domcontentloaded')
        time.sleep(3)
        print(f"   当前URL: {page.url}")
        
        # 等待班次API响应
        time.sleep(2)
        
        # 分析火车详情API
        if schedule_api_data:
            print(f"\n   捕获到 {len(schedule_api_data)} 个班次API响应")
            for data in schedule_api_data:
                if 'data' in data:
                    schedules = data['data']
                    if isinstance(schedules, list):
                        print(f"   班次数量: {len(schedules)}")
                        for i, schedule in enumerate(schedules[:3]):
                            print(f"\n   班次 {i+1}:")
                            print(f"   - ID: {schedule.get('id')}")
                            print(f"   - 名称: {schedule.get('name')}")
                            print(f"   - 状态: {schedule.get('status')}")
                    elif isinstance(schedules, dict):
                        print(f"   班次详情: {schedules.get('id')} - {schedules.get('name')}")
    else:
        print("   ✗ 未找到查看按钮")
    
    # 截图
    page.screenshot(path='train-detail-api.png')
    print("\n   截图已保存: train-detail-api.png")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()