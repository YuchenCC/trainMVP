#!/usr/bin/env python3
"""获取火车和班次ID - 简化版"""
from playwright.sync_api import sync_playwright
import time

BASE_URL = "http://localhost:5173"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
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
    
    # 2. 关闭模态框
    print("\n2. 关闭模态框...")
    time.sleep(2)
    page.keyboard.press('Escape')
    time.sleep(1)
    
    # 3. 直接调用API获取火车数据
    print("\n3. 获取火车数据...")
    
    # 使用fetch API获取数据
    response = page.evaluate("""
        async () => {
            const res = await fetch('/api/trains');
            return await res.json();
        }
    """)
    
    if response and 'data' in response:
        trains = response['data']
        print(f"   火车数量: {len(trains)}")
        
        if trains:
            train = trains[0]
            train_id = train.get('id')
            train_name = train.get('name')
            print(f"   第一个火车:")
            print(f"   - ID: {train_id}")
            print(f"   - 名称: {train_name}")
            
            # 4. 获取火车详情（包含班次）
            print("\n4. 获取火车详情...")
            detail_response = page.evaluate(f"""
                async () => {{
                    const res = await fetch('/api/trains/{train_id}');
                    return await res.json();
                }}
            """)
            
            if detail_response and 'data' in detail_response:
                schedules = detail_response['data'].get('schedules', [])
                print(f"   班次数量: {len(schedules)}")
                
                if schedules:
                    schedule = schedules[0]
                    schedule_id = schedule.get('id')
                    schedule_name = schedule.get('name')
                    print(f"   第一个班次:")
                    print(f"   - ID: {schedule_id}")
                    print(f"   - 名称: {schedule_name}")
                    
                    # 输出完整的路由
                    print(f"\n5. 班次详情导览路由:")
                    print(f"   /trains/{train_id}/schedules/{schedule_id}")
    else:
        print("   ✗ 获取火车数据失败")
    
    # 保持浏览器打开
    time.sleep(10)
    
    browser.close()